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
  
  // Specific to kg-grams
  kg?: number;
  grams?: number;
  total_grams?: number;
  
  // For simple units (piece, bag, meter, liter, ton)
  quantity?: number;
  unit_type: UnitType;
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
 * @returns Formatted string like "1600kg 60g" or "1600kg"
 */
export function formatUnit(kg: number, grams: number = 0): string {
  if (grams > 0) {
    return `${kg}kg ${grams}g`;
  }
  return `${kg}kg`;
}

/**
 * Format unit string for display
 * @param unitString - String in format "kg-grams" or "kg"
 * @returns Formatted display string
 */
export function formatUnitString(unitString: string | number | null | undefined): string {
  const unit = parseUnit(unitString);
  return unit.display;
}

/**
 * Convert UnitData back to the database format (kg-grams)
 * @param unitData - UnitData object
 * @returns String in format "kg-grams" or "kg" if grams is 0
 */
export function unitToString(unitData: UnitData): string {
  if (unitData.grams > 0) {
    return `${unitData.kg}-${unitData.grams}`;
  }
  return `${unitData.kg}`;
}

/**
 * Create UnitData from separate kg and grams values
 * @param kg - Kilogram value
 * @param grams - Grams value
 * @returns UnitData object
 */
export function createUnit(kg: number, grams: number = 0): UnitData {
  // Ensure grams is between 0-999, convert excess to kg
  const extraKg = Math.floor(grams / 1000);
  const finalKg = kg + extraKg;
  const finalGrams = grams % 1000;

  const rawString = finalGrams > 0 ? `${finalKg}-${finalGrams}` : `${finalKg}`;

  return {
    kg: finalKg,
    grams: finalGrams,
    display: formatUnit(finalKg, finalGrams),
    total_grams: (finalKg * 1000) + finalGrams,
    raw: rawString
  };
}

/**
 * Validate unit input string
 * @param unitString - Input string to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateUnit(unitString: string | number | null | undefined): { isValid: boolean; error?: string } {
  if (!unitString || unitString === '') {
    return { isValid: false, error: 'Unit is required' };
  }

  // Convert to string if it's a number
  const stringValue = typeof unitString === 'number' ? unitString.toString() : String(unitString);
  
  if (!stringValue || stringValue.trim() === '') {
    return { isValid: false, error: 'Unit is required' };
  }

  const parts = stringValue.trim().split('-');
  
  if (parts.length > 2) {
    return { isValid: false, error: 'Unit format should be "kg" or "kg-grams"' };
  }

  const kg = parseInt(parts[0]);
  if (isNaN(kg) || kg < 0) {
    return { isValid: false, error: 'Kilogram value must be a positive number' };
  }

  if (parts.length === 2) {
    const grams = parseInt(parts[1]);
    if (isNaN(grams) || grams < 0 || grams >= 1000) {
      return { isValid: false, error: 'Grams value must be between 0-999' };
    }
  }

  return { isValid: true };
}

/**
 * Add two units together
 * @param unit1 - First unit string
 * @param unit2 - Second unit string
 * @returns Combined unit string
 */
export function addUnits(unit1: string | number | null | undefined, unit2: string | number | null | undefined): string {
  const parsed1 = parseUnit(unit1);
  const parsed2 = parseUnit(unit2);
  const totalGrams = parsed1.total_grams + parsed2.total_grams;
  return createUnit(Math.floor(totalGrams / 1000), totalGrams % 1000).raw;
}

/**
 * Subtract unit2 from unit1
 * @param unit1 - Unit to subtract from
 * @param unit2 - Unit to subtract
 * @returns Result unit string (minimum 0)
 */
export function subtractUnits(unit1: string | number | null | undefined, unit2: string | number | null | undefined): string {
  const parsed1 = parseUnit(unit1);
  const parsed2 = parseUnit(unit2);
  const totalGrams = Math.max(0, parsed1.total_grams - parsed2.total_grams);
  return createUnit(Math.floor(totalGrams / 1000), totalGrams % 1000).raw;
}

/**
 * Compare two units
 * @param unit1 - First unit string
 * @param unit2 - Second unit string
 * @returns -1 if unit1 < unit2, 0 if equal, 1 if unit1 > unit2
 */
export function compareUnits(unit1: string | number | null | undefined, unit2: string | number | null | undefined): number {
  const parsed1 = parseUnit(unit1);
  const parsed2 = parseUnit(unit2);
  if (parsed1.total_grams < parsed2.total_grams) return -1;
  if (parsed1.total_grams > parsed2.total_grams) return 1;
  return 0;
}

/**
 * Calculate stock percentage based on quantities in unit strings
 * @param currentStock - Current stock in unit format
 * @param requestedQuantity - Requested quantity in unit format
 * @returns Percentage of stock being used
 */
export function calculateStockPercentage(currentStock: string | number | null | undefined, requestedQuantity: string | number | null | undefined): number {
  const current = parseUnit(currentStock);
  const requested = parseUnit(requestedQuantity);
  
  if (current.total_grams === 0) return 0;
  return (requested.total_grams / current.total_grams) * 100;
}

/**
 * Check if there's sufficient stock
 * @param currentStock - Current stock in unit format
 * @param requestedQuantity - Requested quantity in unit format
 * @returns True if sufficient stock available
 */
export function hasSufficientStock(currentStock: string, requestedQuantity: string): boolean {
  return compareUnits(currentStock, requestedQuantity) >= 0;
}
