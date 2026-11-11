// Karachi Airport Flight Radar - Service Worker for Background & Push Notifications
const SW_VERSION = 'khi-radar-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'Karachi Airport (KHI) Alert',
    message: 'Flight schedule or gate update.',
    flightId: 'KHI',
    tag: 'khi-flight-alert',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.message = event.data.text();
    }
  }

  const title = data.title || 'Karachi Airport Flight Alert';
  const options = {
    body: data.message || data.body || 'Flight status update received.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || `khi-flight-${data.flightId || 'alert'}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || `/?flight=${data.flightId || ''}`,
      flightId: data.flightId,
    },
    actions: [
      { action: 'open', title: 'Open Radar Track' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking the system notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for direct messages from the client to trigger notifications through SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
