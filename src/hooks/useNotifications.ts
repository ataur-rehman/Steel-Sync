// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notifications';
import type { NotificationSettings, NotificationCategory, Notification } from '../services/notifications';

export const useNotifications = () => {
  const [settings, setSettings] = useState<NotificationSettings>(
    notificationService.getSettings()
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications and settings
  const loadNotifications = useCallback(() => {
    const allNotifications = notificationService.getNotifications();
    setNotifications(allNotifications);
    setUnreadCount(notificationService.getUnreadCount());
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = notificationService.getSettings();
    setSettings(savedSettings);
    loadNotifications();
    
    // Listen for notification events
    const handleNotificationCreated = () => {
      loadNotifications();
    };
    
    const handleNotificationRead = () => {
      loadNotifications();
    };
    
    const handleNotificationDismissed = () => {
      loadNotifications();
    };
    
    notificationService.on('notification_created', handleNotificationCreated);
    notificationService.on('notification_read', handleNotificationRead);
    notificationService.on('notification_dismissed', handleNotificationDismissed);
    
    return () => {
      notificationService.off('notification_created', handleNotificationCreated);
      notificationService.off('notification_read', handleNotificationRead);
      notificationService.off('notification_dismissed', handleNotificationDismissed);
    };
  }, [loadNotifications]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    notificationService.updateSettings(updatedSettings);
  }, [settings]);

  // Play test sound
  const playTestSound = useCallback((_priority?: 'low' | 'medium' | 'high' | 'urgent') => {
    if (settings.globalSettings.enableSounds) {
      // Create a simple test sound
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAA=';
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    }
  }, [settings.globalSettings.enableSounds]);

  // Get unread notifications by category
  const getUnreadByCategory = useCallback((category: NotificationCategory) => {
    return notificationService.getUnreadByCategory(category);
  }, []);

  // Show notification using createNotification
  const showNotification = useCallback(async (
    title: string,
    message: string,
    category: NotificationCategory = 'system',
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ) => {
    return await notificationService.createNotification({
      id: `test_${Date.now()}`,
      type: 'system_alert',
      title,
      message,
      priority,
      category
    });
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    notificationService.clearAllNotifications();
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    notificationService.dismissNotification(id);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  return {
    settings,
    notifications,
    unreadCount,
    updateSettings,
    playTestSound,
    getUnreadByCategory,
    showNotification,
    clearAllNotifications,
    markAsRead,
    dismissNotification,
    markAllAsRead
  };
};
