import fs from 'fs';
import path from 'path';
import type { Flight, NotificationAlert, AirportStats, FlightTelemetry } from '../types/flight.ts';

// Karachi Jinnah International Airport coordinates
export const KARACHI_COORDS = { lat: 24.9065, lng: 67.1608 };

// Destination & Origin Coordinate Dictionary for accurate Radar vectors
export const AIRPORT_COORDS: Record<string, { lat: number; lng: number; city: string; country: string; name: string }> = {
  // Domestic
  ISB: { lat: 33.5651, lng: 72.8519, city: 'Islamabad', country: 'Pakistan', name: 'Islamabad International Airport' },
  LHE: { lat: 31.5216, lng: 74.4036, city: 'Lahore', country: 'Pakistan', name: 'Allama Iqbal International Airport' },
  PEW: { lat: 33.9939, lng: 71.5147, city: 'Peshawar', country: 'Pakistan', name: 'Bacha Khan International Airport' },
  UET: { lat: 30.2514, lng: 66.9378, city: 'Quetta', country: 'Pakistan', name: 'Quetta International Airport' },
  MUX: { lat: 30.2032, lng: 71.4190, city: 'Multan', country: 'Pakistan', name: 'Multan International Airport' },
  LYP: { lat: 31.3653, lng: 72.9950, city: 'Faisalabad', country: 'Pakistan', name: 'Faisalabad International Airport' },
  SKZ: { lat: 27.7219, lng: 68.7917, city: 'Sukkur', country: 'Pakistan', name: 'Sukkur Begum Nusrat Bhutto Airport' },
  GWD: { lat: 25.2331, lng: 62.3297, city: 'Gwadar', country: 'Pakistan', name: 'Gwadar International Airport' },
  KDU: { lat: 35.3358, lng: 75.5361, city: 'Skardu', country: 'Pakistan', name: 'Skardu Airport' },
  TUK: { lat: 25.9866, lng: 63.0308, city: 'Turbat', country: 'Pakistan', name: 'Turbat International Airport' },
  SKT: { lat: 32.5356, lng: 74.3639, city: 'Sialkot', country: 'Pakistan', name: 'Sialkot International Airport' },

  // International
  DXB: { lat: 25.2532, lng: 55.3657, city: 'Dubai', country: 'United Arab Emirates', name: 'Dubai International Airport' },
  DWC: { lat: 24.8960, lng: 55.1614, city: 'Dubai Al Maktoum', country: 'United Arab Emirates', name: 'Al Maktoum International Airport' },
  SHJ: { lat: 25.3286, lng: 55.5172, city: 'Sharjah', country: 'United Arab Emirates', name: 'Sharjah International Airport' },
  AUH: { lat: 24.4330, lng: 54.6511, city: 'Abu Dhabi', country: 'United Arab Emirates', name: 'Zayed International Airport' },
  DOH: { lat: 25.2731, lng: 51.6081, city: 'Doha', country: 'Qatar', name: 'Hamad International Airport' },
  JED: { lat: 21.6796, lng: 39.1565, city: 'Jeddah', country: 'Saudi Arabia', name: 'King Abdulaziz International Airport' },
  RUH: { lat: 24.9576, lng: 46.6988, city: 'Riyadh', country: 'Saudi Arabia', name: 'King Khalid International Airport' },
  MED: { lat: 24.5534, lng: 39.7051, city: 'Medina', country: 'Saudi Arabia', name: 'Prince Mohammad Bin Abdulaziz Airport' },
  DMM: { lat: 26.4712, lng: 49.7978, city: 'Dammam', country: 'Saudi Arabia', name: 'King Fahd International Airport' },
  MCT: { lat: 23.5933, lng: 58.2844, city: 'Muscat', country: 'Oman', name: 'Muscat International Airport' },
  SLL: { lat: 17.0387, lng: 54.0913, city: 'Salalah', country: 'Oman', name: 'Salalah International Airport' },
  BAH: { lat: 26.2708, lng: 50.6336, city: 'Manama', country: 'Bahrain', name: 'Bahrain International Airport' },
  KWI: { lat: 29.2269, lng: 47.9789, city: 'Kuwait City', country: 'Kuwait', name: 'Kuwait International Airport' },
  IST: { lat: 41.2753, lng: 28.7519, city: 'Istanbul', country: 'Turkey', name: 'Istanbul Airport' },
  SAW: { lat: 40.8986, lng: 29.3092, city: 'Istanbul Sabiha', country: 'Turkey', name: 'Sabiha Gokcen International Airport' },
  ADD: { lat: 8.9779, lng: 38.7993, city: 'Addis Ababa', country: 'Ethiopia', name: 'Bole International Airport' },
  CAI: { lat: 30.1219, lng: 31.4056, city: 'Cairo', country: 'Egypt', name: 'Cairo International Airport' },
  BGW: { lat: 33.2625, lng: 44.2344, city: 'Baghdad', country: 'Iraq', name: 'Baghdad International Airport' },
  NJF: { lat: 31.9898, lng: 44.4043, city: 'Najaf', country: 'Iraq', name: 'Al Najaf International Airport' },
  IKA: { lat: 35.4161, lng: 51.1522, city: 'Tehran', country: 'Iran', name: 'Imam Khomeini International Airport' },
  MHD: { lat: 36.2352, lng: 59.6410, city: 'Mashhad', country: 'Iran', name: 'Mashhad International Airport' },
  KBL: { lat: 34.5659, lng: 69.2123, city: 'Kabul', country: 'Afghanistan', name: 'Kabul International Airport' },
  MFM: { lat: 22.1495, lng: 113.5915, city: 'Macau', country: 'Macau SAR', name: 'Macau International Airport' },
  CAN: { lat: 23.3924, lng: 113.2988, city: 'Guangzhou', country: 'China', name: 'Guangzhou Baiyun International Airport' },
  PEK: { lat: 40.0799, lng: 116.6031, city: 'Beijing', country: 'China', name: 'Beijing Capital International Airport' },
  PKX: { lat: 39.5098, lng: 116.4105, city: 'Beijing Daxing', country: 'China', name: 'Beijing Daxing International Airport' },
  URC: { lat: 43.9071, lng: 87.4742, city: 'Urumqi', country: 'China', name: 'Urumqi Diwopu International Airport' },
  HKG: { lat: 22.3080, lng: 113.9185, city: 'Hong Kong', country: 'Hong Kong SAR', name: 'Hong Kong International Airport' },
  LHR: { lat: 51.4700, lng: -0.4543, city: 'London', country: 'United Kingdom', name: 'London Heathrow Airport' },
  MAN: { lat: 53.3537, lng: -2.2750, city: 'Manchester', country: 'United Kingdom', name: 'Manchester Airport' },
  YYZ: { lat: 43.6777, lng: -79.6248, city: 'Toronto', country: 'Canada', name: 'Toronto Pearson International Airport' },
  BKK: { lat: 13.6900, lng: 100.7501, city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi Airport' },
  CMB: { lat: 7.1808, lng: 79.8841, city: 'Colombo', country: 'Sri Lanka', name: 'Bandaranaike International Airport' },
  DAC: { lat: 23.8433, lng: 90.3978, city: 'Dhaka', country: 'Bangladesh', name: 'Hazrat Shahjalal International Airport' },
  CGP: { lat: 22.2496, lng: 91.8133, city: 'Chittagong', country: 'Bangladesh', name: 'Shah Amanat International Airport' },
  KUL: { lat: 2.7456, lng: 101.7099, city: 'Kuala Lumpur', country: 'Malaysia', name: 'Kuala Lumpur International Airport' },
  DEL: { lat: 28.5562, lng: 77.1000, city: 'Delhi', country: 'India', name: 'Indira Gandhi International Airport' },
  BOM: { lat: 19.0896, lng: 72.8656, city: 'Mumbai', country: 'India', name: 'Chhatrapati Shivaji Maharaj International Airport' },
  KHI: { lat: 24.9065, lng: 67.1608, city: 'Karachi', country: 'Pakistan', name: 'Jinnah International Airport' },
};

// Airline Directory - Real Operating Airlines for Karachi Airport
export const AIRLINES_MAP: Record<string, { name: string; code: string; iata: string; icao: string; logoColor: string; country: string }> = {
  PIA: { name: 'Pakistan International Airlines', code: 'PIA', iata: 'PK', icao: 'PIA', logoColor: '#005f38', country: 'Pakistan' },
  PK: { name: 'Pakistan International Airlines', code: 'PIA', iata: 'PK', icao: 'PIA', logoColor: '#005f38', country: 'Pakistan' },
  SIF: { name: 'AirSial', code: 'SIF', iata: 'PF', icao: 'SIF', logoColor: '#0a369d', country: 'Pakistan' },
  PF: { name: 'AirSial', code: 'SIF', iata: 'PF', icao: 'SIF', logoColor: '#0a369d', country: 'Pakistan' },
  ABQ: { name: 'Airblue', code: 'ABQ', iata: 'PA', icao: 'ABQ', logoColor: '#004b87', country: 'Pakistan' },
  PA: { name: 'Airblue', code: 'ABQ', iata: 'PA', icao: 'ABQ', logoColor: '#004b87', country: 'Pakistan' },
  FLI: { name: 'Fly Jinnah', code: 'FLI', iata: '9P', icao: 'FLI', logoColor: '#d91d24', country: 'Pakistan' },
  '9P': { name: 'Fly Jinnah', code: 'FLI', iata: '9P', icao: 'FLI', logoColor: '#d91d24', country: 'Pakistan' },
  UAE: { name: 'Emirates', code: 'UAE', iata: 'EK', icao: 'UAE', logoColor: '#d71921', country: 'United Arab Emirates' },
  EK: { name: 'Emirates', code: 'UAE', iata: 'EK', icao: 'UAE', logoColor: '#d71921', country: 'United Arab Emirates' },
  FDB: { name: 'flydubai', code: 'FDB', iata: 'FZ', icao: 'FDB', logoColor: '#0084c9', country: 'United Arab Emirates' },
  FZ: { name: 'flydubai', code: 'FDB', iata: 'FZ', icao: 'FDB', logoColor: '#0084c9', country: 'United Arab Emirates' },
  ABY: { name: 'Air Arabia', code: 'ABY', iata: 'G9', icao: 'ABY', logoColor: '#e21a22', country: 'United Arab Emirates' },
  G9: { name: 'Air Arabia', code: 'ABY', iata: 'G9', icao: 'ABY', logoColor: '#e21a22', country: 'United Arab Emirates' },
  QTR: { name: 'Qatar Airways', code: 'QTR', iata: 'QR', icao: 'QTR', logoColor: '#5c0632', country: 'Qatar' },
  QR: { name: 'Qatar Airways', code: 'QTR', iata: 'QR', icao: 'QTR', logoColor: '#5c0632', country: 'Qatar' },
  SVA: { name: 'Saudia', code: 'SVA', iata: 'SV', icao: 'SVA', logoColor: '#16572e', country: 'Saudi Arabia' },
  SV: { name: 'Saudia', code: 'SVA', iata: 'SV', icao: 'SVA', logoColor: '#16572e', country: 'Saudi Arabia' },
  ETH: { name: 'Ethiopian Airlines', code: 'ETH', iata: 'ET', icao: 'ETH', logoColor: '#006a4e', country: 'Ethiopia' },
  ET: { name: 'Ethiopian Airlines', code: 'ETH', iata: 'ET', icao: 'ETH', logoColor: '#006a4e', country: 'Ethiopia' },
  GFA: { name: 'Gulf Air', code: 'GFA', iata: 'GF', icao: 'GFA', logoColor: '#977a38', country: 'Bahrain' },
  GF: { name: 'Gulf Air', code: 'GFA', iata: 'GF', icao: 'GFA', logoColor: '#977a38', country: 'Bahrain' },
  OMA: { name: 'Oman Air', code: 'OMA', iata: 'WY', icao: 'OMA', logoColor: '#a62b2b', country: 'Oman' },
  WY: { name: 'Oman Air', code: 'OMA', iata: 'WY', icao: 'OMA', logoColor: '#a62b2b', country: 'Oman' },
  JZR: { name: 'Jazeera Airways', code: 'JZR', iata: 'J9', icao: 'JZR', logoColor: '#009fe3', country: 'Kuwait' },
  J9: { name: 'Jazeera Airways', code: 'JZR', iata: 'J9', icao: 'JZR', logoColor: '#009fe3', country: 'Kuwait' },
  KAC: { name: 'Kuwait Airways', code: 'KAC', iata: 'KU', icao: 'KAC', logoColor: '#004d80', country: 'Kuwait' },
  KU: { name: 'Kuwait Airways', code: 'KAC', iata: 'KU', icao: 'KAC', logoColor: '#004d80', country: 'Kuwait' },
  BBC: { name: 'Biman Bangladesh Airlines', code: 'BBC', iata: 'BG', icao: 'BBC', logoColor: '#006a4e', country: 'Bangladesh' },
  BG: { name: 'Biman Bangladesh Airlines', code: 'BBC', iata: 'BG', icao: 'BBC', logoColor: '#006a4e', country: 'Bangladesh' },
  THA: { name: 'Thai Airways', code: 'THA', iata: 'TG', icao: 'THA', logoColor: '#4f2d7f', country: 'Thailand' },
  TG: { name: 'Thai Airways', code: 'THA', iata: 'TG', icao: 'THA', logoColor: '#4f2d7f', country: 'Thailand' },
  BTK: { name: 'Batik Air Malaysia', code: 'BTK', iata: 'OD', icao: 'BTK', logoColor: '#b81237', country: 'Malaysia' },
  OD: { name: 'Batik Air Malaysia', code: 'BTK', iata: 'OD', icao: 'BTK', logoColor: '#b81237', country: 'Malaysia' },
  PVV: { name: 'Fly Pro Cargo', code: 'PVV', iata: 'FP', icao: 'PVV', logoColor: '#0284c7', country: 'Moldova' },
  FP: { name: 'Fly Pro Cargo', code: 'PVV', iata: 'FP', icao: 'PVV', logoColor: '#0284c7', country: 'Moldova' },
  THY: { name: 'Turkish Airlines', code: 'THY', iata: 'TK', icao: 'THY', logoColor: '#c70000', country: 'Turkey' },
  TK: { name: 'Turkish Airlines', code: 'THY', iata: 'TK', icao: 'THY', logoColor: '#c70000', country: 'Turkey' },
  OMS: { name: 'SalamAir', code: 'OMS', iata: 'OV', icao: 'OMS', logoColor: '#00a850', country: 'Oman' },
  OV: { name: 'SalamAir', code: 'OMS', iata: 'OV', icao: 'OMS', logoColor: '#00a850', country: 'Oman' },
  ETD: { name: 'Etihad Airways', code: 'ETD', iata: 'EY', icao: 'ETD', logoColor: '#bd8b13', country: 'United Arab Emirates' },
  EY: { name: 'Etihad Airways', code: 'ETD', iata: 'EY', icao: 'ETD', logoColor: '#bd8b13', country: 'United Arab Emirates' },
  KNE: { name: 'flynas', code: 'KNE', iata: 'XY', icao: 'KNE', logoColor: '#00b5a3', country: 'Saudi Arabia' },
  XY: { name: 'flynas', code: 'KNE', iata: 'XY', icao: 'KNE', logoColor: '#00b5a3', country: 'Saudi Arabia' },
  FAD: { name: 'flyadeal', code: 'FAD', iata: 'F3', icao: 'FAD', logoColor: '#6d28d9', country: 'Saudi Arabia' },
  F3: { name: 'flyadeal', code: 'FAD', iata: 'F3', icao: 'FAD', logoColor: '#6d28d9', country: 'Saudi Arabia' },
  ALK: { name: 'SriLankan Airlines', code: 'ALK', iata: 'UL', icao: 'ALK', logoColor: '#003c71', country: 'Sri Lanka' },
  UL: { name: 'SriLankan Airlines', code: 'ALK', iata: 'UL', icao: 'ALK', logoColor: '#003c71', country: 'Sri Lanka' },
  CCA: { name: 'Air China', code: 'CCA', iata: 'CA', icao: 'CCA', logoColor: '#c8102e', country: 'China' },
  CA: { name: 'Air China', code: 'CCA', iata: 'CA', icao: 'CCA', logoColor: '#c8102e', country: 'China' },
  CSN: { name: 'China Southern Airlines', code: 'CSN', iata: 'CZ', icao: 'CSN', logoColor: '#008fd5', country: 'China' },
  CZ: { name: 'China Southern Airlines', code: 'CSN', iata: 'CZ', icao: 'CSN', logoColor: '#008fd5', country: 'China' },
  IRA: { name: 'Iran Air', code: 'IRA', iata: 'IR', icao: 'IRA', logoColor: '#0033a0', country: 'Iran' },
  IR: { name: 'Iran Air', code: 'IRA', iata: 'IR', icao: 'IRA', logoColor: '#0033a0', country: 'Iran' },
  IRM: { name: 'Mahan Air', code: 'IRM', iata: 'W5', icao: 'IRM', logoColor: '#1d4ed8', country: 'Iran' },
  W5: { name: 'Mahan Air', code: 'IRM', iata: 'W5', icao: 'IRM', logoColor: '#1d4ed8', country: 'Iran' },
  IAW: { name: 'Iraqi Airways', code: 'IAW', iata: 'IA', icao: 'IAW', logoColor: '#0f4c3a', country: 'Iraq' },
  IA: { name: 'Iraqi Airways', code: 'IAW', iata: 'IA', icao: 'IAW', logoColor: '#0f4c3a', country: 'Iraq' },
  KMF: { name: 'Kam Air', code: 'KMF', iata: 'RQ', icao: 'KMF', logoColor: '#ea580c', country: 'Afghanistan' },
  RQ: { name: 'Kam Air', code: 'KMF', iata: 'RQ', icao: 'KMF', logoColor: '#ea580c', country: 'Afghanistan' },
  AFG: { name: 'Ariana Afghan Airlines', code: 'AFG', iata: 'FG', icao: 'AFG', logoColor: '#0284c7', country: 'Afghanistan' },
  FG: { name: 'Ariana Afghan Airlines', code: 'AFG', iata: 'FG', icao: 'AFG', logoColor: '#0284c7', country: 'Afghanistan' },
  MSR: { name: 'EgyptAir', code: 'MSR', iata: 'MS', icao: 'MSR', logoColor: '#1e3a8a', country: 'Egypt' },
  MS: { name: 'EgyptAir', code: 'MSR', iata: 'MS', icao: 'MSR', logoColor: '#1e3a8a', country: 'Egypt' },
  BSC: { name: 'Classic Air Cargo', code: 'BSC', iata: 'KW', icao: 'BSC', logoColor: '#374151', country: 'International Cargo' },
};

export const DELAY_REASONS = [
  'Air Traffic Control (ATC) flow slot hold in Arabian Gulf airspace',
  'Inbound aircraft late turnaround from previous rotation',
  'Dense fog and reduced runway visibility at northern destination airport',
  'Technical avionics clearance and routine engineering inspection',
  'Passenger boarding bridge operational reassignment',
  'Cargo and baggage pallet container weight re-balance',
  'Ramp ground handling & fueling congestion at peak arrival bank',
  'Severe headwinds along Arabian Sea flight corridor',
  'Secondary security gate clearance & baggage screening re-check'
];

interface ScheduleTemplate {
  flightNumber: string;
  airlineCode: string;
  type: 'departure' | 'arrival';
  category: 'domestic' | 'international';
  otherAirport: string;
  hourPkt: number;
  minutePkt: number;
  durationMinutes: number;
  terminal: string;
  concourse: string;
  gate: string;
  checkInCounters: string;
  baggageBelt: string;
  aircraftModel: string;
  aircraftReg: string;
}

// Actual operational daily schedule template for Karachi Airport (OPKC / KHI)
// Serene Air (ER) is completely removed. Timings reflect realistic Karachi banks.
const REAL_SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  // --- MORNING DEPARTURES BANK ---
  {
    flightNumber: 'PA-200',
    airlineCode: 'PA',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'ISB',
    hourPkt: 7,
    minutePkt: 0,
    durationMinutes: 110,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 14',
    checkInCounters: 'Row B (B1-B6)',
    baggageBelt: 'Carousel 1',
    aircraftModel: 'Airbus A321-200',
    aircraftReg: 'AP-BNE'
  },
  {
    flightNumber: 'SV-701',
    airlineCode: 'SV',
    type: 'departure',
    category: 'international',
    otherAirport: 'RUH',
    hourPkt: 8,
    minutePkt: 0,
    durationMinutes: 240,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 22',
    checkInCounters: 'Row D (D1-D6)',
    baggageBelt: 'Carousel 4',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'HZ-AK18'
  },
  {
    flightNumber: 'PK-302',
    airlineCode: 'PK',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'LHE',
    hourPkt: 8,
    minutePkt: 15,
    durationMinutes: 105,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 16',
    checkInCounters: 'Row A (A1-A6)',
    baggageBelt: 'Carousel 1',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BLA'
  },
  {
    flightNumber: 'PF-121',
    airlineCode: 'PF',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'ISB',
    hourPkt: 8,
    minutePkt: 45,
    durationMinutes: 115,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 17',
    checkInCounters: 'Row C (C1-C5)',
    baggageBelt: 'Carousel 2',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BOC'
  },
  {
    flightNumber: '9P-670',
    airlineCode: '9P',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'ISB',
    hourPkt: 9,
    minutePkt: 0,
    durationMinutes: 115,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 15',
    checkInCounters: 'Row C (C6-C10)',
    baggageBelt: 'Carousel 2',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BOP'
  },
  // EK 601: Real morning Emirates flight (09:20 PKT -> arrives Dubai 11:45 PKT / 10:45 UAE)
  {
    flightNumber: 'EK-601',
    airlineCode: 'EK',
    type: 'departure',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 9,
    minutePkt: 20,
    durationMinutes: 135,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 24',
    checkInCounters: 'Row D (D7-D14)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'A6-EQO'
  },
  {
    flightNumber: 'QR-611',
    airlineCode: 'QR',
    type: 'departure',
    category: 'international',
    otherAirport: 'DOH',
    hourPkt: 9,
    minutePkt: 45,
    durationMinutes: 150,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 26',
    checkInCounters: 'Row E (E1-E6)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 787-8',
    aircraftReg: 'A7-BCK'
  },

  // --- MIDDAY / AFTERNOON BANK ---
  {
    flightNumber: 'FZ-335',
    airlineCode: 'FZ',
    type: 'arrival',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 11,
    minutePkt: 30,
    durationMinutes: 120,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 25',
    checkInCounters: 'Row E (E7-E12)',
    baggageBelt: 'Carousel 4',
    aircraftModel: 'Boeing 737 MAX 8',
    aircraftReg: 'A6-FQC'
  },
  {
    flightNumber: 'FZ-336',
    airlineCode: 'FZ',
    type: 'departure',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 12,
    minutePkt: 45,
    durationMinutes: 130,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 25',
    checkInCounters: 'Row E (E7-E12)',
    baggageBelt: 'Carousel 4',
    aircraftModel: 'Boeing 737 MAX 8',
    aircraftReg: 'A6-FQC'
  },
  {
    flightNumber: 'G9-546',
    airlineCode: 'G9',
    type: 'arrival',
    category: 'international',
    otherAirport: 'SHJ',
    hourPkt: 10,
    minutePkt: 45,
    durationMinutes: 120,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 23',
    checkInCounters: 'Row D (D15-D20)',
    baggageBelt: 'Carousel 4',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'A6-AQM'
  },
  {
    flightNumber: 'G9-547',
    airlineCode: 'G9',
    type: 'departure',
    category: 'international',
    otherAirport: 'SHJ',
    hourPkt: 12,
    minutePkt: 15,
    durationMinutes: 125,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 23',
    checkInCounters: 'Row D (D15-D20)',
    baggageBelt: 'Carousel 4',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'A6-AQM'
  },
  {
    flightNumber: 'ET-694',
    airlineCode: 'ET',
    type: 'arrival',
    category: 'international',
    otherAirport: 'ADD',
    hourPkt: 11,
    minutePkt: 15,
    durationMinutes: 270,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 27',
    checkInCounters: 'Row F (F1-F6)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 737 MAX 8',
    aircraftReg: 'ET-AZO'
  },
  {
    flightNumber: 'ET-695',
    airlineCode: 'ET',
    type: 'departure',
    category: 'international',
    otherAirport: 'ADD',
    hourPkt: 12,
    minutePkt: 45,
    durationMinutes: 280,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 27',
    checkInCounters: 'Row F (F1-F6)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 737 MAX 8',
    aircraftReg: 'ET-AZO'
  },
  {
    flightNumber: 'PF-141',
    airlineCode: 'PF',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'LHE',
    hourPkt: 13,
    minutePkt: 0,
    durationMinutes: 105,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 17',
    checkInCounters: 'Row C (C1-C5)',
    baggageBelt: 'Carousel 2',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BOS'
  },
  {
    flightNumber: 'PK-536',
    airlineCode: 'PK',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'SKZ',
    hourPkt: 13,
    minutePkt: 15,
    durationMinutes: 65,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 12',
    checkInCounters: 'Row A (A1-A6)',
    baggageBelt: 'Carousel 1',
    aircraftModel: 'ATR 42-500',
    aircraftReg: 'AP-BHH'
  },
  {
    flightNumber: 'PF-124',
    airlineCode: 'PF',
    type: 'arrival',
    category: 'domestic',
    otherAirport: 'ISB',
    hourPkt: 14,
    minutePkt: 15,
    durationMinutes: 110,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 16',
    checkInCounters: 'Row C (C1-C5)',
    baggageBelt: 'Carousel 2',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BOC'
  },
  {
    flightNumber: 'PK-369',
    airlineCode: 'PK',
    type: 'arrival',
    category: 'domestic',
    otherAirport: 'ISB',
    hourPkt: 14,
    minutePkt: 45,
    durationMinutes: 110,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 18',
    checkInCounters: 'Row A (A7-A12)',
    baggageBelt: 'Carousel 1',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BLS'
  },
  {
    flightNumber: 'PK-305',
    airlineCode: 'PK',
    type: 'arrival',
    category: 'domestic',
    otherAirport: 'LHE',
    hourPkt: 16,
    minutePkt: 30,
    durationMinutes: 105,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 19',
    checkInCounters: 'Row A (A1-A6)',
    baggageBelt: 'Carousel 1',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BMX'
  },
  {
    flightNumber: 'PA-406',
    airlineCode: 'PA',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'LHE',
    hourPkt: 15,
    minutePkt: 30,
    durationMinutes: 105,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 14',
    checkInCounters: 'Row B (B1-B6)',
    baggageBelt: 'Carousel 2',
    aircraftModel: 'Airbus A321-200',
    aircraftReg: 'AP-BMP'
  },
  {
    flightNumber: 'PF-146',
    airlineCode: 'PF',
    type: 'arrival',
    category: 'domestic',
    otherAirport: 'LHE',
    hourPkt: 15,
    minutePkt: 45,
    durationMinutes: 105,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 17',
    checkInCounters: 'Row C (C1-C5)',
    baggageBelt: 'Carousel 2',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BPJ'
  },
  {
    flightNumber: 'KW-4002',
    airlineCode: 'BSC',
    type: 'arrival',
    category: 'international',
    otherAirport: 'MFM',
    hourPkt: 17,
    minutePkt: 45,
    durationMinutes: 380,
    terminal: 'Jinnah Cargo Complex',
    concourse: 'Cargo Apron',
    gate: 'Stand C4',
    checkInCounters: 'Cargo Terminal',
    baggageBelt: 'Cargo Bay 1',
    aircraftModel: 'Boeing 747-200F',
    aircraftReg: 'EX-47004'
  },

  // --- EVENING / NIGHT INTERNATIONAL & DOMESTIC BANK ---
  {
    flightNumber: 'PK-832',
    airlineCode: 'PK',
    type: 'arrival',
    category: 'international',
    otherAirport: 'JED',
    hourPkt: 17,
    minutePkt: 30,
    durationMinutes: 260,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 28',
    checkInCounters: 'Row A (A1-A12)',
    baggageBelt: 'Carousel 3',
    aircraftModel: 'Boeing 777-200ER',
    aircraftReg: 'AP-BHX'
  },
  {
    flightNumber: 'EK-602',
    airlineCode: 'EK',
    type: 'arrival',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 14,
    minutePkt: 15,
    durationMinutes: 125,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 24',
    checkInCounters: 'Row D (D7-D14)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'A6-EQL'
  },
  {
    flightNumber: 'EK-603',
    airlineCode: 'EK',
    type: 'departure',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 15,
    minutePkt: 45,
    durationMinutes: 135,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 24',
    checkInCounters: 'Row D (D7-D14)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'A6-EQL'
  },
  {
    flightNumber: 'EK-608',
    airlineCode: 'EK',
    type: 'arrival',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 19,
    minutePkt: 15,
    durationMinutes: 125,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 24',
    checkInCounters: 'Row D (D7-D14)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'A6-EQP'
  },
  {
    flightNumber: 'EK-609',
    airlineCode: 'EK',
    type: 'departure',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 20,
    minutePkt: 45,
    durationMinutes: 135,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 24',
    checkInCounters: 'Row D (D7-D14)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'A6-EQP'
  },
  {
    flightNumber: 'SV-704',
    airlineCode: 'SV',
    type: 'arrival',
    category: 'international',
    otherAirport: 'JED',
    hourPkt: 18,
    minutePkt: 30,
    durationMinutes: 250,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 22',
    checkInCounters: 'Row D (D1-D6)',
    baggageBelt: 'Carousel 4',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'HZ-AK35'
  },
  {
    flightNumber: 'SV-705',
    airlineCode: 'SV',
    type: 'departure',
    category: 'international',
    otherAirport: 'JED',
    hourPkt: 20,
    minutePkt: 15,
    durationMinutes: 260,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 22',
    checkInCounters: 'Row D (D1-D6)',
    baggageBelt: 'Carousel 4',
    aircraftModel: 'Boeing 777-300ER',
    aircraftReg: 'HZ-AK35'
  },
  {
    flightNumber: 'QR-604',
    airlineCode: 'QR',
    type: 'arrival',
    category: 'international',
    otherAirport: 'DOH',
    hourPkt: 21,
    minutePkt: 0,
    durationMinutes: 140,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 26',
    checkInCounters: 'Row E (E1-E6)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 787-9',
    aircraftReg: 'A7-BHC'
  },
  {
    flightNumber: 'QR-605',
    airlineCode: 'QR',
    type: 'departure',
    category: 'international',
    otherAirport: 'DOH',
    hourPkt: 22,
    minutePkt: 30,
    durationMinutes: 150,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 26',
    checkInCounters: 'Row E (E1-E6)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Boeing 787-9',
    aircraftReg: 'A7-BHC'
  },
  {
    flightNumber: 'PK-306',
    airlineCode: 'PK',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'LHE',
    hourPkt: 19,
    minutePkt: 0,
    durationMinutes: 105,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 16',
    checkInCounters: 'Row A (A1-A6)',
    baggageBelt: 'Carousel 1',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BLA'
  },
  {
    flightNumber: 'PF-143',
    airlineCode: 'PF',
    type: 'departure',
    category: 'domestic',
    otherAirport: 'LHE',
    hourPkt: 19,
    minutePkt: 30,
    durationMinutes: 105,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse West (Domestic)',
    gate: 'Gate 17',
    checkInCounters: 'Row C (C1-C5)',
    baggageBelt: 'Carousel 2',
    aircraftModel: 'Airbus A320-200',
    aircraftReg: 'AP-BOC'
  },
  {
    flightNumber: 'PA-110',
    airlineCode: 'PA',
    type: 'departure',
    category: 'international',
    otherAirport: 'DXB',
    hourPkt: 18,
    minutePkt: 30,
    durationMinutes: 130,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 21',
    checkInCounters: 'Row B (B7-B12)',
    baggageBelt: 'Carousel 3',
    aircraftModel: 'Airbus A321-200',
    aircraftReg: 'AP-BNV'
  },
  {
    flightNumber: 'GF-752',
    airlineCode: 'GF',
    type: 'arrival',
    category: 'international',
    otherAirport: 'BAH',
    hourPkt: 14,
    minutePkt: 0,
    durationMinutes: 150,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 20',
    checkInCounters: 'Row F (F7-F12)',
    baggageBelt: 'Carousel 3',
    aircraftModel: 'Airbus A321neo',
    aircraftReg: 'A9C-TD'
  },
  {
    flightNumber: 'J9-511',
    airlineCode: 'J9',
    type: 'arrival',
    category: 'international',
    otherAirport: 'KWI',
    hourPkt: 16,
    minutePkt: 30,
    durationMinutes: 180,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 27',
    checkInCounters: 'Row F (F13-F18)',
    baggageBelt: 'Carousel 3',
    aircraftModel: 'Airbus A320neo',
    aircraftReg: '9K-CBM'
  },
  {
    flightNumber: 'TK-708',
    airlineCode: 'TK',
    type: 'arrival',
    category: 'international',
    otherAirport: 'IST',
    hourPkt: 4,
    minutePkt: 30,
    durationMinutes: 340,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 24',
    checkInCounters: 'Row E (E19-E24)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Airbus A330-300',
    aircraftReg: 'TC-JOG'
  },
  {
    flightNumber: 'TK-709',
    airlineCode: 'TK',
    type: 'departure',
    category: 'international',
    otherAirport: 'IST',
    hourPkt: 6,
    minutePkt: 0,
    durationMinutes: 360,
    terminal: 'Jinnah Terminal 1',
    concourse: 'Concourse East (International)',
    gate: 'Gate 24',
    checkInCounters: 'Row E (E19-E24)',
    baggageBelt: 'Carousel 5',
    aircraftModel: 'Airbus A330-300',
    aircraftReg: 'TC-JOG'
  }
];

