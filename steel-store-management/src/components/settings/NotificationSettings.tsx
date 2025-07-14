// components/settings/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import type { NotificationCategory } from '../../services/notifications';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Settings,
  Save,
  RotateCcw,
  TestTube,
  Moon,
  Smartphone,
  Globe,
  Shield,
  Clock,
  Package,
  DollarSign,
  Users,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationSettings: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    playTestSound,
    getUnreadByCategory 
  } = useNotifications();
  
  const {
    isSupported: pushSupported,
    isGranted: pushGranted,
    requestPermission,
    sendTestNotification,
    enablePushNotifications,
    disablePushNotifications
  } = usePushNotifications();
  
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'quiet' | 'push'>('general');
  const [tempSettings, setTempSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with parent settings when they change
  useEffect(() => {
    setTempSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleGeneralSettingChange = (key: string, value: any) => {
    const newSettings = {
      ...tempSettings,
      [key]: value
    };
    setTempSettings(newSettings);
    setHasChanges(true);
  };

  const handleGlobalSettingChange = (key: string, value: any) => {
    const newSettings = {
      ...tempSettings,
      globalSettings: {
        ...tempSettings.globalSettings,
        [key]: value
      }
    };
    setTempSettings(newSettings);
    setHasChanges(true);
  };

  const handleCategorySettingChange = (category: NotificationCategory, key: string, value: any) => {
    const newSettings = {
      ...tempSettings,
      categories: {
        ...tempSettings.categories,
        [category]: {
          ...tempSettings.categories[category],
          [key]: value
        }
      }
    };
    setTempSettings(newSettings);
    setHasChanges(true);
  };

  const handleQuietHoursChange = (key: string, value: any) => {
    const newSettings = {
      ...tempSettings,
      globalSettings: {
        ...tempSettings.globalSettings,
        quietHours: {
          ...tempSettings.globalSettings.quietHours,
          [key]: value
        }
      }
    };
    setTempSettings(newSettings);
    setHasChanges(true);
  };

  const saveSettings = () => {
    updateSettings(tempSettings);
    setHasChanges(false);
    toast.success('Notification settings saved successfully!');
  };

  const resetSettings = () => {
    setTempSettings(settings);
    setHasChanges(false);
    toast('Settings reset to current values');
  };

  const testSound = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    playTestSound(priority);
    toast.success(`Played ${priority} priority notification sound`);
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'inventory':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'finance':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'sales':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'system':
        return <Settings className="h-5 w-5 text-gray-500" />;
      case 'reminders':
        return <Clock className="h-5 w-5 text-purple-500" />;
      case 'alerts':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const categoryData = [
    { key: 'inventory', label: 'Inventory', description: 'Stock alerts, low inventory, restocking reminders' },
    { key: 'finance', label: 'Finance', description: 'Payment reminders, high balances, overdue invoices' },
    { key: 'sales', label: 'Sales', description: 'New orders, daily summaries, sales milestones' },
    { key: 'system', label: 'System', description: 'Backups, maintenance, system status updates' },
    { key: 'reminders', label: 'Reminders', description: 'Custom reminders, scheduled notifications' },
    { key: 'alerts', label: 'Alerts', description: 'Critical alerts, emergency notifications' },
  ];

  const handleTestPushNotification = async () => {
    if (!pushGranted) {
      const granted = await requestPermission();
      if (!granted) {
        toast.error('Push notification permission denied');
        return;
      }
    }

    try {
      await sendTestNotification('Test Push Notification', 'This is a test push notification from Itehad Iron Store');
      toast.success('Test push notification sent!');
    } catch (error) {
      toast.error('Failed to send test push notification');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <>
              <button
                onClick={resetSettings}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </button>
              <button
                onClick={saveSettings}
                className="flex items-center px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell className="h-4 w-4 inline mr-2" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('quiet')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'quiet'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Moon className="h-4 w-4 inline mr-2" />
            Quiet Hours
          </button>
          <button
            onClick={() => setActiveTab('push')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'push'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Smartphone className="h-4 w-4 inline mr-2" />
            Push Notifications
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Global Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {tempSettings.enabled ? (
                      <Bell className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <BellOff className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Enable Notifications
                      </label>
                      <p className="text-sm text-gray-500">
                        Turn on/off all notifications system-wide
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tempSettings.enabled}
                      onChange={(e) => handleGeneralSettingChange('enabled', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {tempSettings.globalSettings.enableSounds ? (
                      <Volume2 className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Sound Notifications
                      </label>
                      <p className="text-sm text-gray-500">
                        Play sound alerts for notifications
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tempSettings.globalSettings.enableSounds}
                      onChange={(e) => handleGlobalSettingChange('enableSounds', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Show Badge Notifications
                      </label>
                      <p className="text-sm text-gray-500">
                        Show notification badges on icons
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tempSettings.globalSettings.enableBadges}
                      onChange={(e) => handleGlobalSettingChange('enableBadges', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Advanced Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Notifications
                  </label>
                  <input
                    type="number"
                    value={tempSettings.globalSettings.maxNotifications}
                    onChange={(e) => handleGlobalSettingChange('maxNotifications', parseInt(e.target.value))}
                    min="10"
                    max="500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum number of notifications to keep in memory
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-Mark Read After (minutes)
                  </label>
                  <input
                    type="number"
                    value={tempSettings.globalSettings.autoMarkReadAfter}
                    onChange={(e) => handleGlobalSettingChange('autoMarkReadAfter', parseInt(e.target.value))}
                    min="0"
                    max="10080"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Automatically mark notifications as read after this time (0 = never)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Sound Test</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => testSound('low')}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Low
                </button>
                <button
                  onClick={() => testSound('medium')}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  Medium
                </button>
                <button
                  onClick={() => testSound('high')}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  High
                </button>
                <button
                  onClick={() => testSound('urgent')}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Urgent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Notification Categories</h3>
              <p className="text-sm text-blue-700">
                Configure settings for each type of notification. You can enable/disable categories, 
                set priority levels, and control repeat behavior.
              </p>
            </div>

            <div className="space-y-4">
              {categoryData.map((category) => (
                <div key={category.key} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(category.key as NotificationCategory)}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{category.label}</h4>
                        <p className="text-sm text-gray-500">{category.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getUnreadByCategory(category.key as NotificationCategory)} unread notifications
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tempSettings.categories[category.key as NotificationCategory]?.enabled || false}
                        onChange={(e) => handleCategorySettingChange(category.key as NotificationCategory, 'enabled', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {tempSettings.categories[category.key as NotificationCategory]?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                          value={tempSettings.categories[category.key as NotificationCategory]?.priority || 'medium'}
                          onChange={(e) => handleCategorySettingChange(category.key as NotificationCategory, 'priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Count</label>
                        <input
                          type="number"
                          value={tempSettings.categories[category.key as NotificationCategory]?.repeatCount || 1}
                          onChange={(e) => handleCategorySettingChange(category.key as NotificationCategory, 'repeatCount', parseInt(e.target.value))}
                          min="0"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Interval (min)</label>
                        <input
                          type="number"
                          value={tempSettings.categories[category.key as NotificationCategory]?.repeatInterval || 0}
                          onChange={(e) => handleCategorySettingChange(category.key as NotificationCategory, 'repeatInterval', parseInt(e.target.value))}
                          min="0"
                          max="1440"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      </div>

                      <div className="flex items-center space-y-2 flex-col">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={tempSettings.categories[category.key as NotificationCategory]?.soundEnabled || false}
                            onChange={(e) => handleCategorySettingChange(category.key as NotificationCategory, 'soundEnabled', e.target.checked)}
                            className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          Sound
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={tempSettings.categories[category.key as NotificationCategory]?.showAsBadge || false}
                            onChange={(e) => handleCategorySettingChange(category.key as NotificationCategory, 'showAsBadge', e.target.checked)}
                            className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          Badge
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiet Hours Tab */}
        {activeTab === 'quiet' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Moon className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
                    <p className="text-sm text-gray-500">
                      Disable notifications during specified hours (except urgent alerts)
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tempSettings.globalSettings.quietHours.enabled}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              {tempSettings.globalSettings.quietHours.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={tempSettings.globalSettings.quietHours.startTime}
                      onChange={(e) => handleQuietHoursChange('startTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={tempSettings.globalSettings.quietHours.endTime}
                      onChange={(e) => handleQuietHoursChange('endTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Push Notifications Tab */}
        {activeTab === 'push' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Push Notifications</h3>
              <p className="text-sm text-blue-700">
                Enable push notifications to receive alerts even when the app is closed. 
                This feature requires browser permission.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-medium mb-4">Browser Support & Permissions</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Browser Support</span>
                      <p className="text-sm text-gray-500">
                        Push notifications support in this browser
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pushSupported 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {pushSupported ? 'Supported' : 'Not Supported'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Permission Status</span>
                      <p className="text-sm text-gray-500">
                        Current notification permission level
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pushGranted 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {pushGranted ? 'Granted' : 'Not Granted'}
                  </span>
                </div>

                {pushSupported && !pushGranted && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={requestPermission}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Request Permission
                    </button>
                  </div>
                )}

                {pushSupported && pushGranted && (
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">Enable Push Notifications</span>
                        <p className="text-sm text-gray-500">
                          Receive notifications even when the app is closed
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={enablePushNotifications}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Enable
                        </button>
                        <button
                          onClick={disablePushNotifications}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Disable
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={handleTestPushNotification}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        Send Test Push Notification
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
