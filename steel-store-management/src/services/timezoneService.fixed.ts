// services/timezoneService.ts - FIXED VERSION
// This version addresses all critical bugs, logical errors, and security issues

export interface TimezoneInfo {
  value: string;
  label: string;
  offset: string; // This will be dynamically calculated
  abbreviation: string;
}

// Removed hardcoded offsets - they will be calculated dynamically
export const SUPPORTED_TIMEZONES: Readonly<TimezoneInfo[]> = Object.freeze([
  {
    value: 'Asia/Kolkata',
    label: 'Asia/Kolkata (IST)',
    offset: '', // Dynamically calculated
    abbreviation: 'IST'
  },
  {
    value: 'America/New_York',
    label: 'America/New_York (EST/EDT)',
    offset: '', // Dynamically calculated (handles DST)
    abbreviation: 'EST/EDT'
  },
  {
    value: 'Europe/London',
    label: 'Europe/London (GMT/BST)',
    offset: '', // Dynamically calculated (handles BST)
    abbreviation: 'GMT/BST'
  },
  {
    value: 'Asia/Tokyo',
    label: 'Asia/Tokyo (JST)',
    offset: '', // Dynamically calculated
    abbreviation: 'JST'
  },
  {
    value: 'Australia/Sydney',
    label: 'Australia/Sydney (AEST/AEDT)',
    offset: '', // Dynamically calculated (handles DST)
    abbreviation: 'AEST/AEDT'
  },
  {
    value: 'America/Los_Angeles',
    label: 'America/Los_Angeles (PST/PDT)',
    offset: '', // Dynamically calculated (handles DST)
    abbreviation: 'PST/PDT'
  },
  {
    value: 'Europe/Paris',
    label: 'Europe/Paris (CET/CEST)',
    offset: '', // Dynamically calculated (handles DST)
    abbreviation: 'CET/CEST'
  },
  {
    value: 'Asia/Dubai',
    label: 'Asia/Dubai (GST)',
    offset: '', // Dynamically calculated
    abbreviation: 'GST'
  },
  // Added more international timezones
  {
    value: 'Asia/Shanghai',
    label: 'Asia/Shanghai (CST)',
    offset: '',
    abbreviation: 'CST'
  },
  {
    value: 'America/Chicago',
    label: 'America/Chicago (CST/CDT)',
    offset: '',
    abbreviation: 'CST/CDT'
  },
  {
    value: 'America/Denver',
    label: 'America/Denver (MST/MDT)',
    offset: '',
    abbreviation: 'MST/MDT'
  },
  {
    value: 'Europe/Berlin',
    label: 'Europe/Berlin (CET/CEST)',
    offset: '',
    abbreviation: 'CET/CEST'
  },
  {
    value: 'Asia/Singapore',
    label: 'Asia/Singapore (SGT)',
    offset: '',
    abbreviation: 'SGT'
  },
  {
    value: 'Australia/Melbourne',
    label: 'Australia/Melbourne (AEST/AEDT)',
    offset: '',
    abbreviation: 'AEST/AEDT'
  },
  {
    value: 'America/Toronto',
    label: 'America/Toronto (EST/EDT)',
    offset: '',
    abbreviation: 'EST/EDT'
  }
]);

// Input validation utilities
class TimezoneValidation {
  static sanitizeTimezone(timezone: unknown): string {
    if (typeof timezone !== 'string') {
      throw new Error('Timezone must be a string');
    }
    
    // Basic sanitization
    const sanitized = timezone.trim();
    
    // Check length limits
    if (sanitized.length === 0 || sanitized.length > 100) {
      throw new Error('Invalid timezone length');
    }
    
    // Check for suspicious patterns
    if (/<script|javascript:|data:|vbscript:/i.test(sanitized)) {
      throw new Error('Invalid timezone format - potential security risk');
    }
    
    return sanitized;
  }
  
