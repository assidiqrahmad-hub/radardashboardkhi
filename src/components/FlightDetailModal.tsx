import React from 'react';
import {
  X,
  Plane,
  Star,
  Bell,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Calendar,
  AlertTriangle,
  Building,
  CheckCircle2,
  Share2,
  Navigation,
  CloudSun
} from 'lucide-react';
import { Flight } from '../types/flight';
import { OpkcWeatherResponse } from '../types/weather';

interface FlightDetailModalProps {
  flight: Flight | null;
  onClose: () => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (flightId: string) => void;
  onSimulateEvent: (flightId: string, eventType: 'gate_change' | 'delay' | 'boarding' | 'landed') => void;
  weather?: OpkcWeatherResponse | null;
  onViewWeather?: () => void;
  onOpenRadar?: (flight: Flight) => void;
}

export const FlightDetailModal: React.FC<FlightDetailModalProps> = ({
  flight,
  onClose,
  isWatchlisted,
  onToggleWatchlist,
  onSimulateEvent,
  weather,
  onViewWeather,
  onOpenRadar
}) => {
  if (!flight) return null;

  const isDeparture = flight.type === 'departure';
  const isDelayed = flight.delayMinutes > 0;

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '--:--';
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Top Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-10 rounded-sm shrink-0"
              style={{ backgroundColor: flight.airline.logoColor }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono text-white tracking-tight">
                  {flight.flightNumber}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {flight.category === 'domestic' ? 'Domestic Flight' : 'International Flight'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {flight.type.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {flight.airline.name} · Aircraft: {flight.aircraft.model}
                {flight.aircraft.registration ? ` (${flight.aircraft.registration})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Open Live Radar Map */}
            {onOpenRadar && (
              <button
                onClick={() => onOpenRadar(flight)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Live Radar Map</span>
              </button>
            )}

            {/* Watchlist toggle button */}
            <button
              onClick={() => onToggleWatchlist(flight.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isWatchlisted
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
              <span>{isWatchlisted ? 'Tracking' : 'Track Flight'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Origin & Destination Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center justify-between">
              {/* Origin */}
              <div>
                <span className="text-2xl font-bold font-mono text-white">{flight.origin.code}</span>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">{flight.origin.city}</p>
                <p className="text-[11px] text-slate-400">{flight.origin.name}</p>
                <p className="text-xs font-mono text-slate-300 mt-2">
                  STD: <strong className="text-white">{formatTime(flight.scheduledTime)}</strong>
                </p>
              </div>

              {/* Airplane & Route Progress */}
              <div className="flex-1 px-6 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>{flight.status}</span>
                  <span>{flight.telemetry.progressPct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, flight.telemetry.progressPct)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                  <Plane className="w-3.5 h-3.5 text-amber-400" />
                  <span>{flight.telemetry.distanceRemainingNm} NM remaining</span>
                </div>
              </div>

              {/* Destination */}
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-white">{flight.destination.code}</span>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">{flight.destination.city}</p>
                <p className="text-[11px] text-slate-400">{flight.destination.name}</p>
                <p className="text-xs font-mono text-slate-300 mt-2">
                  ETA: <strong className={isDelayed ? 'text-amber-400' : 'text-white'}>{formatTime(flight.estimatedTime)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Delay Banner (if delayed) */}
          {isDelayed && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">
                  Delay Advisory: +{flight.delayMinutes} minutes
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  {flight.delayReason}
                </p>
              </div>
            </div>
          )}

          {/* Karachi Aerodrome Weather Status Strip */}
          {weather && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-400">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">Karachi Weather (OPKC METAR)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {weather.metar.flightCategory} Rules
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        weather.metar.delayRisk.level === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-300'
                          : weather.metar.delayRisk.level === 'MODERATE'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {weather.metar.delayRisk.level} DELAY RISK
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {weather.metar.temperatureC}°C · Wind {weather.metar.wind.directionDeg}° @ {weather.metar.wind.speedKnots}kt · Vis {weather.metar.visibility.meters}m
                    {weather.metar.weatherPhenomena.length > 0 && ` (${weather.metar.weatherPhenomena.map(w => w.meaning).join(', ')})`}
                  </p>
                </div>
              </div>

              {onViewWeather && (
                <button
                  onClick={() => {
                    onClose();
                    onViewWeather();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg whitespace-nowrap shrink-0 transition-colors"
                >
                  Full METAR / TAF →
                </button>
              )}
            </div>
          )}

          {/* Terminal & Ground Facilities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Terminal</span>
              <span className="font-semibold text-white mt-1 block">{flight.terminal}</span>
              <span className="text-[10px] text-slate-500">{flight.concourse}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Boarding Gate</span>
              <span className="font-mono font-bold text-amber-400 text-sm mt-1 block">
                {flight.gate}
              </span>
              {flight.previousGate ? (
                <span className="text-[10px] text-amber-500">Changed from {flight.previousGate}</span>
              ) : (
                <span className="text-[10px] text-slate-500">Confirmed Gate</span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Check-in Desks</span>
              <span className="font-mono font-semibold text-white mt-1 block">
                {flight.checkInCounters}
              </span>
              <span className="text-[10px] text-slate-500">Passenger Hall</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Baggage Carousel</span>
              <span className="font-mono font-bold text-emerald-400 text-sm mt-1 block">
                {flight.baggageBelt}
              </span>
              <span className="text-[10px] text-slate-500">Arrivals Reclaim</span>
            </div>
          </div>

          {/* Aircraft & Radar Telemetry */}
          {/* Aircraft & Radar Telemetry */}
          <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs">Live Telemetry & Transponder ADS-B</h4>
              <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                {flight.liveDataSource || 'adsb.fi + ADS-B DB Feeder'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div>
                <span className="text-[10px] text-slate-300 block font-sans">Altitude</span>
                <span className="text-cyan-300 font-bold text-sm tabular-nums">
                  {flight.telemetry.altitudeFt.toLocaleString()} ft
                </span>
                {flight.telemetry.altitudeGeomFt && (
                  <span className="text-[10px] text-slate-400 block">Geom: {flight.telemetry.altitudeGeomFt.toLocaleString()} ft</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-300 block font-sans">Ground Speed</span>
                <span className="text-white font-bold text-sm tabular-nums">
                  {flight.telemetry.groundSpeedKnots} kts
                </span>
                <span className="text-[10px] text-slate-400 block">Mach ~{(flight.telemetry.groundSpeedKnots / 575).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-300 block font-sans">Heading & Track</span>
                <span className="text-white font-bold text-sm tabular-nums">
                  {flight.telemetry.heading}°
                </span>
                {flight.telemetry.verticalRateFpm !== undefined && (
                  <span className={`text-[10px] font-bold block ${flight.telemetry.verticalRateFpm > 100 ? 'text-emerald-400' : flight.telemetry.verticalRateFpm < -100 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {flight.telemetry.verticalRateFpm > 0 ? `+${flight.telemetry.verticalRateFpm}` : flight.telemetry.verticalRateFpm} ft/min
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-300 block font-sans">Squawk & Mode-S</span>
                <span className={`text-sm font-bold tabular-nums block ${flight.telemetry.squawk === '7700' ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                  {flight.isLiveRadar ? `SQK ${flight.telemetry.squawk || flight.squawkCode || '----'}` : 'SCHED'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Hex: {flight.telemetry.hex || (flight.aircraft.registration ? flight.aircraft.registration.slice(-4) : 'SCHED')}
                </span>
              </div>
            </div>

            {/* Signal & Coordinates Row */}
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300 font-mono flex-wrap gap-2">
              <div>
                <span className="text-slate-400 font-sans">GPS: </span>
                <span className="text-white font-bold">{flight.telemetry.lat.toFixed(4)}°N, {flight.telemetry.lng.toFixed(4)}°E</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans">Distance: </span>
                <span className="text-amber-300 font-bold">{flight.telemetry.distanceRemainingNm} NM from KHI</span>
              </div>
              {flight.telemetry.rssi !== undefined && (
                <div>
                  <span className="text-slate-400 font-sans">Signal: </span>
                  <span className="text-emerald-400">{flight.telemetry.rssi} dBFS ({flight.telemetry.messages ?? 0} msgs)</span>
                </div>
              )}
            </div>
          </div>

          {/* Event History / Timeline */}
          <div>
            <h4 className="font-bold text-white text-xs mb-2">Gate & Operational Log</h4>
            <div className="space-y-2">
              {flight.history.map((event, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="text-slate-400 font-mono text-[10px] mr-2">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{event.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Trigger Actions for this flight */}
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-2 font-medium">
              Simulate Push Notification Event for {flight.flightNumber}:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSimulateEvent(flight.id, 'gate_change')}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
              >
                Trigger Gate Change
              </button>
              <button
                onClick={() => onSimulateEvent(flight.id, 'delay')}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
              >
                Trigger Delay (+30m)
              </button>
              <button
                onClick={() => onSimulateEvent(flight.id, 'boarding')}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700"
              >
                Trigger Boarding
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
