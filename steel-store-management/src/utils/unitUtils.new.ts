/**
 * Enhanced unit formatting utilities for the steel store management system
 * Supports multiple unit types: kg-grams, piece, bag, meter, liter, ton
 */

export type UnitType = 'kg-grams' | 'piece' | 'bag' | 'meter' | 'liter' | 'ton';

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
  format: 'kg-grams' | 'simple';
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
    type: 'meter',
    label: 'Meters',
    symbol: 'm',
    description: 'Length in meters',
    format: 'simple',
    examples: ['10', '25.5', '100']
  },
  {
    type: 'liter',
    label: 'Liters',
    symbol: 'L',
    description: 'Volume in liters',
    format: 'simple',
    examples: ['50', '100', '500']
  },
  {
    type: 'ton',
    label: 'Tons',
    symbol: 't',
    description: 'Weight in tons',
    format: 'simple',
    examples: ['1', '2.5', '10']
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
export function parseUnit(unitString: string | number | null | undefined, unitType: UnitType = 'kg-grams'): UnitData {
  // Handle null, undefined, or empty values
  if (!unitString || unitString === '') {
    return createEmptyUnit(unitType);
  }

  // Convert to string if it's a number
  const stringValue = typeof unitString === 'number' ? unitString.toString() : String(unitString);
  
  // Check if string is empty after conversion
  if (!stringValue || stringValue.trim() === '') {
    return createEmptyUnit(unitType);
  }

  const cleanString = stringValue.trim();

  if (unitType === 'kg-grams') {
    return parseKgGramsUnit(cleanString);
  } else {
    return parseSimpleUnit(cleanString, unitType);
  }
}

/**
 * Create an empty unit for a given type
 */
function createEmptyUnit(unitType: UnitType): UnitData {
  if (unitType === 'kg-grams') {
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
 */
function parseKgGramsUnit(unitString: string): UnitData {
  const parts = unitString.split('-');
  const kg = parseInt(parts[0]) || 0;
  const grams = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
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
 * Parse simple unit (piece, bag, meter, liter, ton)
 */
function parseSimpleUnit(unitString: string, unitType: UnitType): UnitData {
  const quantity = parseFloat(unitString) || 0;
  const config = getUnitTypeConfig(unitType);
  
  return {
    quantity,
    display: `${quantity} ${config.symbol}`,
    raw: unitString,
    numericValue: quantity,
    unit_type: unitType
  };
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
 * Validate simple unit format
 */
function validateSimpleUnit(unitString: string, unitType: UnitType): { isValid: boolean; error?: string } {
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

// Legacy functions for backward compatibility (will be phased out)
export const createUnit = createKgGramsUnit;
export const formatUnit = formatKgGrams;
