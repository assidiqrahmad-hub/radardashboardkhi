export type FlightType = 'departure' | 'arrival';
export type FlightCategory = 'domestic' | 'international';

export type FlightStatus =
  | 'Scheduled'
  | 'Check-in Open'
  | 'Boarding'
  | 'Final Call'
  | 'Gate Closed'
  | 'Taxiing'
  | 'Departed'
  | 'En Route'
  | 'Approaching'
  | 'Landed'
  | 'Baggage Delivery'
  | 'Arrived'
  | 'Delayed'
  | 'Cancelled';

export interface AirportLocation {
  code: string;
  name: string;
  city: string;
  country: string;
  terminal?: string;
  gate?: string;
}

export interface AircraftInfo {
  model: string;
  registration: string;
  ageYears?: number;
  speedKnots?: number;
  maxAltitudeFt?: number;
}

export interface FlightTelemetry {
  lat: number;
  lng: number;
  altitudeFt: number;
  altitudeGeomFt?: number;
  groundSpeedKnots: number;
  heading: number;
  verticalRateFpm?: number;
  squawk?: string;
  hex?: string;
  emergency?: string;
  rssi?: number;
  messages?: number;
  progressPct: number;
  distanceRemainingNm: number;
  waypoints?: Array<{ lat: number; lng: number; name: string }>;
}

export interface FlightEvent {
  timestamp: string;
  type: 'status' | 'gate' | 'delay' | 'push';
  message: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: {
    name: string;
    code: string;
    iata: string;
    icao: string;
    logoColor: string;
    country: string;
  };
  type: FlightType;
  category: FlightCategory;
  origin: AirportLocation;
  destination: AirportLocation;
  scheduledTime: string; // ISO
  estimatedTime: string; // ISO
  actualTime: string | null; // ISO
  status: FlightStatus;
  delayMinutes: number;
  delayReason: string | null;
  terminal: string;
  concourse: string;
  gate: string;
  previousGate?: string;
  checkInCounters: string;
  baggageBelt: string;
  aircraft: AircraftInfo;
  telemetry: FlightTelemetry;
  history: FlightEvent[];
  updatedAt: string;
  isLiveRadar?: boolean;
  liveDataSource?: string;
  isMilitary?: boolean;
  squawkCode?: string;
  isOverflight?: boolean;
}

export interface NotificationAlert {
  id: string;
  flightId: string;
  flightNumber: string;
  airline: string;
  type: 'gate_change' | 'delay_update' | 'boarding_call' | 'touchdown' | 'status_change';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  route: string;
  gate?: string;
  delayMinutes?: number;
}

export interface AirportStats {
  airportCode: string;
  icao: string;
  name: string;
  localTime: string;
  utcTime: string;
  weather: {
    tempC: number;
    condition: string;
    wind: string;
    visibilityM: number;
    qnhHpa: number;
    runwaysActive: string[];
  };
  activeDeparturesCount: number;
  activeArrivalsCount: number;
  onTimeRate: number;
  averageGateDelayMins: number;
  activeGatesCount: number;
  liveRadarCount?: number;
  feedStatus?: string;
  lastFeedSync?: string;
}

export interface FlightFilterState {
  type: 'all' | 'departure' | 'arrival';
  category: 'all' | 'domestic' | 'international';
  status: 'all' | 'delayed' | 'boarding' | 'active' | 'landed';
  searchQuery: string;
  gate?: string;
  airline?: string;
  watchlistOnly: boolean;
  window?: '3h' | '6h' | 'all';
}
