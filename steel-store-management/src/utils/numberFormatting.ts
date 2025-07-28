/**
 * Number formatting utilities for display purposes
 * Formats numbers with single leading zero for better readability
 * while preserving full numbers for database storage and search
 */

/**
 * Format a number for display with only one leading zero
 * Examples:
 * - I00001 -> I01
 * - I00015 -> I015  
 * - S0001 -> S01
 * - S00123 -> S0123
 * - P0001 -> P01
 * - C0001 -> C01
 */
export function formatDisplayNumber(input: string): string {
  if (!input) return input;
  
  // Extract prefix (letters) and number part
  const match = input.match(/^([A-Za-z]*)(\d+)$/);
  if (!match) return input;
  
  const [, prefix, numberStr] = match;
  const number = parseInt(numberStr, 10);
  
  if (isNaN(number)) return input;
  
  // Always format with exactly one leading zero (minimum 2 digits total)
  const paddedNumber = number.toString().padStart(2, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Format invoice number for display
 * I00001 -> I01, I00099 -> I99, I00100 -> I100
 */
export function formatInvoiceNumber(billNumber: string): string {
  return formatDisplayNumber(billNumber);
}

/**
 * Format stock receiving number for display  
 * S0001 -> S01, S0099 -> S99, S0100 -> S100
 */
export function formatReceivingNumber(receivingNumber: string): string {
  return formatDisplayNumber(receivingNumber);
}

/**
 * Format payment code for display
 * P0001 -> P01, P0099 -> P99, P0100 -> P100
 */
export function formatPaymentCode(paymentCode: string): string {
  return formatDisplayNumber(paymentCode);
}

/**
 * Format customer code for display
 * C0001 -> C01, C0099 -> C99, C0100 -> C100  
 */
export function formatCustomerCode(customerCode: string): string {
  return formatDisplayNumber(customerCode);
}

/**
 * Extract the numeric part from a formatted ID for search purposes
 * This helps with search functionality - user can search "1" to find "I00001"
 */
export function extractNumberFromId(id: string): number {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check if a search term matches a formatted ID
 * Supports searching by:
 * - Full formatted ID (I01, S01)
 * - Full original ID (I00001, S0001) 
 * - Just the number part (1, 01, 001, etc.)
 */
export function matchesSearchTerm(id: string, searchTerm: string): boolean {
  if (!id || !searchTerm) return false;
  
  const search = searchTerm.trim().toUpperCase();
  const upperID = id.toUpperCase();
  
  // Direct match with formatted version
  if (formatDisplayNumber(upperID).includes(search)) return true;
  
  // Direct match with original
  if (upperID.includes(search)) return true;
  
  // Extract numbers and compare
  const idNumber = extractNumberFromId(id);
  const searchNumber = parseInt(search, 10);
  
  if (!isNaN(searchNumber) && idNumber === searchNumber) return true;
  
  return false;
}
