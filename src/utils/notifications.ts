import { NotificationAlert } from '../types/flight';
import { playAirportChime } from './audioChime';

export interface PushNotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  gateChanges: boolean;
  delays: boolean;
  boardingCalls: boolean;
  touchdown: boolean;
  watchlistOnly: boolean;
}

const SETTINGS_STORAGE_KEY = 'khi_push_settings_v1';
const WATCHLIST_STORAGE_KEY = 'khi_flight_watchlist_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: PushNotificationSettings = {
  enabled: true,
  soundEnabled: true,
  gateChanges: true,
  delays: true,
  boardingCalls: true,
  touchdown: true,
  watchlistOnly: false,
};

export function getSavedPushSettings(): PushNotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    // fallback
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function savePushSettings(settings: PushNotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // ignore
  }
}

export function getWatchlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveWatchlist(list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

/**
 * Initialize and register service worker for push notifications and offline caching
 */
export async function initNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Push service worker registration warning:', err);
    return null;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      // Dispatch immediate welcome test notification to verify delivery
      await sendVerificationPushNotification();
    }
    return perm;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return 'denied';
  }
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Sends a welcome verification notification once user enables push notifications
 */
export async function sendVerificationPushNotification() {
  const alert: NotificationAlert = {
    id: `welcome-${Date.now()}`,
    flightId: 'OPKC',
    flightNumber: 'OPKC',
    airline: 'Karachi Radar',
    type: 'status_change',
    title: '✓ Karachi Flight Alerts Active',
    message: 'Push notifications are now enabled! You will receive instant gate changes, delay updates, and arrivals.',
    severity: 'info',
    timestamp: new Date().toISOString(),
    route: 'KHI Jinnah Terminal',
  };

  await dispatchFlightPushNotification(alert, { ...DEFAULT_NOTIFICATION_SETTINGS, enabled: true }, []);
}

/**
 * Dispatches an alert with sound chime, vibration, and system notification
 */
export async function dispatchFlightPushNotification(
  alert: NotificationAlert,
  settings: PushNotificationSettings,
  watchlist: string[] = []
): Promise<boolean> {
  // Check if watchlist filter applies
  if (settings.watchlistOnly && watchlist.length > 0 && !watchlist.includes(alert.flightId)) {
    return false;
  }

  // Check specific categories
  if (alert.type === 'gate_change' && !settings.gateChanges) return false;
  if (alert.type === 'delay_update' && !settings.delays) return false;
  if (alert.type === 'boarding_call' && !settings.boardingCalls) return false;
  if (alert.type === 'touchdown' && !settings.touchdown) return false;

  // Sound chime
  if (settings.soundEnabled) {
    try {
      if (alert.type === 'gate_change') playAirportChime('gate_change');
      else if (alert.type === 'delay_update') playAirportChime('delay');
      else if (alert.type === 'boarding_call') playAirportChime('boarding');
      else if (alert.type === 'touchdown') playAirportChime('touchdown');
      else playAirportChime('notification');
    } catch (soundErr) {
      console.warn('Audio chime playback error:', soundErr);
    }
  }

  // Physical haptic vibration on mobile devices
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch (e) {
      // Ignore vibration error
    }
  }

  // Browser system push notification
  if (settings.enabled && isNotificationSupported() && Notification.permission === 'granted') {
    const notifOptions: any = {
      body: alert.message,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `khi-flight-${alert.flightId}`,
      renotify: true,
      data: {
        flightId: alert.flightId,
        url: `/?flight=${alert.flightId}`,
      },
    };

    // Approach 1: Try ServiceWorkerRegistration.showNotification (mandatory for Android Chrome & PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(alert.title, notifOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('Service worker showNotification fallback:', swErr);
      }
    }

    // Approach 2: Direct window.Notification constructor (desktop Chrome/Firefox/Safari)
    try {
      const n = new Notification(alert.title, notifOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch (nativeErr) {
      console.warn('Native Notification constructor failed (expected on some mobile browsers):', nativeErr);
    }
  }

  return false;
}

