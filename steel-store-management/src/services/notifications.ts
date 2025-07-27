// services/notifications.ts
import { db } from './database';
import { formatCurrency } from '../utils/formatters';

export interface NotificationConfig {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: NotificationCategory;
  actionUrl?: string;
  actionText?: string;
  data?: any;
  expiresAt?: Date;
  repeatCount?: number;
  repeatInterval?: number; // in minutes
  conditions?: NotificationCondition[];
}

export interface NotificationCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  value: any;
}

export interface NotificationSettings {
  enabled: boolean;
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      repeatCount: number;
      repeatInterval: number; // in minutes
      soundEnabled: boolean;
      showInApp: boolean;
      showAsBadge: boolean;
    };
  };
  globalSettings: {
    maxNotifications: number;
    autoMarkReadAfter: number; // in minutes
    enableSounds: boolean;
    enableBadges: boolean;
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
}

export type NotificationType = 
  | 'low_stock'
  | 'overdue_payment'
  | 'high_balance'
  | 'new_order'
  | 'system_alert'
  | 'reminder'
  | 'achievement'
  | 'backup_complete'
  | 'data_export'
  | 'maintenance';

export type NotificationCategory = 
  | 'inventory'
  | 'finance'
  | 'sales'
  | 'system'
  | 'reminders'
  | 'alerts';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  data?: any;
  expiresAt?: string;
  repeatCount: number;
  currentRepeat: number;
  lastRepeated?: string;
  dismissed: boolean;
  persistent: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private settings: NotificationSettings;
  private eventListeners: Map<string, Function[]> = new Map();
  private scheduledNotifications: Map<string, number> = new Map();

  private constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
    this.startPeriodicCheck();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      categories: {
        inventory: {
          enabled: true,
          priority: 'high',
          repeatCount: 3,
          repeatInterval: 60,
          soundEnabled: true,
          showInApp: true,
          showAsBadge: true,
        },
        finance: {
          enabled: true,
          priority: 'high',
          repeatCount: 2,
          repeatInterval: 120,
          soundEnabled: true,
          showInApp: true,
          showAsBadge: true,
        },
        sales: {
          enabled: true,
          priority: 'medium',
          repeatCount: 1,
          repeatInterval: 30,
          soundEnabled: false,
          showInApp: true,
          showAsBadge: true,
        },
        system: {
          enabled: true,
          priority: 'medium',
          repeatCount: 1,
          repeatInterval: 0,
          soundEnabled: false,
          showInApp: true,
          showAsBadge: false,
        },
        reminders: {
          enabled: true,
          priority: 'medium',
          repeatCount: 2,
          repeatInterval: 30,
          soundEnabled: true,
          showInApp: true,
          showAsBadge: true,
        },
        alerts: {
          enabled: true,
          priority: 'urgent',
          repeatCount: 5,
          repeatInterval: 15,
          soundEnabled: true,
          showInApp: true,
          showAsBadge: true,
        },
      },
      globalSettings: {
        maxNotifications: 50,
        autoMarkReadAfter: 1440, // 24 hours
        enableSounds: true,
        enableBadges: true,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
        },
      },
    };
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('notification_settings');
      if (saved) {
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.emit('settings_updated', this.settings);
  }

  updateCategorySettings(category: NotificationCategory, settings: Partial<NotificationSettings['categories'][NotificationCategory]>): void {
    this.settings.categories[category] = { ...this.settings.categories[category], ...settings };
    this.saveSettings();
    this.emit('settings_updated', this.settings);
  }

  private isInQuietHours(): boolean {
    if (!this.settings.globalSettings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = this.parseTime(this.settings.globalSettings.quietHours.startTime);
    const endTime = this.parseTime(this.settings.globalSettings.quietHours.endTime);
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  private shouldCreateNotification(_type: NotificationType, category: NotificationCategory): boolean {
    if (!this.settings.enabled) return false;
    if (!this.settings.categories[category].enabled) return false;
    if (this.isInQuietHours() && category !== 'alerts') return false;
    
    return true;
  }

  async createNotification(config: NotificationConfig): Promise<string | null> {
    if (!this.shouldCreateNotification(config.type, config.category)) {
      return null;
    }

    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      category: config.category,
      title: config.title,
      message: config.message,
      priority: config.priority,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: config.actionUrl,
      actionText: config.actionText || 'View Details',
      data: config.data,
      expiresAt: config.expiresAt?.toISOString(),
      repeatCount: config.repeatCount || this.settings.categories[config.category].repeatCount,
      currentRepeat: 0,
      dismissed: false,
      persistent: config.priority === 'urgent' || config.category === 'alerts',
    };

    this.notifications.unshift(notification);
    
    // Limit notifications
    if (this.notifications.length > this.settings.globalSettings.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.settings.globalSettings.maxNotifications);
    }

    // Schedule repeats
    if (notification.repeatCount > 0) {
      this.scheduleRepeat(notification);
    }

    // Schedule auto-expiry
    if (notification.expiresAt) {
      this.scheduleExpiry(notification);
    }

    // Play sound if enabled
    if (this.settings.categories[config.category].soundEnabled && this.settings.globalSettings.enableSounds) {
      this.playNotificationSound(notification.priority);
    }

    this.emit('notification_created', notification);
    return notification.id;
  }

  private scheduleRepeat(notification: Notification): void {
    const categorySettings = this.settings.categories[notification.category];
    if (categorySettings.repeatInterval > 0 && notification.currentRepeat < notification.repeatCount) {
      const timeout = window.setTimeout(() => {
        this.repeatNotification(notification.id);
      }, categorySettings.repeatInterval * 60 * 1000);
      
      this.scheduledNotifications.set(`repeat_${notification.id}`, timeout);
    }
  }

  private scheduleExpiry(notification: Notification): void {
    if (!notification.expiresAt) return;
    
    const expiryTime = new Date(notification.expiresAt).getTime() - Date.now();
    if (expiryTime > 0) {
      const timeout = window.setTimeout(() => {
        this.expireNotification(notification.id);
      }, expiryTime);
      
      this.scheduledNotifications.set(`expire_${notification.id}`, timeout);
    }
  }

  private repeatNotification(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification || notification.dismissed) return;

    notification.currentRepeat++;
    notification.lastRepeated = new Date().toISOString();
    
    if (notification.currentRepeat < notification.repeatCount) {
      this.scheduleRepeat(notification);
    }

    // Play sound for repeat
    const categorySettings = this.settings.categories[notification.category];
    if (categorySettings.soundEnabled && this.settings.globalSettings.enableSounds) {
      this.playNotificationSound(notification.priority);
    }

    this.emit('notification_repeated', notification);
  }

  private expireNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.emit('notification_expired', notificationId);
    }
  }

  private playNotificationSound(priority: string): void {
    // Implementation for playing notification sounds
    // This could be enhanced with actual audio files
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
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read && !n.dismissed).length;
  }

  getUnreadByCategory(category: NotificationCategory): number {
    return this.notifications.filter(n => !n.read && !n.dismissed && n.category === category).length;
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emit('notification_read', notification);
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
      }
    });
    this.emit('all_notifications_read');
  }

  dismissNotification(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.dismissed = true;
      
      // Clear scheduled repeats
      const repeatKey = `repeat_${notificationId}`;
      if (this.scheduledNotifications.has(repeatKey)) {
        window.clearTimeout(this.scheduledNotifications.get(repeatKey));
        this.scheduledNotifications.delete(repeatKey);
      }
      
      this.emit('notification_dismissed', notification);
    }
  }

  clearAllNotifications(): void {
    this.notifications = [];
    this.scheduledNotifications.forEach(timeout => window.clearTimeout(timeout));
    this.scheduledNotifications.clear();
    this.emit('all_notifications_cleared');
  }

  clearExpiredNotifications(): void {
    const now = new Date();
    const initialCount = this.notifications.length;
    
    this.notifications = this.notifications.filter(n => {
      if (n.expiresAt && new Date(n.expiresAt) < now) {
        return false;
      }
      if (n.read && this.settings.globalSettings.autoMarkReadAfter > 0) {
        const readTime = new Date(n.timestamp);
        const autoExpireTime = readTime.getTime() + (this.settings.globalSettings.autoMarkReadAfter * 60 * 1000);
        return Date.now() < autoExpireTime;
      }
      return true;
    });
    
    if (this.notifications.length !== initialCount) {
      this.emit('notifications_cleaned');
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification event listener:', error);
        }
      });
    }
  }

  // Periodic checks for system-generated notifications
  private startPeriodicCheck(): void {
    // Check every 5 minutes
    setInterval(() => {
      this.checkSystemConditions();
      this.clearExpiredNotifications();
    }, 5 * 60 * 1000);
    
    // Initial check
    window.setTimeout(() => {
      this.checkSystemConditions();
    }, 2000);
  }

  private async checkSystemConditions(): Promise<void> {
    try {
      await this.checkLowStock();
      await this.checkHighBalances();
      await this.checkOverduePayments();
      await this.checkDailySummary();
    } catch (error) {
      console.error('Error checking system conditions:', error);
    }
  }

  private async checkLowStock(): Promise<void> {
    try {
      await db.initialize();
      const products = await db.getAllProducts();
      const lowStockItems = products.filter((p: any) => p.stock_quantity <= (p.min_stock_alert || 0));
      
      if (lowStockItems.length > 0) {
        // Check if we already have a recent low stock notification
        const recentLowStock = this.notifications.find(n => 
          n.type === 'low_stock' && 
          !n.dismissed && 
          new Date(n.timestamp).getTime() > Date.now() - (60 * 60 * 1000) // 1 hour ago
        );
        
        if (!recentLowStock) {
          await this.createNotification({
            id: 'low_stock_check',
            type: 'low_stock',
            category: 'inventory',
            title: 'Low Stock Alert',
            message: `${lowStockItems.length} product${lowStockItems.length > 1 ? 's' : ''} running low on stock`,
            priority: 'high',
            actionUrl: '/reports/stock?filter=low_stock',
            actionText: 'View Stock Report',
            data: { products: lowStockItems },
          });
        }
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }

  private async checkHighBalances(): Promise<void> {
    try {
      await db.initialize();
      const customers = await db.getAllCustomers();
      const highBalanceCustomers = customers.filter((c: any) => c.balance > 50000);
      
      if (highBalanceCustomers.length > 0) {
        const recentHighBalance = this.notifications.find(n => 
          n.type === 'high_balance' && 
          !n.dismissed && 
          new Date(n.timestamp).getTime() > Date.now() - (4 * 60 * 60 * 1000) // 4 hours ago
        );
        
        if (!recentHighBalance) {
          await this.createNotification({
            id: 'high_balance_check',
            type: 'high_balance',
            category: 'finance',
            title: 'High Outstanding Balances',
            message: `${highBalanceCustomers.length} customer${highBalanceCustomers.length > 1 ? 's have' : ' has'} balance over ${formatCurrency(50000)}`,
            priority: 'high',
            actionUrl: '/reports/customer?filter=high_balance',
            actionText: 'View Customer Report',
            data: { customers: highBalanceCustomers },
          });
        }
      }
    } catch (error) {
      console.error('Error checking high balances:', error);
    }
  }

  private async checkOverduePayments(): Promise<void> {
    try {
      await db.initialize();
      const overdueInvoices = await db.getOverdueInvoices(30);
      
      // Ensure overdueInvoices is an array
      if (!Array.isArray(overdueInvoices)) {
        console.warn('checkOverduePayments: getOverdueInvoices returned non-array:', typeof overdueInvoices);
        return;
      }
      
      if (overdueInvoices.length > 0) {
        const recentOverdue = this.notifications.find(n => 
          n.type === 'overdue_payment' && 
          !n.dismissed && 
          new Date(n.timestamp).getTime() > Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
        );
        
        if (!recentOverdue) {
          await this.createNotification({
            id: 'overdue_payment_check',
            type: 'overdue_payment',
            category: 'finance',
            title: 'Overdue Payments',
            message: `${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? 's are' : ' is'} overdue for payment`,
            priority: 'high',
            actionUrl: '/billing/list?filter=overdue',
            actionText: 'View Overdue Invoices',
            data: { invoices: overdueInvoices },
          });
        }
      }
    } catch (error) {
      console.error('Error checking overdue payments:', error);
    }
  }

  private async checkDailySummary(): Promise<void> {
    try {
      await db.initialize();
      const today = new Date().toISOString().split('T')[0];
      const todayInvoices = await db.getInvoices({
        from_date: today,
        to_date: today
      });
      
      if (todayInvoices.length > 0) {
        // Only send daily summary once per day
        const existingSummary = this.notifications.find(n => 
          n.type === 'system_alert' && 
          n.data?.summaryDate === today &&
          !n.dismissed
        );
        
        if (!existingSummary) {
          const totalSales = todayInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
          
          await this.createNotification({
            id: 'daily_summary',
            type: 'system_alert',
            category: 'sales',
            title: 'Daily Sales Summary',
            message: `${todayInvoices.length} invoice${todayInvoices.length > 1 ? 's' : ''} totaling ${formatCurrency(totalSales)} today`,
            priority: 'medium',
            actionUrl: `/billing/list?from_date=${today}&to_date=${today}`,
            actionText: 'View Today\'s Sales',
            data: { 
              summaryDate: today,
              invoiceCount: todayInvoices.length,
              totalSales 
            },
          });
        }
      }
    } catch (error) {
      console.error('Error checking daily summary:', error);
    }
  }

  // Enhanced notification creation with business logic triggers
  async notifyProductLowStock(productId: string, productName: string, currentStock: number, minStock: number): Promise<void> {
    await this.createNotification({
      id: `low_stock_${productId}`,
      type: 'low_stock',
      category: 'inventory',
      title: 'Product Low Stock Alert',
      message: `${productName} has only ${currentStock} units left (minimum: ${minStock})`,
      priority: currentStock === 0 ? 'urgent' : 'high',
      actionUrl: `/products/${productId}`,
      actionText: 'Restock Product',
      data: { productId, productName, currentStock, minStock },
      repeatCount: currentStock === 0 ? 5 : 2,
      repeatInterval: currentStock === 0 ? 15 : 60,
    });
  }

  async notifyCustomerHighBalance(customerId: string, customerName: string, balance: number): Promise<void> {
    await this.createNotification({
      id: `high_balance_${customerId}`,
      type: 'high_balance',
      category: 'finance',
      title: 'High Customer Balance Alert',
      message: `${customerName} has outstanding balance of ${formatCurrency(balance)}`,
      priority: balance > 100000 ? 'urgent' : 'high',
      actionUrl: `/customers/${customerId}`,
      actionText: 'Contact Customer',
      data: { customerId, customerName, balance },
      repeatCount: 3,
      repeatInterval: 240, // 4 hours
    });
  }

  async notifyPaymentOverdue(invoiceId: string, customerName: string, amount: number, daysPastDue: number): Promise<void> {
    await this.createNotification({
      id: `overdue_${invoiceId}`,
      type: 'overdue_payment',
      category: 'finance',
      title: 'Payment Overdue',
      message: `${customerName} payment of ${formatCurrency(amount)} is ${daysPastDue} days overdue`,
      priority: daysPastDue > 30 ? 'urgent' : 'high',
      actionUrl: `/billing/view/${invoiceId}`,
      actionText: 'View Invoice',
      data: { invoiceId, customerName, amount, daysPastDue },
      repeatCount: daysPastDue > 30 ? 5 : 2,
      repeatInterval: daysPastDue > 30 ? 60 : 120,
    });
  }

  async notifyLargeOrder(orderId: string, customerName: string, total: number): Promise<void> {
    await this.createNotification({
      id: `large_order_${orderId}`,
      type: 'new_order',
      category: 'sales',
      title: 'Large Order Received',
      message: `Large order of ${formatCurrency(total)} from ${customerName}`,
      priority: total > 500000 ? 'urgent' : 'high',
      actionUrl: `/billing/view/${orderId}`,
      actionText: 'Process Order',
      data: { orderId, customerName, total },
    });
  }

  // Manual notification triggers
  async notifyLowStock(products: any[]): Promise<void> {
    await this.createNotification({
      id: 'manual_low_stock',
      type: 'low_stock',
      category: 'inventory',
      title: 'Low Stock Alert',
      message: `${products.length} product${products.length > 1 ? 's need' : ' needs'} restocking`,
      priority: 'high',
      actionUrl: '/reports/stock?filter=low_stock',
      data: { products },
    });
  }

  async notifyOrderComplete(orderId: string, customerName: string, total: number): Promise<void> {
    await this.createNotification({
      id: `order_complete_${orderId}`,
      type: 'new_order',
      category: 'sales',
      title: 'Order Completed',
      message: `New order from ${customerName} - ${formatCurrency(total)}`,
      priority: 'medium',
      actionUrl: `/billing/view/${orderId}`,
      data: { orderId, customerName, total },
    });
  }

  async notifyBackupComplete(status: 'success' | 'failed'): Promise<void> {
    await this.createNotification({
      id: `backup_${Date.now()}`,
      type: 'backup_complete',
      category: 'system',
      title: status === 'success' ? 'Backup Complete' : 'Backup Failed',
      message: status === 'success' ? 'System backup completed successfully' : 'System backup failed. Please try again.',
      priority: status === 'success' ? 'low' : 'high',
      actionUrl: '/settings',
      actionText: 'View Settings',
    });
  }

  async createReminder(title: string, message: string, triggerAt: Date, actionUrl?: string): Promise<void> {
    const delay = triggerAt.getTime() - Date.now();
    if (delay > 0) {
      window.setTimeout(async () => {
        await this.createNotification({
          id: `reminder_${Date.now()}`,
          type: 'reminder',
          category: 'reminders',
          title,
          message,
          priority: 'medium',
          actionUrl,
        });
      }, delay);
    }
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
