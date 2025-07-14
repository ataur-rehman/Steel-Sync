// hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notifications';

interface PushNotificationState {
  isSupported: boolean;
  isGranted: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<boolean>;
  sendTestNotification: (title: string, body: string) => Promise<void>;
  enablePushNotifications: () => Promise<void>;
  disablePushNotifications: () => void;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isGranted: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Check if push notifications are supported
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    const isGranted = isSupported && Notification.permission === 'granted';

    setState(prev => ({
      ...prev,
      isSupported,
      isGranted,
    }));
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      setState(prev => ({
        ...prev,
        isGranted: granted,
        isLoading: false,
        error: granted ? null : 'Notification permission denied',
      }));

      return granted;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request notification permission',
      }));
      return false;
    }
  };

  const sendTestNotification = async (title: string, body: string): Promise<void> => {
    if (!state.isGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: false,
        silent: false,
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to send test notification',
      }));
    }
  };

  const enablePushNotifications = async (): Promise<void> => {
    if (!state.isGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    // Register service worker for push notifications
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Subscribe to push notifications
        // This would integrate with your backend push service
        // const subscription = await registration.pushManager.subscribe({
        //   userVisibleOnly: true,
        //   applicationServerKey: YOUR_VAPID_PUBLIC_KEY
        // });
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to enable push notifications',
      }));
    }
  };

  const disablePushNotifications = (): void => {
    // Unsubscribe from push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            subscription.unsubscribe();
          }
        });
      });
    }
  };

  return {
    ...state,
    requestPermission,
    sendTestNotification,
    enablePushNotifications,
    disablePushNotifications,
  };
};

// Service Worker template for push notifications
export const createServiceWorkerTemplate = (): string => {
  return `
// sw.js - Service Worker for push notifications
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
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
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  if (notificationData && notificationData.url) {
    event.waitUntil(
      clients.openWindow(notificationData.url)
    );
  }
});
`;
};

// Local notification utility functions
export const createLocalNotification = (
  title: string,
  body: string,
  options: {
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    requireInteraction?: boolean;
    silent?: boolean;
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
  } = {}
): void => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || 'local-notification',
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      data: { url: options.url },
    });

    notification.onclick = () => {
      if (options.url) {
        window.open(options.url, '_blank');
      }
      notification.close();
    };

    // Auto-close after 5 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }
};

// Integration with notification service
export const integrateWithNotificationService = (): void => {
  // Listen for new notifications and show as local notifications
  notificationService.on('notification_created', (notification: any) => {
    if (Notification.permission === 'granted') {
      const urgentNotification = notification.priority === 'urgent';
      
      createLocalNotification(
        notification.title,
        notification.message,
        {
          tag: notification.id,
          url: notification.actionUrl,
          requireInteraction: urgentNotification,
          silent: false,
        }
      );
    }
  });
};
