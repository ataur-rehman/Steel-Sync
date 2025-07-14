// components/notifications/NotificationsPage.tsx
import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useNavigation } from '../../hooks/useNavigation';
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  Settings, 
  Search,
  AlertTriangle,
  Info,
  Zap,
  DollarSign,
  Package2,
  Clock
} from 'lucide-react';
import type { NotificationCategory } from '../../services/notifications';

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    dismissNotification, 
    markAllAsRead,
    clearAllNotifications,
    getUnreadByCategory 
  } = useNotifications();
  const { navigateTo } = useNavigation();
  
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'priority' | 'type'>('timestamp');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <Package2 className="h-5 w-5 text-orange-500" />;
      case 'overdue_payment':
        return <DollarSign className="h-5 w-5 text-red-500" />;
      case 'high_balance':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'new_order':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-purple-500" />;
      case 'system_alert':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const formatNotificationTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications
    .filter(notification => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !notification.read;
      return notification.category === filter;
    })
    .filter(notification => {
      if (!searchTerm) return true;
      return notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        case 'type':
          return a.type.localeCompare(b.type);
        case 'timestamp':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigateTo(notification.actionUrl);
    }
  };

  const handleNotificationDismiss = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    dismissNotification(notificationId);
  };

  const categoryStats = [
    { key: 'inventory', label: 'Inventory', count: getUnreadByCategory('inventory') },
    { key: 'finance', label: 'Finance', count: getUnreadByCategory('finance') },
    { key: 'sales', label: 'Sales', count: getUnreadByCategory('sales') },
    { key: 'system', label: 'System', count: getUnreadByCategory('system') },
    { key: 'reminders', label: 'Reminders', count: getUnreadByCategory('reminders') },
    { key: 'alerts', label: 'Alerts', count: getUnreadByCategory('alerts') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All notifications are read'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateTo('/settings/notifications')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </button>
              <button
                onClick={clearAllNotifications}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categoryStats.map((stat) => (
          <div
            key={stat.key}
            onClick={() => setFilter(stat.key as NotificationCategory)}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              filter === stat.key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread only</option>
              <option value="inventory">Inventory</option>
              <option value="finance">Finance</option>
              <option value="sales">Sales</option>
              <option value="system">System</option>
              <option value="reminders">Reminders</option>
              <option value="alerts">Alerts</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="timestamp">Sort by time</option>
              <option value="priority">Sort by priority</option>
              <option value="type">Sort by type</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`text-sm font-medium ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatNotificationTime(notification.timestamp)}</span>
                        <span className="capitalize">{notification.category}</span>
                        {notification.repeatCount > 0 && (
                          <span>Repeat: {notification.currentRepeat}/{notification.repeatCount}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                      <button
                        onClick={(e) => handleNotificationDismiss(e, notification.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all' 
                ? 'No notifications match your current filters.'
                : 'You\'re all caught up! No notifications to display.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
