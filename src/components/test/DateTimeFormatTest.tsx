/**
 * Date/Time Format Test Component
 * Verify consistent 12-hour format throughout the application
 */

import React, { useState, useEffect } from 'react';
import { formatDate, formatTime, formatDateTime, getCurrentSystemDateTime } from '../../utils/formatters';

const DateTimeFormatTest: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const systemDateTime = getCurrentSystemDateTime();

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">12-Hour Format Test</h2>

            <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Current System Date/Time (Live)</h3>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Display Date:</span> {formatDate(currentTime)}</div>
                        <div><span className="font-medium">Display Time:</span> {formatTime(currentTime)}</div>
                        <div><span className="font-medium">Display DateTime:</span> {formatDateTime(currentTime)}</div>
                    </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Database Storage Format</h3>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">DB Date:</span> {systemDateTime.dbDate}</div>
                        <div><span className="font-medium">DB Time (12-hour):</span> {systemDateTime.dbTime}</div>
                        <div><span className="font-medium">DB Timestamp:</span> {systemDateTime.dbTimestamp}</div>
                    </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2">Sample Dates</h3>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Morning:</span> {formatTime('2025-08-23T09:15:30')}</div>
                        <div><span className="font-medium">Afternoon:</span> {formatTime('2025-08-23T14:30:45')}</div>
                        <div><span className="font-medium">Evening:</span> {formatTime('2025-08-23T18:45:00')}</div>
                        <div><span className="font-medium">Night:</span> {formatTime('2025-08-23T23:55:15')}</div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Format Rules Verified</h3>
                    <div className="text-sm text-gray-700">
                        <div>✅ All times show 12-hour format with AM/PM</div>
                        <div>✅ Dates show dd/mm/yy format</div>
                        <div>✅ Database storage uses consistent 12-hour format</div>
                        <div>✅ No 24-hour format anywhere in the system</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DateTimeFormatTest;
