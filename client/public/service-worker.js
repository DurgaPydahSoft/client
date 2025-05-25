// Log when service worker is installed
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  self.skipWaiting();
});

// Log when service worker is activated
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  return self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received:', event);
  
  try {
    const data = event.data.json();
    console.log('[Service Worker] Push Data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: {
        url: data.url,
        type: data.type,
        id: data.id
      },
      actions: getNotificationActions(data.type)
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Default action or 'open' action
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Helper function to get notification actions based on type
function getNotificationActions(type) {
  const baseActions = [
    {
      action: 'open',
      title: 'Open'
    },
    {
      action: 'close',
      title: 'Close'
    }
  ];

  switch (type) {
    case 'complaint':
      return [
        ...baseActions,
        {
          action: 'view_complaint',
          title: 'View Complaint'
        }
      ];
    case 'poll':
      return [
        ...baseActions,
        {
          action: 'vote',
          title: 'Vote Now'
        }
      ];
    case 'announcement':
      return [
        ...baseActions,
        {
          action: 'view_announcement',
          title: 'Read More'
        }
      ];
    case 'poll_ending':
      return [
        ...baseActions,
        {
          action: 'vote_now',
          title: 'Vote Now'
        }
      ];
    default:
      return baseActions;
  }
}