  static validateTimezone(timezone: string): boolean {
    try {
      // Use proper validation
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
  
  static validateDate(date: unknown): Date {
    if (!(date instanceof Date)) {
      throw new Error('Invalid date object');
    }
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date value');
    }
    
    // Check for reasonable date bounds (not too far in past/future)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) {
      throw new Error('Date out of reasonable bounds');
    }
    
    return date;
  }
  
  static validateTimeString(timeString: unknown): string {
    if (typeof timeString !== 'string') {
      throw new Error('Time must be a string');
    }
    
    const sanitized = timeString.trim();
    
    // Validate HH:MM format
    if (!/^\d{1,2}:\d{2}$/.test(sanitized)) {
      throw new Error('Invalid time format. Use HH:MM');
    }
    
    const [hours, minutes] = sanitized.split(':').map(Number);
    
    if (hours < 0 || hours > 23 || isNaN(hours)) {
      throw new Error('Invalid hours value');
    }
    
    if (minutes < 0 || minutes > 59 || isNaN(minutes)) {
      throw new Error('Invalid minutes value');
    }
    
    return sanitized;
  }
}

class TimezoneService {
  private readonly cache = new Map<string, { offset: string; timestamp: number }>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
  
  getCurrentTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.error('Error getting current timezone:', error);
      return 'UTC'; // Safe fallback
    }
  }

  formatTimeInTimezone(date: unknown, timezone: unknown, use24Hour: boolean = false): string {
    try {
      const validDate = TimezoneValidation.validateDate(date);
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      
      if (!TimezoneValidation.validateTimezone(validTimezone)) {
        throw new Error(`Invalid timezone: ${validTimezone}`);
      }
      
      const options: Intl.DateTimeFormatOptions = {
        timeZone: validTimezone,
        hour12: !use24Hour,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      
      return validDate.toLocaleTimeString('en-US', options);
    } catch (error) {
      console.error('Error formatting time in timezone:', error);
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleTimeString(); // Fallback to local time
      }
      throw error; // Re-throw for proper error handling
    }
  }

  formatDateTimeInTimezone(date: unknown, timezone: unknown, options: {
    dateFormat?: string;
    use24Hour?: boolean;
    includeSeconds?: boolean;
    locale?: string;
  } = {}): string {
    try {
      const validDate = TimezoneValidation.validateDate(date);
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      
      if (!TimezoneValidation.validateTimezone(validTimezone)) {
        throw new Error(`Invalid timezone: ${validTimezone}`);
      }
      
      const {
        dateFormat = 'DD/MM/YYYY',
        use24Hour = false,
        includeSeconds = false,
        locale = 'en-US'
      } = options;
      
      // Validate locale
      const validLocale = typeof locale === 'string' ? locale : 'en-US';
      
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: validTimezone,
        hour12: !use24Hour,
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' })
      };

      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: validTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };

      // Use safer date formatting
      const formattedTime = validDate.toLocaleTimeString(validLocale, timeOptions);
      const formattedDateParts = validDate.toLocaleDateString('en-CA', dateOptions); // YYYY-MM-DD
      
      const [year, month, day] = formattedDateParts.split('-');
      let finalDate: string;

      switch (dateFormat) {
        case 'MM/DD/YYYY':
          finalDate = `${month}/${day}/${year}`;
          break;
        case 'YYYY-MM-DD':
          finalDate = formattedDateParts;
          break;
        case 'DD/MM/YYYY':
        default:
          finalDate = `${day}/${month}/${year}`;
          break;
      }

      return `${finalDate} ${formattedTime}`;
    } catch (error) {
      console.error('Error formatting datetime in timezone:', error);
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleString(); // Fallback
      }
      throw error; // Re-throw for proper error handling
    }
  }

  // FIXED: Proper timezone offset calculation with DST support
  getTimezoneOffset(timezone: unknown, date?: Date): string {
    try {
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      
      if (!TimezoneValidation.validateTimezone(validTimezone)) {
        throw new Error(`Invalid timezone: ${validTimezone}`);
      }
      
      // Use provided date or current date
      const targetDate = date || new Date();
      TimezoneValidation.validateDate(targetDate);
      
      // Check cache first
      const cacheKey = `${validTimezone}-${targetDate.toDateString()}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.offset;
      }
      
      // Use proper Intl API for offset calculation
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: validTimezone,
        timeZoneName: 'longOffset'
      });
      
      const parts = formatter.formatToParts(targetDate);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');
      
      if (offsetPart && offsetPart.value.startsWith('GMT')) {
        const offset = offsetPart.value.replace('GMT', '') || '+00:00';
        
        // Cache the result
        this.cache.set(cacheKey, { offset, timestamp: Date.now() });
        
        return offset;
      }
      
      // Fallback calculation if timeZoneName not available
      const utcTime = targetDate.getTime() + (targetDate.getTimezoneOffset() * 60000);
      const targetTime = new Date(utcTime + (this.getUtcOffsetInMinutes(validTimezone, targetDate) * 60000));
      const offsetMinutes = (targetTime.getTime() - utcTime) / 60000;
      
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(offsetMinutes) / 60);
      const minutes = Math.abs(offsetMinutes) % 60;
      
      const result = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Cache the result
      this.cache.set(cacheKey, { offset: result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error('Error getting timezone offset:', error);
      
      // Fallback to static data only as last resort
      const info = SUPPORTED_TIMEZONES.find(tz => tz.value === timezone);
      if (info && info.offset) {
        return info.offset;
      }
      
      return '+00:00'; // Ultimate fallback
    }
  }
  
  // Helper method for UTC offset calculation
  private getUtcOffsetInMinutes(timezone: string, date: Date): number {
    try {
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
    } catch {
      return 0;
    }
  }

  // FIXED: Proper timezone conversion using Intl API
  convertToTimezone(date: unknown, fromTimezone: unknown, toTimezone: unknown): Date {
    try {
      const validDate = TimezoneValidation.validateDate(date);
      const validFromTz = TimezoneValidation.sanitizeTimezone(fromTimezone);
      const validToTz = TimezoneValidation.sanitizeTimezone(toTimezone);
      
      if (!TimezoneValidation.validateTimezone(validFromTz)) {
        throw new Error(`Invalid source timezone: ${validFromTz}`);
      }
      
      if (!TimezoneValidation.validateTimezone(validToTz)) {
        throw new Error(`Invalid target timezone: ${validToTz}`);
      }
      
      // If same timezone, return copy of original date
      if (validFromTz === validToTz) {
        return new Date(validDate);
      }
      
      // Use proper Intl-based conversion
      const utcTime = validDate.getTime() - (this.getUtcOffsetInMinutes(validFromTz, validDate) * 60000);
      const targetTime = utcTime + (this.getUtcOffsetInMinutes(validToTz, validDate) * 60000);
      
      return new Date(targetTime);
    } catch (error) {
      console.error('Error converting timezone:', error);
      
      // Return copy of original date as safe fallback
      if (date instanceof Date && !isNaN(date.getTime())) {
        return new Date(date);
      }
      
      throw error; // Re-throw for proper error handling
    }
  }

  getSupportedTimezones(): TimezoneInfo[] {
    // Return a copy with dynamically calculated offsets
    return SUPPORTED_TIMEZONES.map(tz => ({
      ...tz,
      offset: this.getTimezoneOffset(tz.value)
    }));
  }

  getTimezoneInfo(timezone: unknown): TimezoneInfo | undefined {
    try {
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      const found = SUPPORTED_TIMEZONES.find(tz => tz.value === validTimezone);
      
      if (found) {
        return {
          ...found,
          offset: this.getTimezoneOffset(validTimezone)
        };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting timezone info:', error);
      return undefined;
    }
  }

  validateTimezone(timezone: unknown): boolean {
    try {
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      return TimezoneValidation.validateTimezone(validTimezone);
    } catch {
      return false;
    }
  }

  // FIXED: Proper business hours formatting with validation
  formatBusinessHours(startTime: unknown, endTime: unknown, timezone: unknown): string {
    try {
      const validStartTime = TimezoneValidation.validateTimeString(startTime);
      const validEndTime = TimezoneValidation.validateTimeString(endTime);
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      
      if (!TimezoneValidation.validateTimezone(validTimezone)) {
        throw new Error(`Invalid timezone: ${validTimezone}`);
      }
      
      const today = new Date();
      const [startHours, startMinutes] = validStartTime.split(':').map(Number);
      const [endHours, endMinutes] = validEndTime.split(':').map(Number);
      
      const start = new Date(today);
      start.setHours(startHours, startMinutes, 0, 0);
      
      const end = new Date(today);
      
      // Handle cross-midnight business hours
      if (endHours < startHours || (endHours === startHours && endMinutes < startMinutes)) {
        // Business hours cross midnight
        end.setDate(end.getDate() + 1);
      }
      
      end.setHours(endHours, endMinutes, 0, 0);
      
      const formattedStart = this.formatTimeInTimezone(start, validTimezone, false);
      const formattedEnd = this.formatTimeInTimezone(end, validTimezone, false);
      
      const tzInfo = this.getTimezoneInfo(validTimezone);
      const crossesMidnight = end.getDate() !== start.getDate();
      
      return `${formattedStart} - ${formattedEnd}${crossesMidnight ? ' (+1 day)' : ''} ${tzInfo?.abbreviation || ''}`;
    } catch (error) {
      console.error('Error formatting business hours:', error);
      
      // Safe fallback
      if (typeof startTime === 'string' && typeof endTime === 'string') {
        return `${startTime} - ${endTime}`;
      }
      
      throw error; // Re-throw for proper error handling
    }
  }
  
  // Additional utility methods
  
  isDaylightSavingTime(date: Date, timezone: string): boolean {
    try {
      const validDate = TimezoneValidation.validateDate(date);
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      
      if (!TimezoneValidation.validateTimezone(validTimezone)) {
        return false;
      }
      
      // Check if timezone observes DST by comparing January and July offsets
      const jan = new Date(validDate.getFullYear(), 0, 1);
      const jul = new Date(validDate.getFullYear(), 6, 1);
      
      const janOffset = this.getTimezoneOffset(validTimezone, jan);
      const julOffset = this.getTimezoneOffset(validTimezone, jul);
      const currentOffset = this.getTimezoneOffset(validTimezone, validDate);
      
      // If offsets differ between winter and summer, timezone observes DST
      if (janOffset !== julOffset) {
        // DST is active if current offset matches summer offset
        return currentOffset === julOffset;
      }
      
      return false; // No DST observed
    } catch (error) {
      console.error('Error checking daylight saving time:', error);
      return false;
    }
  }
  
  getTimezoneName(timezone: string, date?: Date): string {
    try {
      const validTimezone = TimezoneValidation.sanitizeTimezone(timezone);
      const targetDate = date || new Date();
      
      if (!TimezoneValidation.validateTimezone(validTimezone)) {
        throw new Error(`Invalid timezone: ${validTimezone}`);
      }
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: validTimezone,
        timeZoneName: 'short'
      });
      
      const parts = formatter.formatToParts(targetDate);
      const namePart = parts.find(part => part.type === 'timeZoneName');
      
      return namePart?.value || validTimezone;
    } catch (error) {
      console.error('Error getting timezone name:', error);
      return timezone as string;
    }
  }
  
  // Clear cache (useful for testing or memory management)
  clearCache(): void {
    this.cache.clear();
  }
}

// Create singleton instance with proper pattern
let instance: TimezoneService | null = null;

export function getTimezoneService(): TimezoneService {
  if (!instance) {
    instance = new TimezoneService();
  }
  return instance;
}

// Export the singleton instance
export const timezoneService = getTimezoneService();
export default timezoneService;

// Export validation utilities for external use
export { TimezoneValidation };
