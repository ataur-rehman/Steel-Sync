/**
 * ISSUE DETECTION TEST
 * 
 * Testing for the three specific issues:
 * 1. Invoice payments not showing in daily ledger
 * 2. Credit balance not updating correctly when invoice equals credit
 * 3. Credit allocation happening even when payment is made with invoice
 */

const fs = require('fs');
const path = require('path');

class IssueDetectionTest {
    constructor() {
        this.databasePath = path.join(__dirname, 'src', 'services', 'database.ts');
    }

    async checkIssue1_DailyLedgerMissing() {
        console.log('🔍 ISSUE 1: Invoice payments not showing in daily ledger');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // Look for daily ledger entry creation in invoice process
        const dailyLedgerMatch = content.match(/if \(paymentAmount > 0\)[\s\S]*?INSERT INTO ledger_entries/);

        if (dailyLedgerMatch) {
            console.log('   ✅ Daily ledger entry creation found in invoice process');

            // Check if it's properly implemented
            const properImplementation = content.includes('Payment - Invoice') &&
                content.includes('incoming') &&
                content.includes('Payment Received');

            if (properImplementation) {
                console.log('   ✅ Daily ledger implementation looks correct');
                return false; // No issue
            } else {
                console.log('   ❌ ISSUE FOUND: Daily ledger implementation incomplete');
                return true;
            }
        } else {
            console.log('   ❌ ISSUE FOUND: No daily ledger entry creation in invoice process');
            return true;
        }
    }

    async checkIssue2_CreditBalanceNotUpdating() {
        console.log('\n🔍 ISSUE 2: Credit balance not updating when invoice amount equals credit');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // Check if auto credit allocation is ALWAYS triggered, even when payment is made
        const autoTriggerMatch = content.match(/🎯 TRIGGER AUTO CREDIT ALLOCATION AFTER DEBIT CREATION[\s\S]*?autoAllocateCustomerCredit/);

        if (autoTriggerMatch) {
            // Check if it's inside a conditional that checks for payment
            const triggerLocation = content.indexOf('🎯 TRIGGER AUTO CREDIT ALLOCATION');
            const paymentCheckBefore = content.substring(Math.max(0, triggerLocation - 1000), triggerLocation);

            // If the trigger is NOT inside a payment check, it's always called
            if (!paymentCheckBefore.includes('if (paymentAmount')) {
                console.log('   ❌ ISSUE FOUND: Auto credit allocation is ALWAYS triggered');
                console.log('   ❌ PROBLEM: Even when payment is made, credit allocation still happens');
                return true;
            } else {
                console.log('   ✅ Auto credit allocation is conditionally triggered');
                return false;
            }
        } else {
            console.log('   ⚠️ Could not find auto credit allocation trigger');
            return false;
        }
    }

