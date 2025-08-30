/**
 * PERMANENT SOLUTION: Centralized Date/Time Formatting
 * Enforces consistent dd/mm/yy and 12-hour format across entire application
 * 
 * CRITICAL RULES:
 * 1. Always use dd/mm/yy format (2-digit year)
 * 2. Always use 12-hour format with AM/PM
 * 3. Always use system time (no hardcoded values)
 * 4. Consistent across all components and pages
 */

// CRITICAL FIX: Centralized system datetime function for database operations - 12-hour format
export function getCurrentSystemDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const dbDate = `${year}-${month}-${day}`;
  const dbTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const dbTimestamp = `${dbDate} ${dbTime}`;

  return { dbDate, dbTime, dbTimestamp };
}

// Get current system date and time
export function getSystemDateTime(): { date: string; time: string; dateTime: string } {
  const now = new Date();

  return {
    date: formatDate(now),
    time: formatTime(now),
    dateTime: formatDateTime(now)
  };
}

// Standard date format: dd/mm/yy
export function formatDate(date: string | Date): string {
  const d = new Date(date);

  // Validate date
  if (isNaN(d.getTime())) {
    console.warn('Invalid date provided to formatDate:', date);
    return formatDate(new Date()); // Use current system date as fallback
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2); // 2-digit year

  return `${day}/${month}/${year}`;
}

// Standard time format: 12-hour with AM/PM
export function formatTime(date: string | Date): string {
  const d = new Date(date);

  // Validate date
  if (isNaN(d.getTime())) {
    console.warn('Invalid date provided to formatTime:', date);
    return formatTime(new Date()); // Use current system time as fallback
  }

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Combined date and time format: dd/mm/yy hh:mm AM/PM
export function formatDateTime(date: string | Date): string {
  let d = new Date(date);

  // Validate date
  if (isNaN(d.getTime())) {
    console.warn('Invalid date provided to formatDateTime:', date);
    return formatDateTime(new Date()); // Use current system date/time as fallback
  }

  // If the input is a UTC timestamp, convert to Pakistan Standard Time (UTC+5)
  // Check if the date string contains 'Z' (indicating UTC) or if it's already a Date object from UTC
  if (typeof date === 'string' && date.includes('Z')) {
    // This is a UTC timestamp, convert to Pakistan time
    d = new Date(d.getTime() + (5 * 60 * 60 * 1000));
  }

  return `${formatDate(d)} ${formatTime(d)}`;
}

// For database storage - local date in YYYY-MM-DD format
export function formatDateForDatabase(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// For database storage - 12-hour format with AM/PM for consistency
export function formatTimeForDatabase(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Long date format for headers/reports: Monday, 25/12/23
export function formatDateLong(date: string | Date): string {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    console.warn('Invalid date provided to formatDateLong:', date);
    return formatDateLong(new Date());
  }

  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${formatDate(d)}`;
}

// Month/Year format for reports: December 2023
export function formatMonthYear(date: string | Date): string {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    console.warn('Invalid date provided to formatMonthYear:', date);
    return formatMonthYear(new Date());
  }

  return d.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

export function formatCurrency(amount: number | undefined | null): string {
  const safeAmount = amount ?? 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(safeAmount);
}

export function formatPhoneNumber(phone: string): string {
  // Format Pakistani phone numbers
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 11)}`;
  }
  return phone;
}

export function formatCNIC(cnic: string): string {
  const cleaned = cnic.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
  }
  return cnic;
}

/**
 * Convert 12-hour time format (HH:MM AM/PM) to 24-hour format for proper sorting
 * @param timeStr - Time string in format "02:10 AM" or "04:10 PM"
 * @returns Time in 24-hour format "14:10" for sorting
 */
export function convertTo24HourFormat(timeStr: string): string {
  if (!timeStr || timeStr.trim() === '') {
    return '00:00';
  }

  try {
    // Handle different time formats
    const cleanTimeStr = timeStr.trim();

    // If already in 24-hour format, return as is
    if (!/AM|PM/i.test(cleanTimeStr)) {
      return cleanTimeStr;
    }

    // Parse 12-hour format
    const match = cleanTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) {
      console.warn('Invalid time format:', timeStr);
      return '00:00';
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    // Convert to 24-hour format
    if (period === 'AM') {
      if (hours === 12) {
        hours = 0; // 12:XX AM becomes 00:XX
      }
    } else { // PM
      if (hours !== 12) {
        hours += 12; // 1:XX PM becomes 13:XX, but 12:XX PM stays 12:XX
      }
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  } catch (error) {
    console.warn('Error converting time format:', timeStr, error);
    return '00:00';
  }
}

/**
 * Sort entries by date and time properly handling AM/PM format
 * @param a - First entry with date and time properties
 * @param b - Second entry with date and time properties
 * @returns Comparison result for sorting
 */
export function sortByDateTime(a: any, b: any): number {
  // First sort by date
  const dateA = a.date || '1900-01-01';
  const dateB = b.date || '1900-01-01';

  const dateComparison = dateA.localeCompare(dateB);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  // If dates are equal, sort by time (convert to 24-hour format first)
  const timeA = convertTo24HourFormat(a.time || '00:00 AM');
  const timeB = convertTo24HourFormat(b.time || '00:00 AM');

  return timeA.localeCompare(timeB);
}