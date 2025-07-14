// hooks/useNotifications.tsx
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notifications';
import type { Notification, NotificationSettings, NotificationCategory } from '../services/notifications';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  updateCategorySettings: (category: NotificationCategory, settings: any) => void;
  getUnreadByCategory: (category: NotificationCategory) => number;
  playTestSound: (priority: 'low' | 'medium' | 'high' | 'urgent') => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadNotifications = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
      setSettings(notificationService.getSettings());
      setLoading(false);
    };

    loadNotifications();

    // Event listeners
    const handleNotificationCreated = (_notification: Notification) => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    const handleNotificationRead = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    const handleNotificationDismissed = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    const handleAllNotificationsRead = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(0);
    };

    const handleAllNotificationsCleared = () => {
      setNotifications([]);
      setUnreadCount(0);
    };

    const handleNotificationsCleaned = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    const handleSettingsUpdated = (newSettings: NotificationSettings) => {
      setSettings(newSettings);
    };

    const handleNotificationRepeated = () => {
      setNotifications(notificationService.getNotifications());
    };

    const handleNotificationExpired = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    // Register event listeners
    notificationService.on('notification_created', handleNotificationCreated);
    notificationService.on('notification_read', handleNotificationRead);
    notificationService.on('notification_dismissed', handleNotificationDismissed);
    notificationService.on('all_notifications_read', handleAllNotificationsRead);
    notificationService.on('all_notifications_cleared', handleAllNotificationsCleared);
    notificationService.on('notifications_cleaned', handleNotificationsCleaned);
    notificationService.on('settings_updated', handleSettingsUpdated);
    notificationService.on('notification_repeated', handleNotificationRepeated);
    notificationService.on('notification_expired', handleNotificationExpired);

    // Cleanup event listeners
    return () => {
      notificationService.off('notification_created', handleNotificationCreated);
      notificationService.off('notification_read', handleNotificationRead);
      notificationService.off('notification_dismissed', handleNotificationDismissed);
      notificationService.off('all_notifications_read', handleAllNotificationsRead);
      notificationService.off('all_notifications_cleared', handleAllNotificationsCleared);
      notificationService.off('notifications_cleaned', handleNotificationsCleaned);
      notificationService.off('settings_updated', handleSettingsUpdated);
      notificationService.off('notification_repeated', handleNotificationRepeated);
      notificationService.off('notification_expired', handleNotificationExpired);
    };
  }, []);

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const dismissNotification = (id: string) => {
    notificationService.dismissNotification(id);
  };

  const clearAllNotifications = () => {
    notificationService.clearAllNotifications();
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    notificationService.updateSettings(newSettings);
  };

  const updateCategorySettings = (category: NotificationCategory, categorySettings: any) => {
    notificationService.updateCategorySettings(category, categorySettings);
  };

  const getUnreadByCategory = (category: NotificationCategory) => {
    return notificationService.getUnreadByCategory(category);
  };

  const playTestSound = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    // Test sound playback
    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio();
        switch (priority) {
          case 'urgent':
            audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PUvmkiBzl+zfT...';
            break;
          case 'high':
            audio.src = 'data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVoAAAC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4';
            break;
          default:
            audio.src = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAA=';
        }
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  };

  return {
    notifications,
    unreadCount,
    settings: settings || notificationService.getSettings(),
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    updateSettings,
    updateCategorySettings,
    getUnreadByCategory,
    playTestSound,
  };
};