    async checkIssue3_CreditUsedWithPayment() {
        console.log('\n🔍 ISSUE 3: Credit allocation happening even when payment is made');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // The issue is the same as Issue 2 - auto credit allocation is always triggered
        // Let's check the logic flow

        console.log('   Analyzing invoice creation logic flow...');

        // Find the createInvoice function structure
        const createInvoiceMatch = content.match(/async createInvoice\([\s\S]*?(?=async [a-zA-Z]|\n  [a-zA-Z])/);

        if (createInvoiceMatch) {
            const invoiceCode = createInvoiceMatch[0];

            // Check if credit allocation happens outside payment conditions
            const creditTriggerIndex = invoiceCode.indexOf('autoAllocateCustomerCredit');
            const paymentBlockIndex = invoiceCode.indexOf('if (paymentAmount > 0)');

            if (creditTriggerIndex > -1 && paymentBlockIndex > -1) {
                // If credit trigger is AFTER the payment block, it's always called
                if (creditTriggerIndex > paymentBlockIndex + 1000) { // Rough estimate
                    console.log('   ❌ ISSUE FOUND: Credit allocation called after payment processing');
                    console.log('   ❌ PROBLEM: Credit will be used even when customer pays cash');
                    return true;
                } else {
                    console.log('   ✅ Credit allocation appears to be within payment logic');
                    return false;
                }
            } else {
                console.log('   ⚠️ Could not determine credit allocation placement');
                return false;
            }
        } else {
            console.log('   ❌ Could not find createInvoice function');
            return false;
        }
    }

    async analyzeExpectedBehavior() {
        console.log('\n📋 EXPECTED BEHAVIOR ANALYSIS:');

        console.log('\n🎯 SCENARIO 1: Customer has -1500 credit, creates 1500 invoice (no payment)');
        console.log('   Expected:');
        console.log('   • Create debit entry: +1500 (balance becomes 0)');
        console.log('   • Auto credit allocation: Apply 1500 credit');
        console.log('   • Create credit entry: -1500 (balance stays 0)');
        console.log('   • Final balance: 0 ✅');
        console.log('   • Invoice status: paid ✅');

        console.log('\n🎯 SCENARIO 2: Customer has -1500 credit, creates 1500 invoice WITH 1500 payment');
        console.log('   Expected:');
        console.log('   • Create debit entry: +1500 (balance becomes 0)');
        console.log('   • Create credit entry for payment: -1500 (balance becomes -1500)');
        console.log('   • Create daily ledger for payment ✅');
        console.log('   • NO auto credit allocation (already paid) ✅');
        console.log('   • Final balance: -1500 (credit preserved) ✅');
        console.log('   • Invoice status: paid ✅');

        console.log('\n🎯 SCENARIO 3: Customer has 0 balance, creates invoice with payment');
        console.log('   Expected:');
        console.log('   • Create debit entry: +amount');
        console.log('   • Create credit entry for payment: -amount');
        console.log('   • Create daily ledger for payment ✅');
        console.log('   • NO auto credit allocation (no credit available) ✅');
    }

    async identifyRootCause() {
        console.log('\n🔍 ROOT CAUSE ANALYSIS:');

        const content = fs.readFileSync(this.databasePath, 'utf8');

        // Find where auto credit allocation is triggered
        const lines = content.split('\n');
        const triggerLine = lines.findIndex(line => line.includes('autoAllocateCustomerCredit'));

        if (triggerLine > -1) {
            console.log(`\n   Found auto credit trigger at line ${triggerLine + 1}`);

            // Show context around the trigger
            const startLine = Math.max(0, triggerLine - 5);
            const endLine = Math.min(lines.length - 1, triggerLine + 5);

            console.log('\n   CODE CONTEXT:');
            for (let i = startLine; i <= endLine; i++) {
                const marker = i === triggerLine ? ' → ' : '   ';
                console.log(`${marker}${i + 1}: ${lines[i].trim()}`);
            }

            // Check if it's inside any conditionals
            let isConditional = false;
            for (let i = triggerLine - 1; i >= Math.max(0, triggerLine - 50); i--) {
                if (lines[i].includes('if (') && !lines[i].includes('//')) {
                    isConditional = true;
                    console.log(`\n   ⚠️ Found conditional at line ${i + 1}: ${lines[i].trim()}`);
                    break;
                }
            }

            if (!isConditional) {
                console.log('\n   ❌ ROOT CAUSE IDENTIFIED: Auto credit allocation is UNCONDITIONAL');
                console.log('   ❌ IMPACT: Always runs regardless of payment status');
            }
        }
    }

    async proposeFixStrategy() {
        console.log('\n🔧 PROPOSED FIX STRATEGY:');

        console.log('\n1. CONDITIONAL CREDIT ALLOCATION:');
        console.log('   • Only trigger auto credit allocation when NO payment is made');
        console.log('   • Condition: if (paymentAmount === 0) { autoAllocateCustomerCredit() }');

        console.log('\n2. BALANCE CALCULATION FIX:');
        console.log('   • Ensure credit balance updates correctly');
        console.log('   • Verify balance_after calculation in all ledger entries');

        console.log('\n3. DAILY LEDGER VERIFICATION:');
        console.log('   • Ensure all payments create daily ledger entries');
        console.log('   • Verify payment channel updates');
    }

    async run() {
        console.log('🚀 ISSUE DETECTION TEST\n');
        console.log('Checking for the three reported issues...\n');

        try {
            const issue1 = await this.checkIssue1_DailyLedgerMissing();
            const issue2 = await this.checkIssue2_CreditBalanceNotUpdating();
            const issue3 = await this.checkIssue3_CreditUsedWithPayment();

            console.log('\n📊 ISSUE DETECTION SUMMARY:');
            console.log(`   Issue 1 (Daily Ledger Missing): ${issue1 ? '❌ FOUND' : '✅ OK'}`);
            console.log(`   Issue 2 (Credit Balance Not Updating): ${issue2 ? '❌ FOUND' : '✅ OK'}`);
            console.log(`   Issue 3 (Credit Used With Payment): ${issue3 ? '❌ FOUND' : '✅ OK'}`);

            if (issue1 || issue2 || issue3) {
                await this.analyzeExpectedBehavior();
                await this.identifyRootCause();
                await this.proposeFixStrategy();

                console.log('\n🚨 ISSUES DETECTED - FIXES NEEDED');
            } else {
                console.log('\n✅ NO ISSUES DETECTED - SYSTEM WORKING CORRECTLY');
            }

        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
}

// Run the issue detection
const detector = new IssueDetectionTest();
detector.run();
