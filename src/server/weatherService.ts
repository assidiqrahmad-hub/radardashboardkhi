import type { DecodedMetar, DecodedTaf, FlightCategory, DelayRiskLevel, OpkcWeatherResponse, TafPeriod } from '../types/weather.ts';

interface CachedWeather {
  data: OpkcWeatherResponse;
  expiresAt: number;
}

let weatherCache: CachedWeather | null = null;

// Weather phenomena dictionary
const WX_CODES: Record<string, string> = {
  FU: 'Smoke (Industrial/Agricultural haze)',
  HZ: 'Haze (Suspended dry particles)',
  BR: 'Mist (High moisture shallow obscuration)',
  FG: 'Fog (Heavy visibility obscuration below 1km)',
  DZ: 'Drizzle',
  RA: 'Rain',
  SH: 'Showers',
  TS: 'Thunderstorm (Deep convective activity)',
  SQ: 'Squall',
  DU: 'Widespread Dust',
  BLDU: 'Blowing Dust',
  NSC: 'Nil Significant Cloud',
  SKC: 'Sky Clear',
  CAVOK: 'Ceiling and Visibility OK',
};

function decodeWeatherString(wxString?: string | null): Array<{ code: string; meaning: string }> {
  if (!wxString || !wxString.trim()) return [];
  const parts = wxString.trim().split(/\s+/);
  return parts.map(part => {
    let clean = part.replace(/^[-+]/, '');
    const isLight = part.startsWith('-');
    const isHeavy = part.startsWith('+');
    let meaning = WX_CODES[clean] || clean;
    if (isLight) meaning = 'Light ' + meaning;
    if (isHeavy) meaning = 'Heavy ' + meaning;
    return { code: part, meaning };
  });
}

function calculateRunways(windDir: number, windSpeed: number) {
  // Karachi Airport Runways: 25L/25R (approx heading 250°) and 07R/07L (approx heading 070°)
  const runways = [
    { name: 'Runway 25L / 25R', heading: 250 },
    { name: 'Runway 07R / 07L', heading: 70 },
  ];

  return runways.map(r => {
    const angleDiffRad = ((windDir - r.heading) * Math.PI) / 180;
    const headwind = Math.round(windSpeed * Math.cos(angleDiffRad));
    const crosswind = Math.round(Math.abs(windSpeed * Math.sin(angleDiffRad)));
    const crosswindDir = Math.sin(angleDiffRad) > 0 ? ('right' as const) : ('left' as const);

    return {
      runwayName: r.name,
      headingDeg: r.heading,
      headwindKnots: headwind,
      crosswindKnots: crosswind,
      crosswindDirection: crosswind === 0 ? ('none' as const) : crosswindDir,
      isOptimal: headwind > 0 && crosswind < 15,
    };
  });
}

