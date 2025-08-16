/**
 * DETAILED CREDIT ALLOCATION ANALYSIS
 * 
 * This test will trace exactly what entries are being created
 * and identify why credit is still being added instead of used.
 */

const fs = require('fs');
const path = require('path');

class DetailedCreditAnalysis {
    constructor() {
        this.databasePath = path.join(__dirname, 'src', 'services', 'database.ts');
    }

    async analyzeAutoAllocateCustomerCredit() {
        console.log('🔍 ANALYZING autoAllocateCustomerCredit FUNCTION\n');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // Find the autoAllocateCustomerCredit function
        const functionMatch = content.match(/private async autoAllocateCustomerCredit\([\s\S]*?(?=\n  [a-zA-Z]|\n  \/\*)/);

        if (!functionMatch) {
            console.log('❌ Could not find autoAllocateCustomerCredit function');
            return;
        }

        const functionCode = functionMatch[0];
        console.log('📋 FUNCTION STRUCTURE ANALYSIS:\n');

        // Check 1: Does it create customer ledger entries?
        const ledgerEntryCreation = functionCode.match(/INSERT INTO customer_ledger_entries/g);
        if (ledgerEntryCreation) {
            console.log(`❌ FOUND ${ledgerEntryCreation.length} customer ledger entry creation(s)!`);
            console.log('   This is the problem - creating new entries adds more credit!');

            // Find the specific entries being created
            const insertMatches = functionCode.match(/INSERT INTO customer_ledger_entries[\s\S]*?VALUES[\s\S]*?\]/g);
            if (insertMatches) {
                insertMatches.forEach((match, index) => {
                    console.log(`\n   ENTRY ${index + 1}:`);
                    const entryTypeMatch = match.match(/'([^']*)',.*?'([^']*)'/);
                    if (entryTypeMatch) {
                        console.log(`     Entry Type: ${entryTypeMatch[1]}`);
                        console.log(`     Transaction Type: ${entryTypeMatch[2]}`);
                    }
                });
            }
        } else {
            console.log('✅ No customer ledger entries being created');
        }

        // Check 2: Does it create daily ledger entries?
        const dailyLedgerCreation = functionCode.match(/INSERT INTO ledger_entries/g);
        if (dailyLedgerCreation) {
            console.log(`\n❌ FOUND ${dailyLedgerCreation.length} daily ledger entry creation(s)!`);
        } else {
            console.log('\n✅ No daily ledger entries being created');
        }

        // Check 3: What does it actually do?
        console.log('\n📋 WHAT THE FUNCTION ACTUALLY DOES:');

        if (functionCode.includes('allocateAmountToInvoices')) {
            console.log('   ✅ Calls allocateAmountToInvoices (correct)');
        }

        if (functionCode.includes('No customer ledger entries created')) {
            console.log('   ✅ Claims to not create customer ledger entries');
        }

        if (functionCode.includes('using existing credit balance')) {
            console.log('   ✅ Claims to use existing credit balance');
        }

        return { ledgerEntryCreation, dailyLedgerCreation, functionCode };
    }

    async analyzeAllocateAmountToInvoices() {
        console.log('\n🔍 ANALYZING allocateAmountToInvoices FUNCTION\n');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // Find the allocateAmountToInvoices function
        const functionMatch = content.match(/private async allocateAmountToInvoices\([\s\S]*?return \{[\s\S]*?\};/);

        if (!functionMatch) {
            console.log('❌ Could not find allocateAmountToInvoices function');
            return;
        }

        const functionCode = functionMatch[0];
        console.log('📋 ALLOCATION ENGINE ANALYSIS:\n');

        // Check what it does
        if (functionCode.includes('UPDATE invoices')) {
            console.log('✅ Updates invoice amounts (correct)');
        }

        if (functionCode.includes('INSERT INTO customer_ledger_entries')) {
            console.log('❌ Creates customer ledger entries (PROBLEM!)');

            // Find what entries it creates
            const insertMatches = functionCode.match(/INSERT INTO customer_ledger_entries[\s\S]*?VALUES[\s\S]*?\]/g);
            if (insertMatches) {
                console.log(`   Found ${insertMatches.length} customer ledger entry creation(s):`);
                insertMatches.forEach((match, index) => {
                    console.log(`\n   ENTRY ${index + 1}:`);
                    console.log(`     ${match.substring(0, 200)}...`);
                });
            }
        } else {
            console.log('✅ Does not create customer ledger entries');
        }

        return functionCode;
    }

