/**
 * Currency utilities to handle floating point precision issues
 */

/**
 * Rounds a number to 2 decimal places to avoid floating point precision issues
 * Uses more robust rounding to handle edge cases like 57600.009999999995
 * @param value - The number to round
 * @returns The rounded number
 */
export const roundCurrency = (value: number): number => {
  // Handle NaN and infinite values
  if (!isFinite(value)) return 0;
  
  // Use more robust rounding approach to handle floating point precision issues
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Safely parses a string or number to a currency value with proper precision
 * @param value - The value to parse
 * @returns The parsed and rounded currency value
 */
export const parseCurrency = (value: string | number): number => {
  if (typeof value === 'number') {
    return roundCurrency(value);
  }
  
  // Handle string input
  const cleaned = value.toString().replace(/[^0-9.-]/g, ''); // Remove any non-numeric chars except . and -
  const numValue = parseFloat(cleaned);
  return isNaN(numValue) ? 0 : roundCurrency(numValue);
};

/**
 * Adds two currency values with proper precision
 * @param a - First value
 * @param b - Second value
 * @returns The sum with proper precision
 */
export const addCurrency = (a: number, b: number): number => {
  // Convert to integers to avoid floating point issues, then back to decimal
  const aInt = Math.round((a + Number.EPSILON) * 100);
  const bInt = Math.round((b + Number.EPSILON) * 100);
  return (aInt + bInt) / 100;
};

/**
 * Subtracts two currency values with proper precision
 * @param a - First value
 * @param b - Second value
 * @returns The difference with proper precision
 */
export const subtractCurrency = (a: number, b: number): number => {
  const aInt = Math.round((a + Number.EPSILON) * 100);
  const bInt = Math.round((b + Number.EPSILON) * 100);
  return (aInt - bInt) / 100;
};

/**
 * Multiplies two currency values with proper precision
 * @param a - First value
 * @param b - Second value
 * @returns The product with proper precision
 */
export const multiplyCurrency = (a: number, b: number): number => {
  const aInt = Math.round((a + Number.EPSILON) * 100);
  const bInt = Math.round((b + Number.EPSILON) * 100);
  return (aInt * bInt) / 10000; // Divide by 10000 because we're multiplying two 100x values
};

/**
 * Divides two currency values with proper precision
 * @param a - First value (dividend)
 * @param b - Second value (divisor)
 * @returns The quotient with proper precision
 */
export const divideCurrency = (a: number, b: number): number => {
  if (b === 0) return 0;
  const aInt = Math.round((a + Number.EPSILON) * 100);
  const bInt = Math.round((b + Number.EPSILON) * 100);
  return roundCurrency(aInt / bInt);
};
