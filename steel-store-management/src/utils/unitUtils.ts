/**
 * Enhanced unit formatting utilities for the Itehad Iron Store management system
 * Supports multiple unit types: kg-grams, piece, bag, meter, liter, ton
 */

export type UnitType = 'kg-grams' | 'piece' | 'bag' | 'kg' | 'meter' | 'ton' | 'foot';

export interface UnitData {
  // Universal fields
  display: string;
  raw: string;
  numericValue: number; // Standardized numeric value for calculations
  unit_type: UnitType;

  // Specific to kg-grams
  kg?: number;
  grams?: number;
  total_grams?: number;

  // For simple units (piece, bag, meter, liter, ton)
  quantity?: number;
}

export interface UnitTypeConfig {
  type: UnitType;
  label: string;
  symbol: string;
  description: string;
  format: 'kg-grams' | 'kg-decimal' | 'simple';
  examples: string[];
}

export const UNIT_TYPES: UnitTypeConfig[] = [
  {
    type: 'kg-grams',
    label: 'Kilograms-Grams',
    symbol: 'kg',
    description: 'Weight in kg and grams (e.g., 1600-60 = 1600kg 60grams)',
    format: 'kg-grams',
    examples: ['1600', '1600-60', '500-250']
  },
  {
    type: 'kg',
    label: 'Kilograms (Decimal)',
    symbol: 'kg',
    description: 'Weight in kg with decimal grams (e.g., 500.10 = 500kg 10g)',
    format: 'kg-decimal',
    examples: ['500.10', '1600.60', '100.250']
  },
  {
    type: 'piece',
    label: 'Pieces',
    symbol: 'pcs',
    description: 'Count of individual items',
    format: 'simple',
    examples: ['100', '500', '1200']
  },
  {
    type: 'bag',
    label: 'Bags',
    symbol: 'bags',
    description: 'Count of bags (e.g., cement bags)',
    format: 'simple',
    examples: ['25', '50', '100']
  },
  {
    type: 'foot',
    label: 'Feet',
    symbol: 'ft',
    description: 'Length in feet (for T-Iron and similar products)',
    format: 'simple',
    examples: ['12', '24', '36']
  }
];

/**
 * Get unit type configuration
 */
export function getUnitTypeConfig(unitType: UnitType): UnitTypeConfig {
  return UNIT_TYPES.find(config => config.type === unitType) || UNIT_TYPES[0];
}

/**
 * Parse a unit string based on unit type
 * @param unitString - String to parse
 * @param unitType - Type of unit to parse
 * @returns UnitData object with parsed values
 */


/**
 * Create an empty unit for a given type
 */
function createEmptyUnit(unitType: UnitType): UnitData {
  if (unitType === 'kg-grams' || unitType === 'kg') {
    return {
      kg: 0,
      grams: 0,
      display: '0kg',
      total_grams: 0,
      raw: '0',
      numericValue: 0,
      unit_type: unitType
    };
  } else {
    const config = getUnitTypeConfig(unitType);
    return {
      quantity: 0,
      display: `0 ${config.symbol}`,
      raw: '0',
      numericValue: 0,
      unit_type: unitType
    };
  }
}

/**
 * Parse kg-grams format unit
 * Handles both raw format (e.g., "1600-60") and display format (e.g., "1600kg 60g")
 */
function parseKgGramsUnit(unitString: string): UnitData {
  let kg = 0;
  let grams = 0;

  // Check if it's a display format like "1600kg 60g" or "1600kg"
  const displayFormatMatch = unitString.match(/(\d+)kg(?:\s+(\d+)g)?/);
  if (displayFormatMatch) {
    kg = parseInt(displayFormatMatch[1]) || 0;
    grams = parseInt(displayFormatMatch[2]) || 0;
  } else {
    // Handle raw format like "1600-60" or just "1600"
    const parts = unitString.split('-');
    kg = parseInt(parts[0]) || 0;
    grams = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
  }

  const total_grams = (kg * 1000) + grams;

  return {
    kg,
    grams,
    display: formatKgGrams(kg, grams),
    total_grams,
    raw: unitString,
    numericValue: total_grams,
    unit_type: 'kg-grams'
  };
}

