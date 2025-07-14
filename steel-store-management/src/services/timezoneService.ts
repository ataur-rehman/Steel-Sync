// services/timezoneService.ts
export interface TimezoneInfo {
  value: string;
  label: string;
  offset: string;
  abbreviation: string;
}

export const SUPPORTED_TIMEZONES: TimezoneInfo[] = [
  {
    value: 'Asia/Kolkata',
    label: 'Asia/Kolkata (IST)',
    offset: '+05:30',
    abbreviation: 'IST'
  },
  {
    value: 'America/New_York',
    label: 'America/New_York (EST)',
    offset: '-05:00',
    abbreviation: 'EST'
  },
  {
    value: 'Europe/London',
    label: 'Europe/London (GMT)',
    offset: '+00:00',
    abbreviation: 'GMT'
  },
  {
    value: 'Asia/Tokyo',
    label: 'Asia/Tokyo (JST)',
    offset: '+09:00',
    abbreviation: 'JST'
  },
  {
    value: 'Australia/Sydney',
    label: 'Australia/Sydney (AEST)',
    offset: '+10:00',
    abbreviation: 'AEST'
  },
  {
    value: 'America/Los_Angeles',
    label: 'America/Los_Angeles (PST)',
    offset: '-08:00',
    abbreviation: 'PST'
  },
  {
    value: 'Europe/Paris',
    label: 'Europe/Paris (CET)',
    offset: '+01:00',
    abbreviation: 'CET'
  },
  {
    value: 'Asia/Dubai',
    label: 'Asia/Dubai (GST)',
    offset: '+04:00',
    abbreviation: 'GST'
  }
];

class TimezoneService {
  getCurrentTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  formatTimeInTimezone(date: Date, timezone: string, use24Hour: boolean = false): string {
    try {
      return date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: !use24Hour,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time in timezone:', error);
      return date.toLocaleTimeString();
    }
  }

  formatDateTimeInTimezone(date: Date, timezone: string, options: {
    dateFormat?: string;
    use24Hour?: boolean;
    includeSeconds?: boolean;
  } = {}): string {
    const {
      dateFormat = 'DD/MM/YYYY',
      use24Hour = false,
      includeSeconds = false
    } = options;

    try {
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour12: !use24Hour,
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' })
      };

      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };

      const formattedDate = date.toLocaleDateString('en-CA', dateOptions); // YYYY-MM-DD
      const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

      // Convert date format
      const [year, month, day] = formattedDate.split('-');
      let finalDate: string;

      switch (dateFormat) {
        case 'MM/DD/YYYY':
          finalDate = `${month}/${day}/${year}`;
          break;
        case 'YYYY-MM-DD':
          finalDate = formattedDate;
          break;
        default: // DD/MM/YYYY
          finalDate = `${day}/${month}/${year}`;
          break;
      }

      return `${finalDate} ${formattedTime}`;
    } catch (error) {
      console.error('Error formatting datetime in timezone:', error);
      return date.toLocaleString();
    }
  }

  getTimezoneOffset(timezone: string): string {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
      const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
      const offset = (target.getTime() - utc.getTime()) / (1000 * 60 * 60);
      
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(offset));
      const minutes = Math.round((Math.abs(offset) - hours) * 60);
      
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error getting timezone offset:', error);
      const info = SUPPORTED_TIMEZONES.find(tz => tz.value === timezone);
      return info?.offset || '+00:00';
    }
  }

  convertToTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    try {
      // Convert to string in source timezone, then parse in target timezone
      const dateString = date.toLocaleString('sv-SE', { timeZone: fromTimezone });
      const targetDate = new Date(dateString + ' UTC');
      
      // Adjust for target timezone
      const now = new Date();
      const sourceOffset = new Date(now.toLocaleString('en-US', { timeZone: fromTimezone })).getTime() - 
                          new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
      const targetOffset = new Date(now.toLocaleString('en-US', { timeZone: toTimezone })).getTime() - 
                          new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
      
      return new Date(targetDate.getTime() + targetOffset - sourceOffset);
    } catch (error) {
      console.error('Error converting timezone:', error);
      return date;
    }
  }

  getSupportedTimezones(): TimezoneInfo[] {
    return SUPPORTED_TIMEZONES;
  }

  getTimezoneInfo(timezone: string): TimezoneInfo | undefined {
    return SUPPORTED_TIMEZONES.find(tz => tz.value === timezone);
  }

  validateTimezone(timezone: string): boolean {
    try {
      new Date().toLocaleString('en-US', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  // Format business hours in different timezone
  formatBusinessHours(startTime: string, endTime: string, timezone: string): string {
    try {
      const today = new Date();
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      
      const start = new Date(today);
      start.setHours(startHours, startMinutes, 0, 0);
      
      const end = new Date(today);
      end.setHours(endHours, endMinutes, 0, 0);
      
      const formattedStart = this.formatTimeInTimezone(start, timezone, false);
      const formattedEnd = this.formatTimeInTimezone(end, timezone, false);
      
      const tzInfo = this.getTimezoneInfo(timezone);
      return `${formattedStart} - ${formattedEnd} ${tzInfo?.abbreviation || ''}`;
    } catch (error) {
      console.error('Error formatting business hours:', error);
      return `${startTime} - ${endTime}`;
    }
  }
}

export const timezoneService = new TimezoneService();
export default timezoneService;
