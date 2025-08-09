/**
 * Currency utilities to handle floating point precision issues
 */

/**
 * Rounds a number to 1 decimal place to avoid floating point precision issues
 * @param value - The number to round
 * @returns The rounded number
 */
export const roundCurrency = (value: number): number => {
  // Handle NaN and infinite values
  if (!isFinite(value)) return 0;
  
  // Use more robust rounding approach to handle floating point precision issues
  // Changed to 1 decimal place
  return Math.round((value + Number.EPSILON) * 10) / 10;
};

/**
 * Safely parses a string or number to a currency value with proper precision
 * @param value - The value to parse
 * @returns The parsed and rounded currency value (1 decimal place)
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
 * Adds two currency values with proper precision (1 decimal place)
 * @param a - First value
 * @param b - Second value
 * @returns The sum with proper precision
 */
export const addCurrency = (a: number, b: number): number => {
  // Convert to integers to avoid floating point issues, then back to decimal
  // Changed to 1 decimal place precision
  const aInt = Math.round((a + Number.EPSILON) * 10);
  const bInt = Math.round((b + Number.EPSILON) * 10);
  return (aInt + bInt) / 10;
};

/**
 * Subtracts two currency values with proper precision (1 decimal place)
 * @param a - First value
 * @param b - Second value
 * @returns The difference with proper precision
 */
export const subtractCurrency = (a: number, b: number): number => {
  const aInt = Math.round((a + Number.EPSILON) * 10);
  const bInt = Math.round((b + Number.EPSILON) * 10);
  return (aInt - bInt) / 10;
};

/**
 * Multiplies two currency values with proper precision (1 decimal place)
 * @param a - First value
 * @param b - Second value
 * @returns The product with proper precision
 */
export const multiplyCurrency = (a: number, b: number): number => {
  const aInt = Math.round((a + Number.EPSILON) * 10);
  const bInt = Math.round((b + Number.EPSILON) * 10);
  return (aInt * bInt) / 100; // Divide by 100 because we're multiplying two 10x values
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
