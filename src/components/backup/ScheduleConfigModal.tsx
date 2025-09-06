import React, { useState } from 'react';
import { Clock, Calendar, AlertCircle, X } from 'lucide-react';

interface ScheduleConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: BackupScheduleConfig) => Promise<void>;
    currentSchedule?: BackupScheduleConfig;
}

interface BackupScheduleConfig {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string; // HH:MM format
    weekday?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // For weekly backups (0 = Sunday)
    autoCleanup: boolean;
    maxBackups: number;
}

const WEEKDAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
];

const ScheduleConfigModal: React.FC<ScheduleConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentSchedule
}) => {
    const [schedule, setSchedule] = useState<BackupScheduleConfig>({
        enabled: currentSchedule?.enabled || false,
        frequency: currentSchedule?.frequency || 'daily',
        time: currentSchedule?.time || '02:00',
        weekday: currentSchedule?.weekday || 0,
        autoCleanup: currentSchedule?.autoCleanup || true,
        maxBackups: currentSchedule?.maxBackups || 30
    });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(schedule);
            onClose();
        } catch (error) {
            console.error('Failed to save schedule:', error);
        } finally {
            setSaving(false);
        }
    };

    const getNextBackupTime = () => {
        if (!schedule.enabled) return null;

        const now = new Date();
        const [hours, minutes] = schedule.time.split(':').map(Number);

        let nextBackup = new Date();
        nextBackup.setHours(hours, minutes, 0, 0);

        if (schedule.frequency === 'daily') {
            if (nextBackup <= now) {
                nextBackup.setDate(nextBackup.getDate() + 1);
            }
        } else {
            // Weekly
            const targetDay = schedule.weekday || 0;
            const currentDay = nextBackup.getDay();
            let daysUntilTarget = targetDay - currentDay;

            if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextBackup <= now)) {
                daysUntilTarget += 7;
            }

            nextBackup.setDate(nextBackup.getDate() + daysUntilTarget);
        }

        return nextBackup;
    };

    const nextBackupTime = getNextBackupTime();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <Clock className="w-6 h-6 text-blue-500" />
                        <h2 className="text-xl font-semibold">Backup Schedule</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Enable/Disable */}
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="enableSchedule"
                            checked={schedule.enabled}
                            onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="enableSchedule" className="text-sm font-medium text-gray-700">
                            Enable automatic backups
                        </label>
                    </div>

                    {schedule.enabled && (
                        <>
                            {/* Frequency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Backup Frequency
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="radio"
                                            id="daily"
                                            name="frequency"
                                            value="daily"
                                            checked={schedule.frequency === 'daily'}
                                            onChange={() => setSchedule({ ...schedule, frequency: 'daily' })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <label htmlFor="daily" className="text-sm text-gray-700">
                                            Daily (recommended for active businesses)
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="radio"
                                            id="weekly"
                                            name="frequency"
                                            value="weekly"
                                            checked={schedule.frequency === 'weekly'}
                                            onChange={() => setSchedule({ ...schedule, frequency: 'weekly' })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <label htmlFor="weekly" className="text-sm text-gray-700">
                                            Weekly (for smaller operations)
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Time Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Backup Time
                                </label>
                                <input
                                    type="time"
                                    value={schedule.time}
                                    onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Choose a time when your store is typically closed
                                </p>
                            </div>

                            {/* Weekly Day Selection */}
                            {schedule.frequency === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Day of Week
                                    </label>
                                    <select
                                        value={schedule.weekday}
                                        onChange={(e) => setSchedule({ ...schedule, weekday: Number(e.target.value) as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {WEEKDAYS.map((day) => (
                                            <option key={day.value} value={day.value}>
                                                {day.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Auto Cleanup */}
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <input
                                        type="checkbox"
                                        id="autoCleanup"
                                        checked={schedule.autoCleanup}
                                        onChange={(e) => setSchedule({ ...schedule, autoCleanup: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="autoCleanup" className="text-sm font-medium text-gray-700">
                                        Automatically clean up old backups
                                    </label>
                                </div>
                                {schedule.autoCleanup && (
                                    <div className="ml-7">
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Keep maximum backups:
                                        </label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="100"
                                            value={schedule.maxBackups}
                                            onChange={(e) => setSchedule({ ...schedule, maxBackups: Number(e.target.value) })}
                                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Next Backup Preview */}
                            {nextBackupTime && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Next Backup Scheduled</p>
                                            <p className="text-sm text-blue-700">
                                                {nextBackupTime.toLocaleString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Warning for disabled schedule */}
                    {!schedule.enabled && (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="flex">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div className="ml-3">
                                    <h4 className="text-yellow-800 font-medium">No Automatic Backups</h4>
                                    <p className="text-yellow-700 text-sm mt-1">
                                        Your data will only be backed up when you create manual backups.
                                        Consider enabling automatic backups for better protection.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
                        >
                            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                            <span>{saving ? 'Saving...' : 'Save Schedule'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleConfigModal;
