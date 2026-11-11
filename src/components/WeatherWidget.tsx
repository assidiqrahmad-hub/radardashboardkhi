import React, { useState } from 'react';
import {
  CloudSun,
  Wind,
  Eye,
  Thermometer,
  Gauge,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { OpkcWeatherResponse, FlightCategory, DelayRiskLevel } from '../types/weather';

interface WeatherWidgetProps {
  weather: OpkcWeatherResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, isLoading, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'decoded' | 'raw'>('decoded');
  const [showTafDetails, setShowTafDetails] = useState<boolean>(true);
  const [selectedRawToken, setSelectedRawToken] = useState<string | null>(null);

  if (!weather) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-white">Loading Karachi Airport METAR / TAF...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to civil aviation meteorological station at OPKC.</p>
      </div>
    );
  }

  const { metar, taf } = weather;
  const isHighRisk = metar.delayRisk.level === 'HIGH';
  const isModRisk = metar.delayRisk.level === 'MODERATE';

  // Flight category color badges
  const catColorMap: Record<FlightCategory, { bg: string; text: string; border: string }> = {
    VFR: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    MVFR: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    IFR: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    LIFR: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  };

  const currentCatStyle = catColorMap[metar.flightCategory] || catColorMap.VFR;

  // Raw METAR breakdown tokens
  const rawMetarTokens = metar.raw.split(' ').map((token, idx) => {
    let explanation = 'Aviation weather token';
    if (token === 'METAR') explanation = 'Meteorological Aerodrome Report';
    else if (token === 'OPKC') explanation = 'ICAO location indicator for Karachi Jinnah International Airport';
    else if (token.endsWith('Z')) explanation = `Observation day and UTC time: ${token.substring(0, 2)}th at ${token.substring(2, 6)} UTC`;
    else if (token.endsWith('KT')) explanation = `Surface wind: ${token.substring(0, 3)}° direction at ${token.substring(3, 5)} knots`;
    else if (/^\d{4}$/.test(token)) explanation = `Horizontal surface visibility: ${token} meters`;
    else if (token === 'FU') explanation = 'Weather phenomenon: Smoke (Industrial or biomass haze)';
    else if (token === 'HZ') explanation = 'Weather phenomenon: Haze';
    else if (token === 'FG') explanation = 'Weather phenomenon: Fog (Visibility below 1,000m)';
    else if (token === 'BR') explanation = 'Weather phenomenon: Mist (High moisture shallow haze)';
    else if (token === 'NSC') explanation = 'Nil Significant Cloud below 5,000 ft';
    else if (token.includes('/')) explanation = `Temperature / Dewpoint: ${token.split('/')[0]}°C ambient / ${token.split('/')[1]}°C dewpoint`;
    else if (token.startsWith('Q')) explanation = `Altimeter pressure setting (QNH): ${token.substring(1)} hPa`;
    else if (token === 'NOSIG') explanation = 'Trend forecast: No Significant Change expected within 2 hours';

    return { token, explanation };
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-xl space-y-6">
      
      {/* Top Header & Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Karachi Airport METAR & TAF Weather Telemetry
            </h2>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              OPKC / KHI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time surface observation and 24-hour terminal aerodrome forecast for weather delay prediction
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Decoded vs Raw Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('decoded')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'decoded' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Decoded View
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'raw' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw Aviation Telemetry
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh METAR and TAF data"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Flight Weather Delay Impact Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isHighRisk
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : isModRisk
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isHighRisk ? 'bg-rose-500/20 text-rose-400' : isModRisk ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isHighRisk ? <ShieldAlert className="w-5 h-5" /> : isModRisk ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                Weather Delay Risk: {metar.delayRisk.level}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${currentCatStyle.bg} ${currentCatStyle.text} ${currentCatStyle.border}`}
              >
                {metar.flightCategory} Rules
              </span>
            </div>
            <p className="text-xs mt-1 text-slate-200 leading-relaxed">
              {metar.delayRisk.summary}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-300">
              {metar.delayRisk.factors.map((factor, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  <span>{factor}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Potential Delay Window */}
        <div className="md:border-l md:border-slate-800/80 md:pl-4 shrink-0 text-xs text-slate-300 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase font-sans font-semibold">Expected Impact</span>
          <p className="mt-0.5 font-medium text-white">
            {metar.delayRisk.potentialDelays[0] || 'Nominal departure and arrival sequence'}
          </p>
        </div>
      </div>

      {/* METAR Content (Decoded or Raw) */}
      {viewMode === 'decoded' ? (
        <div className="space-y-4">
          
          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            
            {/* Wind */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-medium text-[11px]">Surface Wind</span>
                <Wind className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono">
                <span className="text-xl font-bold text-white tabular-nums">{metar.wind.speedKnots}</span>
                <span className="text-xs text-slate-400">knots</span>
                {metar.wind.gustKnots && (
                  <span className="text-xs font-semibold text-amber-400">(Gusts {metar.wind.gustKnots}kt)</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                <span>Bearing: {metar.wind.directionDeg}°</span>
              </p>
            </div>

            {/* Visibility */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-medium text-[11px]">Horizontal Visibility</span>
                <Eye className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono">
                <span className="text-xl font-bold text-white tabular-nums">
                  {metar.visibility.meters.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">meters</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                {metar.weatherPhenomena.length > 0
                  ? metar.weatherPhenomena.map(w => w.meaning).join(', ')
                  : 'Clear visual conditions'}
              </p>
            </div>

            {/* Temperature & Humidity */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-medium text-[11px]">Temp & Dew Point</span>
                <Thermometer className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono">
                <span className="text-xl font-bold text-white tabular-nums">{metar.temperatureC}°C</span>
                <span className="text-xs text-slate-400">/ {metar.dewPointC}°C</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Relative Humidity: <strong className="text-white font-mono">{metar.relativeHumidityPct}%</strong>
              </p>
            </div>

            {/* Altimeter QNH */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-medium text-[11px]">Altimeter (QNH)</span>
                <Gauge className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono">
                <span className="text-xl font-bold text-white tabular-nums">{metar.altimeter.qnhHpa}</span>
                <span className="text-xs text-slate-400">hPa</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 font-mono">
                {metar.altimeter.inHg} inHg · Standard pressure
              </p>
            </div>
          </div>

          {/* Runway Wind & Crosswind Analysis */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Karachi Active Runway Wind Allocation</h4>
                <p className="text-[11px] text-slate-400">Crosswind and headwind calculations for OPKC dual parallel runways</p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Surface Wind: {metar.wind.directionDeg}° @ {metar.wind.speedKnots}kt
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {metar.runwayAnalysis.map(r => (
                <div
                  key={r.runwayName}
                  className={`p-3 rounded-lg border transition-colors ${
                    r.isOptimal
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-xs'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-xs">{r.runwayName}</span>
                    {r.isOptimal && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                        Primary Active (Headwind)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Headwind / Tailwind</span>
                      <span className={`font-semibold ${r.headwindKnots >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {r.headwindKnots >= 0 ? `+${r.headwindKnots} kt Headwind` : `${Math.abs(r.headwindKnots)} kt Tailwind`}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">Crosswind Component</span>
                      <span className="text-slate-200 font-semibold">
                        {r.crosswindKnots} kt {r.crosswindDirection !== 'none' ? `from ${r.crosswindDirection}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Raw Aviation Telemetry Mode with Interactive Inspector */
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Raw Observation (Click any token to decode):</span>
            <span className="text-[10px] font-mono text-slate-400">Observed {metar.observationTimePkt}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300">
            {rawMetarTokens.map((item, idx) => {
              const isSelected = selectedRawToken === item.token;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedRawToken(item.token)}
                  className={`px-2 py-1 rounded transition-colors ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold ring-1 ring-amber-300'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  {item.token}
                </button>
              );
            })}
          </div>

          {selectedRawToken && (
            <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 text-xs text-slate-200 animate-in fade-in">
              <span className="font-mono font-bold text-amber-400 mr-2">{selectedRawToken}:</span>
              <span>{rawMetarTokens.find(t => t.token === selectedRawToken)?.explanation}</span>
            </div>
          )}
        </div>
      )}

      {/* Terminal Aerodrome Forecast (TAF) 24-Hour Horizon */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white">24-Hour Terminal Aerodrome Forecast (TAF)</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{taf.summary}</p>
          </div>

          <button
            onClick={() => setShowTafDetails(!showTafDetails)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium"
          >
            <span>{showTafDetails ? 'Collapse TAF' : 'Expand TAF'}</span>
            {showTafDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showTafDetails && (
          <div className="space-y-2 mt-3">
            {taf.periods.map((period, idx) => {
              const pRiskColor =
                period.delayRiskLevel === 'HIGH'
                  ? 'border-rose-500/40 bg-rose-500/5 text-rose-300'
                  : period.delayRiskLevel === 'MODERATE'
                  ? 'border-amber-500/40 bg-amber-500/5 text-amber-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${pRiskColor}`}
                >
                  <div className="flex items-center gap-2.5 shrink-0 font-mono">
                    <span className="font-bold text-slate-200 px-1.5 py-0.5 bg-slate-800 rounded text-[11px]">
                      {period.type}
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      {period.fromTimePkt} → {period.toTimePkt}
                    </span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">Wind</span>
                      <span className="text-slate-100">{period.wind.description}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">Visibility</span>
                      <span className="text-slate-100">{period.visibilityMeters.toLocaleString()}m ({period.weatherMeaning})</span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-400 text-[10px] block font-sans">Clouds</span>
                      <span className="text-slate-100">{period.clouds}</span>
                    </div>
                  </div>

                  {period.delayNote && (
                    <div className="text-[11px] font-sans text-slate-400 md:text-right shrink-0">
                      <span className="block font-medium text-slate-200">
                        {period.delayRiskLevel === 'HIGH' ? '⚠️ High Delay Risk' : period.delayRiskLevel === 'MODERATE' ? '⚡ Moderate Delay Risk' : '✓ Standard Flow'}
                      </span>
                      <span>{period.delayNote}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Observation Freshness Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
        <div>
          Source: <strong className="text-slate-300">{weather.source}</strong> · Karachi Aerodrome Station (OPKC)
        </div>
        <div>
          Last observed: <span className="font-mono text-slate-300">{metar.observationTimePkt}</span> ({metar.observationTimeUtc.substring(11, 16)} UTC)
        </div>
      </div>
    </div>
  );
};
