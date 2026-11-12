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
import { AIRPORT_COORDS } from '../services/clientScheduleFallback';

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
  onOpenApisModal?: () => void;
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
  isSyncingFeed,
  onOpenApisModal
}) => {
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<'all' | 'delayed' | 'boarding' | 'active' | 'landed'>(
    (filters.status as any) || 'all'
  );

  // 0. Base valid flights: exclude airport ground vehicles (e.g. SCOP27), sweepers, tugs, test transponders
  const cleanFlights = useMemo(() => {
    return flights.filter(flight => {
      const isGroundVehicle =
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(flight.flightNumber) ||
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(flight.airline.code) ||
        flight.aircraft.registration === 'N644PK' ||
        (flight.origin.code === 'KHI' && flight.destination.code === 'KHI' && flight.telemetry && flight.telemetry.altitudeFt < 1000 && flight.telemetry.groundSpeedKnots < 130);
      return !isGroundVehicle;
    });
  }, [flights]);

  // Total daily counts
  const totalDepartures = useMemo(() => cleanFlights.filter(f => f.type === 'departure').length, [cleanFlights]);
  const totalArrivals = useMemo(() => cleanFlights.filter(f => f.type === 'arrival').length, [cleanFlights]);

  // Window-matched counts for departures and arrivals
  const windowFilteredDepartures = useMemo(() => {
    const windowMode = filters.window || 'all';
    if (windowMode === 'all') return totalDepartures;
    const nowMs = Date.now();
    return cleanFlights.filter(f => {
      if (f.type !== 'departure') return false;
      if (f.isLiveRadar && f.status !== 'Departed' && f.status !== 'Arrived') return true;
      const schedMs = new Date(f.scheduledTime).getTime();
      const diffHours = (schedMs - nowMs) / (1000 * 60 * 60);
      if (windowMode === '3h') return diffHours >= -3.25 && diffHours <= 3.25;
      if (windowMode === '6h') return diffHours >= -1.0 && diffHours <= 6.25;
      return true;
    }).length;
  }, [cleanFlights, filters.window, totalDepartures]);

  const windowFilteredArrivals = useMemo(() => {
    const windowMode = filters.window || 'all';
    if (windowMode === 'all') return totalArrivals;
    const nowMs = Date.now();
    return cleanFlights.filter(f => {
      if (f.type !== 'arrival') return false;
      if (f.isLiveRadar && f.status !== 'Departed' && f.status !== 'Arrived') return true;
      const schedMs = new Date(f.scheduledTime).getTime();
      const diffHours = (schedMs - nowMs) / (1000 * 60 * 60);
      if (windowMode === '3h') return diffHours >= -3.25 && diffHours <= 3.25;
      if (windowMode === '6h') return diffHours >= -1.0 && diffHours <= 6.25;
      return true;
    }).length;
  }, [cleanFlights, filters.window, totalArrivals]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-800/95 border border-emerald-500/40 text-xs shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold text-white">Live Air Traffic Feeds:</span>
          <span className="text-emerald-300 font-mono font-bold">
            {flights.filter(f => f.isLiveRadar).length || stats?.liveRadarCount || 14} Aircraft Tracked Live in Karachi FIR
          </span>
          <span
            onClick={onOpenApisModal}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer transition-colors"
            title="adsb.fi Open Data v3 (250 NM radius) - Click to view status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            adsb.fi (250 NM)
          </span>
          <span className="hidden md:inline px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[10px] font-semibold border border-slate-600">
            Flightradar24 Feeder
          </span>
          <span
            onClick={onOpenApisModal}
            className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-semibold border border-blue-500/30 hover:bg-blue-500/30 cursor-pointer transition-colors"
            title="OAG Official Aviation Guide - Click to view status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            OAG Flight Info
          </span>
          <span
            onClick={onOpenApisModal}
            className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-semibold border border-cyan-500/30 hover:bg-cyan-500/30 cursor-pointer transition-colors"
            title="ADS-B DB (mrjackwills) open-source route database active - Click to view status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            ADS-B DB
          </span>
          <span
            onClick={onOpenApisModal}
            className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-semibold border border-purple-500/30 hover:bg-purple-500/30 cursor-pointer transition-colors"
            title="RapidAPI flightradar243 key configured - Click to view status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            RapidAPI flightradar243
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-300 font-mono font-medium hidden sm:inline">
            Auto-syncing 15s
          </span>
          {onRefreshFeed && (
            <button
              onClick={onRefreshFeed}
              disabled={isSyncingFeed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              title="Trigger real-time re-sync from all radar & schedule feeds"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${isSyncingFeed ? 'animate-spin' : ''}`} />
              <span>{isSyncingFeed ? 'Syncing Feeds...' : 'Refresh Live Feed'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Bar & Filter Tabs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/90 border border-slate-700 shadow-md">
        
        {/* Left Side: Departures/Arrivals + Domestic/International + Operational Window */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Departures vs Arrivals Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700">
            <button
              onClick={() => handleTypeChange('departure')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.type === 'departure'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <PlaneTakeoff className="w-4 h-4" />
              Departures ({filters.window && filters.window !== 'all' ? `${windowFilteredDepartures} of ${totalDepartures}` : totalDepartures})
            </button>
            <button
              onClick={() => handleTypeChange('arrival')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.type === 'arrival'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <PlaneLanding className="w-4 h-4" />
              Arrivals ({filters.window && filters.window !== 'all' ? `${windowFilteredArrivals} of ${totalArrivals}` : totalArrivals})
            </button>
          </div>

          {/* Operational Window Filter (±3h Current Window / Next 6h / 24h Full Day) */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-300 px-2 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Window:</span>
            </span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, window: 'all' }))}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                (!filters.window || filters.window === 'all')
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Full 24-hour daily flight schedule"
            >
              Full Day ({cleanFlights.length})
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, window: '3h' }))}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.window === '3h'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Flights operating within ±3 hours of current time"
            >
              Current (±3h)
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, window: '6h' }))}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.window === '6h'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Next 6 hours of flight operations"
            >
              Next 6h
            </button>
          </div>

          {/* Domestic vs International Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.category === 'all'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              All Routes
            </button>
            <button
              onClick={() => handleCategoryChange('domestic')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.category === 'domestic'
                  ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/50'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Domestic
            </button>
            <button
              onClick={() => handleCategoryChange('international')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filters.category === 'international'
                  ? 'bg-blue-600/40 text-blue-200 border border-blue-500/50'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              International
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search flight #, city (Dubai, Islamabad), airline, gate..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400 font-medium transition-colors shadow-inner"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-300 font-bold text-xs whitespace-nowrap">Filter Status:</span>
        <button
          onClick={() => handleQuickFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            selectedQuickFilter === 'all'
              ? 'bg-slate-700 text-white font-bold shadow-xs'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          All Statuses
        </button>
        <button
          onClick={() => handleQuickFilter('delayed')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            selectedQuickFilter === 'delayed'
              ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40 font-bold'
              : 'text-slate-300 hover:text-amber-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Delayed Flights Only
        </button>
        <button
          onClick={() => handleQuickFilter('boarding')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            selectedQuickFilter === 'boarding'
              ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 font-bold'
              : 'text-slate-300 hover:text-emerald-300'
          }`}
        >
          Boarding / Final Call
        </button>
        <button
          onClick={() => handleQuickFilter('active')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            selectedQuickFilter === 'active'
              ? 'bg-blue-500/25 text-blue-200 border border-blue-500/40 font-bold'
              : 'text-slate-300 hover:text-blue-300'
          }`}
        >
          Active In-Air
        </button>
        <button
          onClick={() => handleQuickFilter('landed')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            selectedQuickFilter === 'landed'
              ? 'bg-teal-500/25 text-teal-200 border border-teal-500/40 font-bold'
              : 'text-slate-300 hover:text-teal-300'
          }`}
        >
          Landed / Baggage
        </button>
      </div>

      {/* Active Operational Window Notice Banner when filtering by 3h or 6h */}
      {filters.window && filters.window !== 'all' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-200">
              Showing <strong className="text-white font-mono">{filteredFlights.length}</strong> {filters.type === 'departure' ? 'Departures' : filters.type === 'arrival' ? 'Arrivals' : 'Flights'} in the <strong className="text-amber-300">{filters.window === '3h' ? 'Current (±3h)' : 'Next 6h'}</strong> operational window.
            </span>
          </div>
          <button
            onClick={() => setFilters(prev => ({ ...prev, window: 'all' }))}
            className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-white underline cursor-pointer shrink-0 transition-colors"
          >
            Switch to Full Day Schedule (View All {filters.type === 'departure' ? totalDepartures : filters.type === 'arrival' ? totalArrivals : cleanFlights.length}) →
          </button>
        </div>
      )}

      {/* Active Filter Status & Match Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white font-mono">{filteredFlights.length}</strong> of{' '}
          <strong className="text-white font-mono">{filters.type === 'departure' ? totalDepartures : filters.type === 'arrival' ? totalArrivals : cleanFlights.length}</strong> {filters.type === 'departure' ? 'departures' : filters.type === 'arrival' ? 'arrivals' : 'flights'}
          {filters.window && filters.window !== 'all' && (
            <span className="text-amber-400 font-mono text-[11px] ml-1.5">
              ({filters.window === '3h' ? '±3h window' : '6h window'})
            </span>
          )}
        </span>
        {(filters.type !== 'all' || filters.category !== 'all' || filters.status !== 'all' || filters.searchQuery || (filters.window && filters.window !== 'all')) && (
          <button
            onClick={() => {
              setFilters({
                type: 'all',
                category: 'all',
                status: 'all',
                searchQuery: '',
                watchlistOnly: false,
                window: 'all',
              });
              setSelectedQuickFilter('all');
            }}
            className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
          >
            Show All / Reset Filters
          </button>
        )}
      </div>

      {/* Main FIDS Flight Board Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/90 overflow-hidden shadow-lg">
        {filteredFlights.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-white">No flights matching your filter criteria</p>
            <p className="text-xs text-slate-300 mt-1">Try resetting search keywords or changing the category filter.</p>
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
              className="mt-4 px-3.5 py-2 text-xs font-bold text-white bg-slate-700 rounded-lg hover:bg-slate-600 border border-slate-600 cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-850 text-xs font-bold text-slate-200 tracking-wider">
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
              <tbody className="divide-y divide-slate-700/60 text-xs">
                {filteredFlights.map(flight => {
                  const isWatchlisted = watchlist.includes(flight.id);
                  const isDeparture = flight.type === 'departure';
                  const isDelayed = flight.delayMinutes > 0;
                  const rawCity = isDeparture ? flight.destination.city : flight.origin.city;
                  const displayCode = isDeparture ? flight.destination.code : flight.origin.code;
                  const rawCountry = isDeparture ? flight.destination.country : flight.origin.country;

                  // Resolve missing / unexpanded city codes (e.g. DAC -> Dhaka, KUL -> Kuala Lumpur)
                  const matchedAirport = AIRPORT_COORDS[displayCode];
                  const displayCity = (!rawCity || rawCity === '(AIRSPACE)' || rawCity.toUpperCase() === displayCode.toUpperCase() || rawCity === `(${displayCode})`)
                    ? (matchedAirport ? matchedAirport.city : (displayCode === 'AIRSPACE' ? 'Karachi Flight Corridor' : rawCity || 'Aerodrome'))
                    : rawCity;
                  const displayCountry = (!rawCountry || rawCountry === 'International' || rawCountry === 'Pakistan')
                    ? (matchedAirport ? matchedAirport.country : rawCountry)
                    : rawCountry;

                  // Status styling
                  let statusBadge = (
                    <span className="text-slate-200 font-semibold">{flight.status}</span>
                  );
                  if (flight.status === 'Departed') {
                    const isReached = flight.destination.code === 'DXB' || flight.destination.code === 'SHJ' || flight.destination.code === 'DOH';
                    statusBadge = (
                      <span className="text-emerald-300 font-bold text-xs bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded">
                        {isReached ? `Departed (Arrived in ${flight.destination.city})` : 'Departed'}
                      </span>
                    );
                  } else if (flight.status === 'Arrived') {
                    statusBadge = (
                      <span className="text-teal-300 font-bold text-xs bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded">
                        Landed / Arrived
                      </span>
                    );
                  } else if (flight.status === 'Boarding' || flight.status === 'Final Call') {
                    statusBadge = (
                      <span className="text-emerald-300 font-bold bg-emerald-500/25 border border-emerald-500/40 px-2 py-0.5 rounded text-xs animate-pulse">
                        {flight.status}
                      </span>
                    );
                  } else if (isDelayed || flight.status === 'Delayed') {
                    statusBadge = (
                      <div className="flex flex-col">
                        <span className="text-amber-300 font-bold text-xs bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded inline-block">
                          Delayed (+{flight.delayMinutes}m)
                        </span>
                        {flight.delayReason && (
                          <span className="text-xs text-slate-300 font-medium truncate max-w-[130px] mt-0.5" title={flight.delayReason}>
                            {flight.delayReason}
                          </span>
                        )}
                      </div>
                    );
                  } else if (flight.status === 'Landed') {
                    statusBadge = (
                      <span className="text-cyan-300 font-bold bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded text-xs">
                        Landed Rwy 25L
                      </span>
                    );
                  } else if (flight.status === 'Taxiing') {
                    statusBadge = (
                      <span className="text-amber-300 font-bold text-xs bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        Taxiing
                      </span>
                    );
                  } else if (flight.status === 'En Route' || flight.status === 'Approaching') {
                    const altText = flight.telemetry?.altitudeFt ? `FL${Math.round(flight.telemetry.altitudeFt / 100)}` : '';
                    const spdText = flight.telemetry?.groundSpeedKnots ? `${flight.telemetry.groundSpeedKnots}kt` : '';
                    statusBadge = (
                      <div className="flex flex-col">
                        <span className="text-blue-300 font-bold text-xs flex items-center gap-1.5">
                          {flight.status === 'Approaching' ? 'Final Approach' : 'En Route'}
                          {flight.isLiveRadar && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />}
                        </span>
                        {(altText || spdText) && (
                          <span className="text-xs font-mono text-slate-300 font-medium">
                            {altText} · {spdText}
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <tr
                      key={flight.id}
                      className="hover:bg-slate-750 transition-colors group cursor-pointer"
                      onClick={() => onSelectFlight(flight)}
                    >
                      {/* Watchlist Star Toggle */}
                      <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onToggleWatchlist(flight.id)}
                          title={isWatchlisted ? 'Remove from push watchlist' : 'Add to push alert watchlist'}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            isWatchlisted
                              ? 'text-amber-400 hover:text-amber-300 bg-amber-500/15'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
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
                              <span className="font-mono font-bold text-white text-sm tracking-tight">
                                {flight.flightNumber}
                              </span>
                              <span className="text-xs font-mono text-slate-300 font-semibold uppercase">
                                {flight.category === 'domestic' ? 'DOM' : 'INT'}
                              </span>
                              {flight.liveDataSource?.toLowerCase().includes('oag') && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30" title="Verified by OAG Official Airline Schedules">
                                  OAG
                                </span>
                              )}
                              {flight.liveDataSource?.toLowerCase().includes('adsb.fi') && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40" title="Live telemetry tracked via adsb.fi Open Data Network">
                                  adsb.fi
                                </span>
                              )}
                              {(flight.liveDataSource?.toLowerCase().includes('ads-b db') || flight.liveDataSource?.toLowerCase().includes('flightradar24')) && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30" title="Route origin and destination enriched by ADS-B DB (mrjackwills)">
                                  ADS-B DB
                                </span>
                              )}
                              {(flight.telemetry?.squawk === '7700' || flight.squawkCode === '7700') && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 font-mono text-[10px] font-bold border border-rose-500/50 animate-pulse" title="Squawk 7700 General Emergency Broadcast">
                                  SQK 7700
                                </span>
                              )}
                              {flight.isLiveRadar && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30 inline-flex items-center gap-1" title={flight.liveDataSource}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  LIVE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                              <span className="truncate max-w-[120px] text-slate-200">{flight.airline.name}</span>
                              <span>·</span>
                              <span className="font-mono text-slate-300 font-semibold">{flight.aircraft.registration}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Destination / Origin */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{displayCity}</span>
                            <span className="font-mono text-amber-300 font-bold text-xs">({displayCode})</span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium">{displayCountry}</p>
                        </div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-white font-bold text-sm tabular-nums">
                        {formatTime(flight.scheduledTime)}
                      </td>

                      {/* Estimated / Actual Time */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums">
                        {isDelayed ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-300 font-bold text-sm">{formatTime(flight.estimatedTime)}</span>
                            <span className="text-xs text-amber-400 font-semibold">(+{flight.delayMinutes}m)</span>
                          </div>
                        ) : flight.actualTime ? (
                          <span className="text-cyan-300 font-bold text-sm">{formatTime(flight.actualTime)}</span>
                        ) : (
                          <span className="text-slate-200 font-semibold text-sm">{formatTime(flight.scheduledTime)}</span>
                        )}
                      </td>

                      {/* Terminal & Gate */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold px-2.5 py-1 rounded text-xs ${
                              flight.previousGate
                                ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                                : 'bg-slate-700 text-white border border-slate-600'
                            }`}
                          >
                            {flight.gate}
                          </span>
                          {flight.previousGate && (
                            <span className="text-xs text-amber-300 font-bold" title={`Changed from ${flight.previousGate}`}>
                              (Changed)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 font-medium mt-0.5">{flight.concourse.split(' ')[0]}</p>
                      </td>

                      {/* Check-in or Baggage Carousel */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-100 text-xs font-semibold">
                        {isDeparture ? (
                          <span className="text-slate-100">{flight.checkInCounters}</span>
                        ) : (
                          <span className="text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded text-xs">
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
                          className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>Radar</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
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
