// sw.js - Service Worker for push notifications
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {},
      silent: data.silent || false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  const notificationData = event.notification.data;
  if (notificationData && notificationData.url) {
    event.waitUntil(
      clients.openWindow(notificationData.url)
    );
  } else {
    // Open the main app if no specific URL
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event);
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
