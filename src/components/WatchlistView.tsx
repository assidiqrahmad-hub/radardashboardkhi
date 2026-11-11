import React from 'react';
import { Star, Bell, BellRing, Plane, Trash2, ChevronRight, Info } from 'lucide-react';
import { Flight } from '../types/flight';

interface WatchlistViewProps {
  flights: Flight[];
  watchlist: string[];
  onToggleWatchlist: (flightId: string) => void;
  onSelectFlight: (flight: Flight) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  flights,
  watchlist,
  onToggleWatchlist,
  onSelectFlight
}) => {
  const watchlistedFlights = flights.filter(f => watchlist.includes(f.id));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              My Flight Watchlist & Push Alert Subscriptions
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            You will receive instant push notifications and audio chimes whenever these flights update their gate, delay status, or commence boarding.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
          {watchlistedFlights.length} Tracked Flight{watchlistedFlights.length !== 1 ? 's' : ''}
        </span>
      </div>

      {watchlistedFlights.length === 0 ? (
        <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800/80">
          <Star className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Flights on Watchlist Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Star any domestic or international flight on the Flight Boards to get push notifications whenever its gate changes, departure is delayed, or aircraft lands.
          </p>

          {/* Quick Suggestions to add */}
          <div className="mt-6 text-left max-w-lg mx-auto">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Popular Karachi Flights to Track:
            </span>
            <div className="space-y-2">
              {flights.slice(0, 3).map(f => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{f.flightNumber}</span>
                    <span className="text-slate-400">
                      {f.destination.code === 'KHI' ? `${f.origin.city} → Karachi` : `Karachi → ${f.destination.city}`}
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleWatchlist(f.id)}
                    className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded hover:bg-amber-500/20"
                  >
                    + Track
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {watchlistedFlights.map(flight => {
            const isDelayed = flight.delayMinutes > 0;
            return (
              <div
                key={flight.id}
                onClick={() => onSelectFlight(flight)}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-8 rounded-xs"
                      style={{ backgroundColor: flight.airline.logoColor }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{flight.flightNumber}</span>
                        <span className="text-[10px] font-mono text-slate-400">{flight.airline.name}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} ({flight.destination.code})
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleWatchlist(flight.id);
                    }}
                    title="Remove from watchlist"
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-900 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Time</span>
                    <span className="font-mono text-slate-200">
                      {new Date(flight.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Gate</span>
                    <span className="font-mono font-bold text-amber-400">
                      {flight.gate}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Status</span>
                    <span className={`font-semibold ${isDelayed ? 'text-amber-400' : 'text-slate-200'}`}>
                      {flight.status}
                    </span>
                  </div>
                </div>

                {isDelayed && (
                  <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    <strong>+{flight.delayMinutes}m delay:</strong> {flight.delayReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
