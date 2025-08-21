/**
 * CRITICAL SYSTEM DATE/TIME UTILITIES
 * 
 * This file provides centralized system date/time functions that MUST be used
 * throughout the entire application to ensure 100% consistency.
 * 
 * MANDATORY RULES:
 * 1. ALL components MUST use these functions for date/time operations
 * 2. NO direct Date() constructor calls in components
 * 3. NO custom date formatting in components
 * 4. ALWAYS use dd/mm/yy format for display
 * 5. ALWAYS use 12-hour format with AM/PM for time display
 * 6. ALWAYS use system time (never hardcoded values)
 */

import { formatDate, formatTime, formatDateTime, formatDateForDatabase, formatTimeForDatabase } from './formatters';

/**
 * Get current system date and time in all required formats
 */
export function getCurrentSystemDateTime() {
    const now = new Date();

    return {
        // For display purposes
        date: formatDate(now),           // dd/mm/yy
        time: formatTime(now),           // hh:mm AM/PM
        dateTime: formatDateTime(now),   // dd/mm/yy hh:mm AM/PM

        // For database storage
        dbDate: formatDateForDatabase(now),  // YYYY-MM-DD
        dbTime: formatTimeForDatabase(now),  // HH:MM:SS

        // Raw Date object (use sparingly)
        raw: now
    };
}

/**
 * Get system date for input fields (YYYY-MM-DD format)
 */
export function getSystemDateForInput(): string {
    return formatDateForDatabase();
}

/**
 * Get system time for input fields (HH:MM format)
 */
export function getSystemTimeForInput(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Create a new Date object with validation
 */
export function createSystemDate(dateString?: string): Date {
    if (!dateString) {
        return new Date();
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date provided: ${dateString}. Using current system date.`);
        return new Date();
    }

    return date;
}

/**
 * Get date for navigation (prev/next day)
 */
export function getNavigationDate(currentDate: string, direction: 'prev' | 'next'): string {
    const date = createSystemDate(currentDate);

    if (direction === 'prev') {
        date.setDate(date.getDate() - 1);
    } else {
        date.setDate(date.getDate() + 1);
    }

    return formatDateForDatabase(date);
}

/**
 * Get start and end of current month for reports
 */
export function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
        start: formatDateForDatabase(start),
        end: formatDateForDatabase(end),
        startDisplay: formatDate(start),
        endDisplay: formatDate(end)
    };
}

/**
 * Get start and end of current week
 */
export function getCurrentWeekRange() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
        start: formatDateForDatabase(startOfWeek),
        end: formatDateForDatabase(endOfWeek),
        startDisplay: formatDate(startOfWeek),
        endDisplay: formatDate(endOfWeek)
    };
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string): boolean {
    const today = formatDateForDatabase();
    const inputDate = formatDateForDatabase(createSystemDate(dateString));
    return today === inputDate;
}

/**
 * Get relative date (X days ago/from now)
 */
export function getRelativeDate(days: number): { db: string; display: string } {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return {
        db: formatDateForDatabase(date),
        display: formatDate(date)
    };
}

/**
 * LEDGER ENTRY HELPERS
 * Specific functions for ledger entries with system time
 */
export function createLedgerTimestamp() {
    const { date, time, dbDate, dbTime } = getCurrentSystemDateTime();

    return {
        date: dbDate,      // For database storage
        time: dbTime,      // For database storage
        displayDate: date, // For UI display
        displayTime: time, // For UI display
        displayDateTime: `${date} ${time}` // Combined display
    };
}

/**
 * INVOICE HELPERS
 * Specific functions for invoice operations
 */
export function createInvoiceTimestamp() {
    return getCurrentSystemDateTime();
}

/**
 * STAFF/SALARY HELPERS
 * Specific functions for staff and salary management
 */
export function createSalaryPeriod() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
        month: now.toISOString().substring(0, 7), // YYYY-MM
        start: formatDateForDatabase(start),
        end: formatDateForDatabase(end),
        displayMonth: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
}

/**
 * STOCK REPORT HELPERS
 * Specific functions for stock reports
 */
export function createStockReportPeriod() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return {
        from: formatDateForDatabase(thirtyDaysAgo),
        to: formatDateForDatabase(now),
        fromDisplay: formatDate(thirtyDaysAgo),
        toDisplay: formatDate(now)
    };
}
