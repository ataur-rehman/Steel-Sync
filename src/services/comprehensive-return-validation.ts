// COMPREHENSIVE VALIDATION TEST FOR ENHANCED RETURN SYSTEM
// This test validates all business logic, edge cases, and integration points

import { InvoicePaymentStatusManager, PermanentReturnValidator } from './enhanced-return-system';

interface TestResult {
    testName: string;
    passed: boolean;
    error?: string;
    details?: any;
}

async function runComprehensiveTests(): Promise<void> {
    console.log('🔍 COMPREHENSIVE ENHANCED RETURN SYSTEM VALIDATION');
    console.log('==================================================');

    const results: TestResult[] = [];

    // Mock database connection with comprehensive scenarios
    const mockDbConnection = {
        select: async (query: string, params: any[]) => {
            // Mock different invoice scenarios
            if (query.includes('SELECT id, total_amount, paid_amount')) {
                const scenarios: Record<number, any> = {
                    1: { id: 1, total_amount: 14000, paid_amount: 14000, remaining_balance: 0, payment_status: 'paid' }, // Fully paid
                    2: { id: 2, total_amount: 14000, paid_amount: 0, remaining_balance: 14000, payment_status: 'pending' }, // Unpaid
                    3: { id: 3, total_amount: 14000, paid_amount: 7000, remaining_balance: 7000, payment_status: 'partially_paid' }, // Partially paid
                    4: { id: 4, total_amount: 0, paid_amount: 0, remaining_balance: 0, payment_status: 'paid' }, // Zero amount
                    5: { id: 5, total_amount: 100, paid_amount: -10, remaining_balance: 110, payment_status: 'pending' }, // Negative payment
                    6: { id: 6, total_amount: 1000.01, paid_amount: 1000.00, remaining_balance: 0.01, payment_status: 'paid' } // Rounding edge case
                };
                return [scenarios[params[0]] || null];
            }
            return [];
        },
        execute: async () => ({ lastInsertId: 123 })
    };

    const paymentStatusManager = new InvoicePaymentStatusManager(mockDbConnection);

    // Test 1: Fully Paid Invoice Logic
    try {
        const status = await paymentStatusManager.getInvoicePaymentStatus(1);
        const eligibility = paymentStatusManager.determineSettlementEligibility(status, 5000);

        results.push({
            testName: 'Fully Paid Invoice - Payment Status Check',
            passed: status.is_fully_paid && !status.is_partially_paid && !status.is_unpaid,
            details: { status }
        });

        results.push({
            testName: 'Fully Paid Invoice - Settlement Eligibility',
            passed: eligibility.eligible_for_credit && eligibility.allow_cash_refund && eligibility.credit_amount === 5000,
            details: { eligibility }
        });
    } catch (error) {
        results.push({
            testName: 'Fully Paid Invoice Tests',
            passed: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    // Test 2: Unpaid Invoice Logic
    try {
        const status = await paymentStatusManager.getInvoicePaymentStatus(2);
        const eligibility = paymentStatusManager.determineSettlementEligibility(status, 5000);

        results.push({
            testName: 'Unpaid Invoice - Payment Status Check',
            passed: !status.is_fully_paid && !status.is_partially_paid && status.is_unpaid,
            details: { status }
        });

        results.push({
            testName: 'Unpaid Invoice - Settlement Eligibility',
            passed: eligibility.eligible_for_credit && !eligibility.allow_cash_refund && eligibility.credit_amount === 5000,
            details: { eligibility }
        });
    } catch (error) {
        results.push({
            testName: 'Unpaid Invoice Tests',
            passed: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    // Test 3: Partially Paid Invoice Logic
    try {
        const status = await paymentStatusManager.getInvoicePaymentStatus(3);
        const eligibility = paymentStatusManager.determineSettlementEligibility(status, 5000);

        results.push({
            testName: 'Partially Paid Invoice - Payment Status Check',
            passed: !status.is_fully_paid && status.is_partially_paid && !status.is_unpaid,
            details: { status }
        });

        results.push({
            testName: 'Partially Paid Invoice - Settlement Blocked',
            passed: !eligibility.eligible_for_credit && !eligibility.allow_cash_refund && eligibility.credit_amount === 0,
            details: { eligibility }
        });
    } catch (error) {
        results.push({
            testName: 'Partially Paid Invoice Tests',
            passed: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    // Test 4: Zero Amount Invoice Edge Case
    try {
        const status = await paymentStatusManager.getInvoicePaymentStatus(4);

        results.push({
            testName: 'Zero Amount Invoice - Should be considered paid',
            passed: status.is_fully_paid && !status.is_partially_paid && !status.is_unpaid,
            details: { status }
        });
    } catch (error) {
        results.push({
            testName: 'Zero Amount Invoice Test',
            passed: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    // Test 5: Negative Payment Edge Case
    try {
        const status = await paymentStatusManager.getInvoicePaymentStatus(5);

        results.push({
            testName: 'Negative Payment - Should be treated as unpaid',
            passed: !status.is_fully_paid && !status.is_partially_paid && status.is_unpaid && status.paid_amount === 0,
            details: { status }
        });
    } catch (error) {
        results.push({
            testName: 'Negative Payment Test',
            passed: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    // Test 6: Rounding Edge Case
    try {
        const status = await paymentStatusManager.getInvoicePaymentStatus(6);

        results.push({
            testName: 'Rounding Edge Case - Should be considered fully paid',
            passed: status.is_fully_paid && !status.is_partially_paid,
            details: { status }
        });
    } catch (error) {
        results.push({
            testName: 'Rounding Edge Case Test',
            passed: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    // Test 7: Invalid Return Amount
    try {
        const status = await paymentStatusManager.getInvoicePaymentStatus(1);
        const eligibility = paymentStatusManager.determineSettlementEligibility(status, 0);

        results.push({
            testName: 'Invalid Return Amount - Should be rejected',
            passed: !eligibility.eligible_for_credit && eligibility.credit_amount === 0,
            details: { eligibility }
        });
    } catch (error) {
        results.push({
            testName: 'Invalid Return Amount Test',
            passed: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    // Test 8: Return Data Validation - Valid Data
    const validReturnData = {
        customer_id: 1,
        customer_name: 'John Doe',
        original_invoice_id: 1,
        original_invoice_number: 'INV-001',
        items: [{
            product_id: 1,
            product_name: 'Steel Rod',
            original_invoice_item_id: 1,
            original_quantity: 10,
            return_quantity: 5,
            unit_price: 1000,
            total_price: 5000,
            unit: 'kg',
            reason: 'Quality issue'
        }],
        reason: 'Product defect',
        settlement_type: 'ledger' as const,
        notes: 'Customer complaint',
        created_by: 'test_user'
    };

    const validValidation = PermanentReturnValidator.validateReturnData(validReturnData);
    results.push({
        testName: 'Valid Return Data Validation',
        passed: validValidation.valid && validValidation.errors.length === 0,
        details: { validation: validValidation }
    });

    // Test 9: Return Data Validation - Invalid Data
    const invalidReturnData = {
        customer_id: 0, // Invalid
        original_invoice_id: 0, // Invalid
        items: [{
            product_id: -1, // Invalid
            product_name: '', // Invalid
            original_invoice_item_id: 0, // Invalid
            original_quantity: 0, // Invalid
            return_quantity: -1, // Invalid
            unit_price: -100, // Invalid
            total_price: -500, // Invalid
        }],
        reason: '', // Invalid
        settlement_type: 'invalid' as any // Invalid
    };

    const invalidValidation = PermanentReturnValidator.validateReturnData(invalidReturnData);
    results.push({
        testName: 'Invalid Return Data Validation',
        passed: !invalidValidation.valid && invalidValidation.errors.length > 0,
        details: { validation: invalidValidation }
    });

    // Test 10: Return Quantity vs Original Quantity
    const quantityMismatchData = {
        ...validReturnData,
        items: [{
            ...validReturnData.items[0],
            return_quantity: 15, // Exceeds original quantity of 10
        }]
    };

    const quantityValidation = PermanentReturnValidator.validateReturnData(quantityMismatchData);
    results.push({
        testName: 'Return Quantity Exceeds Original - Should be rejected',
        passed: !quantityValidation.valid && quantityValidation.errors.some(e => e.includes('exceed original quantity')),
        details: { validation: quantityValidation }
    });

    // Test 11: Total Price Calculation Validation
    const priceMismatchData = {
        ...validReturnData,
        items: [{
            ...validReturnData.items[0],
            unit_price: 1000,
            return_quantity: 5,
            total_price: 6000, // Should be 5000 (1000 * 5)
        }]
    };

    const priceValidation = PermanentReturnValidator.validateReturnData(priceMismatchData);
    results.push({
        testName: 'Total Price Calculation Mismatch - Should be rejected',
        passed: !priceValidation.valid && priceValidation.errors.some(e => e.includes("doesn't match unit price")),
        details: { validation: priceValidation }
    });

    // Print results
    console.log('\n📋 TEST RESULTS SUMMARY');
    console.log('========================');

    const passedTests = results.filter(r => r.passed);
    const failedTests = results.filter(r => !r.passed);

    console.log(`✅ Passed: ${passedTests.length}/${results.length} tests`);
    console.log(`❌ Failed: ${failedTests.length}/${results.length} tests`);

    if (failedTests.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        failedTests.forEach(test => {
            console.log(`   - ${test.testName}`);
            if (test.error) console.log(`     Error: ${test.error}`);
            if (test.details) console.log(`     Details:`, test.details);
        });
    }

    console.log('\n✅ PASSED TESTS:');
    passedTests.forEach(test => {
        console.log(`   - ${test.testName}`);
    });

    // Final assessment
    const successRate = (passedTests.length / results.length) * 100;
    console.log(`\n🎯 SUCCESS RATE: ${successRate.toFixed(1)}%`);

    if (successRate === 100) {
        console.log('🎉 ALL TESTS PASSED - IMPLEMENTATION IS ROBUST!');
    } else if (successRate >= 90) {
        console.log('⚠️ MOSTLY PASSED - MINOR ISSUES DETECTED');
    } else {
        console.log('❌ SIGNIFICANT ISSUES DETECTED - NEEDS ATTENTION');
    }
}

// Export for external use
export { runComprehensiveTests };

// Run tests if this file is executed directly
if (require.main === module) {
    runComprehensiveTests().catch(console.error);
}
