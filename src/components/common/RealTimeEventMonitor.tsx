import React, { useState, useEffect } from 'react';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';
import { X, Activity, Eye, EyeOff, Trash2 } from 'lucide-react';

interface EventLog {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
}

interface RealTimeEventMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Development tool for monitoring real-time events
 * This component helps developers see when events are fired and debug the real-time system
 * Should only be used in development environment
 */
export const RealTimeEventMonitor: React.FC<RealTimeEventMonitorProps> = ({ isOpen, onClose }) => {
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set(Object.values(BUSINESS_EVENTS)));

  useEffect(() => {
    if (!isMonitoring || !isOpen) return;

    const handlers = new Map<string, Function>();

    // Subscribe to all business events
    Object.values(BUSINESS_EVENTS).forEach(eventName => {
      const handler = (data: any) => {
        if (selectedEvents.has(eventName)) {
          const newLog: EventLog = {
            id: Math.random().toString(36).substr(2, 9),
            event: eventName,
            data,
            timestamp: new Date()
          };

          setEventLogs(prevLogs => [newLog, ...prevLogs.slice(0, 99)]); // Keep only 100 recent events
        }
      };

      eventBus.on(eventName, handler);
      handlers.set(eventName, handler);
    });

    // Cleanup
    return () => {
      handlers.forEach((handler, eventName) => {
        eventBus.off(eventName, handler);
      });
    };
  }, [isMonitoring, isOpen, selectedEvents]);

  const toggleEventFilter = (eventName: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventName)) {
        newSet.delete(eventName);
      } else {
        newSet.add(eventName);
      }
      return newSet;
    });
  };

  const clearLogs = () => {
    setEventLogs([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventColor = (eventName: string) => {
    if (eventName.includes('CUSTOMER')) return 'text-blue-600 bg-blue-50';
    if (eventName.includes('PRODUCT')) return 'text-green-600 bg-green-50';
    if (eventName.includes('INVOICE')) return 'text-purple-600 bg-purple-50';
    if (eventName.includes('STOCK')) return 'text-orange-600 bg-orange-50';
    if (eventName.includes('PAYMENT')) return 'text-teal-600 bg-teal-50';
    if (eventName.includes('LEDGER')) return 'text-indigo-600 bg-indigo-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Real-Time Event Monitor</h2>
                <p className="text-sm text-gray-500">Development tool for debugging real-time updates</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`flex items-center space-x-1 rounded-md px-3 py-1 text-sm font-medium ${isMonitoring
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {isMonitoring ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span>{isMonitoring ? 'Monitoring' : 'Paused'}</span>
              </button>

              <button
                onClick={clearLogs}
                className="flex items-center space-x-1 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Event Filters */}
          <div className="border-b bg-gray-50 px-6 py-3">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-700">Event Filters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BUSINESS_EVENTS).map(([key, eventName]) => (
                <button
                  key={key}
                  onClick={() => toggleEventFilter(eventName)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${selectedEvents.has(eventName)
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  {key.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="border-b bg-gray-50 px-6 py-2">
            <div className="flex space-x-6 text-sm">
              <span className="text-gray-600">
                Total Events: <span className="font-medium text-gray-900">{eventLogs.length}</span>
              </span>
              <span className="text-gray-600">
                Monitoring: <span className="font-medium text-gray-900">{selectedEvents.size}/{Object.keys(BUSINESS_EVENTS).length}</span>
              </span>
              <span className="text-gray-600">
                Status: <span className={`font-medium ${isMonitoring ? 'text-green-600' : 'text-red-600'}`}>
                  {isMonitoring ? 'Active' : 'Paused'}
                </span>
              </span>
            </div>
          </div>

          {/* Event Logs */}
          <div className="flex-1 overflow-y-auto">
            {eventLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                <div className="text-center">
                  <Activity className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm">
                    {isMonitoring ? 'Waiting for events...' : 'Monitoring is paused'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Try creating a customer, product, or invoice to see events
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 p-3">
                {eventLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`rounded-md px-2 py-1 text-xs font-medium ${getEventColor(log.event)}`}>
                          {log.event.replace(/:/g, ' ').replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>
                    </div>

                    {log.data && Object.keys(log.data).length > 0 && (
                      <div className="mt-2">
                        <pre className="text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeEventMonitor;