function evaluateDelayRisk(
  flightCat: FlightCategory,
  visibilityM: number,
  windSpeed: number,
  gustSpeed: number | undefined,
  weatherString?: string
): { level: DelayRiskLevel; summary: string; factors: string[]; potentialDelays: string[] } {
  const factors: string[] = [];
  const potentialDelays: string[] = [];
  let risk: DelayRiskLevel = 'LOW';

  const isLowVis = visibilityM < 4000;
  const isVeryLowVis = visibilityM < 2000;
  const isHighWind = windSpeed > 20 || (gustSpeed && gustSpeed > 25);
  const isFog = weatherString?.includes('FG');
  const isSmokeOrHaze = weatherString?.includes('FU') || weatherString?.includes('HZ');
  const isStorm = weatherString?.includes('TS');

  if (isVeryLowVis || isFog || isStorm) {
    risk = 'HIGH';
    if (isVeryLowVis) factors.push(`Restricted visibility (${visibilityM}m) triggering Low Visibility Procedures (LVP)`);
    if (isFog) factors.push('Dense surface fog significantly slowing runway operations');
    if (isStorm) factors.push('Thunderstorm activity requiring airborne holding and ground stop advisories');
    potentialDelays.push('Inbound flights placed in holding stacks over Karachi TMA');
    potentialDelays.push('Extended spacing between departures and arrivals (approx. +20 to +45 min delays)');
  } else if (isLowVis || isHighWind || isSmokeOrHaze || flightCat === 'IFR' || flightCat === 'MVFR') {
    risk = 'MODERATE';
    if (isSmokeOrHaze) factors.push(`Atmospheric haze and particulate smoke (${visibilityM}m)`);
    if (isHighWind) factors.push(`Elevated surface winds (${windSpeed}kt${gustSpeed ? ` G${gustSpeed}kt` : ''})`);
    if (flightCat === 'IFR') factors.push('IFR criteria in effect for approaching aircraft');
    potentialDelays.push('Minor spacing adjustments on Runway 25L (+10 to +20 min delay potential)');
    potentialDelays.push('Domestic turboprop aircraft (ATR-72 to Gwadar/Sukkur) monitoring crosswind limits');
  } else {
    risk = 'LOW';
    factors.push('Favorable visual meteorological conditions (VMC)');
    factors.push('Standard runway separation buffers');
    potentialDelays.push('No significant meteorological flight delays expected');
  }

  const summary =
    risk === 'HIGH'
      ? 'Adverse atmospheric conditions present. Weather delays and ATC holds likely.'
      : risk === 'MODERATE'
      ? 'Reduced visibility or brisk winds. Minor departure spacing adjustments possible.'
      : 'Optimal weather at Karachi Airport. Negligible weather delay impact.';

  return { level: risk, summary, factors, potentialDelays };
}