/**
 * Parse kg decimal format unit (e.g., 500.10 = 500kg 10g)
 * Handles both raw format (e.g., "500.10") and display format (e.g., "2500kg")
 */
function parseKgDecimalUnit(unitString: string): UnitData {
  let floatValue = 0;

  // Check if it's a display format like "2500kg"
  const displayFormatMatch = unitString.match(/(\d+(?:\.\d+)?)kg/);
  if (displayFormatMatch) {
    floatValue = parseFloat(displayFormatMatch[1]) || 0;
  } else {
    // Handle raw format like "500.10"
    floatValue = parseFloat(unitString) || 0;
  }

  const kg = Math.floor(floatValue);
  const decimalPart = floatValue - kg;
  const grams = Math.round(decimalPart * 1000); // Convert decimal to grams (0.010 = 10g)
  const total_grams = (kg * 1000) + grams;

  return {
    kg,
    grams,
    display: formatKgDecimal(kg, grams),
    total_grams,
    raw: unitString,
    numericValue: total_grams,
    unit_type: 'kg'
  };
}

/**
 * Parse simple unit (piece, bag, meter, liter, ton)
 * Handles both raw format (e.g., "150") and display format (e.g., "150 bags")
 */
/**
* Parse simple unit (piece, bag, meter, liter, ton)
* Handles both raw format (e.g., "150") and display format (e.g., "150 bags")
*/
function parseSimpleUnit(unitString: string, unitType: UnitType): UnitData {
  let quantity = 0;

  console.log(`🔧 parseSimpleUnit called with: "${unitString}", unitType: "${unitType}"`);

  // Check if it's a display format like "150 bags" or "5000 pieces"
  const displayFormatMatch = unitString.match(/(\d+(?:\.\d+)?)\s*(?:bag|piece|kg|meter|liter|ton)s?/);
  if (displayFormatMatch) {
    quantity = parseFloat(displayFormatMatch[1]) || 0;
    console.log(`🔧 parseSimpleUnit: Matched display format, quantity: ${quantity}`);
  } else {
    // Handle raw format like "150"
    quantity = parseFloat(unitString) || 0;
    console.log(`🔧 parseSimpleUnit: Raw format, quantity: ${quantity}`);
  }

  const config = getUnitTypeConfig(unitType);

  const result = {
    quantity,
    display: `${quantity} ${config.symbol}`,
    raw: unitString,
    numericValue: quantity, // CRITICAL: For simple units, this should be the actual quantity (1 bag = 1)
    unit_type: unitType
  };

  console.log(`🔧 parseSimpleUnit result:`, result);

  return result;
}

/**
 * CORRECTED parseUnit function with debugging
 */
export function parseUnit(unitString: string | number | null | undefined, unitType: UnitType = 'kg-grams'): UnitData {
  console.log(`🔧 parseUnit called with: "${unitString}", unitType: "${unitType}"`);

  // Handle null, undefined, or empty values
  if (!unitString || unitString === '') {
    console.log(`🔧 parseUnit: Empty input, creating empty unit`);
    return createEmptyUnit(unitType);
  }

  // Convert to string if it's a number
  const stringValue = typeof unitString === 'number' ? unitString.toString() : String(unitString);

  // Check if string is empty after conversion
  if (!stringValue || stringValue.trim() === '') {
    console.log(`🔧 parseUnit: Empty string after conversion, creating empty unit`);
    return createEmptyUnit(unitType);
  }

  const cleanString = stringValue.trim();
  console.log(`🔧 parseUnit: Clean string: "${cleanString}"`);

  if (unitType === 'kg-grams') {
    console.log(`🔧 parseUnit: Processing as kg-grams`);
    return parseKgGramsUnit(cleanString);
  } else if (unitType === 'kg') {
    console.log(`🔧 parseUnit: Processing as kg decimal`);
    return parseKgDecimalUnit(cleanString);
  } else {
    console.log(`🔧 parseUnit: Processing as simple unit (${unitType})`);
    return parseSimpleUnit(cleanString, unitType);
  }
}