export class KarachiFlightEngine {
  private flights: Map<string, Flight> = new Map();
  private notificationHistory: NotificationAlert[] = [];
  private liveRadarSyncTimer: NodeJS.Timeout | null = null;
  private lastLiveFetchTime: number = 0;
  private liveAircraftCount: number = 0;
  private feedStatusText: string = 'Connecting to Global Air Traffic Feed...';
  private oagApiKey: string = process.env.OAG_SUBSCRIPTION_KEY || '';
  private lastOagSyncTime: number = 0;
  private oagCallsUsed: number = 0;
  private rapidApiKey: string = process.env.RAPIDAPI_KEY || '3f7292b161msh5ef5328ac60a420p1d0277jsnfdeddd740a25';
  private rapidApiHost: string = process.env.RAPIDAPI_HOST || 'flightradar243.p.rapidapi.com';
  private lastRapidApiSyncTime: number = 0;
  private rapidApiStatusText: string = 'RapidAPI Flightradar24 Configured';
  private rapidApiStatusCode: number = 0;

  // adsb.fi Open Data integration (ADS-B Exchange v2 format)
  private adsbfiBaseUrl: string = 'https://opendata.adsb.fi/api';
  private lastAdsbfiSyncTime: number = 0;
  private adsbfiAircraftCount: number = 0;
  private adsbfiStatusText: string = 'adsb.fi Open Data Active (v3 250NM radius)';
  private oagCacheDir: string = path.resolve(process.cwd(), '.cache');
  private oagCacheFile: string = path.resolve(process.cwd(), '.cache', 'oag-khi-schedule.json');

