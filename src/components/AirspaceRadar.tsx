import React, { useState, useMemo } from 'react';
import {
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Navigation,
  Layers,
  Plane,
  Info
} from 'lucide-react';
import { Flight } from '../types/flight';
import { KARACHI_COORDS } from '../server/flightEngine';

interface AirspaceRadarProps {
  flights: Flight[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight) => void;
}

export const AirspaceRadar: React.FC<AirspaceRadarProps> = ({
  flights,
  selectedFlight,
  onSelectFlight
}) => {
  const [zoomRangeNm, setZoomRangeNm] = useState<number>(150); // 50, 100, 150, 250 NM
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'arrivals' | 'departures'>('all');

  // Filter airborne flights
  const airborneFlights = useMemo(() => {
    return flights.filter(f => {
      // Must have telemetry and not be parked at gate with 0 progress
      const isAirborne =
        f.status === 'En Route' ||
        f.status === 'Approaching' ||
        f.status === 'Departed' ||
        (f.telemetry && f.telemetry.altitudeFt > 500);

      if (!isAirborne) return false;
      if (filterMode === 'arrivals') return f.type === 'arrival';
      if (filterMode === 'departures') return f.type === 'departure';
      return true;
    });
  }, [flights, filterMode]);

  // Transform lat/lng to SVG coordinates relative to Karachi Airport
  // 1 degree latitude ~= 60 NM
  // 1 degree longitude ~= 60 * cos(lat) NM ~= 54 NM at 25°N
  const radarRadiusPx = 280; // half of 560px SVG viewbox

  const getPositionOnRadar = (lat: number, lng: number) => {
    const dLatNm = (lat - KARACHI_COORDS.lat) * 60;
    const dLngNm = (lng - KARACHI_COORDS.lng) * 54.4;

    const scale = radarRadiusPx / zoomRangeNm;

    const x = radarRadiusPx + dLngNm * scale;
    const y = radarRadiusPx - dLatNm * scale; // invert y for SVG coordinate system

    return { x, y, dLatNm, dLngNm };
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 md:p-6 shadow-2xl">
      {/* Radar Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Karachi Terminal Control Area (OPKC TMA)
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              24.9065°N, 67.1608°E
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Active transponder radar sweep · Radius: {zoomRangeNm} Nautical Miles (NM)
          </p>
        </div>

        {/* Filter & Range Controls */}
        <div className="flex items-center gap-2">
          {/* Arrivals / Departures Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
              }`}
            >
              All Airborne
            </button>
            <button
              onClick={() => setFilterMode('arrivals')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'arrivals' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
              }`}
            >
              Inbound KHI
            </button>
            <button
              onClick={() => setFilterMode('departures')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'departures' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-slate-400'
              }`}
            >
              Outbound
            </button>
          </div>

          {/* Zoom In / Out */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoomRangeNm(prev => Math.max(50, prev - 50))}
              title="Zoom In"
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1">{zoomRangeNm} NM</span>
            <button
              onClick={() => setZoomRangeNm(prev => Math.min(300, prev + 50))}
              title="Zoom Out"
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showLabels
                ? 'bg-slate-900 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            Labels
          </button>
        </div>
      </div>

      {/* Main Radar Screen */}
      <div className="relative mt-4 flex justify-center items-center overflow-hidden bg-radial from-slate-900 via-slate-950 to-slate-950 rounded-xl border border-slate-800/80 p-2 min-h-[500px]">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        <svg
          viewBox="0 0 560 560"
          className="w-full max-w-[560px] h-auto select-none"
        >
          {/* Radar Circles */}
          <circle cx="280" cy="280" r="70" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
          <circle cx="280" cy="280" r="140" fill="none" stroke="#1e293b" stroke-width="1.5" />
          <circle cx="280" cy="280" r="210" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
          <circle cx="280" cy="280" r="270" fill="none" stroke="#334155" stroke-width="1.5" />

          {/* Azimuth Crosshairs */}
          <line x1="280" y1="10" x2="280" y2="550" stroke="#1e293b" stroke-width="1" />
          <line x1="10" y1="280" x2="550" y2="280" stroke="#1e293b" stroke-width="1" />
          <line x1="89" y1="89" x2="471" y2="471" stroke="#0f172a" stroke-width="1" stroke-dasharray="3 3" />
          <line x1="89" y1="471" x2="471" y2="89" stroke="#0f172a" stroke-width="1" stroke-dasharray="3 3" />

          {/* Compass degree text */}
          <text x="280" y="24" text-anchor="middle" fill="#64748b" font-size="10" font-family="monospace">000° N</text>
          <text x="546" y="284" text-anchor="end" fill="#64748b" font-size="10" font-family="monospace">090° E</text>
          <text x="280" y="546" text-anchor="middle" fill="#64748b" font-size="10" font-family="monospace">180° S</text>
          <text x="14" y="284" text-anchor="start" fill="#64748b" font-size="10" font-family="monospace">270° W</text>

          {/* Range markings */}
          <text x="285" y="215" fill="#475569" font-size="9" font-family="monospace">{Math.round(zoomRangeNm * 0.25)} NM</text>
          <text x="285" y="145" fill="#475569" font-size="9" font-family="monospace">{Math.round(zoomRangeNm * 0.5)} NM</text>
          <text x="285" y="75" fill="#475569" font-size="9" font-family="monospace">{Math.round(zoomRangeNm * 0.75)} NM</text>
          <text x="285" y="15" fill="#475569" font-size="9" font-family="monospace">{zoomRangeNm} NM</text>

          {/* Center: Karachi Jinnah International (OPKC) */}
          <g transform="translate(280, 280)">
            {/* Runways 25L/07R and 25R/07L orientation (approx 250° bearing) */}
            <line x1="-16" y1="6" x2="16" y2="-6" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
            <line x1="-14" y1="12" x2="18" y2="0" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="0" cy="0" r="4" fill="#38bdf8" />
            <text x="0" y="22" text-anchor="middle" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">
              OPKC / KHI
            </text>
          </g>

          {/* Rotating radar sweep beam */}
          <defs>
            <linearGradient id="radarBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0284c7" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 280 280 L 460 100 A 255 255 0 0 0 280 25 Z"
            fill="url(#radarBeamGrad)"
            className="animate-radar-sweep pointer-events-none"
          />

          {/* Aircraft Blips */}
          {airborneFlights.map(flight => {
            const { x, y } = getPositionOnRadar(flight.telemetry.lat, flight.telemetry.lng);

            // Hide if outside visible radar box
            if (x < 10 || x > 550 || y < 10 || y > 550) return null;

            const isSelected = selectedFlight?.id === flight.id;
            const isArrival = flight.type === 'arrival';
            const color = isSelected ? '#f59e0b' : isArrival ? '#06b6d4' : '#10b981';

            // Vector heading line length
            const headingRad = (flight.telemetry.heading - 90) * (Math.PI / 180);
            const vectorLen = 18;
            const vx = x + Math.cos(headingRad) * vectorLen;
            const vy = y + Math.sin(headingRad) * vectorLen;

            return (
              <g
                key={flight.id}
                className="cursor-pointer group"
                onClick={() => onSelectFlight(flight)}
              >
                {/* Heading vector line */}
                <line
                  x1={x}
                  y1={y}
                  x2={vx}
                  y2={vy}
                  stroke={color}
                  stroke-width={isSelected ? '2' : '1.5'}
                  stroke-dasharray={isSelected ? 'none' : '2 2'}
                />

                {/* Pulsing ring if selected or approaching */}
                {(isSelected || flight.status === 'Approaching') && (
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill="none"
                    stroke={color}
                    stroke-width="1.5"
                    className="animate-radar-blip opacity-75"
                  />
                )}

                {/* Target Symbol */}
                <circle cx={x} cy={y} r={isSelected ? '5' : '3.5'} fill={color} />

                {/* Airplane Orientation Icon */}
                <g transform={`translate(${x}, ${y}) rotate(${flight.telemetry.heading}) translate(-7, -7)`}>
                  <path
                    d="M7 1 L9 5 L13 6 L13 8 L9 8 L8 12 L10 13 L10 14 L7 13 L4 14 L4 13 L6 12 L5 8 L1 8 L1 6 L5 5 Z"
                    fill={color}
                    opacity="0.9"
                  />
                </g>

                {/* Flight Callsign Label Tag */}
                {showLabels && (
                  <g transform={`translate(${x + 10}, ${y - 8})`}>
                    <rect
                      x="0"
                      y="-10"
                      width="66"
                      height="24"
                      rx="3"
                      fill="#090d16"
                      stroke={isSelected ? '#f59e0b' : '#334155'}
                      stroke-width={isSelected ? '1.5' : '1'}
                      fill-opacity="0.9"
                    />
                    <text x="4" y="0" fill="#f8fafc" font-size="9" font-weight="bold" font-family="monospace">
                      {flight.flightNumber}
                    </text>
                    <text x="4" y="10" fill={color} font-size="8" font-family="monospace">
                      FL{Math.round(flight.telemetry.altitudeFt / 100)} {flight.telemetry.groundSpeedKnots}kt
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected Flight Radar Overlay Telemetry Card */}
        {selectedFlight && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 p-4 rounded-xl shadow-2xl text-xs z-10">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {selectedFlight.flightNumber}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedFlight.type === 'departure' ? 'OUTBOUND' : 'INBOUND'}
                </span>
              </div>
              <button
                onClick={() => onSelectFlight(null as any)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-2.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Carrier:</span>
                <span className="text-white font-medium">{selectedFlight.airline.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Route:</span>
                <span className="text-white font-mono">
                  {selectedFlight.origin.code} → {selectedFlight.destination.code}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Altitude:</span>
                <span className="text-cyan-400 font-semibold tabular-nums">
                  {selectedFlight.telemetry.altitudeFt.toLocaleString()} ft
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Ground Speed:</span>
                <span className="text-white tabular-nums">
                  {selectedFlight.telemetry.groundSpeedKnots} knots
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Heading:</span>
                <span className="text-white tabular-nums">
                  {selectedFlight.telemetry.heading}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Gate:</span>
                <span className="text-amber-300 font-mono font-bold">
                  {selectedFlight.gate}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