/**
 * Format kg and grams into a display string
 * @param kg - Kilogram value
 * @param grams - Grams value (0-999)
 * @returns Formatted display string
 */
export function formatKgGrams(kg: number, grams: number): string {
  if (grams > 0) {
    return `${kg}kg ${grams}g`;
  }
  return `${kg}kg`;
}

/**
 * Format kg decimal into a display string
 * @param kg - Kilogram value
 * @param grams - Grams value (0-999)
 * @returns Formatted display string
 */
export function formatKgDecimal(kg: number, grams: number): string {
  if (grams > 0) {
    return `${kg}kg ${grams}g`;
  }
  return `${kg}kg`;
}

/**
 * Format unit string for display based on unit type
 * @param unitString - Unit string to format
 * @param unitType - Type of unit
 * @returns Formatted display string
 */
export function formatUnitString(unitString: string | number | null | undefined, unitType: UnitType = 'kg-grams'): string {
  const parsed = parseUnit(unitString, unitType);
  return parsed.display;
}

/**
 * Create a unit from kg and grams (for kg-grams type only)
 * @param kg - Kilogram value
 * @param grams - Grams value
 * @returns UnitData object
 */
export function createKgGramsUnit(kg: number, grams: number): UnitData {
  const normalizedGrams = grams % 1000;
  const additionalKg = Math.floor(grams / 1000);
  const totalKg = kg + additionalKg;

  return {
    kg: totalKg,
    grams: normalizedGrams,
    display: formatKgGrams(totalKg, normalizedGrams),
    total_grams: (totalKg * 1000) + normalizedGrams,
    raw: normalizedGrams > 0 ? `${totalKg}-${normalizedGrams}` : `${totalKg}`,
    numericValue: (totalKg * 1000) + normalizedGrams,
    unit_type: 'kg-grams'
  };
}

/**
 * Create a kg decimal unit (for kg type only)
 * @param kg - Kilogram value
 * @param grams - Grams value
 * @returns UnitData object
 */
export function createKgDecimalUnit(kg: number, grams: number): UnitData {
  const normalizedGrams = grams % 1000;
  const additionalKg = Math.floor(grams / 1000);
  const totalKg = kg + additionalKg;
  const decimalValue = totalKg + (normalizedGrams / 1000);

  return {
    kg: totalKg,
    grams: normalizedGrams,
    display: formatKgDecimal(totalKg, normalizedGrams),
    total_grams: (totalKg * 1000) + normalizedGrams,
    raw: decimalValue.toString(),
    numericValue: (totalKg * 1000) + normalizedGrams,
    unit_type: 'kg'
  };
}

/**
 * Create a simple unit (piece, bag, meter, liter, ton)
 * @param quantity - Quantity value
 * @param unitType - Type of unit
 * @returns UnitData object
 */
export function createSimpleUnit(quantity: number, unitType: UnitType): UnitData {
  const config = getUnitTypeConfig(unitType);
  return {
    quantity,
    display: `${quantity} ${config.symbol}`,
    raw: quantity.toString(),
    numericValue: quantity,
    unit_type: unitType
  };
}

/**
 * Validate unit string format for a given unit type
 * @param unitString - Unit string to validate
 * @param unitType - Type of unit
 * @returns Validation result
 */
export function validateUnit(unitString: string, unitType: UnitType = 'kg-grams'): { isValid: boolean; error?: string } {
  if (!unitString || unitString.trim() === '') {
    return { isValid: false, error: 'Unit cannot be empty' };
  }

  if (unitType === 'kg-grams') {
    return validateKgGramsUnit(unitString);
  } else if (unitType === 'kg') {
    return validateKgDecimalUnit(unitString);
  } else {
    return validateSimpleUnit(unitString, unitType);
  }
}

/**
 * Validate kg-grams format unit
 */