    async analyzeProcessCustomerPayment() {
        console.log('\n🔍 ANALYZING processCustomerPayment FUNCTION\n');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // Find where daily ledger entries are created
        const paymentFunctionMatch = content.match(/async processCustomerPayment\([\s\S]*?return \{[\s\S]*?\};/);

        if (!paymentFunctionMatch) {
            console.log('❌ Could not find processCustomerPayment function');
            return;
        }

        const functionCode = paymentFunctionMatch[0];

        // Check for daily ledger creation
        const dailyLedgerMatches = functionCode.match(/INSERT INTO ledger_entries/g);
        if (dailyLedgerMatches) {
            console.log(`✅ Creates ${dailyLedgerMatches.length} daily ledger entry/entries`);
        } else {
            console.log('❌ Does not create daily ledger entries');
        }

        // Check for customer ledger creation
        const customerLedgerMatches = functionCode.match(/INSERT INTO customer_ledger_entries/g);
        if (customerLedgerMatches) {
            console.log(`✅ Creates ${customerLedgerMatches.length} customer ledger entry/entries`);
        }

        return functionCode;
    }

    async findProblemSources() {
        console.log('\n🚨 IDENTIFYING PROBLEM SOURCES\n');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // Find all places where customer ledger entries are created
        const allInserts = [...content.matchAll(/INSERT INTO customer_ledger_entries[\s\S]*?VALUES[\s\S]*?\]/g)];

        console.log(`Found ${allInserts.length} total customer ledger entry creations:`);

        allInserts.forEach((match, index) => {
            const context = content.substring(Math.max(0, match.index - 200), match.index + match[0].length + 200);
            const lines = context.split('\n');
            const matchLine = lines.findIndex(line => line.includes('INSERT INTO customer_ledger_entries'));

            console.log(`\n${index + 1}. LEDGER ENTRY CREATION:`);

            // Show context
            const startLine = Math.max(0, matchLine - 3);
            const endLine = Math.min(lines.length - 1, matchLine + 3);
            for (let i = startLine; i <= endLine; i++) {
                const marker = i === matchLine ? ' → ' : '   ';
                console.log(`${marker}${lines[i].trim()}`);
            }

            // Check entry type
            const entryTypeMatch = match[0].match(/'(credit|debit)',\s*'([^']*)'/);
            if (entryTypeMatch) {
                console.log(`   Entry Type: ${entryTypeMatch[1]}, Transaction: ${entryTypeMatch[2]}`);

                if (entryTypeMatch[1] === 'credit' && entryTypeMatch[2].includes('allocation')) {
                    console.log('   ❌ PROBLEM: This creates credit for allocation (adds more credit!)');
                }
            }
        });
    }

    async proposeCorrectSolution() {
        console.log('\n💡 CORRECT SOLUTION ANALYSIS\n');

        console.log('🎯 THE ROOT ISSUE:');
        console.log('   When allocating existing customer credit to invoices, the system should:');
        console.log('   1. ✅ Update invoice amounts (mark as paid/partially paid)');
        console.log('   2. ❌ NOT create any new customer ledger entries');
        console.log('   3. ❌ NOT create any new credit entries');
        console.log('');

        console.log('💭 WHY THIS HAPPENS:');
        console.log('   • Customer has -1500 balance (credit)');
        console.log('   • Invoice creates +1500 debit (balance becomes 0)');
        console.log('   • Auto allocation creates -1500 credit (balance becomes -1500 again!)');
        console.log('   • Result: Credit not used, balance unchanged');
        console.log('');

        console.log('✅ CORRECT APPROACH:');
        console.log('   • Customer has -1500 balance (credit)');
        console.log('   • Invoice creates +1500 debit (balance becomes 0)');
        console.log('   • Auto allocation ONLY updates invoice status (no new entries)');
        console.log('   • Result: Credit used, balance is 0, invoice is paid');
        console.log('');

        console.log('🔧 SPECIFIC FIXES NEEDED:');
        console.log('   1. Remove ALL customer ledger entry creation from auto credit allocation');
        console.log('   2. Remove ALL customer ledger entry creation from allocateAmountToInvoices when source=credit');
        console.log('   3. Ensure daily ledger entries are created for manual payments');
        console.log('   4. Keep allocation logic for updating invoice amounts only');
    }

    async run() {
        console.log('🚀 DETAILED CREDIT ALLOCATION ANALYSIS\n');
        console.log('Investigating why credit is still being added instead of used...\n');

        try {
            const autoAllocateAnalysis = await this.analyzeAutoAllocateCustomerCredit();
            const allocateEngineAnalysis = await this.analyzeAllocateAmountToInvoices();
            const paymentAnalysis = await this.analyzeProcessCustomerPayment();

            await this.findProblemSources();
            await this.proposeCorrectSolution();

        } catch (error) {
            console.error('❌ Analysis failed:', error);
        }
    }
}

// Run the detailed analysis
const analyzer = new DetailedCreditAnalysis();
analyzer.run();
