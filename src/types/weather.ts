export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export type DelayRiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface DecodedMetar {
  raw: string;
  station: string;
  stationName: string;
  observationTimeUtc: string;
  observationTimePkt: string;
  flightCategory: FlightCategory;
  flightCategoryDescription: string;
  temperatureC: number;
  dewPointC: number;
  relativeHumidityPct: number;
  wind: {
    directionDeg: number;
    speedKnots: number;
    gustKnots?: number;
    variableDir?: string;
    description: string;
  };
  runwayAnalysis: {
    runwayName: string;
    headingDeg: number;
    headwindKnots: number;
    crosswindKnots: number;
    crosswindDirection: 'left' | 'right' | 'none';
    isOptimal: boolean;
  }[];
  visibility: {
    meters: number;
    statuteMiles: number;
    description: string;
    qualifier?: string;
  };
  weatherPhenomena: Array<{
    code: string;
    meaning: string;
    severity?: 'light' | 'moderate' | 'heavy';
  }>;
  clouds: Array<{
    coverage: string;
    altitudeFt?: number;
    type?: string;
    description: string;
  }>;
  altimeter: {
    qnhHpa: number;
    inHg: number;
  };
  trend: string;
  delayRisk: {
    level: DelayRiskLevel;
    summary: string;
    factors: string[];
    potentialDelays: string[];
  };
}

export interface TafPeriod {
  fromTimeUtc: string;
  toTimeUtc: string;
  fromTimePkt: string;
  toTimePkt: string;
  type: 'BASE' | 'BECMG' | 'TEMPO' | 'PROB';
  changeType?: string;
  wind: {
    directionDeg: number;
    speedKnots: number;
    gustKnots?: number;
    description: string;
  };
  visibilityMeters: number;
  visibilityMiles: number;
  weatherString: string;
  weatherMeaning: string;
  clouds: string;
  delayRiskLevel: DelayRiskLevel;
  delayNote?: string;
}

export interface DecodedTaf {
  raw: string;
  station: string;
  issueTimeUtc: string;
  validFromUtc: string;
  validToUtc: string;
  periods: TafPeriod[];
  summary: string;
}

export interface OpkcWeatherResponse {
  station: 'OPKC';
  stationName: 'Jinnah International Airport, Karachi';
  timestamp: string;
  metar: DecodedMetar;
  taf: DecodedTaf;
  source: string;
}
