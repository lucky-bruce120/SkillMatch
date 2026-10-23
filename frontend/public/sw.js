/**
 * Minimal service worker.
 *
 * Its only job is to display notifications on platforms (most notably Android
 * Chrome) that refuse `new Notification(...)` and require a service worker
 * registration instead. It deliberately does not cache anything, so it cannot
 * serve stale assets or interfere with the dev server.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
        return undefined;
      })
  );
});