export async function getOpkcWeather(): Promise<OpkcWeatherResponse> {
  const now = Date.now();
  if (weatherCache && weatherCache.expiresAt > now) {
    return weatherCache.data;
  }

  try {
    const [metarRes, tafRes] = await Promise.all([
      fetch('https://aviationweather.gov/api/data/metar?ids=OPKC&format=json', {
        headers: { 'User-Agent': 'KarachiFlightRadar/2.0' },
      }),
      fetch('https://aviationweather.gov/api/data/taf?ids=OPKC&format=json', {
        headers: { 'User-Agent': 'KarachiFlightRadar/2.0' },
      }),
    ]);

    if (!metarRes.ok || !tafRes.ok) {
      throw new Error(`Weather upstream status: METAR ${metarRes.status}, TAF ${tafRes.status}`);
    }

    const metarList = await metarRes.json();
    const tafList = await tafRes.json();

    const metarRaw = metarList?.[0];
    const tafRaw = tafList?.[0];

    if (!metarRaw || !tafRaw) {
      throw new Error('Empty weather response from aviationweather.gov');
    }

    // Decode METAR
    const tempC = Number(metarRaw.temp ?? 26);
    const dewpC = Number(metarRaw.dewp ?? 21);
    const windDir = Number(metarRaw.wdir ?? 240);
    const windSpeed = Number(metarRaw.wspd ?? 8);
    const gustSpeed = metarRaw.wgst ? Number(metarRaw.wgst) : undefined;
    const visibMiles = Number(metarRaw.visib ?? 4);
    const visibMeters = Math.round(visibMiles * 1609.34);
    const qnh = Number(metarRaw.altim ?? 1014);

    // Relative humidity approx formula: RH ~= 100 - 5 * (T - Td)
    const relHumidity = Math.max(10, Math.min(100, Math.round(100 - 5 * (tempC - dewpC))));

    const flightCategory: FlightCategory =
      (metarRaw.fltCat as FlightCategory) || (visibMiles < 3 ? 'IFR' : visibMiles < 5 ? 'MVFR' : 'VFR');

    const catDescMap: Record<FlightCategory, string> = {
      VFR: 'Visual Flight Rules (Optimal conditions, ceiling > 3000ft, vis > 5 SM)',
      MVFR: 'Marginal VFR (Ceiling 1000-3000ft and/or visibility 3-5 SM)',
      IFR: 'Instrument Flight Rules (Ceiling 500-1000ft and/or visibility 1-3 SM)',
      LIFR: 'Low IFR (Ceiling < 500ft and/or visibility < 1 SM)',
    };

    const runwayAnalysis = calculateRunways(windDir, windSpeed);
    const delayRisk = evaluateDelayRisk(flightCategory, visibMeters, windSpeed, gustSpeed, metarRaw.wxString);

    const obsDate = new Date((metarRaw.obsTime ?? Math.floor(now / 1000)) * 1000);
    const pktDate = new Date(obsDate.getTime() + 5 * 60 * 60 * 1000);

    const decodedMetar: DecodedMetar = {
      raw: metarRaw.rawOb || `METAR OPKC ${obsDate.getUTCDate()}${String(obsDate.getUTCHours()).padStart(2, '0')}00Z ${windDir}${String(windSpeed).padStart(2, '0')}KT ${visibMeters} ${metarRaw.wxString || 'NSC'} ${tempC}/${dewpC} Q${qnh} NOSIG`,
      station: 'OPKC',
      stationName: 'Jinnah International Airport, Karachi',
      observationTimeUtc: obsDate.toISOString(),
      observationTimePkt: pktDate.toTimeString().substring(0, 8) + ' PKT',
      flightCategory,
      flightCategoryDescription: catDescMap[flightCategory],
      temperatureC: tempC,
      dewPointC: dewpC,
      relativeHumidityPct: relHumidity,
      wind: {
        directionDeg: windDir,
        speedKnots: windSpeed,
        gustKnots: gustSpeed,
        description: `${windDir}° at ${windSpeed} knots${gustSpeed ? ` (gusting to ${gustSpeed} knots)` : ''}`,
      },
      runwayAnalysis,
      visibility: {
        meters: visibMeters,
        statuteMiles: Number(visibMiles.toFixed(1)),
        description: `${visibMeters} meters (${visibMiles.toFixed(1)} statute miles)`,
      },
      weatherPhenomena: decodeWeatherString(metarRaw.wxString),
      clouds: (metarRaw.clouds || []).map((c: any) => ({
        coverage: c.cover || 'NSC',
        altitudeFt: c.base ? c.base * 100 : undefined,
        description: c.base ? `${c.cover} at ${c.base * 100} ft AGL` : c.cover === 'NSC' ? 'Nil Significant Cloud' : c.cover,
      })),
      altimeter: {
        qnhHpa: qnh,
        inHg: Number((qnh * 0.02953).toFixed(2)),
      },
      trend: metarRaw.rawOb?.includes('NOSIG') ? 'NOSIG (No significant change expected next 2 hours)' : 'Normal',
      delayRisk,
    };

    // Decode TAF Periods
    const tafPeriods: TafPeriod[] = (tafRaw.fcsts || []).map((fcst: any, idx: number) => {
      const fromD = new Date(fcst.timeFrom * 1000);
      const toD = new Date(fcst.timeTo * 1000);
      const fromPkt = new Date(fromD.getTime() + 5 * 60 * 60 * 1000).toTimeString().substring(0, 5) + ' PKT';
      const toPkt = new Date(toD.getTime() + 5 * 60 * 60 * 1000).toTimeString().substring(0, 5) + ' PKT';

      const fWdir = Number(fcst.wdir ?? 240);
      const fWspd = Number(fcst.wspd ?? 8);
      const fWgst = fcst.wgst ? Number(fcst.wgst) : undefined;
      const fVisMiles = Number(fcst.visib ?? 4);
      const fVisMeters = Math.round(fVisMiles * 1609.34);

      let pRisk: DelayRiskLevel = 'LOW';
      let pNote = 'Standard operations expected';
      if (fVisMeters < 2000 || fcst.wxString?.includes('FG')) {
        pRisk = 'HIGH';
        pNote = 'Dense morning fog/mist window; potential holding stacks';
      } else if (fVisMeters < 4000 || fWspd > 18 || fcst.wxString?.includes('HZ')) {
        pRisk = 'MODERATE';
        pNote = 'Haze or brisk winds; minor runway departure intervals';
      }

      return {
        fromTimeUtc: fromD.toISOString(),
        toTimeUtc: toD.toISOString(),
        fromTimePkt: fromPkt,
        toTimePkt: toPkt,
        type: (fcst.fcstChange as any) || (idx === 0 ? 'BASE' : 'BECMG'),
        changeType: fcst.fcstChange,
        wind: {
          directionDeg: fWdir,
          speedKnots: fWspd,
          gustKnots: fWgst,
          description: `${fWdir}° at ${fWspd} kt${fWgst ? ` (G${fWgst}kt)` : ''}`,
        },
        visibilityMeters: fVisMeters,
        visibilityMiles: Number(fVisMiles.toFixed(1)),
        weatherString: fcst.wxString || 'Clear / Nil Significant',
        weatherMeaning: decodeWeatherString(fcst.wxString).map(w => w.meaning).join(', ') || 'No weather phenomena',
        clouds: (fcst.clouds || []).map((c: any) => c.cover + (c.base ? ` ${c.base * 100}ft` : '')).join(', ') || 'NSC',
        delayRiskLevel: pRisk,
        delayNote: pNote,
      };
    });

    const decodedTaf: DecodedTaf = {
      raw: tafRaw.rawTAF || 'TAF OPKC unavailable',
      station: 'OPKC',
      issueTimeUtc: new Date((tafRaw.issueTime ? new Date(tafRaw.issueTime).getTime() : now)).toISOString(),
      validFromUtc: new Date(tafRaw.validTimeFrom * 1000).toISOString(),
      validToUtc: new Date(tafRaw.validTimeTo * 1000).toISOString(),
      periods: tafPeriods,
      summary: `24-Hour forecast for Karachi: Wind predominantly from 240°-270° (Arabian Sea breeze), with morning haze/mist periods (visibility ${tafPeriods.some(p => p.delayRiskLevel === 'HIGH') ? 'reducing to ~1500m' : '3000-5000m'}).`,
    };

    const response: OpkcWeatherResponse = {
      station: 'OPKC',
      stationName: 'Jinnah International Airport, Karachi',
      timestamp: new Date().toISOString(),
      metar: decodedMetar,
      taf: decodedTaf,
      source: 'NOAA Aviation Weather Center (AWC) Live Feed',
    };

    // Cache for 5 minutes
    weatherCache = {
      data: response,
      expiresAt: now + 5 * 60 * 1000,
    };

    return response;
  } catch (err: any) {
    console.warn('Live METAR/TAF fetch error, using synthetic fallback:', err.message);

    // Robust realistic fallback for OPKC Karachi
    const now = Date.now();
    const obsDate = new Date(now);
    const pktDate = new Date(obsDate.getTime() + 5 * 60 * 60 * 1000);

    const fallback: OpkcWeatherResponse = {
      station: 'OPKC',
      stationName: 'Jinnah International Airport, Karachi',
      timestamp: new Date().toISOString(),
      metar: {
        raw: `METAR OPKC ${obsDate.getUTCDate()}${String(obsDate.getUTCHours()).padStart(2, '0')}00Z 24011KT 6000 HZ NSC 28/21 Q1013 NOSIG`,
        station: 'OPKC',
        stationName: 'Jinnah International Airport, Karachi',
        observationTimeUtc: obsDate.toISOString(),
        observationTimePkt: pktDate.toTimeString().substring(0, 8) + ' PKT',
        flightCategory: 'VFR',
        flightCategoryDescription: 'Visual Flight Rules (Optimal conditions, ceiling > 3000ft, vis > 5 SM)',
        temperatureC: 28,
        dewPointC: 21,
        relativeHumidityPct: 65,
        wind: {
          directionDeg: 240,
          speedKnots: 11,
          description: '240° at 11 knots (Southwesterly Arabian sea breeze)',
        },
        runwayAnalysis: calculateRunways(240, 11),
        visibility: {
          meters: 6000,
          statuteMiles: 3.7,
          description: '6,000 meters (Moderate haze)',
        },
        weatherPhenomena: [{ code: 'HZ', meaning: 'Haze (Coastal marine particulate)' }],
        clouds: [{ coverage: 'NSC', description: 'Nil Significant Cloud' }],
        altimeter: { qnhHpa: 1013, inHg: 29.91 },
        trend: 'NOSIG (No significant change expected next 2 hours)',
        delayRisk: {
          level: 'LOW',
          summary: 'Nominal coastal weather conditions. Runway 25L/25R operating with direct headwind.',
          factors: ['Direct headwind along Runway 25 (approx 11 kt)', 'Visibility 6,000m exceeds minimums'],
          potentialDelays: ['No weather-induced flight delays anticipated at Karachi.'],
        },
      },
      taf: {
        raw: 'TAF OPKC 092300Z 1000/1106 24010KT 6000 HZ NSC TEMPO 1001/1005 00000KT 2500 BR/HZ NSC BECMG 1006/1008 25014KT 5000 HZ',
        station: 'OPKC',
        issueTimeUtc: new Date(now - 30 * 60 * 1000).toISOString(),
        validFromUtc: new Date(now).toISOString(),
        validToUtc: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        periods: [
          {
            fromTimeUtc: new Date(now).toISOString(),
            toTimeUtc: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
            fromTimePkt: 'Current',
            toTimePkt: '+6h',
            type: 'BASE',
            wind: { directionDeg: 240, speedKnots: 10, description: '240° at 10 kt' },
            visibilityMeters: 6000,
            visibilityMiles: 3.7,
            weatherString: 'HZ',
            weatherMeaning: 'Haze',
            clouds: 'NSC',
            delayRiskLevel: 'LOW',
            delayNote: 'Optimal visual runway conditions',
          },
          {
            fromTimeUtc: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
            toTimeUtc: new Date(now + 10 * 60 * 60 * 1000).toISOString(),
            fromTimePkt: '+6h',
            toTimePkt: '+10h',
            type: 'TEMPO',
            changeType: 'TEMPO',
            wind: { directionDeg: 0, speedKnots: 2, description: 'Variable calm' },
            visibilityMeters: 2500,
            visibilityMiles: 1.5,
            weatherString: 'BR HZ',
            weatherMeaning: 'Mist and Haze',
            clouds: 'NSC',
            delayRiskLevel: 'MODERATE',
            delayNote: 'Morning mist may trigger minor arrival sequencing intervals',
          },
          {
            fromTimeUtc: new Date(now + 10 * 60 * 60 * 1000).toISOString(),
            toTimeUtc: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
            fromTimePkt: '+10h',
            toTimePkt: '+24h',
            type: 'BECMG',
            changeType: 'BECMG',
            wind: { directionDeg: 250, speedKnots: 14, description: '250° at 14 kt' },
            visibilityMeters: 5000,
            visibilityMiles: 3.1,
            weatherString: 'HZ',
            weatherMeaning: 'Afternoon coastal sea breeze',
            clouds: 'NSC',
            delayRiskLevel: 'LOW',
            delayNote: 'Good headwind on Runway 25L/25R',
          },
        ],
        summary: '24-Hour outlook: Coastal sea breeze predominant, with temporary morning mist window.',
      },
      source: 'OPKC Aerodrome Meteorological Station (Simulated)',
    };

    return fallback;
  }
}
