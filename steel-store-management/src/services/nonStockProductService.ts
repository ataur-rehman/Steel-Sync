/**
 * NON-STOCK PRODUCT SERVICE
 * 
 * Handles special products like T-Iron that don't track inventory but have
 * special calculation logic (pieces × length × price per unit)
 */

import { DatabaseService } from './database';

export interface NonStockProduct {
    id: number;
    name: string;
    unit_type: 'foot';
    track_inventory: 0;
    rate_per_unit: number; // Price per foot
    length_per_piece?: number; // Default length per piece
    pieces_count?: number; // For inventory display only
}

export interface TIronCalculation {
    pieces: number;
    lengthPerPiece: number;
    pricePerFoot: number;
    totalFeet: number;
    totalAmount: number;
}

export class NonStockProductService {
    private static instance: NonStockProductService;
    private db: DatabaseService;

    private constructor() {
        this.db = DatabaseService.getInstance();
    }

    public static getInstance(): NonStockProductService {
        if (!NonStockProductService.instance) {
            NonStockProductService.instance = new NonStockProductService();
        }
        return NonStockProductService.instance;
    }

    /**
     * Check if a product is a non-stock product
     */
    isNonStockProduct(product: any): boolean {
        return product.track_inventory === 0 || product.track_inventory === false;
    }

    /**
     * Calculate T-Iron pricing
     * Formula: pieces × length_per_piece × rate_per_unit
     */
    calculateTIronPrice(pieces: number, lengthPerPiece: number, pricePerFoot: number): TIronCalculation {
        const totalFeet = pieces * lengthPerPiece;
        const totalAmount = totalFeet * pricePerFoot;

        return {
            pieces,
            lengthPerPiece,
            pricePerFoot,
            totalFeet,
            totalAmount
        };
    }

    /**
     * Create T-Iron product in database
     */
    async createTIronProduct(): Promise<number> {
        try {
            const tIronData = {
                name: 'T-Iron',
                category: 'Steel',
                unit_type: 'foot',
                unit: 'ft',
                track_inventory: 0,
                rate_per_unit: 120, // Default price per foot
                length_per_piece: 12, // Default 12 feet per piece
                pieces_count: 0, // Not tracked, just for reference
                current_stock: '0', // Always 0 for non-stock
                min_stock_alert: '0',
                is_active: 1,
                description: 'T-Iron calculated by pieces × length × price per foot'
            };

            const productId = await this.db.createProduct(tIronData);
            console.log('✅ T-Iron product created with ID:', productId);
            return productId;
        } catch (error) {
            console.error('❌ Failed to create T-Iron product:', error);
            throw error;
        }
    }

    /**
     * Get all non-stock products
     */
    async getNonStockProducts(): Promise<NonStockProduct[]> {
        try {
            const allProducts = await this.db.getAllProducts();
            return allProducts.filter(product => this.isNonStockProduct(product));
        } catch (error) {
            console.error('❌ Failed to get non-stock products:', error);
            return [];
        }
    }

    /**
     * Update T-Iron product settings
     */
    async updateTIronProduct(productId: number, updates: Partial<NonStockProduct>): Promise<void> {
        try {
            await this.db.updateProduct(productId, updates);
            console.log('✅ T-Iron product updated');
        } catch (error) {
            console.error('❌ Failed to update T-Iron product:', error);
            throw error;
        }
    }

    /**
     * Create invoice item for T-Iron with special calculation
     */
    createTIronInvoiceItem(product: NonStockProduct, pieces: number, lengthPerPiece: number): any {
        const calculation = this.calculateTIronPrice(pieces, lengthPerPiece, product.rate_per_unit);

        return {
            product_id: product.id,
            product_name: product.name,
            quantity: calculation.totalFeet, // Total feet
            unit: 'ft',
            unit_price: product.rate_per_unit, // Price per foot
            rate: product.rate_per_unit,
            line_total: calculation.totalAmount,
            amount: calculation.totalAmount,
            total_price: calculation.totalAmount,
            // Special T-Iron fields for invoice display
            t_iron_pieces: pieces,
            t_iron_length_per_piece: lengthPerPiece,
            t_iron_total_feet: calculation.totalFeet,
            product_description: `${pieces} pieces × ${lengthPerPiece} ft × Rs.${product.rate_per_unit}/ft = ${calculation.totalFeet} ft total`,
            is_non_stock_item: true
        };
    }

    /**
     * Validate T-Iron calculation inputs
     */
    validateTIronInputs(pieces: number, lengthPerPiece: number, pricePerFoot: number): string[] {
        const errors: string[] = [];

        if (!pieces || pieces <= 0) {
            errors.push('Pieces must be greater than 0');
        }

        if (!lengthPerPiece || lengthPerPiece <= 0) {
            errors.push('Length per piece must be greater than 0');
        }

        if (!pricePerFoot || pricePerFoot <= 0) {
            errors.push('Price per foot must be greater than 0');
        }

        return errors;
    }

    /**
     * Format T-Iron display string
     */
    formatTIronDisplay(pieces: number, lengthPerPiece: number, totalFeet: number, totalAmount: number): string {
        return `${pieces} pcs × ${lengthPerPiece} ft = ${totalFeet} ft total (Rs.${totalAmount.toLocaleString()})`;
    }
}

export const nonStockProductService = NonStockProductService.getInstance();
