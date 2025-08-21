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

// CRITICAL FIX: Centralized system datetime function for database operations
export function getCurrentSystemDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const dbDate = `${year}-${month}-${day}`;
  const dbTime = `${hours}:${minutes}:${seconds}`;
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

// For database storage - local time in HH:MM:SS format
export function formatTimeForDatabase(date: Date = new Date()): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
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