/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { FlightBoard } from './components/FlightBoard';
import { AirspaceRadar } from './components/AirspaceRadar';
import { TerminalGateMap } from './components/TerminalGateMap';
import { NotificationAlertsCenter } from './components/NotificationAlertsCenter';
import { WatchlistView } from './components/WatchlistView';
import { FlightDetailModal } from './components/FlightDetailModal';
import { WeatherWidget } from './components/WeatherWidget';
import {
  Flight,
  NotificationAlert,
  AirportStats,
  FlightFilterState
} from './types/flight';
import { OpkcWeatherResponse } from './types/weather';
import {
  getSavedPushSettings,
  savePushSettings,
  getWatchlist,
  saveWatchlist,
  dispatchFlightPushNotification,
  initNotificationServiceWorker,
  PushNotificationSettings
} from './utils/notifications';
import { Bell, AlertCircle, X, ShieldAlert } from 'lucide-react';

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stats, setStats] = useState<AirportStats | null>(null);
  const [weather, setWeather] = useState<OpkcWeatherResponse | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [settings, setSettings] = useState<PushNotificationSettings>(getSavedPushSettings);
  const [activeTab, setActiveTab] = useState<'boards' | 'radar' | 'terminal' | 'weather' | 'alerts' | 'watchlist'>('boards');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [activeToast, setActiveToast] = useState<NotificationAlert | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const [filters, setFilters] = useState<FlightFilterState>({
    type: 'departure',
    category: 'all',
    status: 'all',
    searchQuery: '',
    watchlistOnly: false,
    window: '3h',
  });
  const [isSyncingFeed, setIsSyncingFeed] = useState<boolean>(false);

  // Watchlist ref to avoid stale closures in SSE callbacks
  const watchlistRef = useRef<string[]>(watchlist);
  const settingsRef = useRef<PushNotificationSettings>(settings);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load initial watchlist from local storage and initialize service worker
  useEffect(() => {
    initNotificationServiceWorker();
    const saved = getWatchlist();
    if (saved.length > 0) {
      setWatchlist(saved);
    } else {
      // Seed default watchlist with popular domestic and international flights
      const initialSeed = ['pk302', 'ek601', 'pa200'];
      setWatchlist(initialSeed);
      saveWatchlist(initialSeed);
    }
  }, []);

  // Fetch weather METAR/TAF for OPKC
  const fetchWeather = useCallback(async () => {
    setIsWeatherLoading(true);
    try {
      let res = await fetch('/api/weather/opkc').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('api.php?action=weather').catch(() => null);
      }
      if (res && res.ok) {
        const data: OpkcWeatherResponse = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.warn('Weather fetch warning:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  // Fetch flight data
  const fetchData = useCallback(async () => {
    try {
      let [flightsRes, statsRes, notifsRes] = await Promise.all([
        fetch('/api/flights?window=all').catch(() => null),
        fetch('/api/airport/stats').catch(() => null),
        fetch('/api/notifications').catch(() => null),
      ]);

      if (!flightsRes || !flightsRes.ok) {
        flightsRes = await fetch('api.php?action=flights').catch(() => null);
      }

      if (flightsRes && flightsRes.ok) {
        const flightsData = await flightsRes.json();
        setFlights(flightsData);
      }
      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (notifsRes && notifsRes.ok) {
        const notifsData = await notifsRes.json();
        setNotifications(notifsData);
      }
    } catch (err) {
      console.warn('API fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dedicated live air traffic feed refresh (triggers live Flightradar24 query on backend)
  const handleSyncFeed = useCallback(async () => {
    setIsSyncingFeed(true);
    try {
      const syncRes = await fetch('/api/feed/sync', { method: 'POST' });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.stats) setStats(syncData.stats);
      }
      await fetchData();
    } catch (err) {
      console.warn('Manual feed sync warning:', err);
    } finally {
      setIsSyncingFeed(false);
    }
  }, [fetchData]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial fetch and SSE Real-time live stream
  useEffect(() => {
    fetchData();
    fetchWeather();

    // Setup SSE connection
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');

      eventSource.addEventListener('flights_tick', (e: MessageEvent) => {
        try {
          const updatedFlights: Flight[] = JSON.parse(e.data);
          setFlights(updatedFlights);
        } catch (err) {
          // ignore parse error
        }
      });

      eventSource.addEventListener('flight_updated', (e: MessageEvent) => {
        try {
          const updatedFlight: Flight = JSON.parse(e.data);
          setFlights(prev =>
            prev.map(f => (f.id === updatedFlight.id ? updatedFlight : f))
          );
          setSelectedFlight(prev => (prev?.id === updatedFlight.id ? updatedFlight : prev));
        } catch (err) {
          // ignore
        }
      });

      eventSource.addEventListener('notification', (e: MessageEvent) => {
        try {
          const alert: NotificationAlert = JSON.parse(e.data);
          setNotifications(prev => [alert, ...prev.slice(0, 40)]);

          // Trigger push notification (sound chime + desktop push)
          dispatchFlightPushNotification(alert, settingsRef.current, watchlistRef.current);

          // Show in-app banner toast
          setActiveToast(alert);
          setTimeout(() => {
            setActiveToast(current => (current?.id === alert.id ? null : current));
          }, 6000);
        } catch (err) {
          // ignore
        }
      });
    } catch (err) {
      console.warn('EventSource initialization skipped:', err);
    }

    // Interval fallback (every 15 seconds)
    const interval = setInterval(fetchData, 15000);
    // Weather refresh every 3 minutes
    const weatherInterval = setInterval(fetchWeather, 180000);

    return () => {
      clearInterval(interval);
      clearInterval(weatherInterval);
      if (eventSource) eventSource.close();
    };
  }, [fetchData, fetchWeather]);

  // Toggle Watchlist handler
  const handleToggleWatchlist = (flightId: string) => {
    setWatchlist(prev => {
      const exists = prev.includes(flightId);
      const next = exists ? prev.filter(id => id !== flightId) : [...prev, flightId];
      saveWatchlist(next);
      return next;
    });
  };

  // Trigger test simulation event from the client
  const handleSimulateEvent = async (
    flightId: string,
    eventType: 'gate_change' | 'delay' | 'boarding' | 'landed'
  ) => {
    try {
      const res = await fetch('/api/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId, eventType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alert) {
          setNotifications(prev => [data.alert, ...prev]);
          dispatchFlightPushNotification(data.alert, settingsRef.current, watchlistRef.current);
          setActiveToast(data.alert);
          setTimeout(() => {
            setActiveToast(current => (current?.id === data.alert.id ? null : current));
          }, 6000);
        }
        if (data.flight) {
          setFlights(prev => prev.map(f => (f.id === data.flight.id ? data.flight : f)));
          if (selectedFlight?.id === data.flight.id) {
            setSelectedFlight(data.flight);
          }
        }
      }
    } catch (err) {
      console.warn('Simulation error:', err);
    }
  };

  const handleSelectFlightById = (flightId: string) => {
    const flight = flights.find(f => f.id === flightId);
    if (flight) {
      setSelectedFlight(flight);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-600 px-4 py-2 text-center text-xs font-semibold text-slate-950 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Offline Mode: Operating with cached local flight data.</span>
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        watchlistCount={watchlist.length}
        soundEnabled={settings.soundEnabled}
        setSoundEnabled={enabled => {
          const updated = { ...settings, soundEnabled: enabled };
          setSettings(updated);
          savePushSettings(updated);
        }}
        unreadAlertsCount={notifications.slice(0, 5).length}
        weatherRisk={weather?.metar.delayRisk.level}
        weatherFlightCat={weather?.metar.flightCategory}
      />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Airport Status & Twilight Apron Banner */}
        <HeroBanner
          stats={stats}
          onQuickFilter={filterType => {
            setActiveTab('boards');
            setFilters(prev => ({
              ...prev,
              status: filterType === 'delayed' ? 'delayed' : filterType === 'boarding' ? 'boarding' : 'all',
            }));
          }}
          onOpenWeather={() => setActiveTab('weather')}
        />

        {/* View Switcher Container */}
        {activeTab === 'boards' && (
          <FlightBoard
            flights={flights}
            filters={filters}
            setFilters={setFilters}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectFlight={setSelectedFlight}
            onTriggerTestAlert={handleSimulateEvent}
            stats={stats}
            onRefreshFeed={handleSyncFeed}
            isSyncingFeed={isSyncingFeed}
          />
        )}

        {activeTab === 'radar' && (
          <AirspaceRadar
            flights={flights}
            selectedFlight={selectedFlight}
            onSelectFlight={setSelectedFlight}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalGateMap
            flights={flights}
            onSelectFlight={setSelectedFlight}
          />
        )}

        {activeTab === 'weather' && (
          <WeatherWidget
            weather={weather}
            isLoading={isWeatherLoading}
            onRefresh={fetchWeather}
          />
        )}

        {activeTab === 'alerts' && (
          <NotificationAlertsCenter
            notifications={notifications}
            settings={settings}
            setSettings={setSettings}
            onSimulateEvent={handleSimulateEvent}
            onSelectFlightById={handleSelectFlightById}
            flights={flights}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            flights={flights}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectFlight={setSelectedFlight}
          />
        )}
      </main>

      {/* Flight Detail Modal / Drawer */}
      <FlightDetailModal
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
        isWatchlisted={selectedFlight ? watchlist.includes(selectedFlight.id) : false}
        onToggleWatchlist={handleToggleWatchlist}
        onSimulateEvent={handleSimulateEvent}
        weather={weather}
        onViewWeather={() => setActiveTab('weather')}
      />

      {/* Live In-App Notification Toast */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border border-amber-500/50 shadow-2xl rounded-xl p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">{activeToast.title}</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{activeToast.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      handleSelectFlightById(activeToast.flightId);
                      setActiveToast(null);
                    }}
                    className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 uppercase tracking-wider"
                  >
                    View Radar Track →
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Karachi Jinnah International Airport (KHI / OPKC)</span>
            <span>·</span>
            <span>Civil Aviation Aerodrome Telemetry</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Primary Runways 25L/07R & 25R/07L</span>
            <span>·</span>
            <span>Pakistan Standard Time (PKT UTC+5)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