  constructor() {
    const loadedFromCache = this.loadOagCacheForToday();
    if (!this.oagApiKey && !loadedFromCache) {
      // Only use static fallback templates if OAG API key is not configured
      this.rebuildScheduleFromRealTime();
    }
    this.startLiveRadarFeedPolling();
    this.syncAdsbFiAirTraffic();
    if (this.oagApiKey && !loadedFromCache) {
      this.syncOagFlightSchedule();
    }
    if (this.rapidApiKey) {
      this.syncRapidApiFlightradar();
    }
  }

  private getTodayPktDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  }

  /**
   * Matches an ADS-B callsign / flight number / tail registration against flights in memory
   * Handles IATA vs ICAO carrier codes (e.g. PK-302 === PIA302, EK-601 === UAE601, FZ-336 === FDB336)
   */
  private findMatchingFlight(callsign?: string, fno?: string, reg?: string): Flight | undefined {
    const cleanCall = (callsign || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanFno = (fno || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanReg = (reg || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanFno && this.flights.has(cleanFno)) return this.flights.get(cleanFno);
    if (cleanCall && this.flights.has(cleanCall)) return this.flights.get(cleanCall);

    const extractCarrierAndDigits = (s: string) => {
      const m = s.match(/^([a-z0-9]{2,3}?)(\d+[a-z]?)$/i);
      return m ? { carrier: m[1].toLowerCase(), num: m[2].replace(/^0+/, '') } : null;
    };

    const targetParts = extractCarrierAndDigits(cleanCall || cleanFno);

    return Array.from(this.flights.values()).find(f => {
      const fClean = f.flightNumber.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if ((cleanCall && fClean === cleanCall) || (cleanFno && fClean === cleanFno)) return true;
      if (cleanReg && f.aircraft.registration && f.aircraft.registration.replace(/[^a-z0-9]/gi, '').toLowerCase() === cleanReg) {
        return true;
      }
      if (targetParts) {
        const fParts = extractCarrierAndDigits(fClean);
        if (fParts && fParts.num === targetParts.num) {
          const iata = (f.airline.iata || '').toLowerCase();
          const icao = (f.airline.icao || '').toLowerCase();
          if (targetParts.carrier === iata || targetParts.carrier === icao) {
            return true;
          }
        }
      }
      return false;
    });
  }

  public setRapidApiKey(key: string, host?: string): void {
    this.rapidApiKey = key.trim();
    if (host) this.rapidApiHost = host.trim();
  }

  public getRapidApiStatus(): {
    configured: boolean;
    keyMask: string | null;
    host: string;
    lastSync: string | null;
    statusCode: number;
    statusText: string;
  } {
    return {
      configured: Boolean(this.rapidApiKey && this.rapidApiKey.length > 5),
      keyMask: this.rapidApiKey ? `••••••••${this.rapidApiKey.slice(-5)}` : null,
      host: this.rapidApiHost,
      lastSync: this.lastRapidApiSyncTime ? new Date(this.lastRapidApiSyncTime).toISOString() : null,
      statusCode: this.rapidApiStatusCode,
      statusText: this.rapidApiStatusText
    };
  }

  /**
   * Syncs real-time arrivals from RapidAPI Flightradar24 API (flightradar243.p.rapidapi.com)
   * Handles upstream 500 status gracefully with live transponder radar fallback
   */
  public async syncRapidApiFlightradar(): Promise<{ success: boolean; message: string; statusCode: number }> {
    if (!this.rapidApiKey) {
      return { success: false, message: 'RapidAPI key not configured', statusCode: 400 };
    }

    try {
      this.lastRapidApiSyncTime = Date.now();
      const res = await fetch(`https://${this.rapidApiHost}/v1/airports/arrivals?code=KHI&limit=100&page=1`, {
        headers: {
          'x-rapidapi-key': this.rapidApiKey,
          'x-rapidapi-host': this.rapidApiHost,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      this.rapidApiStatusCode = res.status;

      if (res.ok) {
        const data = await res.json();
        const arrivals = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        let imported = 0;
        for (const item of arrivals) {
          const fn = item.flight?.identification?.number?.default || item.number || item.flightNumber;
          if (!fn) continue;
          const cleanKey = fn.toLowerCase().replace(/[^a-z0-9]/g, '');
          const existing = this.flights.get(cleanKey);
          if (existing) {
            existing.liveDataSource = 'RapidAPI Flightradar24 + ADS-B Radar';
            this.flights.set(cleanKey, existing);
            imported++;
          }
        }
        this.rapidApiStatusText = `🟢 Connected (${imported} arrivals verified via RapidAPI flightradar243)`;
        return { success: true, message: this.rapidApiStatusText, statusCode: 200 };
      } else {
        // RapidAPI provider server error (e.g. 500 Server Error)
        this.rapidApiStatusText = `RapidAPI returned HTTP ${res.status} (Upstream provider temporary error). Automatic Live ADS-B Feeder & OAG fallback active.`;
        return { success: false, message: this.rapidApiStatusText, statusCode: res.status };
      }
    } catch (err: any) {
      this.rapidApiStatusCode = 500;
      this.rapidApiStatusText = `RapidAPI request timeout/error: ${err.message}. Feeder network active.`;
      return { success: false, message: this.rapidApiStatusText, statusCode: 500 };
    }
  }

  /**
   * Returns current health, telemetry count, and supported endpoints of the adsb.fi Open Data API
   */
  public getAdsbFiStatus() {
    return {
      configured: true,
      provider: 'adsb.fi Open Data Network',
      baseUrl: this.adsbfiBaseUrl,
      lastSync: this.lastAdsbfiSyncTime ? new Date(this.lastAdsbfiSyncTime).toISOString() : null,
      aircraftCount: this.adsbfiAircraftCount,
      statusText: this.adsbfiStatusText,
      endpoints: [
        { endpoint: '/v3/lat/24.9065/lon/67.1608/dist/250', desc: 'Radius aircraft search up to 250 NM around Karachi Jinnah International (v3)' },
        { endpoint: '/v2/callsign/{callsign}', desc: 'Real-time aircraft search matching flight call sign (e.g. PIA302, UAE601)' },
        { endpoint: '/v2/registration/{reg}', desc: 'Real-time aircraft search matching tail registration (e.g. AP-BMG, A6-EEO)' },
        { endpoint: '/v2/hex/{hex}', desc: 'Real-time transponder Mode-S 24-bit hex code query (e.g. 461E1A)' },
        { endpoint: '/v2/sqk/{squawk}', desc: 'Aircraft transponder squawk filter (e.g. 7700 general emergency)' },
        { endpoint: '/v2/mil', desc: 'All globally tracked aircraft flagged as military' }
      ]
    };
  }

  /**
   * Syncs real-time flights within 250 NM radius of Karachi from adsb.fi Open Data API
   * Implements full ADS-B Exchange v2 format parsing with rich telemetry extraction:
   * (hex, alt_baro, alt_geom, gs, track, baro_rate, squawk, emergency, lat, lon, messages, rssi)
   */
  public async syncAdsbFiAirTraffic(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      this.lastAdsbfiSyncTime = Date.now();
      const url = `${this.adsbfiBaseUrl}/v3/lat/${KARACHI_COORDS.lat}/lon/${KARACHI_COORDS.lng}/dist/250`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KarachiAirportFlightRadar/1.0'
        },
        signal: AbortSignal.timeout(6500)
      });

      if (!res.ok) {
        throw new Error(`adsb.fi returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const aircraftList: any[] = Array.isArray(data?.ac) ? data.ac : [];
      let imported = 0;

      for (const ac of aircraftList) {
        const hex = (ac.hex || '').trim().toLowerCase();
        const callsign = (ac.flight || '').trim().toUpperCase();
        const reg = (ac.r || '').trim().toUpperCase();
        const model = (ac.t || ac.desc || 'Commercial Aircraft').trim();
        const lat = typeof ac.lat === 'number' ? ac.lat : null;
        const lon = typeof ac.lon === 'number' ? ac.lon : null;

        if (!lat || !lon) continue;

        // Calculate distance from Karachi aerodrome
        const dLat = (lat - KARACHI_COORDS.lat) * 60;
        const dLng = (lon - KARACHI_COORDS.lng) * 60 * Math.cos(KARACHI_COORDS.lat * Math.PI / 180);
        const distNm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

        // Skip ground equipment, maintenance sweepers, tugs, security vehicles
        const flightNumUpper = (callsign || reg || hex).toUpperCase();
        const isGroundVehicle =
          /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(flightNumUpper) ||
          reg === 'N644PK';
        if (isGroundVehicle) continue;

        const altBaro = ac.alt_baro === 'ground' ? 0 : typeof ac.alt_baro === 'number' ? ac.alt_baro : 0;
        const altGeom = typeof ac.alt_geom === 'number' ? ac.alt_geom : undefined;
        const speed = typeof ac.gs === 'number' ? Math.round(ac.gs) : 0;
        const track = typeof ac.track === 'number' ? Math.round(ac.track) : 0;
        const verticalRate = typeof ac.baro_rate === 'number' ? Math.round(ac.baro_rate) : undefined;
        const squawk = ac.squawk ? String(ac.squawk).trim() : undefined;
        const emergency = ac.emergency && ac.emergency !== 'none' ? String(ac.emergency) : undefined;

        // Emergency squawk detection (7700 = general, 7600 = radio failure, 7500 = hijack)
        if (squawk === '7700' || squawk === '7600' || squawk === '7500' || emergency) {
          this.triggerSquawkAlert(callsign || reg || hex, squawk, emergency, lat, lon);
        }

        const isGround = ac.alt_baro === 'ground' || altBaro <= 50;
        let liveStatus: Flight['status'] = 'En Route';
        if (isGround) {
          liveStatus = distNm <= 5 ? 'Landed' : 'Taxiing';
        } else if (distNm <= 25 && altBaro < 5000) {
          liveStatus = 'Approaching';
        } else if (distNm <= 60 && altBaro < 10000 && verticalRate && verticalRate < -300) {
          liveStatus = 'Approaching';
        } else if (distNm <= 40 && verticalRate && verticalRate > 500) {
          liveStatus = 'Departed';
        }

        // Enrich route via adsbdb open-source database
        const adsbRoute = await this.lookupAdsbDbRoute(callsign || reg || hex);
        const flightKey = (callsign || reg || hex).toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check if existing flight matches (handling IATA <-> ICAO codes & registration)
        const existing = this.findMatchingFlight(callsign, callsign, reg);

        const nowIso = new Date().toISOString();

        if (existing) {
          existing.telemetry = {
            ...existing.telemetry,
            lat: Number(lat.toFixed(4)),
            lng: Number(lon.toFixed(4)),
            altitudeFt: altBaro,
            altitudeGeomFt: altGeom,
            groundSpeedKnots: speed,
            heading: track,
            verticalRateFpm: verticalRate,
            squawk: squawk || existing.telemetry.squawk,
            hex: hex || existing.telemetry.hex,
            emergency: emergency || existing.telemetry.emergency,
            rssi: typeof ac.rssi === 'number' ? ac.rssi : undefined,
            messages: typeof ac.messages === 'number' ? ac.messages : undefined,
            distanceRemainingNm: distNm
          };
          if (reg) existing.aircraft.registration = reg;
          if (model && (!existing.aircraft.model || existing.aircraft.model === 'Commercial Jet')) {
            existing.aircraft.model = model;
          }
          existing.status = liveStatus;
          existing.isLiveRadar = true;
          existing.liveDataSource = 'adsb.fi Open Data + ADS-B DB';
          existing.squawkCode = squawk;
          existing.updatedAt = nowIso;
          this.flights.set(existing.id, existing);
          imported++;
        } else {
          // Dynamic aircraft discovered within 250 NM radius
          const airlineCode = (callsign.substring(0, 3) || callsign.substring(0, 2)).toUpperCase();
          const airlineInfo = AIRLINES_MAP[airlineCode] || AIRLINES_MAP[callsign.substring(0, 2)] || {
            name: callsign.length >= 3 ? callsign.substring(0, 3) : 'Commercial Aircraft',
            code: airlineCode,
            iata: airlineCode.substring(0, 2),
            icao: airlineCode,
            logoColor: '#2563eb',
            country: 'International'
          };

          const isToKarachi = distNm <= 120 && track > 100 && track < 300;
          const origCode = adsbRoute?.origin?.code || (isToKarachi ? 'AIRSPACE' : altBaro > 18000 ? 'AIRSPACE' : 'KHI');
          const destCode = adsbRoute?.destination?.code || (isToKarachi ? 'KHI' : 'AIRSPACE');
          const origCoord = AIRPORT_COORDS[origCode] || KARACHI_COORDS;
          const destCoord = AIRPORT_COORDS[destCode] || KARACHI_COORDS;

          const isOverflight =
            (origCode !== 'KHI' && origCode !== 'AIRSPACE' && destCode !== 'KHI' && destCode !== 'AIRSPACE') ||
            (origCode === 'AIRSPACE' && destCode === 'AIRSPACE') ||
            (altBaro > 18000 && origCode !== 'KHI' && destCode !== 'KHI');

          const newFlight: Flight = {
            id: flightKey,
            flightNumber: callsign || (reg ? `REG-${reg}` : `HEX-${hex.toUpperCase()}`),
            airline: adsbRoute?.airline || airlineInfo,
            type: destCode === 'KHI' || isToKarachi ? 'arrival' : 'departure',
            category: 'international',
            origin: adsbRoute?.origin || {
              code: origCode,
              name: origCoord.name,
              city: origCoord.city,
              country: origCoord.country
            },
            destination: adsbRoute?.destination || {
              code: destCode,
              name: destCoord.name,
              city: destCoord.city,
              country: destCoord.country
            },
            scheduledTime: nowIso,
            estimatedTime: nowIso,
            actualTime: null,
            status: liveStatus,
            delayMinutes: 0,
            delayReason: null,
            terminal: 'Jinnah Terminal 1',
            concourse: isOverflight ? 'Karachi FIR Transit' : 'Airspace Radar Feed',
            gate: 'Stand Radar',
            checkInCounters: 'adsb.fi Open Data',
            baggageBelt: 'Carousel Live',
            aircraft: {
              model: model || ac.desc || 'Commercial Jet',
              registration: reg || hex.toUpperCase(),
              speedKnots: speed,
              maxAltitudeFt: 43000
            },
            telemetry: {
              lat: Number(lat.toFixed(4)),
              lng: Number(lon.toFixed(4)),
              altitudeFt: altBaro,
              altitudeGeomFt: altGeom,
              groundSpeedKnots: speed,
              heading: track,
              verticalRateFpm: verticalRate,
              squawk,
              hex,
              emergency,
              rssi: typeof ac.rssi === 'number' ? ac.rssi : undefined,
              messages: typeof ac.messages === 'number' ? ac.messages : undefined,
              progressPct: 50,
              distanceRemainingNm: distNm
            },
            history: [
              {
                timestamp: nowIso,
                type: 'status',
                message: `Transponder ${hex.toUpperCase()} tracked by adsb.fi Open Data (Squawk ${squawk || '1200'}, Altitude ${altBaro}ft).`
              }
            ],
            updatedAt: nowIso,
            isLiveRadar: true,
            liveDataSource: 'adsb.fi Open Data + ADS-B DB',
            squawkCode: squawk,
            isOverflight
          };
          this.flights.set(flightKey, newFlight);
          imported++;
        }
      }

      this.adsbfiAircraftCount = imported || aircraftList.length;
      this.adsbfiStatusText = `🟢 Live: ${this.adsbfiAircraftCount} aircraft tracked via adsb.fi (250 NM radius)`;
      return { success: true, count: this.adsbfiAircraftCount, message: this.adsbfiStatusText };
    } catch (err: any) {
      this.adsbfiStatusText = `adsb.fi query notice: ${err.message}. Feeder network active.`;
      return { success: false, count: 0, message: this.adsbfiStatusText };
    }
  }

  /**
   * Queries adsb.fi matching a specific flight callsign (e.g. PIA302, UAE601)
   */
  public async queryAdsbFiCallsign(callsign: string): Promise<any> {
    try {
      const cs = callsign.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const res = await fetch(`${this.adsbfiBaseUrl}/v2/callsign/${cs}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'KarachiAirportFlightRadar/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // ignore
    }
    return { ac: [], msg: 'No match' };
  }

  /**
   * Queries adsb.fi matching a specific tail registration (e.g. AP-BMG, A6-EEO)
   */
  public async queryAdsbFiRegistration(reg: string): Promise<any> {
    try {
      const r = reg.trim().toUpperCase();
      const res = await fetch(`${this.adsbfiBaseUrl}/v2/registration/${encodeURIComponent(r)}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'KarachiAirportFlightRadar/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // ignore
    }
    return { ac: [], msg: 'No match' };
  }

  /**
   * Queries adsb.fi matching Mode-S 24-bit hex transponder codes (e.g. 461E1A)
   */
  public async queryAdsbFiHex(hex: string): Promise<any> {
    try {
      const h = hex.trim().toLowerCase().replace(/[^a-f0-9]/g, '');
      const res = await fetch(`${this.adsbfiBaseUrl}/v2/hex/${h}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'KarachiAirportFlightRadar/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // ignore
    }
    return { ac: [], msg: 'No match' };
  }

  /**
   * Queries adsb.fi matching a 4-digit squawk code (e.g. 7700 for general emergency)
   */
  public async queryAdsbFiSquawk(sqk: string): Promise<any> {
    try {
      const s = sqk.trim().replace(/[^0-9]/g, '');
      const res = await fetch(`${this.adsbfiBaseUrl}/v2/sqk/${s}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'KarachiAirportFlightRadar/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // ignore
    }
    return { ac: [], msg: 'No match' };
  }

  /**
   * Queries globally tracked military aircraft from adsb.fi (/v2/mil)
   */
  public async queryAdsbFiMilitary(): Promise<any> {
    try {
      const res = await fetch(`${this.adsbfiBaseUrl}/v2/mil`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'KarachiAirportFlightRadar/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // ignore
    }
    return { ac: [], msg: 'No military aircraft found' };
  }

  /**
   * Dispatches emergency notification alert if squawk 7700/7600/7500 or emergency state is detected
   */
  private triggerSquawkAlert(ident: string, squawk?: string, emergency?: string, lat?: number, lon?: number): void {
    const alertId = `sqk-${ident}-${Date.now()}`;
    const desc = squawk === '7700'
      ? 'GENERAL EMERGENCY (Squawk 7700)'
      : squawk === '7600'
      ? 'RADIO COMM LOSS (Squawk 7600)'
      : squawk === '7500'
      ? 'UNLAWFUL INTERFERENCE (Squawk 7500)'
      : `EMERGENCY ALERT (${emergency})`;

    const alert: NotificationAlert = {
      id: alertId,
      flightId: ident.toLowerCase().replace(/[^a-z0-9]/g, ''),
      flightNumber: ident,
      airline: 'ATC Priority Watch',
      type: 'status_change',
      severity: 'urgent',
      title: `🚨 ${desc} Broadcast`,
      message: `Aircraft ${ident} broadcasting ${desc} in Karachi FIR coordinates ${lat?.toFixed(2)}°N, ${lon?.toFixed(2)}°E. ATC radar alert engaged.`,
      timestamp: new Date().toISOString(),
      route: 'Karachi Airspace Corridor'
    };

    const hasRecent = this.notificationHistory.some((n: NotificationAlert) => n.title.includes(desc) && n.flightNumber === ident);
    if (!hasRecent) {
      this.notificationHistory.unshift(alert);
      if (this.notificationHistory.length > 50) this.notificationHistory.pop();
    }
  }

  public setOagApiKey(key: string): void {
    this.oagApiKey = key.trim();
  }

  public getOagStatus(): {
    configured: boolean;
    keyMask: string | null;
    callsUsed: number;
    maxFreeCalls: number;
    lastSync: string | null;
    cacheTtlMinutesRemaining: number;
  } {
    const elapsedMs = Date.now() - this.lastOagSyncTime;
    const ttlRemaining = this.lastOagSyncTime > 0 ? Math.max(0, Math.round((60 * 60 * 1000 - elapsedMs) / 60000)) : 0;
    return {
      configured: Boolean(this.oagApiKey && this.oagApiKey.length > 5),
      keyMask: this.oagApiKey ? `••••••••${this.oagApiKey.slice(-4)}` : null,
      callsUsed: this.oagCallsUsed,
      maxFreeCalls: 100,
      lastSync: this.lastOagSyncTime ? new Date(this.lastOagSyncTime).toISOString() : null,
      cacheTtlMinutesRemaining: ttlRemaining
    };
  }

  private adsbdbCache = new Map<string, any>();

  /**
   * Enriches live ADS-B flight callsigns with verified route origins, destinations, and airline names
   * from adsbdb (Jack Wills / api.adsbdb.com open-source aviation database)
   */
  public async lookupAdsbDbRoute(callsignOrFno: string): Promise<{
    origin?: { code: string; name: string; city: string; country: string };
    destination?: { code: string; name: string; city: string; country: string };
    airline?: { name: string; code: string; iata: string; icao: string; logoColor: string; country: string };
  } | null> {
    const cs = callsignOrFno.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cs || cs.length < 3) return null;
    if (this.adsbdbCache.has(cs)) return this.adsbdbCache.get(cs);

    try {
      const res = await fetch(`https://api.adsbdb.com/v0/callsign/${cs}`, {
        headers: {
          'User-Agent': 'KarachiAirportFlightRadar/1.0 (https://github.com/mrjackwills/adsbdb)'
        },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const d = await res.json();
        const route = d.response?.flightroute;
        if (route) {
          const originIata = route.origin?.iata_code || route.origin?.icao_code || '';
          const destIata = route.destination?.iata_code || route.destination?.icao_code || '';
          const airlineIata = route.airline?.iata || route.airline?.icao || cs.substring(0, 2);

          const result = {
            origin: route.origin ? {
              code: originIata,
              name: route.origin.name || 'Aerodrome',
              city: route.origin.municipality || route.origin.name || originIata,
              country: route.origin.country_name || route.origin.country_iso_name || 'Pakistan'
            } : undefined,
            destination: route.destination ? {
              code: destIata,
              name: route.destination.name || 'Aerodrome',
              city: route.destination.municipality || route.destination.name || destIata,
              country: route.destination.country_name || route.destination.country_iso_name || 'International'
            } : undefined,
            airline: route.airline ? {
              name: route.airline.name || 'Commercial Airline',
              code: airlineIata,
              iata: route.airline.iata || airlineIata,
              icao: route.airline.icao || cs.substring(0, 3),
              logoColor: AIRLINES_MAP[airlineIata]?.logoColor || AIRLINES_MAP[route.airline.icao]?.logoColor || '#2563eb',
              country: route.airline.country || 'International'
            } : undefined
          };
          this.adsbdbCache.set(cs, result);
          return result;
        }
      }
    } catch (e) {
      // ignore network errors
    }
    return null;
  }

  /**
   * Loads cached verified OAG schedule for today's PKT date from disk (0 API calls)
   */
  private loadOagCacheForToday(): boolean {
    try {
      if (!fs.existsSync(this.oagCacheFile)) return false;
      const raw = fs.readFileSync(this.oagCacheFile, 'utf8');
      const cached = JSON.parse(raw);
      const todayPkt = this.getTodayPktDate();
      if (cached && cached.datePkt === todayPkt && Array.isArray(cached.instances) && cached.instances.length > 0) {
        this.lastOagSyncTime = cached.fetchedAt || Date.now();
        this.oagCallsUsed = cached.callsUsed || this.oagCallsUsed;
        this.ingestOagInstances(cached.instances);
        const hasBoth = Boolean(cached.depComplete && cached.arrComplete);
        return hasBoth;
      }
    } catch (err) {
      // Ignore corrupt cache and allow fresh fetch
    }
    return false;
  }

  private readRawOagCache(): any | null {
    try {
      if (!fs.existsSync(this.oagCacheFile)) return null;
      return JSON.parse(fs.readFileSync(this.oagCacheFile, 'utf8'));
    } catch (err) {
      return null;
    }
  }

  private saveOagCache(
    datePkt: string,
    instances: Array<{ item: any; type: 'departure' | 'arrival' }>,
    depComplete = true,
    arrComplete = true
  ): void {
    try {
      if (!fs.existsSync(this.oagCacheDir)) {
        fs.mkdirSync(this.oagCacheDir, { recursive: true });
      }
      fs.writeFileSync(
        this.oagCacheFile,
        JSON.stringify({
          datePkt,
          fetchedAt: Date.now(),
          callsUsed: this.oagCallsUsed,
          depComplete,
          arrComplete,
          instances
        }),
        'utf8'
      );
    } catch (err) {
      // Ignore disk write failure on read-only FS
    }
  }

  /**
   * Computes current time-based FIDS operational status for a verified OAG flight
   */
  private computeOagFlightStatus(
    schedUtcIso: string,
    type: 'departure' | 'arrival',
    elapsedMinutes: number
  ): { status: Flight['status']; actualTime: string | null; progressPct: number } {
    const nowMs = Date.now();
    const schedMs = new Date(schedUtcIso).getTime();
    const diffMinutes = (schedMs - nowMs) / 60000;
    const duration = Math.max(45, elapsedMinutes || 120);

    if (type === 'departure') {
      if (diffMinutes < -45) {
        return { status: 'Departed', actualTime: schedUtcIso, progressPct: 100 };
      } else if (diffMinutes >= -45 && diffMinutes < -10) {
        return {
          status: 'En Route',
          actualTime: schedUtcIso,
          progressPct: Math.min(95, Math.max(15, Math.round((Math.abs(diffMinutes) / duration) * 100)))
        };
      } else if (diffMinutes >= -10 && diffMinutes <= 0) {
        return { status: 'Taxiing', actualTime: null, progressPct: 5 };
      } else if (diffMinutes > 0 && diffMinutes <= 25) {
        return { status: 'Final Call', actualTime: null, progressPct: 0 };
      } else if (diffMinutes > 25 && diffMinutes <= 55) {
        return { status: 'Boarding', actualTime: null, progressPct: 0 };
      } else if (diffMinutes > 55 && diffMinutes <= 120) {
        return { status: 'Check-in Open', actualTime: null, progressPct: 0 };
      }
      return { status: 'Scheduled', actualTime: null, progressPct: 0 };
    } else {
      if (diffMinutes < -35) {
        return { status: 'Arrived', actualTime: schedUtcIso, progressPct: 100 };
      } else if (diffMinutes >= -35 && diffMinutes < 0) {
        return { status: 'Landed', actualTime: schedUtcIso, progressPct: 100 };
      } else if (diffMinutes >= 0 && diffMinutes <= 15) {
        return { status: 'Approaching', actualTime: null, progressPct: 95 };
      } else if (diffMinutes > 15 && diffMinutes <= 90) {
        return {
          status: 'En Route',
          actualTime: null,
          progressPct: Math.max(15, Math.min(90, Math.round(100 - (diffMinutes / duration) * 100)))
        };
      }
      return { status: 'Scheduled', actualTime: null, progressPct: 0 };
    }
  }

  /**
   * Ingests verified OAG instances into this.flights and removes any unverified static fallback rows
   */
  private ingestOagInstances(allInstances: Array<{ item: any; type: 'departure' | 'arrival' }>): number {
    // Purge any stale unverified static template rows so only verified OAG & live ADS-B flights remain
    for (const [id, flight] of this.flights.entries()) {
      if (
        flight.liveDataSource === 'KHI Aerodrome Operational FIDS' ||
        flight.liveDataSource?.includes('Offline')
      ) {
        this.flights.delete(id);
      }
    }

    const OAG_AIRCRAFT_MAP: Record<string, string> = {
      '7M8': 'Boeing 737 MAX 8',
      '7M9': 'Boeing 737 MAX 9',
      'B38M': 'Boeing 737 MAX 8',
      'B39M': 'Boeing 737 MAX 9',
      '738': 'Boeing 737-800',
      'B738': 'Boeing 737-800',
      '73H': 'Boeing 737-800 (Winglets)',
      '77W': 'Boeing 777-300ER',
      'B77W': 'Boeing 777-300ER',
      '772': 'Boeing 777-200ER',
      '77L': 'Boeing 777-200LR',
      '788': 'Boeing 787-8 Dreamliner',
      'B788': 'Boeing 787-8 Dreamliner',
      '789': 'Boeing 787-9 Dreamliner',
      'B789': 'Boeing 787-9 Dreamliner',
      '78X': 'Boeing 787-10 Dreamliner',
      '320': 'Airbus A320-200',
      'A320': 'Airbus A320-200',
      '32A': 'Airbus A320-200 (Sharklets)',
      '32N': 'Airbus A320neo',
      'A20N': 'Airbus A320neo',
      '321': 'Airbus A321-200',
      'A321': 'Airbus A321-200',
      '32Q': 'Airbus A321neo',
      'A21N': 'Airbus A321neo',
      '332': 'Airbus A330-200',
      '333': 'Airbus A330-300',
      'A333': 'Airbus A330-300',
      '359': 'Airbus A350-900',
      'AT7': 'ATR 72',
      'AT76': 'ATR 72-600',
      'AT45': 'ATR 42-500'
    };

    let importedCount = 0;

    for (const { item, type } of allInstances) {
      // Skip marketing-only codeshare duplicates so only actual operating flights are displayed
      if (item.codeshare?.operatingFlight) continue;

      const carrierCode = (item.carrier?.iata || item.carrier?.icao || '').toUpperCase();
      const flightNumber = item.flightNumber;
      if (!carrierCode || !flightNumber) continue;

      const displayFlightNumber = `${carrierCode}-${flightNumber}`;
      const depDateUtc = item.departure?.date?.utc;
      const depTimeUtc = item.departure?.time?.utc;
      const arrDateUtc = item.arrival?.date?.utc;
      const arrTimeUtc = item.arrival?.time?.utc;

      let schedUtc: string;
      if (type === 'departure') {
        if (depDateUtc && depTimeUtc) {
          schedUtc = new Date(`${depDateUtc}T${depTimeUtc}:00.000Z`).toISOString();
        } else {
          schedUtc = new Date(`${item.departure?.date?.local}T${item.departure?.time?.local}:00.000+05:00`).toISOString();
        }
      } else {
        if (arrDateUtc && arrTimeUtc) {
          schedUtc = new Date(`${arrDateUtc}T${arrTimeUtc}:00.000Z`).toISOString();
        } else {
          schedUtc = new Date(`${item.arrival?.date?.local}T${item.arrival?.time?.local}:00.000+05:00`).toISOString();
        }
      }

      const uniqueTimeKey = schedUtc.slice(11, 16).replace(':', '');
      const cleanKey = `${carrierCode}${flightNumber}-${type === 'departure' ? 'd' : 'a'}-${uniqueTimeKey}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

      const origIata = (item.departure?.airport?.iata || (type === 'departure' ? 'KHI' : 'AIRSPACE')).toUpperCase();
      const destIata = (item.arrival?.airport?.iata || (type === 'arrival' ? 'KHI' : 'AIRSPACE')).toUpperCase();

      const origCoord = AIRPORT_COORDS[origIata] || KARACHI_COORDS;
      const destCoord = AIRPORT_COORDS[destIata] || KARACHI_COORDS;

      const acIata = item.aircraftType?.iata || '';
      const acIcao = item.aircraftType?.icao || '';
      const acModel = OAG_AIRCRAFT_MAP[acIata] || OAG_AIRCRAFT_MAP[acIcao] || (acIcao ? `Aircraft (${acIcao})` : acIata ? `Aircraft (${acIata})` : 'Commercial Jet');

      const airlineInfo = AIRLINES_MAP[carrierCode] || AIRLINES_MAP[item.carrier?.icao?.toUpperCase() || ''] || {
        name: carrierCode,
        code: carrierCode,
        iata: carrierCode,
        icao: item.carrier?.icao || carrierCode,
        logoColor: '#2563eb',
        country: 'International'
      };

      const domesticCodes = ['LHE', 'ISB', 'PEW', 'UET', 'MUX', 'LYP', 'SKZ', 'GWD', 'TUK', 'SKT', 'KDU'];
      const isDomestic = (origIata === 'KHI' && domesticCodes.includes(destIata)) || (destIata === 'KHI' && domesticCodes.includes(origIata));

      const statusInfo = this.computeOagFlightStatus(schedUtc, type, item.elapsedTime || 120);
      const existing = this.flights.get(cleanKey) || this.findMatchingFlight(displayFlightNumber, displayFlightNumber);

      if (existing && existing.type === type && existing.isLiveRadar) {
        // Keep live ADS-B telemetry and enrich schedule/gate/aircraft from OAG
        existing.scheduledTime = schedUtc;
        existing.estimatedTime = schedUtc;
        if (acModel && acModel !== 'Commercial Jet') existing.aircraft.model = acModel;
        if (!existing.origin.city || existing.origin.code === 'AIRSPACE') {
          existing.origin = { code: origIata, name: origCoord.name, city: origCoord.city, country: origCoord.country };
        }
        if (!existing.destination.city || existing.destination.code === 'AIRSPACE') {
          existing.destination = { code: destIata, name: destCoord.name, city: destCoord.city, country: destCoord.country };
        }
        existing.liveDataSource = 'OAG Verified Schedule + Live ADS-B Radar';
        this.flights.set(existing.id, existing);
        importedCount++;
      } else {
        const terminalRaw = (type === 'departure' ? item.departure?.terminal : item.arrival?.terminal) || 'M';
        const terminalDisplay = ['M', '0', '1', ''].includes(terminalRaw) ? 'Jinnah Terminal 1' : `Jinnah Terminal ${terminalRaw}`;
        const concourse = isDomestic ? 'Concourse West (Domestic)' : 'Concourse East (International)';
        const gate = type === 'departure'
          ? (item.departure?.gate ? `Gate ${item.departure.gate}` : isDomestic ? 'Dom Gate' : 'Intl Gate')
          : (item.arrival?.gate ? `Gate ${item.arrival.gate}` : 'Terminal 1');
        const checkIn = isDomestic ? 'Domestic Counters' : 'Intl Counters';
        const baggage = isDomestic ? 'Dom Reclaim' : 'Intl Reclaim';

        const currentLat = Number((origCoord.lat + (destCoord.lat - origCoord.lat) * (statusInfo.progressPct / 100)).toFixed(4));
        const currentLng = Number((origCoord.lng + (destCoord.lng - origCoord.lng) * (statusInfo.progressPct / 100)).toFixed(4));

        const flightRecord: Flight = {
          id: cleanKey,
          flightNumber: displayFlightNumber,
          airline: airlineInfo,
          type,
          category: isDomestic ? 'domestic' : 'international',
          origin: {
            code: origIata,
            name: origCoord.name,
            city: origCoord.city,
            country: origCoord.country
          },
          destination: {
            code: destIata,
            name: destCoord.name,
            city: destCoord.city,
            country: destCoord.country
          },
          scheduledTime: schedUtc,
          estimatedTime: schedUtc,
          actualTime: statusInfo.actualTime,
          status: statusInfo.status,
          delayMinutes: 0,
          delayReason: null,
          terminal: terminalDisplay,
          concourse,
          gate,
          checkInCounters: checkIn,
          baggageBelt: baggage,
          aircraft: {
            model: acModel,
            registration: '',
            speedKnots: 460,
            maxAltitudeFt: 39000
          },
          telemetry: {
            lat: currentLat,
            lng: currentLng,
            altitudeFt: statusInfo.status === 'En Route' ? 32000 : statusInfo.status === 'Approaching' ? 4000 : 0,
            groundSpeedKnots: statusInfo.status === 'En Route' ? 450 : statusInfo.status === 'Approaching' ? 180 : 0,
            heading: type === 'departure' ? 250 : 70,
            progressPct: statusInfo.progressPct,
            distanceRemainingNm: item.distance?.greatCircleNauticalMiles || 500
          },
          history: [
            {
              timestamp: schedUtc,
              type: 'status',
              message: `Verified today via OAG Official Aviation Guide (Key: ${item.scheduleInstanceKey?.slice(0, 10) || 'LIVE'}).`
            }
          ],
          updatedAt: new Date().toISOString(),
          isLiveRadar: false,
          liveDataSource: 'OAG Official Aviation Guide'
        };

        this.flights.set(cleanKey, flightRecord);
        importedCount++;
      }
    }

    return importedCount;
  }

  /**
   * Syncs official flight schedules for today's PKT date from OAG Flight Info API (paginating all results)
   * Caches today's verified schedule on disk for 12 hours to protect the 100-call free tier quota.
   */
  public async syncOagFlightSchedule(force = false): Promise<{ success: boolean; message: string; count?: number; callsUsed: number }> {
    if (!this.oagApiKey || this.oagApiKey.trim().length === 0) {
      return {
        success: false,
        message: 'OAG API Subscription Key is not configured yet. Provide your Flight Info primary key to enable official OAG schedules.',
        callsUsed: this.oagCallsUsed
      };
    }

    const todayPkt = this.getTodayPktDate();
    const now = Date.now();

    if (!force && this.loadOagCacheForToday()) {
      const minsRemaining = Math.round((12 * 60 * 60 * 1000 - (now - this.lastOagSyncTime)) / 60000);
      if (minsRemaining > 0) {
        return {
          success: true,
          message: `OAG schedule for ${todayPkt} loaded from verified cache (${this.flights.size} flights, 0 API calls). Next refresh in ${minsRemaining}m.`,
          count: this.flights.size,
          callsUsed: this.oagCallsUsed
        };
      }
    }

    try {
      const headers = {
        'Subscription-Key': this.oagApiKey,
        'Accept': 'application/json'
      };

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const fetchAllPages = async (initialUrl: string, type: 'departure' | 'arrival') => {
        const collected: Array<{ item: any; type: 'departure' | 'arrival' }> = [];
        let nextUrl: string | null = initialUrl;
        let pageCount = 0;
        let completed = false;

        while (nextUrl && pageCount < 15) {
          pageCount++;
          if (pageCount > 1) await sleep(350);
          let res: Response | null = await fetch(nextUrl, { headers, signal: AbortSignal.timeout(8000) }).catch(() => null);
          if (res && res.status === 429) {
            const retrySec = Number(res.headers.get('retry-after')) || 30;
            await sleep(Math.min(65, retrySec + 2) * 1000);
            res = await fetch(nextUrl, { headers, signal: AbortSignal.timeout(8000) }).catch(() => null);
          }
          if (!res) break;
          this.oagCallsUsed++;
          if (!res.ok) break;
          const body: any = await res.json();
          const items = Array.isArray(body) ? body : (body.data || []);
          items.forEach((item: any) => collected.push({ item, type }));
          nextUrl = typeof body?.paging?.next === 'string' ? body.paging.next : null;
          if (!nextUrl) completed = true;
        }
        return { collected, completed };
      };

      const depUrl = `https://api.oag.com/flight-instances/?DepartureAirport=KHI&DepartureDateTime=${todayPkt}&CodeType=IATA&version=v2`;
      const arrUrl = `https://api.oag.com/flight-instances/?ArrivalAirport=KHI&ArrivalDateTime=${todayPkt}&CodeType=IATA&version=v2`;

      const existingCache = !force ? this.readRawOagCache() : null;
      const canReuseDep =
        existingCache &&
        existingCache.datePkt === todayPkt &&
        existingCache.depComplete &&
        Array.isArray(existingCache.instances);

      let depInstances: Array<{ item: any; type: 'departure' | 'arrival' }> = [];
      let depComplete = false;

      if (canReuseDep) {
        depInstances = existingCache.instances.filter((x: any) => x.type === 'departure');
        depComplete = true;
      } else {
        const depRes = await fetchAllPages(depUrl, 'departure');
        depInstances = depRes.collected;
        depComplete = depRes.completed;
        if (depInstances.length > 0) {
          this.saveOagCache(todayPkt, depInstances, depComplete, false);
          this.ingestOagInstances(depInstances);
        }
      }

      const arrRes = await fetchAllPages(arrUrl, 'arrival');
      const arrInstances = arrRes.collected;
      const arrComplete = arrRes.completed;

      const allInstances = [...depInstances, ...arrInstances];
      this.lastOagSyncTime = Date.now();

      if (allInstances.length === 0) {
        return {
          success: false,
          message: `OAG API returned 0 instances (quota or network check). Preserving existing verified radar data.`,
          callsUsed: this.oagCallsUsed
        };
      }

      this.saveOagCache(todayPkt, allInstances, depComplete, arrComplete);
      const importedCount = this.ingestOagInstances(allInstances);

      return {
        success: true,
        message: `Synchronized ${importedCount} verified OAG flights for ${todayPkt} (${depInstances.length} departures, ${arrInstances.length} arrivals).`,
        count: importedCount,
        callsUsed: this.oagCallsUsed
      };
    } catch (err: any) {
      return {
        success: false,
        message: `OAG API request note: ${err.message}. Preserving existing verified radar data.`,
        callsUsed: this.oagCallsUsed
      };
    }
  }

  /**
   * Rebuilds scheduled flights keyed to the current Pakistan Standard Time (PKT UTC+5)
   */
  public rebuildScheduleFromRealTime(): void {
    const now = new Date();
    // Pakistan Standard Time offset is +5 hours
    const nowPktTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const pktYear = nowPktTime.getUTCFullYear();
    const pktMonth = nowPktTime.getUTCMonth();
    const pktDate = nowPktTime.getUTCDate();
    const currentPktMinutesTotal = nowPktTime.getUTCHours() * 60 + nowPktTime.getUTCMinutes();

    for (const tpl of REAL_SCHEDULE_TEMPLATES) {
      const flightKey = tpl.flightNumber.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Create scheduled UTC Date for this flight today
      const schedPktTotal = tpl.hourPkt * 60 + tpl.minutePkt;
      // Convert PKT hour/minute to absolute UTC time:
      const schedUtc = new Date(Date.UTC(pktYear, pktMonth, pktDate, tpl.hourPkt - 5, tpl.minutePkt, 0));
      const scheduledIso = schedUtc.toISOString();

      const diffMinutes = schedPktTotal - currentPktMinutesTotal;

      let status: Flight['status'] = 'Scheduled';
      let delayMinutes = 0;
      let delayReason: string | null = null;
      let actualTime: string | null = null;
      let progressPct = 0;

      // Determine realistic status based on actual current time of day
      if (tpl.type === 'departure') {
        if (diffMinutes < -45) {
          // Completed flight earlier today (e.g. EK 601 in the morning)
          status = 'Departed';
          actualTime = new Date(schedUtc.getTime() + 8 * 60 * 1000).toISOString();
          progressPct = 100;
        } else if (diffMinutes >= -45 && diffMinutes < -10) {
          status = 'En Route';
          progressPct = Math.min(95, Math.max(20, Math.round((Math.abs(diffMinutes) / tpl.durationMinutes) * 100)));
        } else if (diffMinutes >= -10 && diffMinutes <= 0) {
          status = 'Taxiing';
          progressPct = 5;
        } else if (diffMinutes > 0 && diffMinutes <= 25) {
          status = 'Final Call';
          progressPct = 0;
        } else if (diffMinutes > 25 && diffMinutes <= 55) {
          status = 'Boarding';
          progressPct = 0;
        } else if (diffMinutes > 55 && diffMinutes <= 120) {
          status = 'Check-in Open';
          progressPct = 0;
        } else {
          status = 'Scheduled';
          progressPct = 0;
        }
      } else {
        // Arrival
        if (diffMinutes < -35) {
          status = 'Arrived';
          actualTime = new Date(schedUtc.getTime() - 5 * 60 * 1000).toISOString();
          progressPct = 100;
        } else if (diffMinutes >= -35 && diffMinutes < 0) {
          status = 'Baggage Delivery';
          actualTime = schedUtc.toISOString();
          progressPct = 100;
        } else if (diffMinutes >= 0 && diffMinutes <= 15) {
          status = 'Approaching';
          progressPct = 95;
        } else if (diffMinutes > 15 && diffMinutes <= 90) {
          status = 'En Route';
          progressPct = Math.max(15, Math.min(90, Math.round(100 - (diffMinutes / tpl.durationMinutes) * 100)));
        } else {
          status = 'Scheduled';
          progressPct = 0;
        }
      }

      const estimatedTime = new Date(schedUtc.getTime() + delayMinutes * 60 * 1000).toISOString();

      const originCode = tpl.type === 'departure' ? 'KHI' : tpl.otherAirport;
      const destCode = tpl.type === 'departure' ? tpl.otherAirport : 'KHI';

      const origCoord = AIRPORT_COORDS[originCode] || KARACHI_COORDS;
      const destCoord = AIRPORT_COORDS[destCode] || KARACHI_COORDS;

      // Telemetry interpolation
      const currentLat = Number((origCoord.lat + (destCoord.lat - origCoord.lat) * (progressPct / 100)).toFixed(4));
      const currentLng = Number((origCoord.lng + (destCoord.lng - origCoord.lng) * (progressPct / 100)).toFixed(4));

      const altitudeFt = status === 'En Route' ? 34000 : status === 'Approaching' ? 4500 : status === 'Taxiing' ? 0 : status === 'Departed' ? (progressPct === 100 ? 0 : 36000) : 0;
      const speedKnots = status === 'En Route' ? 460 : status === 'Approaching' ? 190 : status === 'Taxiing' ? 15 : status === 'Departed' ? (progressPct === 100 ? 0 : 470) : 0;

      // Bearing
      const y = Math.sin((destCoord.lng - origCoord.lng) * Math.PI / 180) * Math.cos(destCoord.lat * Math.PI / 180);
      const x = Math.cos(origCoord.lat * Math.PI / 180) * Math.sin(destCoord.lat * Math.PI / 180) -
        Math.sin(origCoord.lat * Math.PI / 180) * Math.cos(destCoord.lat * Math.PI / 180) * Math.cos((destCoord.lng - origCoord.lng) * Math.PI / 180);
      const heading = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);

      const dLat = (destCoord.lat - currentLat) * 60;
      const dLng = (destCoord.lng - currentLng) * 60 * Math.cos((origCoord.lat + destCoord.lat) / 2 * Math.PI / 180);
      const distanceRemainingNm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

      const airline = AIRLINES_MAP[tpl.airlineCode] || {
        name: tpl.airlineCode,
        code: tpl.airlineCode,
        iata: tpl.airlineCode,
        icao: tpl.airlineCode,
        logoColor: '#2563eb',
        country: 'International'
      };

      const flightRecord: Flight = {
        id: flightKey,
        flightNumber: tpl.flightNumber,
        airline,
        type: tpl.type,
        category: tpl.category,
        origin: {
          code: originCode,
          name: origCoord.name,
          city: origCoord.city,
          country: origCoord.country,
          terminal: tpl.type === 'departure' ? tpl.terminal : undefined,
          gate: tpl.type === 'departure' ? tpl.gate : undefined
        },
        destination: {
          code: destCode,
          name: destCoord.name,
          city: destCoord.city,
          country: destCoord.country,
          terminal: tpl.type === 'arrival' ? tpl.terminal : undefined,
          gate: tpl.type === 'arrival' ? tpl.gate : undefined
        },
        scheduledTime: scheduledIso,
        estimatedTime,
        actualTime,
        status,
        delayMinutes,
        delayReason,
        terminal: tpl.terminal,
        concourse: tpl.concourse,
        gate: tpl.gate,
        checkInCounters: tpl.checkInCounters,
        baggageBelt: tpl.baggageBelt,
        aircraft: {
          model: tpl.aircraftModel,
          registration: tpl.aircraftReg,
          speedKnots: speedKnots || 450,
          maxAltitudeFt: 39000
        },
        telemetry: {
          lat: currentLat,
          lng: currentLng,
          altitudeFt,
          groundSpeedKnots: speedKnots,
          heading,
          progressPct,
          distanceRemainingNm
        },
        history: [
          {
            timestamp: scheduledIso,
            type: 'status',
            message: status === 'Departed'
              ? `Flight completed on schedule. Arrived at ${destCoord.city} (${destCode}).`
              : status === 'Arrived'
              ? `Touched down safely on Runway 25L. Baggage on ${tpl.baggageBelt}.`
              : `Flight scheduled at Karachi Jinnah International (KHI / OPKC).`
          }
        ],
        updatedAt: now.toISOString(),
        isLiveRadar: false,
        liveDataSource: 'KHI Aerodrome Operational FIDS'
      };

      this.flights.set(flightKey, flightRecord);
    }
  }

  /**
   * Continuous background poller fetching live ADS-B state vectors from both Flightradar24 and adsb.fi
   */
  private startLiveRadarFeedPolling(): void {
    if (this.liveRadarSyncTimer) clearInterval(this.liveRadarSyncTimer);

    // Initial immediate fetch from both sources
    this.syncLiveAirTrafficFeed();
    this.syncAdsbFiAirTraffic();

    // Poll every 15 seconds for fresh real air traffic data
    this.liveRadarSyncTimer = setInterval(async () => {
      await Promise.allSettled([
        this.syncLiveAirTrafficFeed(),
        this.syncAdsbFiAirTraffic()
      ]);
    }, 15000);
  }

  /**
   * Fetches real live ADS-B flights in Karachi FIR and regional corridors from Flightradar24
   */
  public async syncLiveAirTrafficFeed(): Promise<void> {
    try {
      const url = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=38.0,18.0,45.0,85.0';
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(4500)
      });

      if (!response.ok) {
        throw new Error(`Air traffic feed returned HTTP ${response.status}`);
      }

      const data = await response.json();
      this.lastLiveFetchTime = Date.now();
      let matchedLiveCount = 0;

      for (const [radarId, v] of Object.entries(data)) {
        if (!Array.isArray(v)) continue;
        const [hex, lat, lng, track, alt, speed, sq, radar, model, reg, ts, from, to, fno, gnd, vspd, callsign, _, airlineCode] = v;

        // Calculate distance from Karachi aerodrome
        const dLat = (lat - KARACHI_COORDS.lat) * 60;
        const dLng = (lng - KARACHI_COORDS.lng) * 60 * Math.cos(KARACHI_COORDS.lat * Math.PI / 180);
        const distNm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

        const isFromKhi = from === 'KHI';
        const isToKhi = to === 'KHI';
        const isNearKhi = distNm <= 120;

        if (!isFromKhi && !isToKhi && !isNearKhi) {
          continue;
        }

        // STRICT AIRCRAFT FILTER: Reject airport ground vehicles, sweepers, security cars (e.g. SCOP27), tugs, and test transponders
        const flightNumUpper = (fno || callsign || hex || '').toUpperCase();
        const modelUpper = (model || '').toUpperCase();
        const fromUpper = (from || '').toUpperCase();
        const toUpper = (to || '').toUpperCase();

        const isGroundVehicle =
          /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(flightNumUpper) ||
          /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(callsign || '') ||
          (reg || '').toUpperCase() === 'N644PK';
        const isLocalGroundCircuit = fromUpper === 'KHI' && toUpper === 'KHI' && alt < 2500 && speed < 140;
        const isGroundEquipment = (gnd === 1 || alt <= 100) && speed < 45 && (!from || !to || from === to);
        const isUnknownLowSpeedTarget = (!model || model === 'Commercial Jet' || model === 'UNK' || ['GRND', 'GND', 'CAR', 'TRK', 'TUG', 'ZZZZ'].includes(modelUpper)) && alt < 1200 && speed < 110;

        if (isGroundVehicle || isLocalGroundCircuit || isGroundEquipment || isUnknownLowSpeedTarget) {
          continue;
        }

        if (fromUpper === toUpper && alt < 3000) {
          continue;
        }

        matchedLiveCount++;

        const flightNumRaw = fno || callsign || hex;
        const normalizedKey = flightNumRaw.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Determine airline
        const effectiveAirlineCode = (airlineCode || flightNumRaw.substring(0, 3) || flightNumRaw.substring(0, 2)).toUpperCase();
        const airlineInfo = AIRLINES_MAP[effectiveAirlineCode] || AIRLINES_MAP[flightNumRaw.substring(0, 2).toUpperCase()] || {
          name: effectiveAirlineCode,
          code: effectiveAirlineCode,
          iata: effectiveAirlineCode.substring(0, 2),
          icao: effectiveAirlineCode,
          logoColor: '#2563eb',
          country: 'Commercial'
        };

        const isGround = gnd === 1 || alt <= 50;
        const isClimbing = vspd > 300;
        const isDescending = vspd < -300;

        let liveStatus: Flight['status'] = 'En Route';
        if (isGround) {
          liveStatus = isFromKhi ? 'Taxiing' : 'Landed';
        } else if (isToKhi) {
          if (alt < 4000 && distNm < 20) {
            liveStatus = 'Approaching';
          } else if (alt < 8000 && distNm < 50) {
            liveStatus = 'Approaching';
          } else {
            liveStatus = 'En Route';
          }
        } else if (isFromKhi) {
          if (alt < 8000 && distNm < 40) {
            liveStatus = 'Departed';
          } else {
            liveStatus = 'En Route';
          }
        }

        // Enrich with adsbdb (open-source database by Jack Wills / api.adsbdb.com)
        const adsbRoute = await this.lookupAdsbDbRoute(fno || callsign || hex);

        const origCode = from || adsbRoute?.origin?.code || (isFromKhi ? 'KHI' : 'AIRSPACE');
        const destCode = to || adsbRoute?.destination?.code || (isToKhi ? 'KHI' : 'AIRSPACE');

        const isKnownOverflight =
          (origCode !== 'KHI' && origCode !== 'AIRSPACE' && destCode !== 'KHI' && destCode !== 'AIRSPACE') ||
          (!isFromKhi && !isToKhi && alt > 18000);

        const origCoord = AIRPORT_COORDS[origCode] || KARACHI_COORDS;
        const destCoord = AIRPORT_COORDS[destCode] || KARACHI_COORDS;

        const effectiveOrigin = (from ? undefined : adsbRoute?.origin) || {
          code: origCode,
          name: origCoord.name,
          city: origCoord.city,
          country: origCoord.country
        };

        const effectiveDest = (to ? undefined : adsbRoute?.destination) || {
          code: destCode,
          name: destCoord.name,
          city: destCoord.city,
          country: destCoord.country
        };

        const effectiveAirline = adsbRoute?.airline || airlineInfo;

        // Progress estimate
        const totalRouteNm = Math.max(80, Math.round(
          Math.sqrt(Math.pow((destCoord.lat - origCoord.lat) * 60, 2) + Math.pow((destCoord.lng - origCoord.lng) * 60, 2))
        ));
        const progressPct = isToKhi
          ? Math.max(1, Math.min(99, Math.round(100 - (distNm / totalRouteNm) * 100)))
          : isFromKhi
          ? Math.max(1, Math.min(99, Math.round((distNm / totalRouteNm) * 100)))
          : 50;

        const nowIso = new Date().toISOString();

        // Check if matching scheduled flight exists in our directory (IATA <-> ICAO + registration)
        const existing = this.findMatchingFlight(callsign, fno, reg);

        if (existing) {
          // Update existing flight with live telemetry
          existing.telemetry = {
            lat: Number(lat.toFixed(4)),
            lng: Number(lng.toFixed(4)),
            altitudeFt: alt,
            groundSpeedKnots: speed,
            heading: track,
            progressPct,
            distanceRemainingNm: distNm
          };
          existing.aircraft.registration = reg || existing.aircraft.registration;
          existing.aircraft.model = model || existing.aircraft.model;
          existing.status = liveStatus;
          existing.isLiveRadar = true;
          existing.liveDataSource = `Flightradar24 + ADS-B DB (${radar || 'Receiver'})`;
          existing.updatedAt = nowIso;

          // If origin or destination was unknown/AIRSPACE, enrich it from adsbdb
          if (adsbRoute?.origin && (!existing.origin.city || existing.origin.code === 'AIRSPACE')) {
            existing.origin = adsbRoute.origin;
          }
          if (adsbRoute?.destination && (!existing.destination.city || existing.destination.code === 'AIRSPACE')) {
            existing.destination = adsbRoute.destination;
          }
          if (adsbRoute?.airline && (!existing.airline.name || existing.airline.name === existing.airline.code)) {
            existing.airline = adsbRoute.airline;
          }

          this.flights.set(existing.id, existing);
        } else {
          // Dynamic live flight discovered in Karachi FIR
          const newFlight: Flight = {
            id: normalizedKey,
            flightNumber: fno || callsign || `RDR-${hex}`,
            airline: effectiveAirline,
            type: isToKhi ? 'arrival' : 'departure',
            category: origCode !== 'KHI' && ['LHE', 'ISB', 'PEW', 'UET', 'MUX', 'LYP', 'SKZ', 'GWD', 'TUK', 'SKT'].includes(origCode) ? 'domestic' : 'international',
            origin: effectiveOrigin,
            destination: effectiveDest,
            scheduledTime: nowIso,
            estimatedTime: nowIso,
            actualTime: null,
            status: liveStatus,
            delayMinutes: 0,
            delayReason: null,
            terminal: 'Jinnah Terminal 1',
            concourse: isKnownOverflight ? 'Karachi FIR Transit' : origCode === 'KHI' || destCode === 'KHI' ? 'Concourse East (International)' : 'Airspace Radar Transit',
            gate: 'Stand Radar',
            checkInCounters: 'Live ADS-B Radar',
            baggageBelt: 'Carousel Live',
            aircraft: {
              model: model || 'Commercial Aircraft',
              registration: reg || hex,
              speedKnots: speed,
              maxAltitudeFt: 41000
            },
            telemetry: {
              lat: Number(lat.toFixed(4)),
              lng: Number(lng.toFixed(4)),
              altitudeFt: alt,
              groundSpeedKnots: speed,
              heading: track,
              progressPct,
              distanceRemainingNm: distNm
            },
            history: [
              {
                timestamp: nowIso,
                type: 'status',
                message: `Live ADS-B tracking initiated by Flightradar24. Transponder ${hex}.`
              }
            ],
            updatedAt: nowIso,
            isLiveRadar: true,
            liveDataSource: `Flightradar24 ADS-B Live (${radar || 'Receiver'})`,
            isOverflight: isKnownOverflight
          };

          this.flights.set(normalizedKey, newFlight);
        }
      }

      this.liveAircraftCount = matchedLiveCount;
      this.feedStatusText = `🟢 Live ADS-B Air Traffic Feed Connected (${matchedLiveCount} aircraft active in Karachi FIR)`;
    } catch (err: any) {
      this.feedStatusText = `Air Traffic Feed Sync Warning: ${err.message || 'Retrying...'}`;
      // Do not crash; retain active flight table
    }
  }

  public getFlights(params?: {
    type?: string;
    category?: string;
    status?: string;
    search?: string;
    window?: '3h' | '6h' | 'all';
    includeOverflights?: boolean;
  }): Flight[] {
    let result = Array.from(this.flights.values());

    // Never return ground vehicles or non-Karachi overflights on the airport board unless requested
    result = result.filter(f => {
      const isGroundVeh =
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.flightNumber) ||
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.airline.code) ||
        f.aircraft.registration === 'N644PK' ||
        (f.origin.code === 'KHI' && f.destination.code === 'KHI' && f.telemetry && f.telemetry.altitudeFt < 1000 && f.telemetry.groundSpeedKnots < 130);
      if (isGroundVeh) return false;
      if (!params?.includeOverflights && f.isOverflight) return false;
      return true;
    });

    // Operational window filter (default to 'all' so full schedule is visible):
    const windowMode = params?.window || 'all';
    if (windowMode !== 'all') {
      const nowMs = Date.now();
      result = result.filter(f => {
        // Rule 1: Always show planes actively in the air on live radar right now
        if (f.isLiveRadar && f.status !== 'Departed' && f.status !== 'Arrived') {
          return true;
        }

        // Rule 2: Scheduled / completed flights within ±3.25h window
        const schedMs = new Date(f.scheduledTime).getTime();
        const diffHours = (schedMs - nowMs) / (1000 * 60 * 60);

        if (windowMode === '3h') {
          return diffHours >= -3.25 && diffHours <= 3.25;
        } else if (windowMode === '6h') {
          return diffHours >= -1.0 && diffHours <= 6.25;
        }
        return true;
      });
    }

    if (params?.type && params.type !== 'all') {
      result = result.filter(f => f.type === params.type);
    }

    if (params?.category && params.category !== 'all') {
      result = result.filter(f => f.category === params.category);
    }

    if (params?.status && params.status !== 'all') {
      if (params.status === 'delayed') {
        result = result.filter(f => f.delayMinutes > 0);
      } else if (params.status === 'boarding') {
        result = result.filter(f => ['Boarding', 'Final Call'].includes(f.status));
      } else if (params.status === 'active') {
        result = result.filter(f => ['Taxiing', 'Departed', 'En Route', 'Approaching'].includes(f.status));
      } else if (params.status === 'landed') {
        result = result.filter(f => ['Landed', 'Baggage Delivery', 'Arrived'].includes(f.status));
      }
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      result = result.filter(
        f =>
          f.flightNumber.toLowerCase().includes(q) ||
          f.airline.name.toLowerCase().includes(q) ||
          f.origin.city.toLowerCase().includes(q) ||
          f.origin.code.toLowerCase().includes(q) ||
          f.destination.city.toLowerCase().includes(q) ||
          f.destination.code.toLowerCase().includes(q) ||
          f.gate.toLowerCase().includes(q) ||
          f.aircraft.model.toLowerCase().includes(q) ||
          f.aircraft.registration.toLowerCase().includes(q)
      );
    }

    // Sort by scheduled / estimated time
    return result.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }

  public getFlightById(id: string): Flight | undefined {
    const cleanId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.flights.get(cleanId);
  }

  public getAirportStats(): AirportStats {
    const list = Array.from(this.flights.values()).filter(f => {
      const isGroundVeh =
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.flightNumber) ||
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.airline.code) ||
        f.aircraft.registration === 'N644PK' ||
        (f.origin.code === 'KHI' && f.destination.code === 'KHI' && f.telemetry && f.telemetry.altitudeFt < 1000 && f.telemetry.groundSpeedKnots < 130);
      return !isGroundVeh && !f.isOverflight;
    });
    const departures = list.filter(f => f.type === 'departure');
    const arrivals = list.filter(f => f.type === 'arrival');
    const delayed = list.filter(f => f.delayMinutes > 0);
    const onTimeRate = list.length > 0 ? Math.round(((list.length - delayed.length) / list.length) * 100) : 100;
    const totalDelay = list.reduce((acc, f) => acc + f.delayMinutes, 0);
    const avgDelay = delayed.length > 0 ? Math.round(totalDelay / delayed.length) : 0;

    const now = new Date();
    // Pakistan Standard Time is UTC+5
    const pktString = new Date(now.getTime() + 5 * 60 * 60 * 1000).toUTCString().replace('GMT', 'PKT');

    return {
      airportCode: 'KHI',
      icao: 'OPKC',
      name: 'Jinnah International Airport, Karachi',
      localTime: pktString,
      utcTime: now.toISOString(),
      weather: {
        tempC: 28,
        condition: 'Clear Skies / Arabian Sea Maritime Breeze',
        wind: '240° at 11 knots',
        visibilityM: 8000,
        qnhHpa: 1013,
        runwaysActive: ['Runway 25L (Primary Arrivals)', 'Runway 25R (Departures)']
      },
      activeDeparturesCount: departures.length,
      activeArrivalsCount: arrivals.length,
      onTimeRate,
      averageGateDelayMins: avgDelay,
      activeGatesCount: 18,
      liveRadarCount: this.liveAircraftCount,
      feedStatus: this.feedStatusText,
      lastFeedSync: this.lastLiveFetchTime ? new Date(this.lastLiveFetchTime).toISOString() : new Date().toISOString()
    };
  }

  public getNotifications(): NotificationAlert[] {
    return this.notificationHistory.slice(0, 25);
  }

  public addAlert(alert: Omit<NotificationAlert, 'id' | 'timestamp'>): NotificationAlert {
    const fullAlert: NotificationAlert = {
      ...alert,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString()
    };
    this.notificationHistory.unshift(fullAlert);
    if (this.notificationHistory.length > 50) {
      this.notificationHistory.pop();
    }
    return fullAlert;
  }

  // Simulation test trigger for push alerts
  public simulateFlightEvent(flightId: string, eventType: 'gate_change' | 'delay' | 'boarding' | 'landed' | 'cancel'): { success: boolean; flight?: Flight; alert?: NotificationAlert } {
    const flight = this.getFlightById(flightId);
    if (!flight) return { success: false };

    let alert: NotificationAlert | null = null;
    const nowIso = new Date().toISOString();

    if (eventType === 'gate_change') {
      const oldGate = flight.gate;
      const isDomestic = flight.category === 'domestic';
      const newGateNum = isDomestic ? 13 + Math.floor(Math.random() * 11) : 1 + Math.floor(Math.random() * 11);
      const newGate = `Gate ${newGateNum < 10 ? '0' + newGateNum : newGateNum}`;
      flight.previousGate = oldGate;
      flight.gate = newGate;
      flight.history.unshift({
        timestamp: nowIso,
        type: 'gate',
        message: `Gate changed from ${oldGate} to ${newGate}`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: 'gate_change',
        severity: 'urgent',
        title: `GATE CHANGE: ${flight.flightNumber}`,
        message: `${flight.flightNumber} to ${flight.destination.city} relocated from ${oldGate} to ${newGate}. Proceed immediately.`,
        route: `${flight.origin.city} → ${flight.destination.city}`,
        gate: newGate
      });
    } else if (eventType === 'delay') {
      const addMins = 30 + Math.floor(Math.random() * 30);
      flight.delayMinutes += addMins;
      const randomReason = DELAY_REASONS[Math.floor(Math.random() * DELAY_REASONS.length)];
      flight.delayReason = randomReason;
      const estTime = new Date(new Date(flight.scheduledTime).getTime() + flight.delayMinutes * 60 * 1000);
      flight.estimatedTime = estTime.toISOString();
      flight.status = 'Delayed';
      flight.history.unshift({
        timestamp: nowIso,
        type: 'delay',
        message: `Flight delayed +${addMins} min (${randomReason})`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: 'delay_update',
        severity: 'warning',
        title: `DELAY UPDATE: ${flight.flightNumber} (+${flight.delayMinutes}m)`,
        message: `Estimated time: ${estTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Reason: ${randomReason}`,
        route: `${flight.origin.city} → ${flight.destination.city}`,
        gate: flight.gate,
        delayMinutes: flight.delayMinutes
      });
    } else if (eventType === 'boarding') {
      flight.status = 'Boarding';
      flight.history.unshift({
        timestamp: nowIso,
        type: 'status',
        message: `Boarding commenced at ${flight.gate}`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: 'boarding_call',
        severity: 'urgent',
        title: `NOW BOARDING: ${flight.flightNumber}`,
        message: `Boarding is now underway at ${flight.gate} for ${flight.destination.city}. Have boarding pass ready.`,
        route: `${flight.origin.city} → ${flight.destination.city}`,
        gate: flight.gate
      });
    } else if (eventType === 'landed') {
      flight.status = 'Landed';
      flight.actualTime = nowIso;
      flight.telemetry.progressPct = 100;
      flight.telemetry.altitudeFt = 0;
      flight.telemetry.groundSpeedKnots = 18;
      flight.history.unshift({
        timestamp: nowIso,
        type: 'status',
        message: `Aircraft touched down on Runway 25L. Taxiing to ${flight.gate}.`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: 'touchdown',
        severity: 'info',
        title: `TOUCHDOWN: ${flight.flightNumber}`,
        message: `${flight.flightNumber} from ${flight.origin.city} has landed safely at Karachi. Baggage on ${flight.baggageBelt}.`,
        route: `${flight.origin.city} → Karachi`,
        gate: flight.gate
      });
    }

    flight.updatedAt = nowIso;
    this.flights.set(flight.id, flight);

    return { success: true, flight, alert: alert || undefined };
  }
}

export const flightEngine = new KarachiFlightEngine();