function validateKgGramsUnit(unitString: string): { isValid: boolean; error?: string } {
  const parts = unitString.trim().split('-');

  if (parts.length > 2) {
    return { isValid: false, error: 'Format should be "kg" or "kg-grams"' };
  }

  const kg = parseInt(parts[0]);
  if (isNaN(kg) || kg < 0) {
    return { isValid: false, error: 'Kg must be a valid non-negative number' };
  }

  if (parts.length === 2) {
    const grams = parseInt(parts[1]);
    if (isNaN(grams) || grams < 0 || grams >= 1000) {
      return { isValid: false, error: 'Grams must be between 0-999' };
    }
  }

  return { isValid: true };
}

/**
 * Validate kg decimal format unit
 */
function validateKgDecimalUnit(unitString: string): { isValid: boolean; error?: string } {
  const floatValue = parseFloat(unitString.trim());

  if (isNaN(floatValue) || floatValue < 0) {
    return { isValid: false, error: 'Value must be a valid non-negative decimal number' };
  }

  // Check if decimal part represents valid grams (0-999)
  const kg = Math.floor(floatValue);
  const decimalPart = floatValue - kg;
  const grams = Math.round(decimalPart * 1000);

  if (grams >= 1000) {
    return { isValid: false, error: 'Decimal part should represent grams (0-999)' };
  }

  return { isValid: true };
}

/**
 * Validate simple unit format
 */
function validateSimpleUnit(unitString: string, _unitType: UnitType): { isValid: boolean; error?: string } {
  const quantity = parseFloat(unitString.trim());

  if (isNaN(quantity) || quantity < 0) {
    return { isValid: false, error: 'Quantity must be a valid non-negative number' };
  }

  return { isValid: true };
}

/**
 * Convert UnitData back to string format
 * @param unitData - UnitData object
 * @returns String representation
 */
export function unitToString(unitData: UnitData): string {
  return unitData.raw;
}

/**
 * Add two units (must be same type)
 * @param unit1 - First unit string
 * @param unit2 - Second unit string  
 * @param unitType - Type of units
 * @returns Result unit string
 */
export function addUnits(unit1: string | number | null | undefined, unit2: string | number | null | undefined, unitType: UnitType = 'kg-grams'): string {
  const parsed1 = parseUnit(unit1, unitType);
  const parsed2 = parseUnit(unit2, unitType);
  const totalValue = parsed1.numericValue + parsed2.numericValue;

  if (unitType === 'kg-grams') {
    const totalKg = Math.floor(totalValue / 1000);
    const remainingGrams = totalValue % 1000;
    return createKgGramsUnit(totalKg, remainingGrams).raw;
  } else if (unitType === 'kg') {
    const totalKg = Math.floor(totalValue / 1000);
    const remainingGrams = totalValue % 1000;
    return createKgDecimalUnit(totalKg, remainingGrams).raw;
  } else {
    return createSimpleUnit(totalValue, unitType).raw;
  }
}

/**
 * Subtract unit2 from unit1 (must be same type)
 * @param unit1 - Unit to subtract from
 * @param unit2 - Unit to subtract
 * @param unitType - Type of units
 * @returns Result unit string (minimum 0)
 */
export function subtractUnits(unit1: string | number | null | undefined, unit2: string | number | null | undefined, unitType: UnitType = 'kg-grams'): string {
  const parsed1 = parseUnit(unit1, unitType);
  const parsed2 = parseUnit(unit2, unitType);
  const totalValue = Math.max(0, parsed1.numericValue - parsed2.numericValue);

  if (unitType === 'kg-grams') {
    const totalKg = Math.floor(totalValue / 1000);
    const remainingGrams = totalValue % 1000;
    return createKgGramsUnit(totalKg, remainingGrams).raw;
  } else if (unitType === 'kg') {
    const totalKg = Math.floor(totalValue / 1000);
    const remainingGrams = totalValue % 1000;
    return createKgDecimalUnit(totalKg, remainingGrams).raw;
  } else {
    return createSimpleUnit(totalValue, unitType).raw;
  }
}

