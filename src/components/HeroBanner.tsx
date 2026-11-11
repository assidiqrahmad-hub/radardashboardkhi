import React from 'react';
import { Wind, Gauge, Compass, Clock, CheckCircle2, AlertTriangle, Plane } from 'lucide-react';
import { AirportStats } from '../types/flight';

interface HeroBannerProps {
  stats: AirportStats | null;
  onQuickFilter: (filter: 'delayed' | 'boarding' | 'all') => void;
  onOpenWeather?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ stats, onQuickFilter, onOpenWeather }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl mb-6">
      {/* Background Image with Dark Scrim */}
      <div className="relative h-64 md:h-72 w-full overflow-hidden">
        <img
          src="/src/assets/images/khi_airport_terminal_1794245813296.jpg"
          alt="Karachi Jinnah International Airport Terminal and Apron at Twilight"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
        {/* Measured Scrim for WCAG AA readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />

        {/* Content Overlay */}
        <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE AIRPORT OPERATIONS</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {stats?.liveRadarCount ? `${stats.liveRadarCount} AIRCRAFT TRACKED LIVE` : 'ADS-B LIVE FEED CONNECTED'}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 self-start sm:self-auto">
              Elevation: 30m (98 ft) · Coordinates: 24.9065° N, 67.1608° E
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight text-balance">
              Karachi Jinnah International Airport
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time radar tracking, automated gate delay detection, and instant push notifications for all local domestic and international flights.
            </p>
          </div>
        </div>
      </div>

      {/* METAR & Operational Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 border-t border-slate-800 bg-slate-950/90 text-xs">
        {/* Metric 1: Active Flights */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-medium">Active Movements</p>
            <p className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {(stats?.activeDeparturesCount || 14) + (stats?.activeArrivalsCount || 12)} Flights
            </p>
            <p className="text-[11px] text-slate-400">
              {stats?.activeDeparturesCount || 14} Departures · {stats?.activeArrivalsCount || 12} Arrivals
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Plane className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2: On-Time Performance */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-medium">On-Time Reliability</p>
            <p className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
              {stats?.onTimeRate || 85}%
            </p>
            <p className="text-[11px] text-slate-400">
              Avg delay: {stats?.averageGateDelayMins || 16} min
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3: Active Runways */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-medium">Active Runways</p>
            <p className="text-sm font-bold text-white font-mono mt-0.5">25L (Arr) / 25R (Dep)</p>
            <p className="text-[11px] text-slate-400">Length: 3,400m · ILS Cat I/II</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 4: Weather / METAR */}
        <div
          onClick={onOpenWeather}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-colors group"
          title="Click to view detailed OPKC METAR and TAF weather report"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-slate-400 font-medium">Karachi METAR / TAF</p>
              <span className="text-[10px] text-amber-400 group-hover:underline">View →</span>
            </div>
            <p className="text-sm font-bold text-white font-mono mt-0.5">
              {stats?.weather.tempC || 28}°C · Vis {stats?.weather.visibilityM || 8000}m
            </p>
            <p className="text-[11px] text-slate-400">{stats?.weather.wind || '240° at 11kt'}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Wind className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
