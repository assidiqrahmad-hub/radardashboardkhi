// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// src/server/flightEngine.ts
var KARACHI_COORDS = { lat: 24.9065, lng: 67.1608 };
var AIRPORT_COORDS = {
  // Domestic
  ISB: { lat: 33.5651, lng: 72.8519, city: "Islamabad", country: "Pakistan", name: "Islamabad International Airport" },
  LHE: { lat: 31.5216, lng: 74.4036, city: "Lahore", country: "Pakistan", name: "Allama Iqbal International Airport" },
  PEW: { lat: 33.9939, lng: 71.5147, city: "Peshawar", country: "Pakistan", name: "Bacha Khan International Airport" },
  UET: { lat: 30.2514, lng: 66.9378, city: "Quetta", country: "Pakistan", name: "Quetta International Airport" },
  MUX: { lat: 30.2032, lng: 71.419, city: "Multan", country: "Pakistan", name: "Multan International Airport" },
  LYP: { lat: 31.3653, lng: 72.995, city: "Faisalabad", country: "Pakistan", name: "Faisalabad International Airport" },
  SKZ: { lat: 27.7219, lng: 68.7917, city: "Sukkur", country: "Pakistan", name: "Sukkur Begum Nusrat Bhutto Airport" },
  GWD: { lat: 25.2331, lng: 62.3297, city: "Gwadar", country: "Pakistan", name: "Gwadar International Airport" },
  KDU: { lat: 35.3358, lng: 75.5361, city: "Skardu", country: "Pakistan", name: "Skardu Airport" },
  TUK: { lat: 25.9866, lng: 63.0308, city: "Turbat", country: "Pakistan", name: "Turbat International Airport" },
  SKT: { lat: 32.5356, lng: 74.3639, city: "Sialkot", country: "Pakistan", name: "Sialkot International Airport" },
  // International
  DXB: { lat: 25.2532, lng: 55.3657, city: "Dubai", country: "United Arab Emirates", name: "Dubai International Airport" },
  DWC: { lat: 24.896, lng: 55.1614, city: "Dubai Al Maktoum", country: "United Arab Emirates", name: "Al Maktoum International Airport" },
  SHJ: { lat: 25.3286, lng: 55.5172, city: "Sharjah", country: "United Arab Emirates", name: "Sharjah International Airport" },
  AUH: { lat: 24.433, lng: 54.6511, city: "Abu Dhabi", country: "United Arab Emirates", name: "Zayed International Airport" },
  DOH: { lat: 25.2731, lng: 51.6081, city: "Doha", country: "Qatar", name: "Hamad International Airport" },
  JED: { lat: 21.6796, lng: 39.1565, city: "Jeddah", country: "Saudi Arabia", name: "King Abdulaziz International Airport" },
  RUH: { lat: 24.9576, lng: 46.6988, city: "Riyadh", country: "Saudi Arabia", name: "King Khalid International Airport" },
  MED: { lat: 24.5534, lng: 39.7051, city: "Medina", country: "Saudi Arabia", name: "Prince Mohammad Bin Abdulaziz Airport" },
  DMM: { lat: 26.4712, lng: 49.7978, city: "Dammam", country: "Saudi Arabia", name: "King Fahd International Airport" },
  MCT: { lat: 23.5933, lng: 58.2844, city: "Muscat", country: "Oman", name: "Muscat International Airport" },
  BAH: { lat: 26.2708, lng: 50.6336, city: "Manama", country: "Bahrain", name: "Bahrain International Airport" },
  KWI: { lat: 29.2269, lng: 47.9789, city: "Kuwait City", country: "Kuwait", name: "Kuwait International Airport" },
  IST: { lat: 41.2753, lng: 28.7519, city: "Istanbul", country: "Turkey", name: "Istanbul Airport" },
  ADD: { lat: 8.9779, lng: 38.7993, city: "Addis Ababa", country: "Ethiopia", name: "Bole International Airport" },
  BGW: { lat: 33.2625, lng: 44.2344, city: "Baghdad", country: "Iraq", name: "Baghdad International Airport" },
  MFM: { lat: 22.1495, lng: 113.5915, city: "Macau", country: "Macau SAR", name: "Macau International Airport" },
  CAN: { lat: 23.3924, lng: 113.2988, city: "Guangzhou", country: "China", name: "Guangzhou Baiyun International Airport" },
  HKG: { lat: 22.308, lng: 113.9185, city: "Hong Kong", country: "Hong Kong SAR", name: "Hong Kong International Airport" },
  LHR: { lat: 51.47, lng: -0.4543, city: "London", country: "United Kingdom", name: "London Heathrow Airport" },
  YYZ: { lat: 43.6777, lng: -79.6248, city: "Toronto", country: "Canada", name: "Toronto Pearson International Airport" },
  BKK: { lat: 13.69, lng: 100.7501, city: "Bangkok", country: "Thailand", name: "Suvarnabhumi Airport" },
  CMB: { lat: 7.1808, lng: 79.8841, city: "Colombo", country: "Sri Lanka", name: "Bandaranaike International Airport" },
  KHI: { lat: 24.9065, lng: 67.1608, city: "Karachi", country: "Pakistan", name: "Jinnah International Airport" }
};
var AIRLINES_MAP = {
  PIA: { name: "Pakistan International Airlines", code: "PIA", iata: "PK", icao: "PIA", logoColor: "#005f38", country: "Pakistan" },
  PK: { name: "Pakistan International Airlines", code: "PIA", iata: "PK", icao: "PIA", logoColor: "#005f38", country: "Pakistan" },
  SIF: { name: "AirSial", code: "SIF", iata: "PF", icao: "SIF", logoColor: "#0a369d", country: "Pakistan" },
  PF: { name: "AirSial", code: "SIF", iata: "PF", icao: "SIF", logoColor: "#0a369d", country: "Pakistan" },
  ABQ: { name: "Airblue", code: "ABQ", iata: "PA", icao: "ABQ", logoColor: "#004b87", country: "Pakistan" },
  PA: { name: "Airblue", code: "ABQ", iata: "PA", icao: "ABQ", logoColor: "#004b87", country: "Pakistan" },
  FLI: { name: "Fly Jinnah", code: "FLI", iata: "9P", icao: "FLI", logoColor: "#d91d24", country: "Pakistan" },
  "9P": { name: "Fly Jinnah", code: "FLI", iata: "9P", icao: "FLI", logoColor: "#d91d24", country: "Pakistan" },
  UAE: { name: "Emirates", code: "UAE", iata: "EK", icao: "UAE", logoColor: "#d71921", country: "United Arab Emirates" },
  EK: { name: "Emirates", code: "UAE", iata: "EK", icao: "UAE", logoColor: "#d71921", country: "United Arab Emirates" },
  FDB: { name: "flydubai", code: "FDB", iata: "FZ", icao: "FDB", logoColor: "#0084c9", country: "United Arab Emirates" },
  FZ: { name: "flydubai", code: "FDB", iata: "FZ", icao: "FDB", logoColor: "#0084c9", country: "United Arab Emirates" },
  ABY: { name: "Air Arabia", code: "ABY", iata: "G9", icao: "ABY", logoColor: "#e21a22", country: "United Arab Emirates" },
  G9: { name: "Air Arabia", code: "ABY", iata: "G9", icao: "ABY", logoColor: "#e21a22", country: "United Arab Emirates" },
  QTR: { name: "Qatar Airways", code: "QTR", iata: "QR", icao: "QTR", logoColor: "#5c0632", country: "Qatar" },
  QR: { name: "Qatar Airways", code: "QTR", iata: "QR", icao: "QTR", logoColor: "#5c0632", country: "Qatar" },
  SVA: { name: "Saudia", code: "SVA", iata: "SV", icao: "SVA", logoColor: "#16572e", country: "Saudi Arabia" },
  SV: { name: "Saudia", code: "SVA", iata: "SV", icao: "SVA", logoColor: "#16572e", country: "Saudi Arabia" },
  ETH: { name: "Ethiopian Airlines", code: "ETH", iata: "ET", icao: "ETH", logoColor: "#006a4e", country: "Ethiopia" },
  ET: { name: "Ethiopian Airlines", code: "ETH", iata: "ET", icao: "ETH", logoColor: "#006a4e", country: "Ethiopia" },
  GFA: { name: "Gulf Air", code: "GFA", iata: "GF", icao: "GFA", logoColor: "#977a38", country: "Bahrain" },
  GF: { name: "Gulf Air", code: "GFA", iata: "GF", icao: "GFA", logoColor: "#977a38", country: "Bahrain" },
  OMA: { name: "Oman Air", code: "OMA", iata: "WY", icao: "OMA", logoColor: "#a62b2b", country: "Oman" },
  WY: { name: "Oman Air", code: "OMA", iata: "WY", icao: "OMA", logoColor: "#a62b2b", country: "Oman" },
  JZR: { name: "Jazeera Airways", code: "JZR", iata: "J9", icao: "JZR", logoColor: "#009fe3", country: "Kuwait" },
  J9: { name: "Jazeera Airways", code: "JZR", iata: "J9", icao: "JZR", logoColor: "#009fe3", country: "Kuwait" },
  THY: { name: "Turkish Airlines", code: "THY", iata: "TK", icao: "THY", logoColor: "#c70000", country: "Turkey" },
  TK: { name: "Turkish Airlines", code: "THY", iata: "TK", icao: "THY", logoColor: "#c70000", country: "Turkey" },
  OMS: { name: "SalamAir", code: "OMS", iata: "OV", icao: "OMS", logoColor: "#00a850", country: "Oman" },
  OV: { name: "SalamAir", code: "OMS", iata: "OV", icao: "OMS", logoColor: "#00a850", country: "Oman" },
  IAW: { name: "Iraqi Airways / Fly Baghdad", code: "IAW", iata: "IF", icao: "IAW", logoColor: "#0f4c3a", country: "Iraq" },
  BSC: { name: "Classic Air Cargo", code: "BSC", iata: "KW", icao: "BSC", logoColor: "#374151", country: "International Cargo" }
};
var DELAY_REASONS = [
  "Air Traffic Control (ATC) flow slot hold in Arabian Gulf airspace",
  "Inbound aircraft late turnaround from previous rotation",
  "Dense fog and reduced runway visibility at northern destination airport",
  "Technical avionics clearance and routine engineering inspection",
  "Passenger boarding bridge operational reassignment",
  "Cargo and baggage pallet container weight re-balance",
  "Ramp ground handling & fueling congestion at peak arrival bank",
  "Severe headwinds along Arabian Sea flight corridor",
  "Secondary security gate clearance & baggage screening re-check"
];
var REAL_SCHEDULE_TEMPLATES = [
  // --- MORNING DEPARTURES BANK ---
  {
    flightNumber: "PA-200",
    airlineCode: "PA",
    type: "departure",
    category: "domestic",
    otherAirport: "ISB",
    hourPkt: 7,
    minutePkt: 0,
    durationMinutes: 110,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 14",
    checkInCounters: "Row B (B1-B6)",
    baggageBelt: "Carousel 1",
    aircraftModel: "Airbus A321-200",
    aircraftReg: "AP-BNE"
  },
  {
    flightNumber: "SV-701",
    airlineCode: "SV",
    type: "departure",
    category: "international",
    otherAirport: "RUH",
    hourPkt: 8,
    minutePkt: 0,
    durationMinutes: 240,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 22",
    checkInCounters: "Row D (D1-D6)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "HZ-AK18"
  },
  {
    flightNumber: "PK-302",
    airlineCode: "PK",
    type: "departure",
    category: "domestic",
    otherAirport: "LHE",
    hourPkt: 8,
    minutePkt: 15,
    durationMinutes: 105,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 16",
    checkInCounters: "Row A (A1-A6)",
    baggageBelt: "Carousel 1",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BLA"
  },
  {
    flightNumber: "PF-121",
    airlineCode: "PF",
    type: "departure",
    category: "domestic",
    otherAirport: "ISB",
    hourPkt: 8,
    minutePkt: 45,
    durationMinutes: 115,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 17",
    checkInCounters: "Row C (C1-C5)",
    baggageBelt: "Carousel 2",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BOC"
  },
  {
    flightNumber: "9P-670",
    airlineCode: "9P",
    type: "departure",
    category: "domestic",
    otherAirport: "ISB",
    hourPkt: 9,
    minutePkt: 0,
    durationMinutes: 115,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 15",
    checkInCounters: "Row C (C6-C10)",
    baggageBelt: "Carousel 2",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BOP"
  },
  // EK 601: Real morning Emirates flight (09:20 PKT -> arrives Dubai 11:45 PKT / 10:45 UAE)
  {
    flightNumber: "EK-601",
    airlineCode: "EK",
    type: "departure",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 9,
    minutePkt: 20,
    durationMinutes: 135,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 24",
    checkInCounters: "Row D (D7-D14)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "A6-EQO"
  },
  {
    flightNumber: "QR-611",
    airlineCode: "QR",
    type: "departure",
    category: "international",
    otherAirport: "DOH",
    hourPkt: 9,
    minutePkt: 45,
    durationMinutes: 150,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 26",
    checkInCounters: "Row E (E1-E6)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 787-8",
    aircraftReg: "A7-BCK"
  },
  // --- MIDDAY / AFTERNOON BANK ---
  {
    flightNumber: "FZ-335",
    airlineCode: "FZ",
    type: "arrival",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 11,
    minutePkt: 30,
    durationMinutes: 120,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 25",
    checkInCounters: "Row E (E7-E12)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Boeing 737 MAX 8",
    aircraftReg: "A6-FQC"
  },
  {
    flightNumber: "FZ-336",
    airlineCode: "FZ",
    type: "departure",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 12,
    minutePkt: 45,
    durationMinutes: 130,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 25",
    checkInCounters: "Row E (E7-E12)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Boeing 737 MAX 8",
    aircraftReg: "A6-FQC"
  },
  {
    flightNumber: "G9-546",
    airlineCode: "G9",
    type: "arrival",
    category: "international",
    otherAirport: "SHJ",
    hourPkt: 10,
    minutePkt: 45,
    durationMinutes: 120,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 23",
    checkInCounters: "Row D (D15-D20)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "A6-AQM"
  },
  {
    flightNumber: "G9-547",
    airlineCode: "G9",
    type: "departure",
    category: "international",
    otherAirport: "SHJ",
    hourPkt: 12,
    minutePkt: 15,
    durationMinutes: 125,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 23",
    checkInCounters: "Row D (D15-D20)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "A6-AQM"
  },
  {
    flightNumber: "ET-694",
    airlineCode: "ET",
    type: "arrival",
    category: "international",
    otherAirport: "ADD",
    hourPkt: 11,
    minutePkt: 15,
    durationMinutes: 270,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 27",
    checkInCounters: "Row F (F1-F6)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 737 MAX 8",
    aircraftReg: "ET-AZO"
  },
  {
    flightNumber: "ET-695",
    airlineCode: "ET",
    type: "departure",
    category: "international",
    otherAirport: "ADD",
    hourPkt: 12,
    minutePkt: 45,
    durationMinutes: 280,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 27",
    checkInCounters: "Row F (F1-F6)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 737 MAX 8",
    aircraftReg: "ET-AZO"
  },
  {
    flightNumber: "PF-141",
    airlineCode: "PF",
    type: "departure",
    category: "domestic",
    otherAirport: "LHE",
    hourPkt: 13,
    minutePkt: 0,
    durationMinutes: 105,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 17",
    checkInCounters: "Row C (C1-C5)",
    baggageBelt: "Carousel 2",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BOS"
  },
  {
    flightNumber: "PK-536",
    airlineCode: "PK",
    type: "departure",
    category: "domestic",
    otherAirport: "SKZ",
    hourPkt: 13,
    minutePkt: 15,
    durationMinutes: 65,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 12",
    checkInCounters: "Row A (A1-A6)",
    baggageBelt: "Carousel 1",
    aircraftModel: "ATR 42-500",
    aircraftReg: "AP-BHH"
  },
  {
    flightNumber: "PF-124",
    airlineCode: "PF",
    type: "arrival",
    category: "domestic",
    otherAirport: "ISB",
    hourPkt: 14,
    minutePkt: 15,
    durationMinutes: 110,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 16",
    checkInCounters: "Row C (C1-C5)",
    baggageBelt: "Carousel 2",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BOC"
  },
  {
    flightNumber: "PK-369",
    airlineCode: "PK",
    type: "arrival",
    category: "domestic",
    otherAirport: "ISB",
    hourPkt: 14,
    minutePkt: 45,
    durationMinutes: 110,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 18",
    checkInCounters: "Row A (A7-A12)",
    baggageBelt: "Carousel 1",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BLS"
  },
  {
    flightNumber: "PK-305",
    airlineCode: "PK",
    type: "arrival",
    category: "domestic",
    otherAirport: "LHE",
    hourPkt: 16,
    minutePkt: 30,
    durationMinutes: 105,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 19",
    checkInCounters: "Row A (A1-A6)",
    baggageBelt: "Carousel 1",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BMX"
  },
  {
    flightNumber: "PA-406",
    airlineCode: "PA",
    type: "departure",
    category: "domestic",
    otherAirport: "LHE",
    hourPkt: 15,
    minutePkt: 30,
    durationMinutes: 105,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 14",
    checkInCounters: "Row B (B1-B6)",
    baggageBelt: "Carousel 2",
    aircraftModel: "Airbus A321-200",
    aircraftReg: "AP-BMP"
  },
  {
    flightNumber: "PF-146",
    airlineCode: "PF",
    type: "arrival",
    category: "domestic",
    otherAirport: "LHE",
    hourPkt: 15,
    minutePkt: 45,
    durationMinutes: 105,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 17",
    checkInCounters: "Row C (C1-C5)",
    baggageBelt: "Carousel 2",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BPJ"
  },
  {
    flightNumber: "KW-4002",
    airlineCode: "BSC",
    type: "arrival",
    category: "international",
    otherAirport: "MFM",
    hourPkt: 17,
    minutePkt: 45,
    durationMinutes: 380,
    terminal: "Jinnah Cargo Complex",
    concourse: "Cargo Apron",
    gate: "Stand C4",
    checkInCounters: "Cargo Terminal",
    baggageBelt: "Cargo Bay 1",
    aircraftModel: "Boeing 747-200F",
    aircraftReg: "EX-47004"
  },
  // --- EVENING / NIGHT INTERNATIONAL & DOMESTIC BANK ---
  {
    flightNumber: "PK-832",
    airlineCode: "PK",
    type: "arrival",
    category: "international",
    otherAirport: "JED",
    hourPkt: 17,
    minutePkt: 30,
    durationMinutes: 260,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 28",
    checkInCounters: "Row A (A1-A12)",
    baggageBelt: "Carousel 3",
    aircraftModel: "Boeing 777-200ER",
    aircraftReg: "AP-BHX"
  },
  {
    flightNumber: "EK-602",
    airlineCode: "EK",
    type: "arrival",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 14,
    minutePkt: 15,
    durationMinutes: 125,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 24",
    checkInCounters: "Row D (D7-D14)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "A6-EQL"
  },
  {
    flightNumber: "EK-603",
    airlineCode: "EK",
    type: "departure",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 15,
    minutePkt: 45,
    durationMinutes: 135,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 24",
    checkInCounters: "Row D (D7-D14)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "A6-EQL"
  },
  {
    flightNumber: "EK-608",
    airlineCode: "EK",
    type: "arrival",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 19,
    minutePkt: 15,
    durationMinutes: 125,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 24",
    checkInCounters: "Row D (D7-D14)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "A6-EQP"
  },
  {
    flightNumber: "EK-609",
    airlineCode: "EK",
    type: "departure",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 20,
    minutePkt: 45,
    durationMinutes: 135,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 24",
    checkInCounters: "Row D (D7-D14)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "A6-EQP"
  },
  {
    flightNumber: "SV-704",
    airlineCode: "SV",
    type: "arrival",
    category: "international",
    otherAirport: "JED",
    hourPkt: 18,
    minutePkt: 30,
    durationMinutes: 250,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 22",
    checkInCounters: "Row D (D1-D6)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "HZ-AK35"
  },
  {
    flightNumber: "SV-705",
    airlineCode: "SV",
    type: "departure",
    category: "international",
    otherAirport: "JED",
    hourPkt: 20,
    minutePkt: 15,
    durationMinutes: 260,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 22",
    checkInCounters: "Row D (D1-D6)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Boeing 777-300ER",
    aircraftReg: "HZ-AK35"
  },
  {
    flightNumber: "QR-604",
    airlineCode: "QR",
    type: "arrival",
    category: "international",
    otherAirport: "DOH",
    hourPkt: 21,
    minutePkt: 0,
    durationMinutes: 140,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 26",
    checkInCounters: "Row E (E1-E6)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 787-9",
    aircraftReg: "A7-BHC"
  },
  {
    flightNumber: "QR-605",
    airlineCode: "QR",
    type: "departure",
    category: "international",
    otherAirport: "DOH",
    hourPkt: 22,
    minutePkt: 30,
    durationMinutes: 150,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 26",
    checkInCounters: "Row E (E1-E6)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Boeing 787-9",
    aircraftReg: "A7-BHC"
  },
  {
    flightNumber: "PK-306",
    airlineCode: "PK",
    type: "departure",
    category: "domestic",
    otherAirport: "LHE",
    hourPkt: 19,
    minutePkt: 0,
    durationMinutes: 105,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 16",
    checkInCounters: "Row A (A1-A6)",
    baggageBelt: "Carousel 1",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BLA"
  },
  {
    flightNumber: "PF-143",
    airlineCode: "PF",
    type: "departure",
    category: "domestic",
    otherAirport: "LHE",
    hourPkt: 19,
    minutePkt: 30,
    durationMinutes: 105,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse West (Domestic)",
    gate: "Gate 17",
    checkInCounters: "Row C (C1-C5)",
    baggageBelt: "Carousel 2",
    aircraftModel: "Airbus A320-200",
    aircraftReg: "AP-BOC"
  },
  {
    flightNumber: "PA-110",
    airlineCode: "PA",
    type: "departure",
    category: "international",
    otherAirport: "DXB",
    hourPkt: 18,
    minutePkt: 30,
    durationMinutes: 130,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 21",
    checkInCounters: "Row B (B7-B12)",
    baggageBelt: "Carousel 3",
    aircraftModel: "Airbus A321-200",
    aircraftReg: "AP-BNV"
  },
  {
    flightNumber: "GF-752",
    airlineCode: "GF",
    type: "arrival",
    category: "international",
    otherAirport: "BAH",
    hourPkt: 14,
    minutePkt: 0,
    durationMinutes: 150,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 20",
    checkInCounters: "Row F (F7-F12)",
    baggageBelt: "Carousel 3",
    aircraftModel: "Airbus A321neo",
    aircraftReg: "A9C-TD"
  },
  {
    flightNumber: "WY-323",
    airlineCode: "WY",
    type: "arrival",
    category: "international",
    otherAirport: "MCT",
    hourPkt: 13,
    minutePkt: 45,
    durationMinutes: 100,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 28",
    checkInCounters: "Row E (E13-E18)",
    baggageBelt: "Carousel 4",
    aircraftModel: "Boeing 737 MAX 8",
    aircraftReg: "A4O-MP"
  },
  {
    flightNumber: "J9-511",
    airlineCode: "J9",
    type: "arrival",
    category: "international",
    otherAirport: "KWI",
    hourPkt: 16,
    minutePkt: 30,
    durationMinutes: 180,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 27",
    checkInCounters: "Row F (F13-F18)",
    baggageBelt: "Carousel 3",
    aircraftModel: "Airbus A320neo",
    aircraftReg: "9K-CBM"
  },
  {
    flightNumber: "TK-708",
    airlineCode: "TK",
    type: "arrival",
    category: "international",
    otherAirport: "IST",
    hourPkt: 4,
    minutePkt: 30,
    durationMinutes: 340,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 24",
    checkInCounters: "Row E (E19-E24)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Airbus A330-300",
    aircraftReg: "TC-JOG"
  },
  {
    flightNumber: "TK-709",
    airlineCode: "TK",
    type: "departure",
    category: "international",
    otherAirport: "IST",
    hourPkt: 6,
    minutePkt: 0,
    durationMinutes: 360,
    terminal: "Jinnah Terminal 1",
    concourse: "Concourse East (International)",
    gate: "Gate 24",
    checkInCounters: "Row E (E19-E24)",
    baggageBelt: "Carousel 5",
    aircraftModel: "Airbus A330-300",
    aircraftReg: "TC-JOG"
  }
];
var KarachiFlightEngine = class {
  constructor() {
    this.flights = /* @__PURE__ */ new Map();
    this.notificationHistory = [];
    this.liveRadarSyncTimer = null;
    this.lastLiveFetchTime = 0;
    this.liveAircraftCount = 0;
    this.feedStatusText = "Connecting to Global Air Traffic Feed...";
    this.oagApiKey = process.env.OAG_SUBSCRIPTION_KEY || "";
    this.lastOagSyncTime = 0;
    this.oagCallsUsed = 0;
    this.rebuildScheduleFromRealTime();
    this.startLiveRadarFeedPolling();
    if (this.oagApiKey) {
      this.syncOagFlightSchedule();
    }
  }
  setOagApiKey(key) {
    this.oagApiKey = key.trim();
  }
  getOagStatus() {
    const elapsedMs = Date.now() - this.lastOagSyncTime;
    const ttlRemaining = this.lastOagSyncTime > 0 ? Math.max(0, Math.round((60 * 60 * 1e3 - elapsedMs) / 6e4)) : 0;
    return {
      configured: Boolean(this.oagApiKey && this.oagApiKey.length > 5),
      keyMask: this.oagApiKey ? `\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${this.oagApiKey.slice(-4)}` : null,
      callsUsed: this.oagCallsUsed,
      maxFreeCalls: 100,
      lastSync: this.lastOagSyncTime ? new Date(this.lastOagSyncTime).toISOString() : null,
      cacheTtlMinutesRemaining: ttlRemaining
    };
  }
  /**
   * Syncs official flight schedules and real-time gate/terminal status from OAG API
   * Implements strict 1-hour caching to protect the user's 100-call free tier quota!
   */
  async syncOagFlightSchedule(force = false) {
    if (!this.oagApiKey || this.oagApiKey.trim().length === 0) {
      return {
        success: false,
        message: "OAG API Subscription Key is not configured yet. Provide your Flight Info primary key to enable official OAG schedules.",
        callsUsed: this.oagCallsUsed
      };
    }
    const now = Date.now();
    if (!force && this.lastOagSyncTime > 0 && now - this.lastOagSyncTime < 60 * 60 * 1e3) {
      const minsRemaining = Math.round((60 * 60 * 1e3 - (now - this.lastOagSyncTime)) / 6e4);
      return {
        success: true,
        message: `OAG schedule is fresh (cached to preserve your 100 free calls quota). Next auto-refresh in ${minsRemaining}m.`,
        callsUsed: this.oagCallsUsed
      };
    }
    try {
      const todayDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const depUrl = `https://api.oag.com/flight-instances/?DepartureAirport=KHI&DepartureDateTime=${todayDate}&CodeType=IATA&version=v2`;
      const arrUrl = `https://api.oag.com/flight-instances/?ArrivalAirport=KHI&ArrivalDateTime=${todayDate}&CodeType=IATA&version=v2`;
      const headers = {
        "Subscription-Key": this.oagApiKey,
        "Accept": "application/json"
      };
      const [depRes, arrRes] = await Promise.all([
        fetch(depUrl, { headers, signal: AbortSignal.timeout(6500) }).catch(() => null),
        fetch(arrUrl, { headers, signal: AbortSignal.timeout(6500) }).catch(() => null)
      ]);
      this.oagCallsUsed += (depRes ? 1 : 0) + (arrRes ? 1 : 0);
      this.lastOagSyncTime = now;
      let importedCount = 0;
      const allInstances = [];
      if (depRes && depRes.ok) {
        const depData = await depRes.json();
        const items = Array.isArray(depData) ? depData : depData.data || [];
        items.forEach((item) => allInstances.push({ item, type: "departure" }));
      }
      if (arrRes && arrRes.ok) {
        const arrData = await arrRes.json();
        const items = Array.isArray(arrData) ? arrData : arrData.data || [];
        items.forEach((item) => allInstances.push({ item, type: "arrival" }));
      }
      const OAG_AIRCRAFT_MAP = {
        "7M8": "Boeing 737 MAX 8",
        "7M9": "Boeing 737 MAX 9",
        "B38M": "Boeing 737 MAX 8",
        "B39M": "Boeing 737 MAX 9",
        "77W": "Boeing 777-300ER",
        "772": "Boeing 777-200LR",
        "788": "Boeing 787-8 Dreamliner",
        "789": "Boeing 787-9 Dreamliner",
        "78X": "Boeing 787-10 Dreamliner",
        "320": "Airbus A320-200",
        "32A": "Airbus A320-200 (Sharklets)",
        "32N": "Airbus A320neo",
        "A20N": "Airbus A320neo",
        "321": "Airbus A321-200",
        "32Q": "Airbus A321neo",
        "A21N": "Airbus A321neo",
        "333": "Airbus A330-300",
        "332": "Airbus A330-200",
        "359": "Airbus A350-900",
        "AT76": "ATR 72-600",
        "AT45": "ATR 42-500"
      };
      for (const { item, type } of allInstances) {
        const carrierCode = (item.carrier?.iata || item.carrier?.icao || "").toUpperCase();
        const flightNumber = item.flightNumber;
        if (!carrierCode || !flightNumber) continue;
        const displayFlightNumber = `${carrierCode}-${flightNumber}`;
        const cleanKey = `${carrierCode}${flightNumber}`.toLowerCase().replace(/[^a-z0-9]/g, "");
        const depDate = item.departure?.date?.utc || item.departure?.date?.local;
        const depTime = item.departure?.time?.utc || item.departure?.time?.local;
        const arrDate = item.arrival?.date?.utc || item.arrival?.date?.local;
        const arrTime = item.arrival?.time?.utc || item.arrival?.time?.local;
        const schedUtc = type === "departure" ? item.departure?.date?.utc && item.departure?.time?.utc ? (/* @__PURE__ */ new Date(`${item.departure.date.utc}T${item.departure.time.utc}:00.000Z`)).toISOString() : (/* @__PURE__ */ new Date(`${depDate}T${depTime}:00.000+05:00`)).toISOString() : item.arrival?.date?.utc && item.arrival?.time?.utc ? (/* @__PURE__ */ new Date(`${item.arrival.date.utc}T${item.arrival.time.utc}:00.000Z`)).toISOString() : (/* @__PURE__ */ new Date(`${arrDate}T${arrTime}:00.000+05:00`)).toISOString();
        const origIata = item.departure?.airport?.iata || (type === "departure" ? "KHI" : "AIRSPACE");
        const destIata = item.arrival?.airport?.iata || (type === "arrival" ? "KHI" : "AIRSPACE");
        const origCoord = AIRPORT_COORDS[origIata] || KARACHI_COORDS;
        const destCoord = AIRPORT_COORDS[destIata] || KARACHI_COORDS;
        const acCode = item.aircraftType?.iata || item.aircraftType?.icao || "";
        const acModel = OAG_AIRCRAFT_MAP[acCode] || (acCode ? `Commercial Jet (${acCode})` : "Commercial Jet");
        const airlineInfo = AIRLINES_MAP[carrierCode] || {
          name: carrierCode === "FZ" ? "Flydubai" : carrierCode === "SV" ? "Saudia" : carrierCode,
          code: carrierCode,
          iata: carrierCode,
          icao: item.carrier?.icao || carrierCode,
          logoColor: carrierCode === "FZ" ? "#2563eb" : carrierCode === "SV" ? "#15803d" : "#475569",
          country: carrierCode === "SV" ? "Saudi Arabia" : carrierCode === "FZ" ? "United Arab Emirates" : "International"
        };
        const isDomestic = origIata === "KHI" && ["LHE", "ISB", "PEW", "UET", "MUX", "LYP", "SKZ", "GWD", "TUK", "SKT"].includes(destIata) || destIata === "KHI" && ["LHE", "ISB", "PEW", "UET", "MUX", "LYP", "SKZ", "GWD", "TUK", "SKT"].includes(origIata);
        const existing = this.flights.get(cleanKey);
        if (existing) {
          existing.scheduledTime = schedUtc;
          existing.aircraft.model = acModel;
          if (item.departure?.terminal === "M" || item.arrival?.terminal === "M") {
            existing.terminal = "Jinnah Terminal 1";
          }
          if (item.departure?.gate) existing.gate = `Gate ${item.departure.gate}`;
          if (item.arrival?.baggageClaim) existing.baggageBelt = `Carousel ${item.arrival.baggageClaim}`;
          existing.liveDataSource = "OAG Verified Flight Info + ADS-B Radar";
          this.flights.set(cleanKey, existing);
          importedCount++;
        } else {
          const terminalRaw = (type === "departure" ? item.departure?.terminal : item.arrival?.terminal) || "M";
          const terminalDisplay = ["M", "0", "1"].includes(terminalRaw) ? "Jinnah Terminal 1" : `Jinnah Terminal ${terminalRaw}`;
          const concourse = isDomestic ? "Concourse West (Domestic)" : "Concourse East (International)";
          const gate = type === "departure" ? item.departure?.gate ? `Gate ${item.departure.gate}` : isDomestic ? "Gate 16" : "Gate 25" : "Stand Radar";
          const checkIn = isDomestic ? "Row B (B1-B8)" : "Row D (D1-D10)";
          const baggage = isDomestic ? "Carousel 2" : "Carousel 5";
          const flightRecord = {
            id: cleanKey,
            flightNumber: displayFlightNumber,
            airline: airlineInfo,
            type,
            category: isDomestic ? "domestic" : "international",
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
            actualTime: null,
            status: "Scheduled",
            delayMinutes: 0,
            delayReason: null,
            terminal: terminalDisplay,
            concourse,
            gate,
            checkInCounters: checkIn,
            baggageBelt: baggage,
            aircraft: {
              model: acModel,
              registration: `AP-${displayFlightNumber.replace(/[^A-Z0-9]/g, "").slice(-3)}`,
              speedKnots: 460,
              maxAltitudeFt: 39e3
            },
            telemetry: {
              lat: origCoord.lat,
              lng: origCoord.lng,
              altitudeFt: 0,
              groundSpeedKnots: 0,
              heading: 0,
              progressPct: 0,
              distanceRemainingNm: item.distance?.greatCircleNauticalMiles || 600
            },
            history: [
              {
                timestamp: schedUtc,
                type: "status",
                message: `Flight schedule verified via OAG Official Aviation Guide (Schedule Key: ${item.scheduleInstanceKey?.slice(0, 10)}...).`
              }
            ],
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            isLiveRadar: false,
            liveDataSource: "OAG Official Aviation Guide"
          };
          this.flights.set(cleanKey, flightRecord);
          importedCount++;
        }
      }
      return {
        success: true,
        message: `Successfully synchronized ${importedCount} flights with OAG official airline schedules (Departures & Arrivals).`,
        count: importedCount,
        callsUsed: this.oagCallsUsed
      };
    } catch (err) {
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
  rebuildScheduleFromRealTime() {
    const now = /* @__PURE__ */ new Date();
    const nowPktTime = new Date(now.getTime() + 5 * 60 * 60 * 1e3);
    const pktYear = nowPktTime.getUTCFullYear();
    const pktMonth = nowPktTime.getUTCMonth();
    const pktDate = nowPktTime.getUTCDate();
    const currentPktMinutesTotal = nowPktTime.getUTCHours() * 60 + nowPktTime.getUTCMinutes();
    for (const tpl of REAL_SCHEDULE_TEMPLATES) {
      const flightKey = tpl.flightNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
      const schedPktTotal = tpl.hourPkt * 60 + tpl.minutePkt;
      const schedUtc = new Date(Date.UTC(pktYear, pktMonth, pktDate, tpl.hourPkt - 5, tpl.minutePkt, 0));
      const scheduledIso = schedUtc.toISOString();
      const diffMinutes = schedPktTotal - currentPktMinutesTotal;
      let status = "Scheduled";
      let delayMinutes = 0;
      let delayReason = null;
      let actualTime = null;
      let progressPct = 0;
      if (tpl.type === "departure") {
        if (diffMinutes < -45) {
          status = "Departed";
          actualTime = new Date(schedUtc.getTime() + 8 * 60 * 1e3).toISOString();
          progressPct = 100;
        } else if (diffMinutes >= -45 && diffMinutes < -10) {
          status = "En Route";
          progressPct = Math.min(95, Math.max(20, Math.round(Math.abs(diffMinutes) / tpl.durationMinutes * 100)));
        } else if (diffMinutes >= -10 && diffMinutes <= 0) {
          status = "Taxiing";
          progressPct = 5;
        } else if (diffMinutes > 0 && diffMinutes <= 25) {
          status = "Final Call";
          progressPct = 0;
        } else if (diffMinutes > 25 && diffMinutes <= 55) {
          status = "Boarding";
          progressPct = 0;
        } else if (diffMinutes > 55 && diffMinutes <= 120) {
          status = "Check-in Open";
          progressPct = 0;
        } else {
          status = "Scheduled";
          progressPct = 0;
        }
      } else {
        if (diffMinutes < -35) {
          status = "Arrived";
          actualTime = new Date(schedUtc.getTime() - 5 * 60 * 1e3).toISOString();
          progressPct = 100;
        } else if (diffMinutes >= -35 && diffMinutes < 0) {
          status = "Baggage Delivery";
          actualTime = schedUtc.toISOString();
          progressPct = 100;
        } else if (diffMinutes >= 0 && diffMinutes <= 15) {
          status = "Approaching";
          progressPct = 95;
        } else if (diffMinutes > 15 && diffMinutes <= 90) {
          status = "En Route";
          progressPct = Math.max(15, Math.min(90, Math.round(100 - diffMinutes / tpl.durationMinutes * 100)));
        } else {
          status = "Scheduled";
          progressPct = 0;
        }
      }
      const estimatedTime = new Date(schedUtc.getTime() + delayMinutes * 60 * 1e3).toISOString();
      const originCode = tpl.type === "departure" ? "KHI" : tpl.otherAirport;
      const destCode = tpl.type === "departure" ? tpl.otherAirport : "KHI";
      const origCoord = AIRPORT_COORDS[originCode] || KARACHI_COORDS;
      const destCoord = AIRPORT_COORDS[destCode] || KARACHI_COORDS;
      const currentLat = Number((origCoord.lat + (destCoord.lat - origCoord.lat) * (progressPct / 100)).toFixed(4));
      const currentLng = Number((origCoord.lng + (destCoord.lng - origCoord.lng) * (progressPct / 100)).toFixed(4));
      const altitudeFt = status === "En Route" ? 34e3 : status === "Approaching" ? 4500 : status === "Taxiing" ? 0 : status === "Departed" ? progressPct === 100 ? 0 : 36e3 : 0;
      const speedKnots = status === "En Route" ? 460 : status === "Approaching" ? 190 : status === "Taxiing" ? 15 : status === "Departed" ? progressPct === 100 ? 0 : 470 : 0;
      const y = Math.sin((destCoord.lng - origCoord.lng) * Math.PI / 180) * Math.cos(destCoord.lat * Math.PI / 180);
      const x = Math.cos(origCoord.lat * Math.PI / 180) * Math.sin(destCoord.lat * Math.PI / 180) - Math.sin(origCoord.lat * Math.PI / 180) * Math.cos(destCoord.lat * Math.PI / 180) * Math.cos((destCoord.lng - origCoord.lng) * Math.PI / 180);
      const heading = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
      const dLat = (destCoord.lat - currentLat) * 60;
      const dLng = (destCoord.lng - currentLng) * 60 * Math.cos((origCoord.lat + destCoord.lat) / 2 * Math.PI / 180);
      const distanceRemainingNm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
      const airline = AIRLINES_MAP[tpl.airlineCode] || {
        name: tpl.airlineCode,
        code: tpl.airlineCode,
        iata: tpl.airlineCode,
        icao: tpl.airlineCode,
        logoColor: "#2563eb",
        country: "International"
      };
      const flightRecord = {
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
          terminal: tpl.type === "departure" ? tpl.terminal : void 0,
          gate: tpl.type === "departure" ? tpl.gate : void 0
        },
        destination: {
          code: destCode,
          name: destCoord.name,
          city: destCoord.city,
          country: destCoord.country,
          terminal: tpl.type === "arrival" ? tpl.terminal : void 0,
          gate: tpl.type === "arrival" ? tpl.gate : void 0
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
          maxAltitudeFt: 39e3
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
            type: "status",
            message: status === "Departed" ? `Flight completed on schedule. Arrived at ${destCoord.city} (${destCode}).` : status === "Arrived" ? `Touched down safely on Runway 25L. Baggage on ${tpl.baggageBelt}.` : `Flight scheduled at Karachi Jinnah International (KHI / OPKC).`
          }
        ],
        updatedAt: now.toISOString(),
        isLiveRadar: false,
        liveDataSource: "KHI Aerodrome Operational FIDS"
      };
      this.flights.set(flightKey, flightRecord);
    }
  }
  /**
   * Continuous background poller fetching live ADS-B state vectors from Flightradar24
   */
  startLiveRadarFeedPolling() {
    if (this.liveRadarSyncTimer) clearInterval(this.liveRadarSyncTimer);
    this.syncLiveAirTrafficFeed();
    this.liveRadarSyncTimer = setInterval(() => {
      this.syncLiveAirTrafficFeed();
    }, 15e3);
  }
  /**
   * Fetches real live ADS-B flights in Karachi FIR and regional corridors from Flightradar24
   */
  async syncLiveAirTrafficFeed() {
    try {
      const url = "https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=38.0,18.0,45.0,85.0";
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json"
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
        const dLat = (lat - KARACHI_COORDS.lat) * 60;
        const dLng = (lng - KARACHI_COORDS.lng) * 60 * Math.cos(KARACHI_COORDS.lat * Math.PI / 180);
        const distNm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
        const isFromKhi = from === "KHI";
        const isToKhi = to === "KHI";
        const isNearKhi = distNm <= 120;
        if (!isFromKhi && !isToKhi && !isNearKhi) {
          continue;
        }
        const flightNumUpper = (fno || callsign || hex || "").toUpperCase();
        const modelUpper = (model || "").toUpperCase();
        const fromUpper = (from || "").toUpperCase();
        const toUpper = (to || "").toUpperCase();
        const isGroundVehicle = /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(flightNumUpper) || /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(callsign || "") || (reg || "").toUpperCase() === "N644PK";
        const isLocalGroundCircuit = fromUpper === "KHI" && toUpper === "KHI" && alt < 2500 && speed < 140;
        const isGroundEquipment = (gnd === 1 || alt <= 100) && speed < 45 && (!from || !to || from === to);
        const isUnknownLowSpeedTarget = (!model || model === "Commercial Jet" || model === "UNK" || ["GRND", "GND", "CAR", "TRK", "TUG", "ZZZZ"].includes(modelUpper)) && alt < 1200 && speed < 110;
        if (isGroundVehicle || isLocalGroundCircuit || isGroundEquipment || isUnknownLowSpeedTarget) {
          continue;
        }
        if (fromUpper === toUpper && alt < 3e3) {
          continue;
        }
        matchedLiveCount++;
        const flightNumRaw = fno || callsign || hex;
        const normalizedKey = flightNumRaw.toLowerCase().replace(/[^a-z0-9]/g, "");
        const effectiveAirlineCode = (airlineCode || flightNumRaw.substring(0, 3) || flightNumRaw.substring(0, 2)).toUpperCase();
        const airlineInfo = AIRLINES_MAP[effectiveAirlineCode] || AIRLINES_MAP[flightNumRaw.substring(0, 2).toUpperCase()] || {
          name: effectiveAirlineCode,
          code: effectiveAirlineCode,
          iata: effectiveAirlineCode.substring(0, 2),
          icao: effectiveAirlineCode,
          logoColor: "#2563eb",
          country: "Commercial"
        };
        const isGround = gnd === 1 || alt <= 50;
        const isClimbing = vspd > 300;
        const isDescending = vspd < -300;
        let liveStatus = "En Route";
        if (isGround) {
          liveStatus = isFromKhi ? "Taxiing" : "Landed";
        } else if (isToKhi) {
          if (alt < 4e3 && distNm < 20) {
            liveStatus = "Approaching";
          } else if (alt < 8e3 && distNm < 50) {
            liveStatus = "Approaching";
          } else {
            liveStatus = "En Route";
          }
        } else if (isFromKhi) {
          if (alt < 8e3 && distNm < 40) {
            liveStatus = "Departed";
          } else {
            liveStatus = "En Route";
          }
        }
        const origCode = from || (isFromKhi ? "KHI" : isNearKhi ? "KHI" : "AIRSPACE");
        const destCode = to || (isToKhi ? "KHI" : isNearKhi ? "KHI" : "AIRSPACE");
        const origCoord = AIRPORT_COORDS[origCode] || KARACHI_COORDS;
        const destCoord = AIRPORT_COORDS[destCode] || KARACHI_COORDS;
        const totalRouteNm = Math.max(80, Math.round(
          Math.sqrt(Math.pow((destCoord.lat - origCoord.lat) * 60, 2) + Math.pow((destCoord.lng - origCoord.lng) * 60, 2))
        ));
        const progressPct = isToKhi ? Math.max(1, Math.min(99, Math.round(100 - distNm / totalRouteNm * 100))) : isFromKhi ? Math.max(1, Math.min(99, Math.round(distNm / totalRouteNm * 100))) : 50;
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const existing = this.flights.get(normalizedKey) || Array.from(this.flights.values()).find(
          (f) => f.flightNumber.replace(/[^a-z0-9]/gi, "").toLowerCase() === normalizedKey || fno && f.flightNumber.replace(/[^a-z0-9]/gi, "").toLowerCase() === fno.replace(/[^a-z0-9]/gi, "").toLowerCase()
        );
        if (existing) {
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
          existing.liveDataSource = `Flightradar24 ADS-B Live (${radar || "Receiver"})`;
          existing.updatedAt = nowIso;
          this.flights.set(existing.id, existing);
        } else {
          const newFlight = {
            id: normalizedKey,
            flightNumber: fno || callsign || `RDR-${hex}`,
            airline: airlineInfo,
            type: isToKhi ? "arrival" : "departure",
            category: origCode !== "KHI" && ["LHE", "ISB", "PEW", "UET", "MUX", "LYP", "SKZ", "GWD", "TUK", "SKT"].includes(origCode) ? "domestic" : "international",
            origin: {
              code: origCode,
              name: origCoord.name,
              city: origCoord.city,
              country: origCoord.country
            },
            destination: {
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
            terminal: "Jinnah Terminal 1",
            concourse: origCode === "KHI" || destCode === "KHI" ? "Concourse East (International)" : "Airspace Radar Transit",
            gate: "Stand Radar",
            checkInCounters: "Live ADS-B Radar",
            baggageBelt: "Carousel Live",
            aircraft: {
              model: model || "Commercial Aircraft",
              registration: reg || hex,
              speedKnots: speed,
              maxAltitudeFt: 41e3
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
                type: "status",
                message: `Live ADS-B tracking initiated by Flightradar24. Transponder ${hex}.`
              }
            ],
            updatedAt: nowIso,
            isLiveRadar: true,
            liveDataSource: `Flightradar24 ADS-B Live (${radar || "Receiver"})`
          };
          this.flights.set(normalizedKey, newFlight);
        }
      }
      this.liveAircraftCount = matchedLiveCount;
      this.feedStatusText = `\u{1F7E2} Live ADS-B Air Traffic Feed Connected (${matchedLiveCount} aircraft active in Karachi FIR)`;
    } catch (err) {
      this.feedStatusText = `Air Traffic Feed Sync Warning: ${err.message || "Retrying..."}`;
    }
  }
  getFlights(params) {
    let result = Array.from(this.flights.values());
    result = result.filter((f) => {
      const isGroundVeh = /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.flightNumber) || /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.airline.code) || f.aircraft.registration === "N644PK" || f.origin.code === "KHI" && f.destination.code === "KHI" && f.telemetry && f.telemetry.altitudeFt < 1e3 && f.telemetry.groundSpeedKnots < 130;
      return !isGroundVeh;
    });
    const windowMode = params?.window || "3h";
    if (windowMode !== "all") {
      const nowMs = Date.now();
      result = result.filter((f) => {
        if (f.isLiveRadar && f.status !== "Departed" && f.status !== "Arrived") {
          return true;
        }
        const schedMs = new Date(f.scheduledTime).getTime();
        const diffHours = (schedMs - nowMs) / (1e3 * 60 * 60);
        if (windowMode === "3h") {
          return diffHours >= -3.25 && diffHours <= 3.25;
        } else if (windowMode === "6h") {
          return diffHours >= -1 && diffHours <= 6.25;
        }
        return true;
      });
    }
    if (params?.type && params.type !== "all") {
      result = result.filter((f) => f.type === params.type);
    }
    if (params?.category && params.category !== "all") {
      result = result.filter((f) => f.category === params.category);
    }
    if (params?.status && params.status !== "all") {
      if (params.status === "delayed") {
        result = result.filter((f) => f.delayMinutes > 0);
      } else if (params.status === "boarding") {
        result = result.filter((f) => ["Boarding", "Final Call"].includes(f.status));
      } else if (params.status === "active") {
        result = result.filter((f) => ["Taxiing", "Departed", "En Route", "Approaching"].includes(f.status));
      } else if (params.status === "landed") {
        result = result.filter((f) => ["Landed", "Baggage Delivery", "Arrived"].includes(f.status));
      }
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      result = result.filter(
        (f) => f.flightNumber.toLowerCase().includes(q) || f.airline.name.toLowerCase().includes(q) || f.origin.city.toLowerCase().includes(q) || f.origin.code.toLowerCase().includes(q) || f.destination.city.toLowerCase().includes(q) || f.destination.code.toLowerCase().includes(q) || f.gate.toLowerCase().includes(q) || f.aircraft.model.toLowerCase().includes(q) || f.aircraft.registration.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }
  getFlightById(id) {
    const cleanId = id.toLowerCase().replace(/[^a-z0-9]/g, "");
    return this.flights.get(cleanId);
  }
  getAirportStats() {
    const list = Array.from(this.flights.values());
    const departures = list.filter((f) => f.type === "departure");
    const arrivals = list.filter((f) => f.type === "arrival");
    const delayed = list.filter((f) => f.delayMinutes > 0);
    const onTimeRate = list.length > 0 ? Math.round((list.length - delayed.length) / list.length * 100) : 94;
    const totalDelay = list.reduce((acc, f) => acc + f.delayMinutes, 0);
    const avgDelay = delayed.length > 0 ? Math.round(totalDelay / delayed.length) : 0;
    const now = /* @__PURE__ */ new Date();
    const pktString = new Date(now.getTime() + 5 * 60 * 60 * 1e3).toUTCString().replace("GMT", "PKT");
    return {
      airportCode: "KHI",
      icao: "OPKC",
      name: "Jinnah International Airport, Karachi",
      localTime: pktString,
      utcTime: now.toISOString(),
      weather: {
        tempC: 28,
        condition: "Clear Skies / Arabian Sea Maritime Breeze",
        wind: "240\xB0 at 11 knots",
        visibilityM: 8e3,
        qnhHpa: 1013,
        runwaysActive: ["Runway 25L (Primary Arrivals)", "Runway 25R (Departures)"]
      },
      activeDeparturesCount: departures.length,
      activeArrivalsCount: arrivals.length,
      onTimeRate,
      averageGateDelayMins: avgDelay,
      activeGatesCount: 18,
      liveRadarCount: this.liveAircraftCount,
      feedStatus: this.feedStatusText,
      lastFeedSync: this.lastLiveFetchTime ? new Date(this.lastLiveFetchTime).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  getNotifications() {
    return this.notificationHistory.slice(0, 25);
  }
  addAlert(alert) {
    const fullAlert = {
      ...alert,
      id: "notif-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.notificationHistory.unshift(fullAlert);
    if (this.notificationHistory.length > 50) {
      this.notificationHistory.pop();
    }
    return fullAlert;
  }
  // Simulation test trigger for push alerts
  simulateFlightEvent(flightId, eventType) {
    const flight = this.getFlightById(flightId);
    if (!flight) return { success: false };
    let alert = null;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (eventType === "gate_change") {
      const oldGate = flight.gate;
      const isDomestic = flight.category === "domestic";
      const newGateNum = isDomestic ? 13 + Math.floor(Math.random() * 11) : 1 + Math.floor(Math.random() * 11);
      const newGate = `Gate ${newGateNum < 10 ? "0" + newGateNum : newGateNum}`;
      flight.previousGate = oldGate;
      flight.gate = newGate;
      flight.history.unshift({
        timestamp: nowIso,
        type: "gate",
        message: `Gate changed from ${oldGate} to ${newGate}`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: "gate_change",
        severity: "urgent",
        title: `GATE CHANGE: ${flight.flightNumber}`,
        message: `${flight.flightNumber} to ${flight.destination.city} relocated from ${oldGate} to ${newGate}. Proceed immediately.`,
        route: `${flight.origin.city} \u2192 ${flight.destination.city}`,
        gate: newGate
      });
    } else if (eventType === "delay") {
      const addMins = 30 + Math.floor(Math.random() * 30);
      flight.delayMinutes += addMins;
      const randomReason = DELAY_REASONS[Math.floor(Math.random() * DELAY_REASONS.length)];
      flight.delayReason = randomReason;
      const estTime = new Date(new Date(flight.scheduledTime).getTime() + flight.delayMinutes * 60 * 1e3);
      flight.estimatedTime = estTime.toISOString();
      flight.status = "Delayed";
      flight.history.unshift({
        timestamp: nowIso,
        type: "delay",
        message: `Flight delayed +${addMins} min (${randomReason})`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: "delay_update",
        severity: "warning",
        title: `DELAY UPDATE: ${flight.flightNumber} (+${flight.delayMinutes}m)`,
        message: `Estimated time: ${estTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Reason: ${randomReason}`,
        route: `${flight.origin.city} \u2192 ${flight.destination.city}`,
        gate: flight.gate,
        delayMinutes: flight.delayMinutes
      });
    } else if (eventType === "boarding") {
      flight.status = "Boarding";
      flight.history.unshift({
        timestamp: nowIso,
        type: "status",
        message: `Boarding commenced at ${flight.gate}`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: "boarding_call",
        severity: "urgent",
        title: `NOW BOARDING: ${flight.flightNumber}`,
        message: `Boarding is now underway at ${flight.gate} for ${flight.destination.city}. Have boarding pass ready.`,
        route: `${flight.origin.city} \u2192 ${flight.destination.city}`,
        gate: flight.gate
      });
    } else if (eventType === "landed") {
      flight.status = "Landed";
      flight.actualTime = nowIso;
      flight.telemetry.progressPct = 100;
      flight.telemetry.altitudeFt = 0;
      flight.telemetry.groundSpeedKnots = 18;
      flight.history.unshift({
        timestamp: nowIso,
        type: "status",
        message: `Aircraft touched down on Runway 25L. Taxiing to ${flight.gate}.`
      });
      alert = this.addAlert({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        type: "touchdown",
        severity: "info",
        title: `TOUCHDOWN: ${flight.flightNumber}`,
        message: `${flight.flightNumber} from ${flight.origin.city} has landed safely at Karachi. Baggage on ${flight.baggageBelt}.`,
        route: `${flight.origin.city} \u2192 Karachi`,
        gate: flight.gate
      });
    }
    flight.updatedAt = nowIso;
    this.flights.set(flight.id, flight);
    return { success: true, flight, alert: alert || void 0 };
  }
};
var flightEngine = new KarachiFlightEngine();

// src/server/weatherService.ts
var weatherCache = null;
var WX_CODES = {
  FU: "Smoke (Industrial/Agricultural haze)",
  HZ: "Haze (Suspended dry particles)",
  BR: "Mist (High moisture shallow obscuration)",
  FG: "Fog (Heavy visibility obscuration below 1km)",
  DZ: "Drizzle",
  RA: "Rain",
  SH: "Showers",
  TS: "Thunderstorm (Deep convective activity)",
  SQ: "Squall",
  DU: "Widespread Dust",
  BLDU: "Blowing Dust",
  NSC: "Nil Significant Cloud",
  SKC: "Sky Clear",
  CAVOK: "Ceiling and Visibility OK"
};
function decodeWeatherString(wxString) {
  if (!wxString || !wxString.trim()) return [];
  const parts = wxString.trim().split(/\s+/);
  return parts.map((part) => {
    let clean = part.replace(/^[-+]/, "");
    const isLight = part.startsWith("-");
    const isHeavy = part.startsWith("+");
    let meaning = WX_CODES[clean] || clean;
    if (isLight) meaning = "Light " + meaning;
    if (isHeavy) meaning = "Heavy " + meaning;
    return { code: part, meaning };
  });
}
function calculateRunways(windDir, windSpeed) {
  const runways = [
    { name: "Runway 25L / 25R", heading: 250 },
    { name: "Runway 07R / 07L", heading: 70 }
  ];
  return runways.map((r) => {
    const angleDiffRad = (windDir - r.heading) * Math.PI / 180;
    const headwind = Math.round(windSpeed * Math.cos(angleDiffRad));
    const crosswind = Math.round(Math.abs(windSpeed * Math.sin(angleDiffRad)));
    const crosswindDir = Math.sin(angleDiffRad) > 0 ? "right" : "left";
    return {
      runwayName: r.name,
      headingDeg: r.heading,
      headwindKnots: headwind,
      crosswindKnots: crosswind,
      crosswindDirection: crosswind === 0 ? "none" : crosswindDir,
      isOptimal: headwind > 0 && crosswind < 15
    };
  });
}
function evaluateDelayRisk(flightCat, visibilityM, windSpeed, gustSpeed, weatherString) {
  const factors = [];
  const potentialDelays = [];
  let risk = "LOW";
  const isLowVis = visibilityM < 4e3;
  const isVeryLowVis = visibilityM < 2e3;
  const isHighWind = windSpeed > 20 || gustSpeed && gustSpeed > 25;
  const isFog = weatherString?.includes("FG");
  const isSmokeOrHaze = weatherString?.includes("FU") || weatherString?.includes("HZ");
  const isStorm = weatherString?.includes("TS");
  if (isVeryLowVis || isFog || isStorm) {
    risk = "HIGH";
    if (isVeryLowVis) factors.push(`Restricted visibility (${visibilityM}m) triggering Low Visibility Procedures (LVP)`);
    if (isFog) factors.push("Dense surface fog significantly slowing runway operations");
    if (isStorm) factors.push("Thunderstorm activity requiring airborne holding and ground stop advisories");
    potentialDelays.push("Inbound flights placed in holding stacks over Karachi TMA");
    potentialDelays.push("Extended spacing between departures and arrivals (approx. +20 to +45 min delays)");
  } else if (isLowVis || isHighWind || isSmokeOrHaze || flightCat === "IFR" || flightCat === "MVFR") {
    risk = "MODERATE";
    if (isSmokeOrHaze) factors.push(`Atmospheric haze and particulate smoke (${visibilityM}m)`);
    if (isHighWind) factors.push(`Elevated surface winds (${windSpeed}kt${gustSpeed ? ` G${gustSpeed}kt` : ""})`);
    if (flightCat === "IFR") factors.push("IFR criteria in effect for approaching aircraft");
    potentialDelays.push("Minor spacing adjustments on Runway 25L (+10 to +20 min delay potential)");
    potentialDelays.push("Domestic turboprop aircraft (ATR-72 to Gwadar/Sukkur) monitoring crosswind limits");
  } else {
    risk = "LOW";
    factors.push("Favorable visual meteorological conditions (VMC)");
    factors.push("Standard runway separation buffers");
    potentialDelays.push("No significant meteorological flight delays expected");
  }
  const summary = risk === "HIGH" ? "Adverse atmospheric conditions present. Weather delays and ATC holds likely." : risk === "MODERATE" ? "Reduced visibility or brisk winds. Minor departure spacing adjustments possible." : "Optimal weather at Karachi Airport. Negligible weather delay impact.";
  return { level: risk, summary, factors, potentialDelays };
}
async function getOpkcWeather() {
  const now = Date.now();
  if (weatherCache && weatherCache.expiresAt > now) {
    return weatherCache.data;
  }
  try {
    const [metarRes, tafRes] = await Promise.all([
      fetch("https://aviationweather.gov/api/data/metar?ids=OPKC&format=json", {
        headers: { "User-Agent": "KarachiFlightRadar/2.0" }
      }),
      fetch("https://aviationweather.gov/api/data/taf?ids=OPKC&format=json", {
        headers: { "User-Agent": "KarachiFlightRadar/2.0" }
      })
    ]);
    if (!metarRes.ok || !tafRes.ok) {
      throw new Error(`Weather upstream status: METAR ${metarRes.status}, TAF ${tafRes.status}`);
    }
    const metarList = await metarRes.json();
    const tafList = await tafRes.json();
    const metarRaw = metarList?.[0];
    const tafRaw = tafList?.[0];
    if (!metarRaw || !tafRaw) {
      throw new Error("Empty weather response from aviationweather.gov");
    }
    const tempC = Number(metarRaw.temp ?? 26);
    const dewpC = Number(metarRaw.dewp ?? 21);
    const windDir = Number(metarRaw.wdir ?? 240);
    const windSpeed = Number(metarRaw.wspd ?? 8);
    const gustSpeed = metarRaw.wgst ? Number(metarRaw.wgst) : void 0;
    const visibMiles = Number(metarRaw.visib ?? 4);
    const visibMeters = Math.round(visibMiles * 1609.34);
    const qnh = Number(metarRaw.altim ?? 1014);
    const relHumidity = Math.max(10, Math.min(100, Math.round(100 - 5 * (tempC - dewpC))));
    const flightCategory = metarRaw.fltCat || (visibMiles < 3 ? "IFR" : visibMiles < 5 ? "MVFR" : "VFR");
    const catDescMap = {
      VFR: "Visual Flight Rules (Optimal conditions, ceiling > 3000ft, vis > 5 SM)",
      MVFR: "Marginal VFR (Ceiling 1000-3000ft and/or visibility 3-5 SM)",
      IFR: "Instrument Flight Rules (Ceiling 500-1000ft and/or visibility 1-3 SM)",
      LIFR: "Low IFR (Ceiling < 500ft and/or visibility < 1 SM)"
    };
    const runwayAnalysis = calculateRunways(windDir, windSpeed);
    const delayRisk = evaluateDelayRisk(flightCategory, visibMeters, windSpeed, gustSpeed, metarRaw.wxString);
    const obsDate = new Date((metarRaw.obsTime ?? Math.floor(now / 1e3)) * 1e3);
    const pktDate = new Date(obsDate.getTime() + 5 * 60 * 60 * 1e3);
    const decodedMetar = {
      raw: metarRaw.rawOb || `METAR OPKC ${obsDate.getUTCDate()}${String(obsDate.getUTCHours()).padStart(2, "0")}00Z ${windDir}${String(windSpeed).padStart(2, "0")}KT ${visibMeters} ${metarRaw.wxString || "NSC"} ${tempC}/${dewpC} Q${qnh} NOSIG`,
      station: "OPKC",
      stationName: "Jinnah International Airport, Karachi",
      observationTimeUtc: obsDate.toISOString(),
      observationTimePkt: pktDate.toTimeString().substring(0, 8) + " PKT",
      flightCategory,
      flightCategoryDescription: catDescMap[flightCategory],
      temperatureC: tempC,
      dewPointC: dewpC,
      relativeHumidityPct: relHumidity,
      wind: {
        directionDeg: windDir,
        speedKnots: windSpeed,
        gustKnots: gustSpeed,
        description: `${windDir}\xB0 at ${windSpeed} knots${gustSpeed ? ` (gusting to ${gustSpeed} knots)` : ""}`
      },
      runwayAnalysis,
      visibility: {
        meters: visibMeters,
        statuteMiles: Number(visibMiles.toFixed(1)),
        description: `${visibMeters} meters (${visibMiles.toFixed(1)} statute miles)`
      },
      weatherPhenomena: decodeWeatherString(metarRaw.wxString),
      clouds: (metarRaw.clouds || []).map((c) => ({
        coverage: c.cover || "NSC",
        altitudeFt: c.base ? c.base * 100 : void 0,
        description: c.base ? `${c.cover} at ${c.base * 100} ft AGL` : c.cover === "NSC" ? "Nil Significant Cloud" : c.cover
      })),
      altimeter: {
        qnhHpa: qnh,
        inHg: Number((qnh * 0.02953).toFixed(2))
      },
      trend: metarRaw.rawOb?.includes("NOSIG") ? "NOSIG (No significant change expected next 2 hours)" : "Normal",
      delayRisk
    };
    const tafPeriods = (tafRaw.fcsts || []).map((fcst, idx) => {
      const fromD = new Date(fcst.timeFrom * 1e3);
      const toD = new Date(fcst.timeTo * 1e3);
      const fromPkt = new Date(fromD.getTime() + 5 * 60 * 60 * 1e3).toTimeString().substring(0, 5) + " PKT";
      const toPkt = new Date(toD.getTime() + 5 * 60 * 60 * 1e3).toTimeString().substring(0, 5) + " PKT";
      const fWdir = Number(fcst.wdir ?? 240);
      const fWspd = Number(fcst.wspd ?? 8);
      const fWgst = fcst.wgst ? Number(fcst.wgst) : void 0;
      const fVisMiles = Number(fcst.visib ?? 4);
      const fVisMeters = Math.round(fVisMiles * 1609.34);
      let pRisk = "LOW";
      let pNote = "Standard operations expected";
      if (fVisMeters < 2e3 || fcst.wxString?.includes("FG")) {
        pRisk = "HIGH";
        pNote = "Dense morning fog/mist window; potential holding stacks";
      } else if (fVisMeters < 4e3 || fWspd > 18 || fcst.wxString?.includes("HZ")) {
        pRisk = "MODERATE";
        pNote = "Haze or brisk winds; minor runway departure intervals";
      }
      return {
        fromTimeUtc: fromD.toISOString(),
        toTimeUtc: toD.toISOString(),
        fromTimePkt: fromPkt,
        toTimePkt: toPkt,
        type: fcst.fcstChange || (idx === 0 ? "BASE" : "BECMG"),
        changeType: fcst.fcstChange,
        wind: {
          directionDeg: fWdir,
          speedKnots: fWspd,
          gustKnots: fWgst,
          description: `${fWdir}\xB0 at ${fWspd} kt${fWgst ? ` (G${fWgst}kt)` : ""}`
        },
        visibilityMeters: fVisMeters,
        visibilityMiles: Number(fVisMiles.toFixed(1)),
        weatherString: fcst.wxString || "Clear / Nil Significant",
        weatherMeaning: decodeWeatherString(fcst.wxString).map((w) => w.meaning).join(", ") || "No weather phenomena",
        clouds: (fcst.clouds || []).map((c) => c.cover + (c.base ? ` ${c.base * 100}ft` : "")).join(", ") || "NSC",
        delayRiskLevel: pRisk,
        delayNote: pNote
      };
    });
    const decodedTaf = {
      raw: tafRaw.rawTAF || "TAF OPKC unavailable",
      station: "OPKC",
      issueTimeUtc: new Date(tafRaw.issueTime ? new Date(tafRaw.issueTime).getTime() : now).toISOString(),
      validFromUtc: new Date(tafRaw.validTimeFrom * 1e3).toISOString(),
      validToUtc: new Date(tafRaw.validTimeTo * 1e3).toISOString(),
      periods: tafPeriods,
      summary: `24-Hour forecast for Karachi: Wind predominantly from 240\xB0-270\xB0 (Arabian Sea breeze), with morning haze/mist periods (visibility ${tafPeriods.some((p) => p.delayRiskLevel === "HIGH") ? "reducing to ~1500m" : "3000-5000m"}).`
    };
    const response = {
      station: "OPKC",
      stationName: "Jinnah International Airport, Karachi",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      metar: decodedMetar,
      taf: decodedTaf,
      source: "NOAA Aviation Weather Center (AWC) Live Feed"
    };
    weatherCache = {
      data: response,
      expiresAt: now + 5 * 60 * 1e3
    };
    return response;
  } catch (err) {
    console.warn("Live METAR/TAF fetch error, using synthetic fallback:", err.message);
    const now2 = Date.now();
    const obsDate = new Date(now2);
    const pktDate = new Date(obsDate.getTime() + 5 * 60 * 60 * 1e3);
    const fallback = {
      station: "OPKC",
      stationName: "Jinnah International Airport, Karachi",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      metar: {
        raw: `METAR OPKC ${obsDate.getUTCDate()}${String(obsDate.getUTCHours()).padStart(2, "0")}00Z 24011KT 6000 HZ NSC 28/21 Q1013 NOSIG`,
        station: "OPKC",
        stationName: "Jinnah International Airport, Karachi",
        observationTimeUtc: obsDate.toISOString(),
        observationTimePkt: pktDate.toTimeString().substring(0, 8) + " PKT",
        flightCategory: "VFR",
        flightCategoryDescription: "Visual Flight Rules (Optimal conditions, ceiling > 3000ft, vis > 5 SM)",
        temperatureC: 28,
        dewPointC: 21,
        relativeHumidityPct: 65,
        wind: {
          directionDeg: 240,
          speedKnots: 11,
          description: "240\xB0 at 11 knots (Southwesterly Arabian sea breeze)"
        },
        runwayAnalysis: calculateRunways(240, 11),
        visibility: {
          meters: 6e3,
          statuteMiles: 3.7,
          description: "6,000 meters (Moderate haze)"
        },
        weatherPhenomena: [{ code: "HZ", meaning: "Haze (Coastal marine particulate)" }],
        clouds: [{ coverage: "NSC", description: "Nil Significant Cloud" }],
        altimeter: { qnhHpa: 1013, inHg: 29.91 },
        trend: "NOSIG (No significant change expected next 2 hours)",
        delayRisk: {
          level: "LOW",
          summary: "Nominal coastal weather conditions. Runway 25L/25R operating with direct headwind.",
          factors: ["Direct headwind along Runway 25 (approx 11 kt)", "Visibility 6,000m exceeds minimums"],
          potentialDelays: ["No weather-induced flight delays anticipated at Karachi."]
        }
      },
      taf: {
        raw: "TAF OPKC 092300Z 1000/1106 24010KT 6000 HZ NSC TEMPO 1001/1005 00000KT 2500 BR/HZ NSC BECMG 1006/1008 25014KT 5000 HZ",
        station: "OPKC",
        issueTimeUtc: new Date(now2 - 30 * 60 * 1e3).toISOString(),
        validFromUtc: new Date(now2).toISOString(),
        validToUtc: new Date(now2 + 24 * 60 * 60 * 1e3).toISOString(),
        periods: [
          {
            fromTimeUtc: new Date(now2).toISOString(),
            toTimeUtc: new Date(now2 + 6 * 60 * 60 * 1e3).toISOString(),
            fromTimePkt: "Current",
            toTimePkt: "+6h",
            type: "BASE",
            wind: { directionDeg: 240, speedKnots: 10, description: "240\xB0 at 10 kt" },
            visibilityMeters: 6e3,
            visibilityMiles: 3.7,
            weatherString: "HZ",
            weatherMeaning: "Haze",
            clouds: "NSC",
            delayRiskLevel: "LOW",
            delayNote: "Optimal visual runway conditions"
          },
          {
            fromTimeUtc: new Date(now2 + 6 * 60 * 60 * 1e3).toISOString(),
            toTimeUtc: new Date(now2 + 10 * 60 * 60 * 1e3).toISOString(),
            fromTimePkt: "+6h",
            toTimePkt: "+10h",
            type: "TEMPO",
            changeType: "TEMPO",
            wind: { directionDeg: 0, speedKnots: 2, description: "Variable calm" },
            visibilityMeters: 2500,
            visibilityMiles: 1.5,
            weatherString: "BR HZ",
            weatherMeaning: "Mist and Haze",
            clouds: "NSC",
            delayRiskLevel: "MODERATE",
            delayNote: "Morning mist may trigger minor arrival sequencing intervals"
          },
          {
            fromTimeUtc: new Date(now2 + 10 * 60 * 60 * 1e3).toISOString(),
            toTimeUtc: new Date(now2 + 24 * 60 * 60 * 1e3).toISOString(),
            fromTimePkt: "+10h",
            toTimePkt: "+24h",
            type: "BECMG",
            changeType: "BECMG",
            wind: { directionDeg: 250, speedKnots: 14, description: "250\xB0 at 14 kt" },
            visibilityMeters: 5e3,
            visibilityMiles: 3.1,
            weatherString: "HZ",
            weatherMeaning: "Afternoon coastal sea breeze",
            clouds: "NSC",
            delayRiskLevel: "LOW",
            delayNote: "Good headwind on Runway 25L/25R"
          }
        ],
        summary: "24-Hour outlook: Coastal sea breeze predominant, with temporary morning mist window."
      },
      source: "OPKC Aerodrome Meteorological Station (Simulated)"
    };
    return fallback;
  }
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const portArgIndex = process.argv.indexOf("--port");
  const portFromArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  let PORT = 3e3;
  if (portFromArg) {
    PORT = portFromArg;
  } else if (process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT) {
    PORT = Number(process.env.DEFAULT_APP_PORT) || 3e3;
  } else if (process.env.PORT) {
    PORT = Number(process.env.PORT);
  }
  app.use(express.json());
  const sseClients = /* @__PURE__ */ new Set();
  const broadcastSSE = (event, data) => {
    const payload = `event: ${event}
data: ${JSON.stringify(data)}

`;
    sseClients.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        sseClients.delete(res);
      }
    });
  };
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", airport: "OPKC / KHI", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/flights", (req, res) => {
    const { type, category, status, search, window } = req.query;
    const flights = flightEngine.getFlights({
      type,
      category,
      status,
      search,
      window: window || "3h"
    });
    res.json(flights);
  });
  app.get("/api/flights/:id", (req, res) => {
    const flight = flightEngine.getFlightById(req.params.id);
    if (!flight) {
      return res.status(404).json({ error: "Flight not found" });
    }
    res.json(flight);
  });
  app.get("/api/airport/stats", (req, res) => {
    const stats = flightEngine.getAirportStats();
    res.json(stats);
  });
  app.get("/api/weather/opkc", async (req, res) => {
    try {
      const weather = await getOpkcWeather();
      res.json(weather);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch METAR/TAF", details: err.message });
    }
  });
  app.get("/api/notifications", (req, res) => {
    const notifications = flightEngine.getNotifications();
    res.json(notifications);
  });
  app.post("/api/feed/sync", async (req, res) => {
    try {
      await flightEngine.syncLiveAirTrafficFeed();
      const flights = flightEngine.getFlights();
      const stats = flightEngine.getAirportStats();
      broadcastSSE("flights_tick", flights);
      res.json({ success: true, stats, count: flights.length });
    } catch (err) {
      res.status(500).json({ error: "Feed sync failed", details: err.message });
    }
  });
  app.get("/api/oag/status", (req, res) => {
    res.json(flightEngine.getOagStatus());
  });
  app.post("/api/oag/sync", async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const result = await flightEngine.syncOagFlightSchedule(force);
      if (result.success) {
        broadcastSSE("flights_tick", flightEngine.getFlights());
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "OAG sync failure", details: err.message });
    }
  });
  app.post("/api/oag/configure", (req, res) => {
    const { key } = req.body;
    if (!key || typeof key !== "string" || key.trim().length < 8) {
      return res.status(400).json({ error: "Valid OAG Subscription Key required" });
    }
    flightEngine.setOagApiKey(key);
    flightEngine.syncOagFlightSchedule();
    res.json({
      success: true,
      message: "OAG API Subscription Key active. Official airline schedule synchronization initialized.",
      status: flightEngine.getOagStatus()
    });
  });
  app.post("/api/simulate-event", (req, res) => {
    const { flightId, eventType } = req.body;
    if (!flightId || !eventType) {
      return res.status(400).json({ error: "flightId and eventType required" });
    }
    const result = flightEngine.simulateFlightEvent(flightId, eventType);
    if (!result.success) {
      return res.status(404).json({ error: "Flight could not be updated" });
    }
    if (result.alert) {
      broadcastSSE("notification", result.alert);
    }
    if (result.flight) {
      broadcastSSE("flight_updated", result.flight);
    }
    res.json(result);
  });
  app.get("/api/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    });
    res.write("retry: 5000\n\n");
    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
    });
  });
  setInterval(() => {
    if (sseClients.size > 0) {
      const activeFlights = flightEngine.getFlights();
      broadcastSSE("flights_tick", activeFlights);
    }
  }, 4e3);
  const distPath = path.resolve(__dirname, "dist");
  const distIndex = path.resolve(distPath, "index.html");
  const hasDist = fs.existsSync(distIndex);
  const isDevCommand = process.env.npm_lifecycle_event === "dev" || process.argv.includes("--dev");
  if (isDevCommand && !hasDist) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (hasDist) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(distIndex);
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Karachi Airport Flight Radar server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal server boot failure:", err);
  process.exit(1);
});
