import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Check,
  Send,
  Zap,
  Radio,
  Sliders,
  Plane
} from 'lucide-react';
import { NotificationAlert, Flight } from '../types/flight';
import {
  PushNotificationSettings,
  savePushSettings,
  requestBrowserNotificationPermission,
  getNotificationPermissionStatus
} from '../utils/notifications';
import { playAirportChime } from '../utils/audioChime';

interface NotificationAlertsCenterProps {
  notifications: NotificationAlert[];
  settings: PushNotificationSettings;
  setSettings: React.Dispatch<React.SetStateAction<PushNotificationSettings>>;
  onSimulateEvent: (flightId: string, eventType: 'gate_change' | 'delay' | 'boarding' | 'landed') => void;
  onSelectFlightById: (flightId: string) => void;
  flights: Flight[];
}

export const NotificationAlertsCenter: React.FC<NotificationAlertsCenterProps> = ({
  notifications,
  settings,
  setSettings,
  onSimulateEvent,
  onSelectFlightById,
  flights
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermissionStatus());
  const [simulatedFlightId, setSimulatedFlightId] = useState<string>('ek601');
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  const handleToggle = (key: keyof PushNotificationSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    savePushSettings(updated);
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermission(res);
  };

  const handleSimulate = (type: 'gate_change' | 'delay' | 'boarding' | 'landed') => {
    onSimulateEvent(simulatedFlightId, type);
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Push Permissions & Notification Center Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Live Flight Push Notifications & Alert Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Receive instant desktop and mobile browser push notifications for gate changes, delays, and arrival statuses for Karachi Airport.
            </p>
          </div>

          {/* Browser Push Permission Status Card */}
          <div className="flex flex-wrap items-center gap-2">
            {permission === 'granted' ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Device Push Active</span>
              </div>
            ) : permission === 'denied' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Blocked in Browser (Using In-App Alerts)</span>
              </div>
            ) : (
              <button
                onClick={handleRequestPermission}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md active:scale-95"
              >
                <Bell className="w-4 h-4" />
                <span>Enable Browser Notifications</span>
              </button>
            )}

            <button
              onClick={() => handleSimulate('gate_change')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 transition-colors"
              title="Send a sample push alert and chime immediately"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Push Alert</span>
            </button>

            <button
              onClick={() => playAirportChime('notification')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
              title="Test airport chime sound"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Chime</span>
            </button>
          </div>
        </div>

        {/* Guidance when notifications are denied by browser */}
        {permission === 'denied' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Browser Notifications Are Blocked</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                To receive desktop or mobile lockscreen alerts, click the <strong>tune/lock icon</strong> in your browser's address bar (next to the URL), change <em>Notifications</em> to <strong>Allow</strong>, and reload. In-app audio chimes and live alert popups remain fully active.
              </p>
            </div>
          </div>
        )}

        {/* Push Notification Preferences Grid */}
        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-3">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>Notification Delivery Triggers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Gate Changes */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.gateChanges}
                onChange={() => handleToggle('gateChanges')}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-white block">Gate Reassignments</span>
                <span className="text-[11px] text-slate-400">Immediate push when aerobridge or gate changes.</span>
              </div>
            </label>

            {/* Delays */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.delays}
                onChange={() => handleToggle('delays')}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-white block">Flight Delay Updates</span>
                <span className="text-[11px] text-slate-400">Notifies when delay exceeds 15 min with ATC reason.</span>
              </div>
            </label>

            {/* Boarding Calls */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.boardingCalls}
                onChange={() => handleToggle('boardingCalls')}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-white block">Boarding & Final Call</span>
                <span className="text-[11px] text-slate-400">Departure gate boarding commencement alert.</span>
              </div>
            </label>

            {/* Touchdowns */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.touchdown}
                onChange={() => handleToggle('touchdown')}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-white block">Runway Touchdown & Baggage</span>
                <span className="text-[11px] text-slate-400">Arrival touchdown and baggage carousel assignment.</span>
              </div>
            </label>

            {/* Sound Chimes */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={() => handleToggle('soundEnabled')}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-white block">Airport Chime Audio</span>
                <span className="text-[11px] text-slate-400">Play synthesized airport chime on every alert.</span>
              </div>
            </label>

            {/* Watchlist Filter */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={settings.watchlistOnly}
                onChange={() => handleToggle('watchlistOnly')}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-white block">Starred Flights Only</span>
                <span className="text-[11px] text-slate-400">Only trigger notifications for your watchlisted flights.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Live Push Notification Simulator Bar */}
        <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-amber-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Zap className="w-4 h-4" />
                <span>Instant Push Notification Simulator</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Trigger a live event to verify push notifications and sound chimes on your device right now.
              </p>
            </div>

            {/* Flight Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Target Flight:</span>
              <select
                value={simulatedFlightId}
                onChange={e => setSimulatedFlightId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                {flights.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.flightNumber} ({f.airline.code}) - {f.destination.code === 'KHI' ? f.origin.city : f.destination.city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <button
              onClick={() => handleSimulate('gate_change')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Gate Change</span>
            </button>
            <button
              onClick={() => handleSimulate('delay')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate +35m ATC Delay</span>
            </button>
            <button
              onClick={() => handleSimulate('boarding')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Plane className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Boarding Call</span>
            </button>
            <button
              onClick={() => handleSimulate('landed')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulate Touchdown</span>
            </button>

            {testNotificationSent && (
              <span className="text-xs text-emerald-400 font-medium animate-pulse ml-2">
                ✓ Push notification broadcasted!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Push Notification Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Broadcast Alerts Stream</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {notifications.length} alerts logged
          </span>
        </div>

        <div className="divide-y divide-slate-800/80 mt-2">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No push alerts logged yet today.</p>
          ) : (
            notifications.map(notif => {
              const isUrgent = notif.severity === 'urgent';
              const isWarning = notif.severity === 'warning';

              return (
                <div
                  key={notif.id}
                  onClick={() => onSelectFlightById(notif.flightId)}
                  className="py-3 px-2 flex items-start justify-between gap-4 hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isUrgent
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {notif.type === 'gate_change' ? (
                        <Plane className="w-4 h-4" />
                      ) : notif.type === 'delay_update' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{notif.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {notif.route}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.gate && (
                        <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                          {notif.gate}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
