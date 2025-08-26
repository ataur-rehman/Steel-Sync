/**
 * Invoice Analysis Utility
 * 
 * This utility helps you understand your current invoice numbering situation
 * and what will happen when you switch to the new system.
 */

export interface InvoiceAnalysisResult {
    hasOldFormat: boolean;
    hasNewFormat: boolean;
    oldFormatCount: number;
    newFormatCount: number;
    lastOldFormatNumber: number | null;
    lastNewFormatNumber: number | null;
    nextInvoiceNumber: string;
    recommendedAction: string;
    potentialIssues: string[];
}

export class InvoiceAnalyzer {
    private dbConnection: any;

    constructor(dbConnection: any) {
        this.dbConnection = dbConnection;
    }

    /**
     * Analyze current invoice numbering situation
     */
    async analyzeCurrentState(): Promise<InvoiceAnalysisResult> {
        const result: InvoiceAnalysisResult = {
            hasOldFormat: false,
            hasNewFormat: false,
            oldFormatCount: 0,
            newFormatCount: 0,
            lastOldFormatNumber: null,
            lastNewFormatNumber: null,
            nextInvoiceNumber: '01',
            recommendedAction: '',
            potentialIssues: []
        };

        try {
            // Check for old format invoices (I00001, I00002, etc.)
            const oldFormatInvoices = await this.dbConnection.select(
                'SELECT bill_number FROM invoices WHERE bill_number LIKE "I%" ORDER BY CAST(SUBSTR(bill_number, 2) AS INTEGER) DESC'
            );

            if (oldFormatInvoices && oldFormatInvoices.length > 0) {
                result.hasOldFormat = true;
                result.oldFormatCount = oldFormatInvoices.length;
                const lastOld = oldFormatInvoices[0].bill_number;
                result.lastOldFormatNumber = parseInt(lastOld.substring(1)) || 0;
            }

            // Check for new format invoices (01, 02, 088, etc.)
            const newFormatInvoices = await this.dbConnection.select(
                'SELECT bill_number FROM invoices WHERE bill_number REGEXP "^[0-9]+$" ORDER BY CAST(bill_number AS INTEGER) DESC'
            );

            if (newFormatInvoices && newFormatInvoices.length > 0) {
                result.hasNewFormat = true;
                result.newFormatCount = newFormatInvoices.length;
                result.lastNewFormatNumber = parseInt(newFormatInvoices[0].bill_number) || 0;
            }

            // Determine next invoice number
            const maxNumber = Math.max(
                result.lastOldFormatNumber || 0,
                result.lastNewFormatNumber || 0
            );
            const nextNumber = maxNumber + 1;

            if (nextNumber < 10) {
                result.nextInvoiceNumber = `0${nextNumber}`;
            } else if (nextNumber < 100) {
                result.nextInvoiceNumber = `0${nextNumber}`;
            } else if (nextNumber < 1000) {
                result.nextInvoiceNumber = `0${nextNumber}`;
            } else {
                result.nextInvoiceNumber = nextNumber.toString();
            }

            // Determine recommended action
            if (!result.hasOldFormat && !result.hasNewFormat) {
                result.recommendedAction = 'No existing invoices found. New system will start with 01.';
            } else if (result.hasOldFormat && !result.hasNewFormat) {
                result.recommendedAction = `Found ${result.oldFormatCount} old format invoices. New system will continue from ${result.nextInvoiceNumber}.`;
            } else if (!result.hasOldFormat && result.hasNewFormat) {
                result.recommendedAction = `Found ${result.newFormatCount} new format invoices. System will continue normally from ${result.nextInvoiceNumber}.`;
            } else {
                result.recommendedAction = `Found both old (${result.oldFormatCount}) and new (${result.newFormatCount}) format invoices. System will continue from ${result.nextInvoiceNumber}.`;
            }

            // Check for potential issues
            if (result.hasOldFormat && result.hasNewFormat) {
                result.potentialIssues.push('Mixed invoice formats detected. Consider running migration for consistency.');
            }

            if (result.oldFormatCount > 1000) {
                result.potentialIssues.push('Large number of old format invoices. Migration might take time.');
            }

            // Check for duplicate numbers
            const allNumbers = await this.dbConnection.select(
                `SELECT 
          CASE 
            WHEN bill_number LIKE 'I%' THEN CAST(SUBSTR(bill_number, 2) AS INTEGER)
            ELSE CAST(bill_number AS INTEGER)
          END as number_value,
          COUNT(*) as count
        FROM invoices 
        WHERE bill_number != '' 
        GROUP BY number_value 
        HAVING count > 1`
            );

            if (allNumbers && allNumbers.length > 0) {
                result.potentialIssues.push(`Found ${allNumbers.length} duplicate invoice numbers across formats.`);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.potentialIssues.push(`Error analyzing database: ${errorMessage}`);
        }

        return result;
    }

    /**
     * Print analysis results in a readable format
     */
    printAnalysis(result: InvoiceAnalysisResult): void {
        console.log('\n=== INVOICE NUMBERING ANALYSIS ===');
        console.log(`📊 Current State:`);
        console.log(`   • Old format invoices (I00001): ${result.oldFormatCount}`);
        console.log(`   • New format invoices (01): ${result.newFormatCount}`);

        if (result.lastOldFormatNumber) {
            console.log(`   • Last old format number: ${result.lastOldFormatNumber}`);
        }

        if (result.lastNewFormatNumber) {
            console.log(`   • Last new format number: ${result.lastNewFormatNumber}`);
        }

        console.log(`\n🆕 Next Invoice: ${result.nextInvoiceNumber}`);
        console.log(`\n💡 Recommendation: ${result.recommendedAction}`);

        if (result.potentialIssues.length > 0) {
            console.log(`\n⚠️  Potential Issues:`);
            result.potentialIssues.forEach(issue => {
                console.log(`   • ${issue}`);
            });
        } else {
            console.log(`\n✅ No issues detected`);
        }

        console.log('\n=== END ANALYSIS ===\n');
    }

    /**
     * Quick check function you can run in console
     */
    async quickCheck(): Promise<void> {
        const result = await this.analyzeCurrentState();
        this.printAnalysis(result);
        return;
    }
}

// Export a quick function for easy testing
export async function analyzeInvoiceState(dbConnection: any): Promise<void> {
    const analyzer = new InvoiceAnalyzer(dbConnection);
    await analyzer.quickCheck();
}