/**
 * Compare two units (must be same type)
 * @param unit1 - First unit string
 * @param unit2 - Second unit string
 * @param unitType - Type of units
 * @returns -1 if unit1 < unit2, 0 if equal, 1 if unit1 > unit2
 */
export function compareUnits(unit1: string | number | null | undefined, unit2: string | number | null | undefined, unitType: UnitType = 'kg-grams'): number {
  const parsed1 = parseUnit(unit1, unitType);
  const parsed2 = parseUnit(unit2, unitType);

  if (parsed1.numericValue < parsed2.numericValue) return -1;
  if (parsed1.numericValue > parsed2.numericValue) return 1;
  return 0;
}

/**
 * Calculate stock percentage based on quantities in unit strings
 * @param currentStock - Current stock in unit format
 * @param requestedQuantity - Requested quantity in unit format
 * @param unitType - Type of units
 * @returns Percentage of stock being used
 */
export function calculateStockPercentage(currentStock: string | number | null | undefined, requestedQuantity: string | number | null | undefined, unitType: UnitType = 'kg-grams'): number {
  const current = parseUnit(currentStock, unitType);
  const requested = parseUnit(requestedQuantity, unitType);

  if (current.numericValue === 0) return 0;
  return (requested.numericValue / current.numericValue) * 100;
}

/**
 * Check if there's sufficient stock
 * @param currentStock - Current stock in unit format
 * @param requestedQuantity - Requested quantity in unit format
 * @param unitType - Type of units
 * @returns True if sufficient stock available
 */
export function hasSufficientStock(currentStock: string, requestedQuantity: string, unitType: UnitType = 'kg-grams'): boolean {
  return compareUnits(currentStock, requestedQuantity, unitType) >= 0;
}

/**
 * Get numeric value from unit string for calculations
 * @param unitString - Unit string to convert
 * @param unitType - Type of unit
 * @returns Numeric value
 */
export function getStockAsNumber(unitString: string | number | null | undefined, unitType: UnitType = 'kg-grams'): number {
  const parsed = parseUnit(unitString, unitType);
  return parsed.numericValue;
}

/**
 * Check if stock is sufficient for a given quantity
 * @param currentStock - Current stock string
 * @param requestedQuantity - Requested quantity as number
 * @param unitType - Type of unit
 * @returns True if sufficient
 */
export function isStockSufficient(currentStock: string, requestedQuantity: number, unitType: UnitType = 'kg-grams'): boolean {
  const current = parseUnit(currentStock, unitType);
  return current.numericValue >= requestedQuantity;
}

/**
 * Get alert level as number for comparison
 * @param alertLevel - Alert level string
 * @param unitType - Type of unit
 * @returns Numeric value
 */
export function getAlertLevelAsNumber(alertLevel: string | number | null | undefined, unitType: UnitType = 'kg-grams'): number {
  const parsed = parseUnit(alertLevel, unitType);
  return parsed.numericValue;
}

/**
 * CRITICAL FIX: Create unit string from numeric value
 * This function converts a numeric value (in base units) back to proper unit string
 * @param numericValue - Numeric value in base units (grams for kg-grams, direct value for others)
 * @param unitType - Type of unit
 * @returns Properly formatted unit string
 */
export function createUnitFromNumericValue(numericValue: number, unitType: UnitType = 'kg-grams'): string {
  if (unitType === 'kg-grams') {
    // numericValue is in grams, convert to kg-grams format
    const kg = Math.floor(numericValue / 1000);
    const grams = numericValue % 1000;
    return grams > 0 ? `${kg}-${grams}` : `${kg}`;
  } else if (unitType === 'kg') {
    // numericValue is in grams, convert to kg decimal format
    const kg = Math.floor(numericValue / 1000);
    const grams = numericValue % 1000;
    const decimalValue = kg + (grams / 1000);
    return decimalValue.toString();
  } else {
    // For simple units, numericValue is the direct value
    return numericValue.toString();
  }
}

// Legacy functions for backward compatibility (will be phased out)
export const createUnit = createKgGramsUnit;
export const formatUnit = formatKgGrams;
