/**
 * Number formatting utilities for display purposes
 * Updated to handle new invoice numbering system (simple numbers with leading zero)
 */

/**
 * Format a number for display with only one leading zero
 * Examples:
 * - For new invoice system: 01, 02, 088, 0999, 012324
 * - For legacy system: I00001 -> I01, S0001 -> S01
 */
export function formatDisplayNumber(input: string): string {
  if (!input) return input;

  // Check if it's the new invoice format (pure numbers)
  if (/^\d+$/.test(input)) {
    const number = parseInt(input, 10);
    if (isNaN(number)) return input;

    // New format: always show with one leading zero
    return number.toString().padStart(2, '0');
  }

  // Handle legacy format with prefix (letters + numbers)
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
 * New system: 01, 02, 088, 0999, 012324
 * Legacy system: I00001 -> I01, I00099 -> I99, I00100 -> I100
 */
export function formatInvoiceNumber(billNumber: string): string {
  return formatDisplayNumber(billNumber);
}

/**
 * Format invoice number for print - shows invoice numbers as they are stored
 * New system: 01, 02, 088, 0999, 012324 (already in correct format)
 * Legacy system: I00001 -> 01, I00015 -> 015, I00199 -> 0199, I01234 -> 01234
 */
export function formatInvoiceNumberForPrint(billNumber: string): string {
  if (!billNumber) return billNumber;

  // Check if it's the new format (pure numbers) - return as-is
  if (/^\d+$/.test(billNumber)) {
    return billNumber;
  }

  // Handle legacy format - extract number part only (remove any prefix)
  const match = billNumber.match(/^[A-Za-z]*(\d+)$/);
  if (!match) return billNumber;

  const numberStr = match[1];
  const number = parseInt(numberStr, 10);

  if (isNaN(number)) return billNumber;

  // For legacy numbers, format with one leading zero
  if (number < 10) {
    return `0${number}`;
  } else if (number < 100) {
    return `0${number}`;
  } else if (number < 1000) {
    return `0${number}`;
  } else {
    return number.toString();
  }
}/**
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
 * New system: For pure numbers (01, 088, 0999), return the number directly
 * Legacy system: For prefixed IDs (I00001, S0001), extract the number part
 */
export function extractNumberFromId(id: string): number {
  // Check if it's a pure number (new invoice format)
  if (/^\d+$/.test(id)) {
    return parseInt(id, 10);
  }

  // Handle legacy format with prefix
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check if a search term matches a formatted ID
 * Supports searching by:
 * - New invoice format: Direct number match (01, 088, 0999)
 * - Legacy format: Full formatted ID (I01, S01), original ID (I00001, S0001), or just number part
 */
export function matchesSearchTerm(id: string, searchTerm: string): boolean {
  if (!id || !searchTerm) return false;

  const search = searchTerm.trim().toUpperCase();
  const upperID = id.toUpperCase();

  // For new invoice format (pure numbers)
  if (/^\d+$/.test(id)) {
    // Direct match
    if (id.includes(searchTerm)) return true;

    // Match without leading zeros
    const numericValue = parseInt(id, 10);
    const searchNumeric = parseInt(searchTerm, 10);
    if (!isNaN(searchNumeric) && numericValue === searchNumeric) return true;

    return false;
  }

  // For legacy format with prefix
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
