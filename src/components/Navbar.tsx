import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Download, Radio, Plane, ShieldCheck, CloudSun, Key } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { getNotificationPermissionStatus, requestBrowserNotificationPermission } from '../utils/notifications';

interface NavbarProps {
  activeTab: 'boards' | 'radar' | 'terminal' | 'weather' | 'alerts' | 'watchlist';
  setActiveTab: (tab: 'boards' | 'radar' | 'terminal' | 'weather' | 'alerts' | 'watchlist') => void;
  watchlistCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  unreadAlertsCount: number;
  weatherRisk?: 'LOW' | 'MODERATE' | 'HIGH';
  weatherFlightCat?: string;
  onOpenApisModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  watchlistCount,
  soundEnabled,
  setSoundEnabled,
  unreadAlertsCount,
  weatherRisk,
  weatherFlightCat,
  onOpenApisModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [pktTime, setPktTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermissionStatus());

    const updateClock = () => {
      const now = new Date();
      // PKT is UTC+5
      const pktDate = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      setPktTime(pktDate.toTimeString().substring(0, 8) + ' PKT');
      setUtcTime(now.toTimeString().substring(0, 8) + ' UTC');
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    const status = await requestBrowserNotificationPermission();
    setPermission(status);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-750 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Wordmark (Zone 1) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">KHI RADAR</span>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">OPKC</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium hidden sm:block">Karachi Jinnah International Airport</p>
            </div>
          </div>

          {/* Navigation Tabs (Zone 2) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('boards')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'boards' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              Flight Boards
            </button>
            <button
              onClick={() => setActiveTab('radar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'radar' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Airspace Radar
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'terminal' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Terminal & Gates
            </button>
            <button
              onClick={() => setActiveTab('weather')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'weather' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5 text-amber-400" />
              <span>METAR / TAF</span>
              {weatherRisk && (
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                    weatherRisk === 'HIGH'
                      ? 'bg-rose-500/20 text-rose-300'
                      : weatherRisk === 'MODERATE'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {weatherRisk}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 relative flex items-center gap-1.5 ${
                activeTab === 'alerts' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Push Alerts
              {unreadAlertsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {unreadAlertsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'watchlist' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>Watchlist</span>
              {watchlistCount > 0 && (
                <span className="text-[10px] font-mono bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded font-bold">
                  {watchlistCount}
                </span>
              )}
            </button>
          </nav>

          {/* Action Zone (Zone 3) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Clocks */}
            <div className="hidden lg:flex flex-col items-end text-right pr-2 border-r border-slate-750">
              <span className="text-xs font-mono font-bold text-white tabular-nums">{pktTime}</span>
              <span className="text-[10px] font-mono text-slate-300 tabular-nums">{utcTime}</span>
            </div>

            {/* API Integrations Modal Trigger */}
            {onOpenApisModal && (
              <button
                onClick={onOpenApisModal}
                title="View Connected APIs: RapidAPI, OAG, ADS-B DB & Feeder"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-750 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">APIs</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </button>
            )}

            {/* Audio Chime Mute Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Airport announcement chimes enabled' : 'Chimes muted'}
              className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-750'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Push Notification Permission Button */}
            {permission !== 'granted' ? (
              <button
                onClick={handleRequestPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0"
              >
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                <span className="hidden sm:inline">Enable Push Alerts</span>
                <span className="sm:hidden">Push</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('alerts')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg whitespace-nowrap shrink-0"
                title="Browser push notifications active"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Push Active</span>
              </button>
            )}

            {/* PWA Install Button */}
            {isInstallable && !isInstalled && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {isIOS && !isInstalled && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="text-xs font-medium text-slate-300 border border-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-800"
              >
                Install iOS
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('boards')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'boards' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Boards
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'radar' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Radar Map
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'terminal' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('weather')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'weather' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Weather {weatherRisk && `(${weatherRisk})`}
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap relative ${
              activeTab === 'alerts' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Alerts {unreadAlertsCount > 0 && `(${unreadAlertsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'watchlist' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            Watchlist ({watchlistCount})
          </button>
        </div>
      </div>

      {/* iOS Install Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Install Karachi Airport Radar</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              1. Tap the <strong className="text-white">Share</strong> icon in your Safari toolbar.<br />
              2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.<br />
              3. You'll receive real-time push notifications and offline access directly on your device.
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-medium text-white transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
