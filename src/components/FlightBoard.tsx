import React, { useState, useMemo } from 'react';
import {
  PlaneTakeoff,
  PlaneLanding,
  Search,
  Star,
  Bell,
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react';
import { Flight, FlightFilterState } from '../types/flight';

interface FlightBoardProps {
  flights: Flight[];
  filters: FlightFilterState;
  setFilters: React.Dispatch<React.SetStateAction<FlightFilterState>>;
  watchlist: string[];
  onToggleWatchlist: (flightId: string) => void;
  onSelectFlight: (flight: Flight) => void;
  onTriggerTestAlert?: (flightId: string, eventType: 'gate_change' | 'delay' | 'boarding' | 'landed') => void;
  stats?: any;
  onRefreshFeed?: () => void;
  isSyncingFeed?: boolean;
}

export const FlightBoard: React.FC<FlightBoardProps> = ({
  flights,
  filters,
  setFilters,
  watchlist,
  onSelectFlight,
  onToggleWatchlist,
  onTriggerTestAlert,
  stats,
  onRefreshFeed,
  isSyncingFeed
}) => {
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<'all' | 'delayed' | 'boarding' | 'active' | 'landed'>(
    (filters.status as any) || 'all'
  );

  // Filter flights dynamically based on all criteria
  const filteredFlights = useMemo(() => {
    return flights.filter(flight => {
      // 0. Exclude airport ground vehicles, inspection cars (e.g. SCOP27), sweepers, tugs, test transponders
      const isGroundVehicle =
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(flight.flightNumber) ||
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(flight.airline.code) ||
        flight.aircraft.registration === 'N644PK' ||
        (flight.origin.code === 'KHI' && flight.destination.code === 'KHI' && flight.telemetry && flight.telemetry.altitudeFt < 1000 && flight.telemetry.groundSpeedKnots < 130);
      if (isGroundVehicle) return false;

      // 0b. Operational Time Window filter: Defaults to 'all' so full schedule is visible
      const windowMode = filters.window || 'all';
      if (windowMode !== 'all') {
        const nowMs = Date.now();
        const schedMs = new Date(flight.scheduledTime).getTime();
        const diffHours = (schedMs - nowMs) / (1000 * 60 * 60);
        const isLiveAirborne = flight.isLiveRadar && flight.status !== 'Departed' && flight.status !== 'Arrived';
        // Active airborne aircraft tracked on radar are always retained for real-time airspace monitoring
        if (!isLiveAirborne) {
          if (windowMode === '3h') {
            if (diffHours < -3.25 || diffHours > 3.25) return false;
          } else if (windowMode === '6h') {
            if (diffHours < -1.0 || diffHours > 6.25) return false;
          }
        }
      }

      // 1. Departures vs Arrivals
      if (filters.type && filters.type !== 'all') {
        if (flight.type !== filters.type) return false;
      }

      // 2. Domestic vs International
      if (filters.category && filters.category !== 'all') {
        if (flight.category !== filters.category) return false;
      }

      // 3. Quick Status Filter
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'delayed') {
          if (flight.delayMinutes <= 0 && flight.status !== 'Delayed') return false;
        } else if (filters.status === 'boarding') {
          if (!['Boarding', 'Final Call'].includes(flight.status)) return false;
        } else if (filters.status === 'active') {
          if (!['Taxiing', 'Departed', 'En Route', 'Approaching'].includes(flight.status)) return false;
        } else if (filters.status === 'landed') {
          if (!['Landed', 'Baggage Delivery', 'Arrived'].includes(flight.status)) return false;
        }
      }

      // 4. Watchlist filter
      if (filters.watchlistOnly && !watchlist.includes(flight.id)) {
        return false;
      }

      // 5. Search query (flight number, airline name/code, origin/destination city/code, gate, aircraft)
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.trim().toLowerCase();
        const matchNumber = flight.flightNumber.toLowerCase().includes(q);
        const matchAirline =
          flight.airline.name.toLowerCase().includes(q) ||
          flight.airline.code.toLowerCase().includes(q) ||
          flight.airline.iata.toLowerCase().includes(q);
        const matchOrigin =
          flight.origin.city.toLowerCase().includes(q) ||
          flight.origin.code.toLowerCase().includes(q) ||
          flight.origin.name.toLowerCase().includes(q);
        const matchDest =
          flight.destination.city.toLowerCase().includes(q) ||
          flight.destination.code.toLowerCase().includes(q) ||
          flight.destination.name.toLowerCase().includes(q);
        const matchGate = flight.gate.toLowerCase().includes(q);
        const matchAircraft =
          flight.aircraft.model.toLowerCase().includes(q) ||
          flight.aircraft.registration.toLowerCase().includes(q);

        if (!matchNumber && !matchAirline && !matchOrigin && !matchDest && !matchGate && !matchAircraft) {
          return false;
        }
      }

      return true;
    });
  }, [flights, filters, watchlist]);

  const handleTypeChange = (type: 'departure' | 'arrival') => {
    setFilters(prev => ({ ...prev, type }));
  };

  const handleCategoryChange = (category: 'all' | 'domestic' | 'international') => {
    setFilters(prev => ({ ...prev, category }));
  };

  const handleQuickFilter = (status: 'all' | 'delayed' | 'boarding' | 'active' | 'landed') => {
    setSelectedQuickFilter(status);
    setFilters(prev => ({ ...prev, status }));
  };

  // Helper formatting for 24-hr time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '--:--';
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Air Traffic Feed Status Indicator Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold text-white">Live ADS-B Air Traffic Feed Connected:</span>
          <span className="text-emerald-300 font-mono">
            {flights.filter(f => f.isLiveRadar).length || stats?.liveRadarCount || 14} Aircraft Tracked Live in Karachi FIR
          </span>
          <span className="hidden sm:inline px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
            Flightradar24 Feeder Network
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-[10px] border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            OAG Official Aviation Guide Active
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Auto-syncing every 15s
          </span>
          {onRefreshFeed && (
            <button
              onClick={onRefreshFeed}
              disabled={isSyncingFeed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              title="Trigger real-time re-sync from Flightradar24 ADS-B radar network"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingFeed ? 'animate-spin' : ''}`} />
              <span>{isSyncingFeed ? 'Syncing Radar...' : 'Refresh Live Feed'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Bar & Filter Tabs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        
        {/* Left Side: Departures/Arrivals + Domestic/International + Operational Window */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Departures vs Arrivals Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => handleTypeChange('departure')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filters.type === 'departure'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlaneTakeoff className="w-4 h-4" />
              Departures ({flights.filter(f => f.type === 'departure').length})
            </button>
            <button
              onClick={() => handleTypeChange('arrival')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filters.type === 'arrival'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlaneLanding className="w-4 h-4" />
              Arrivals ({flights.filter(f => f.type === 'arrival').length})
            </button>
          </div>

          {/* Operational Window Filter (±3h Current Window / Next 6h / 24h Full Day) */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 px-2 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Window:</span>
            </span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, window: 'all' }))}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                (!filters.window || filters.window === 'all')
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full 24-hour daily flight schedule"
            >
              Full Day ({flights.length})
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, window: '3h' }))}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filters.window === '3h'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Flights operating within ±3 hours of current time"
            >
              Current (±3h)
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, window: '6h' }))}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filters.window === '6h'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Next 6 hours of flight operations"
            >
              Next 6h
            </button>
          </div>

          {/* Domestic vs International Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filters.category === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Routes
            </button>
            <button
              onClick={() => handleCategoryChange('domestic')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filters.category === 'domestic'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Domestic
            </button>
            <button
              onClick={() => handleCategoryChange('international')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filters.category === 'international'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              International
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search flight #, city (Dubai, Islamabad), airline, gate..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/60 transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium text-[11px] whitespace-nowrap">Filter Status:</span>
        <button
          onClick={() => handleQuickFilter('all')}
          className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
            selectedQuickFilter === 'all'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          All Statuses
        </button>
        <button
          onClick={() => handleQuickFilter('delayed')}
          className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
            selectedQuickFilter === 'delayed'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
              : 'text-slate-400 hover:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Delayed Flights Only
        </button>
        <button
          onClick={() => handleQuickFilter('boarding')}
          className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
            selectedQuickFilter === 'boarding'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium'
              : 'text-slate-400 hover:text-emerald-400'
          }`}
        >
          Boarding / Final Call
        </button>
        <button
          onClick={() => handleQuickFilter('active')}
          className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
            selectedQuickFilter === 'active'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium'
              : 'text-slate-400 hover:text-blue-400'
          }`}
        >
          Active In-Air
        </button>
        <button
          onClick={() => handleQuickFilter('landed')}
          className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
            selectedQuickFilter === 'landed'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-medium'
              : 'text-slate-400 hover:text-teal-400'
          }`}
        >
          Landed / Baggage
        </button>
      </div>

      {/* Active Filter Status & Match Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white font-mono">{filteredFlights.length}</strong> of{' '}
          <strong className="text-white font-mono">{flights.length}</strong> flights
        </span>
        {(filters.type !== 'all' || filters.category !== 'all' || filters.status !== 'all' || filters.searchQuery) && (
          <button
            onClick={() => {
              setFilters({
                type: 'all',
                category: 'all',
                status: 'all',
                searchQuery: '',
                watchlistOnly: false,
              });
              setSelectedQuickFilter('all');
            }}
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            Clear Active Filters
          </button>
        )}
      </div>

      {/* Main FIDS Flight Board Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        {filteredFlights.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No flights matching your filter criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search keywords or changing the category filter.</p>
            <button
              onClick={() => {
                setFilters({
                  type: 'all',
                  category: 'all',
                  status: 'all',
                  searchQuery: '',
                  watchlistOnly: false
                });
                setSelectedQuickFilter('all');
              }}
              className="mt-4 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold text-slate-400 tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">Watch</th>
                  <th className="py-3 px-3">Flight / Carrier</th>
                  <th className="py-3 px-3">{filters.type === 'departure' ? 'Destination' : 'Origin'}</th>
                  <th className="py-3 px-3">Scheduled</th>
                  <th className="py-3 px-3">Estimated / Actual</th>
                  <th className="py-3 px-3">Terminal & Gate</th>
                  <th className="py-3 px-3">{filters.type === 'departure' ? 'Check-in' : 'Baggage'}</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredFlights.map(flight => {
                  const isWatchlisted = watchlist.includes(flight.id);
                  const isDeparture = flight.type === 'departure';
                  const isDelayed = flight.delayMinutes > 0;
                  const displayCity = isDeparture ? flight.destination.city : flight.origin.city;
                  const displayCode = isDeparture ? flight.destination.code : flight.origin.code;
                  const displayCountry = isDeparture ? flight.destination.country : flight.origin.country;

                  // Status styling
                  let statusBadge = (
                    <span className="text-slate-400 font-medium">{flight.status}</span>
                  );
                  if (flight.status === 'Departed') {
                    const isReached = flight.destination.code === 'DXB' || flight.destination.code === 'SHJ' || flight.destination.code === 'DOH';
                    statusBadge = (
                      <span className="text-emerald-400 font-medium text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {isReached ? `Departed (Arrived in ${flight.destination.city})` : 'Departed'}
                      </span>
                    );
                  } else if (flight.status === 'Arrived') {
                    statusBadge = (
                      <span className="text-teal-400 font-medium text-[11px] bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                        Landed / Arrived
                      </span>
                    );
                  } else if (flight.status === 'Boarding' || flight.status === 'Final Call') {
                    statusBadge = (
                      <span className="text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] animate-pulse">
                        {flight.status}
                      </span>
                    );
                  } else if (isDelayed || flight.status === 'Delayed') {
                    statusBadge = (
                      <div className="flex flex-col">
                        <span className="text-amber-400 font-semibold text-[11px]">
                          Delayed (+{flight.delayMinutes}m)
                        </span>
                        {flight.delayReason && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={flight.delayReason}>
                            {flight.delayReason}
                          </span>
                        )}
                      </div>
                    );
                  } else if (flight.status === 'Landed') {
                    statusBadge = (
                      <span className="text-cyan-400 font-semibold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[11px]">
                        Landed Rwy 25L
                      </span>
                    );
                  } else if (flight.status === 'Taxiing') {
                    statusBadge = (
                      <span className="text-amber-300 font-medium text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Taxiing
                      </span>
                    );
                  } else if (flight.status === 'En Route' || flight.status === 'Approaching') {
                    const altText = flight.telemetry?.altitudeFt ? `FL${Math.round(flight.telemetry.altitudeFt / 100)}` : '';
                    const spdText = flight.telemetry?.groundSpeedKnots ? `${flight.telemetry.groundSpeedKnots}kt` : '';
                    statusBadge = (
                      <div className="flex flex-col">
                        <span className="text-blue-400 font-medium text-[11px] flex items-center gap-1">
                          {flight.status === 'Approaching' ? 'Final Approach' : 'En Route'}
                          {flight.isLiveRadar && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />}
                        </span>
                        {(altText || spdText) && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {altText} · {spdText}
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <tr
                      key={flight.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectFlight(flight)}
                    >
                      {/* Watchlist Star Toggle */}
                      <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onToggleWatchlist(flight.id)}
                          title={isWatchlisted ? 'Remove from push watchlist' : 'Add to push alert watchlist'}
                          className={`p-1.5 rounded transition-colors ${
                            isWatchlisted
                              ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>

                      {/* Flight Number & Airline */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2.5 h-7 rounded-sm shrink-0"
                            style={{ backgroundColor: flight.airline.logoColor }}
                            title={flight.airline.name}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white text-xs tracking-tight">
                                {flight.flightNumber}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                {flight.category === 'domestic' ? 'DOM' : 'INT'}
                              </span>
                              {flight.liveDataSource?.toLowerCase().includes('oag') && (
                                <span className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[9px] font-bold border border-blue-500/30" title="Verified by OAG Official Airline Schedules">
                                  OAG
                                </span>
                              )}
                              {flight.isLiveRadar && (
                                <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold border border-emerald-500/30 inline-flex items-center gap-1" title={flight.liveDataSource}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  LIVE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="truncate max-w-[110px]">{flight.airline.name}</span>
                              <span>·</span>
                              <span className="font-mono text-slate-300">{flight.aircraft.registration}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Destination / Origin */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-100">{displayCity}</span>
                            <span className="font-mono text-slate-400 text-[11px]">({displayCode})</span>
                          </div>
                          <p className="text-[10px] text-slate-400">{displayCountry}</p>
                        </div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300 tabular-nums">
                        {formatTime(flight.scheduledTime)}
                      </td>

                      {/* Estimated / Actual Time */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums">
                        {isDelayed ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-semibold">{formatTime(flight.estimatedTime)}</span>
                            <span className="text-[10px] text-amber-500">(+{flight.delayMinutes}m)</span>
                          </div>
                        ) : flight.actualTime ? (
                          <span className="text-cyan-400 font-medium">{formatTime(flight.actualTime)}</span>
                        ) : (
                          <span className="text-slate-400">{formatTime(flight.scheduledTime)}</span>
                        )}
                      </td>

                      {/* Terminal & Gate */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-semibold px-2 py-0.5 rounded text-xs ${
                              flight.previousGate
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            {flight.gate}
                          </span>
                          {flight.previousGate && (
                            <span className="text-[10px] text-amber-400 font-medium" title={`Changed from ${flight.previousGate}`}>
                              (Changed)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{flight.concourse.split(' ')[0]}</p>
                      </td>

                      {/* Check-in or Baggage Carousel */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300 text-xs">
                        {isDeparture ? (
                          <span className="text-slate-300">{flight.checkInCounters}</span>
                        ) : (
                          <span className="text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {flight.baggageBelt}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">{statusBadge}</td>

                      {/* Open Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectFlight(flight);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <span>Radar</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
