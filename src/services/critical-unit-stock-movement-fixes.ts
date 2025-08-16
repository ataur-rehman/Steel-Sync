/**
 * CRITICAL UNIT HANDLING & STOCK MOVEMENT FIXES
 * 
 * This fixes the two critical and dangerous issues:
 * 1. Stock movement showing wrong format in stock report (e.g., -0kg 3g instead of proper units)
 * 2. Invoice detail items not creating stock movements & wrong quantity deduction
 * 
 * THESE ARE EXTREMELY DANGEROUS ISSUES THAT AFFECT INVENTORY ACCURACY
 */

import { parseUnit, createUnitFromNumericValue, formatUnitString } from '../utils/unitUtils';

export class CriticalUnitStockMovementFixes {
  private db: any;

  constructor(databaseService: any) {
    this.db = databaseService;
    this.applyCriticalFixes();
  }

  /**
   * Apply critical fixes for unit handling and stock movements
   */
  private applyCriticalFixes(): void {
    console.log('🚨 APPLYING CRITICAL UNIT & STOCK MOVEMENT FIXES');
    
    // NOTE: addInvoiceItems fix is now handled by CentralizedRealtimeSolution
    // to avoid conflicts. We only apply formatting and unit calculation fixes here.
    this.fixStockMovementUnitFormatting();
    this.fixQuantityCalculationsForAllUnitTypes();
    
    console.log('✅ Critical unit and stock movement fixes applied');
  }

  /**
   * CRITICAL FIX 2: Stock movement unit formatting in reports
   */
  private fixStockMovementUnitFormatting(): void {
    // Override the stock movements retrieval to ensure correct formatting
    if (!this.db.getStockMovements) return;

    const originalGetStockMovements = this.db.getStockMovements.bind(this.db);

    this.db.getStockMovements = async (filters: any = {}) => {
      const movements = await originalGetStockMovements(filters);
      
      // **CRITICAL**: Fix unit formatting in stock movements
      const correctedMovements = await Promise.all(movements.map(async (movement: any) => {
        try {
          // Get product unit type
          const productResult = await this.db.dbConnection.select(
            'SELECT unit_type FROM products WHERE id = ?',
            [movement.product_id]
          );
          
          const productUnitType = productResult[0]?.unit_type || 'kg-grams';
          
          // **CRITICAL**: Format quantities correctly based on unit type
          const formatQuantityForDisplay = (numericValue: number, unitType: string): string => {
            if (unitType === 'kg-grams') {
              const kg = Math.floor(numericValue / 1000);
              const grams = numericValue % 1000;
              return grams > 0 ? `${kg}kg ${grams}g` : `${kg}kg`;
            } else if (unitType === 'kg') {
              const kg = Math.floor(numericValue / 1000);
              const grams = numericValue % 1000;
              return grams > 0 ? `${kg}.${grams}kg` : `${kg}kg`;
            } else if (unitType === 'piece') {
              return `${numericValue} pcs`;
            } else if (unitType === 'bag') {
              return `${numericValue} bags`;
            } else {
              return `${numericValue}`;
            }
          };

          // Apply corrections
          const correctedMovement = {
            ...movement,
            // **CRITICAL**: Format display quantities correctly
            quantity_display: formatQuantityForDisplay(movement.quantity, productUnitType),
            previous_stock_display: formatQuantityForDisplay(movement.previous_stock, productUnitType),
            new_stock_display: formatQuantityForDisplay(movement.new_stock, productUnitType),
            unit_type: productUnitType,
            // Keep original values for calculations
            quantity_numeric: movement.quantity,
            previous_stock_numeric: movement.previous_stock,
            new_stock_numeric: movement.new_stock
          };

          return correctedMovement;

        } catch (error) {
          console.warn(`Could not format movement for product ${movement.product_id}:`, error);
          return movement; // Return original if error
        }
      }));

      return correctedMovements;
    };
  }

  /**
   * CRITICAL FIX 3: All unit type calculations must work correctly
   */
  private fixQuantityCalculationsForAllUnitTypes(): void {
    // Override product stock update method to handle all unit types
    if (!this.db.updateProductStock) return;

    this.db.updateProductStock = async (productId: number, quantityChange: number, movementType: 'in' | 'out') => {
      console.log('🔄 [CRITICAL FIX] Enhanced product stock update with correct unit handling');

      try {
        // Get product details
        const productResult = await this.db.dbConnection.select(
          'SELECT id, name, current_stock, unit_type FROM products WHERE id = ?',
          [productId]
        );

        if (!productResult || productResult.length === 0) {
          throw new Error(`Product with ID ${productId} not found`);
        }

        const product = productResult[0];
        const productUnitType = product.unit_type || 'kg-grams';

        // **CRITICAL**: Parse current stock with correct unit type
        const currentStockData = parseUnit(product.current_stock, productUnitType);
        
        // **CRITICAL**: Calculate new stock value
        const adjustment = movementType === 'in' ? quantityChange : -quantityChange;
        const newStockValue = currentStockData.numericValue + adjustment;

        if (newStockValue < 0) {
          throw new Error(`Insufficient stock. Current: ${formatUnitString(product.current_stock, productUnitType)}, Required: ${Math.abs(adjustment)}`);
        }

        // **CRITICAL**: Convert back to proper format
        const newStockString = createUnitFromNumericValue(newStockValue, productUnitType);

        // Update database
        await this.db.dbConnection.execute(
          'UPDATE products SET current_stock = ?, updated_at = datetime(\'now\') WHERE id = ?',
          [newStockString, productId]
        );

        console.log(`✅ Product ${product.name} stock updated: ${formatUnitString(product.current_stock, productUnitType)} → ${formatUnitString(newStockString, productUnitType)}`);

        return { success: true, newStock: newStockString };

      } catch (error) {
        console.error('❌ Product stock update error:', error);
        throw error;
      }
    };
  }
}
