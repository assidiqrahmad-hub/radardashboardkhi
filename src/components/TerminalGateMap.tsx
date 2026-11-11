import React, { useState } from 'react';
import { Building2, AlertTriangle, Clock, ArrowRight, Plane, Info, CheckCircle2 } from 'lucide-react';
import { Flight } from '../types/flight';

interface TerminalGateMapProps {
  flights: Flight[];
  onSelectFlight: (flight: Flight) => void;
}

export const TerminalGateMap: React.FC<TerminalGateMapProps> = ({ flights, onSelectFlight }) => {
  const [selectedGate, setSelectedGate] = useState<string | null>('Gate 04');

  // Map of flights by gate name
  const gateMap: Record<string, Flight[]> = {};
  flights.forEach(f => {
    if (!gateMap[f.gate]) gateMap[f.gate] = [];
    gateMap[f.gate].push(f);
  });

  const concourseEastGates = ['Gate 01', 'Gate 02', 'Gate 03', 'Gate 04', 'Gate 05', 'Gate 06', 'Gate 07', 'Gate 08', 'Gate 09', 'Gate 10', 'Gate 11', 'Gate 12'];
  const concourseWestGates = ['Gate 13', 'Gate 14', 'Gate 15', 'Gate 16', 'Gate 17', 'Gate 18', 'Gate 19', 'Gate 20', 'Gate 21', 'Gate 22', 'Gate 23', 'Gate 24'];
  const remoteStands = ['Remote Stand R-01', 'Remote Stand R-03', 'Remote Stand R-05'];

  const selectedGateFlights = selectedGate ? gateMap[selectedGate] || [] : [];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-xl space-y-6">
      {/* Terminal Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Jinnah Terminal Complex (JTC) Concourse & Gate Map
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive passenger concourses, aerobridges, check-in islands, and baggage carousels
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/40" />
            <span className="text-slate-300">East: International</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-slate-300">West: Domestic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/40" />
            <span className="text-amber-300 font-medium">Gate Delay</span>
          </div>
        </div>
      </div>

      {/* Schematic Gate Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Concourse East: International */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-blue-500/20">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-blue-400">Concourse East · International Gates</h3>
              <p className="text-[11px] text-slate-400">Emirates, Qatar, Saudia, flydubai, Turkish, Gulf Air</p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Gates 01 - 12
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {concourseEastGates.map(gateName => {
              const assigned = gateMap[gateName] || [];
              const hasDelayed = assigned.some(f => f.delayMinutes > 0);
              const hasBoarding = assigned.some(f => f.status === 'Boarding' || f.status === 'Final Call');
              const isSelected = selectedGate === gateName;

              return (
                <button
                  key={gateName}
                  onClick={() => setSelectedGate(gateName)}
                  className={`p-2.5 rounded-lg border text-left transition-all relative ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-400 ring-1 ring-blue-400 shadow-md'
                      : hasDelayed
                      ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                      : assigned.length > 0
                      ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white">{gateName}</span>
                    {hasDelayed && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                    {hasBoarding && !hasDelayed && <Plane className="w-3 h-3 text-emerald-400 animate-pulse" />}
                  </div>

                  {assigned.length > 0 ? (
                    <div className="mt-1">
                      <p className="font-mono text-[11px] font-semibold text-slate-200 truncate">
                        {assigned[0].flightNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {assigned[0].destination.code === 'KHI' ? assigned[0].origin.city : assigned[0].destination.city}
                      </p>
                      {hasDelayed && (
                        <p className="text-[9px] font-mono text-amber-400 font-semibold mt-0.5">
                          +{assigned[0].delayMinutes}m delay
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-2">Available</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Concourse West: Domestic */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-emerald-400">Concourse West · Domestic & Local Gates</h3>
              <p className="text-[11px] text-slate-400">PIA Domestic, Airblue, SereneAir, Fly Jinnah, AirSial</p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Gates 13 - 24
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {concourseWestGates.map(gateName => {
              const assigned = gateMap[gateName] || [];
              const hasDelayed = assigned.some(f => f.delayMinutes > 0);
              const hasBoarding = assigned.some(f => f.status === 'Boarding' || f.status === 'Final Call');
              const isSelected = selectedGate === gateName;

              return (
                <button
                  key={gateName}
                  onClick={() => setSelectedGate(gateName)}
                  className={`p-2.5 rounded-lg border text-left transition-all relative ${
                    isSelected
                      ? 'bg-emerald-600/20 border-emerald-400 ring-1 ring-emerald-400 shadow-md'
                      : hasDelayed
                      ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                      : assigned.length > 0
                      ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white">{gateName}</span>
                    {hasDelayed && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                    {hasBoarding && !hasDelayed && <Plane className="w-3 h-3 text-emerald-400 animate-pulse" />}
                  </div>

                  {assigned.length > 0 ? (
                    <div className="mt-1">
                      <p className="font-mono text-[11px] font-semibold text-slate-200 truncate">
                        {assigned[0].flightNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {assigned[0].destination.code === 'KHI' ? assigned[0].origin.city : assigned[0].destination.city}
                      </p>
                      {hasDelayed && (
                        <p className="text-[9px] font-mono text-amber-400 font-semibold mt-0.5">
                          +{assigned[0].delayMinutes}m delay
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-2">Available</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Gate Inspection Panel */}
      {selectedGate && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-amber-400">{selectedGate} Inspection</span>
              <span className="text-xs text-slate-400">
                {selectedGateFlights.length} Scheduled / Active Flights
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Terminal: Jinnah Terminal 1 (JTC)
            </div>
          </div>

          {selectedGateFlights.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No active flight currently docked at {selectedGate}. Aerobridge is open.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {selectedGateFlights.map(flight => (
                <div
                  key={flight.id}
                  onClick={() => onSelectFlight(flight)}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-xs">{flight.flightNumber}</span>
                    <span className="text-[10px] font-mono text-slate-400">{flight.status}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {flight.origin.city} → {flight.destination.city}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Scheduled: {new Date(flight.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {flight.delayMinutes > 0 && (
                    <div className="mt-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                      <strong>+{flight.delayMinutes} min delay:</strong> {flight.delayReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Baggage Claim & Check-in Hall Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Baggage Claim Carousels */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <h4 className="font-bold text-slate-200 mb-2">Arrivals Baggage Carousels (Belts)</h4>
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-emerald-400 font-bold block">Belt 1 & 2</span>
              <span className="text-slate-400 text-[10px]">Domestic (PIA / Airblue)</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-emerald-400 font-bold block">Belt 3</span>
              <span className="text-slate-400 text-[10px]">Domestic (Fly Jinnah / AirSial)</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-blue-400 font-bold block">Belt 4, 5 & 6</span>
              <span className="text-slate-400 text-[10px]">International Customs Hall</span>
            </div>
          </div>
        </div>

        {/* Check-in Islands */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <h4 className="font-bold text-slate-200 mb-2">Departures Check-In Counter Islands</h4>
          <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-200 font-bold block">Row A</span>
              <span className="text-slate-400 text-[10px]">PIA & Saudia</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-200 font-bold block">Row B</span>
              <span className="text-slate-400 text-[10px]">Airblue & flydubai</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-200 font-bold block">Row C</span>
              <span className="text-slate-400 text-[10px]">SereneAir & Emirates</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-200 font-bold block">Row D</span>
              <span className="text-slate-400 text-[10px]">Fly Jinnah & Qatar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
