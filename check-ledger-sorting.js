/**
 * Test script to check CustomerLedger sorting and balance calculation
 * Run this in browser console on the CustomerLedgerViewer page
 */

// Function to check sorting and balance calculation
function checkLedgerSorting() {
    console.log('🔍 Checking CustomerLedgerViewer Sorting and Balance Calculation...\n');

    // Get transaction data from the page
    const transactionRows = document.querySelectorAll('tbody tr[class*="hover:bg-gray-50"]');

    if (transactionRows.length === 0) {
        console.log('❌ No transaction rows found. Make sure you\'re on the CustomerLedgerViewer page with data.');
        return;
    }

    console.log(`📊 Found ${transactionRows.length} transaction rows\n`);

    let transactions = [];
    let previousBalance = null;
    let sortingIssues = [];
    let balanceIssues = [];
    let previousDateTime = null;

    transactionRows.forEach((row, index) => {
        try {
            // Extract data from the row
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return;

            const dateTimeText = cells[0].textContent.trim();
            const descriptionText = cells[1].textContent.trim();
            const referenceText = cells[2].textContent.trim();
            const debitText = cells[3].textContent.trim();
            const creditText = cells[4].textContent.trim();
            const balanceText = cells[5].textContent.trim();

            // Parse date and time
            const dateTimeParts = dateTimeText.split('\n');
            const dateStr = dateTimeParts[0];
            const timeStr = dateTimeParts[1] || '00:00:00';

            // Create full datetime for comparison
            const fullDateTime = new Date(`${dateStr} ${timeStr}`);

            // Parse amounts
            const debitAmount = debitText === '-' ? 0 : parseFloat(debitText.replace(/,/g, ''));
            const creditAmount = creditText === '-' ? 0 : parseFloat(creditText.replace(/,/g, ''));
            const balanceAmount = parseFloat(balanceText.replace(/,/g, ''));

            const transaction = {
                index: index + 1,
                date: dateStr,
                time: timeStr,
                fullDateTime,
                description: descriptionText,
                reference: referenceText,
                debitAmount,
                creditAmount,
                balanceAmount,
                balanceChange: debitAmount - creditAmount
            };

            transactions.push(transaction);

            // Check sorting (should be newest first)
            if (previousDateTime && fullDateTime > previousDateTime) {
                sortingIssues.push({
                    index: index + 1,
                    current: fullDateTime.toISOString(),
                    previous: previousDateTime.toISOString(),
                    issue: 'Transaction is newer than previous (should be oldest to newest or newest to oldest consistently)'
                });
            }

            // Check balance calculation
            if (previousBalance !== null) {
                const expectedBalance = previousBalance + transaction.balanceChange;
                const balanceDifference = Math.abs(expectedBalance - balanceAmount);

                if (balanceDifference > 0.01) { // Allow for small rounding differences
                    balanceIssues.push({
                        index: index + 1,
                        expected: expectedBalance,
                        actual: balanceAmount,
                        difference: balanceDifference,
                        previousBalance,
                        balanceChange: transaction.balanceChange
                    });
                }
            }

            previousDateTime = fullDateTime;
            previousBalance = balanceAmount;

        } catch (error) {
            console.error(`Error processing row ${index + 1}:`, error);
        }
    });

    // Report findings
    console.log('📅 SORTING ANALYSIS:');
    console.log('===================');

    if (sortingIssues.length === 0) {
        console.log('✅ Sorting appears to be consistent');

        // Check if it's newest first or oldest first
        if (transactions.length >= 2) {
            const firstDateTime = transactions[0].fullDateTime;
            const lastDateTime = transactions[transactions.length - 1].fullDateTime;

            if (firstDateTime > lastDateTime) {
                console.log('📅 Sorting order: NEWEST FIRST (descending)');
            } else {
                console.log('📅 Sorting order: OLDEST FIRST (ascending)');
            }
        }
    } else {
        console.log(`❌ Found ${sortingIssues.length} sorting issues:`);
        sortingIssues.forEach(issue => {
            console.log(`   Row ${issue.index}: ${issue.issue}`);
            console.log(`     Current: ${issue.current}`);
            console.log(`     Previous: ${issue.previous}`);
        });
    }

    console.log('\n💰 BALANCE CALCULATION ANALYSIS:');
    console.log('=================================');

    if (balanceIssues.length === 0) {
        console.log('✅ Balance calculations appear to be correct');

        // Show sample calculations
        if (transactions.length >= 3) {
            console.log('\n📊 Sample balance progression:');
            transactions.slice(0, 5).forEach(tx => {
                console.log(`   ${tx.date} ${tx.time}: ${tx.description.substring(0, 30)}... | Debit: ${tx.debitAmount} | Credit: ${tx.creditAmount} | Balance: ${tx.balanceAmount}`);
            });
        }
    } else {
        console.log(`❌ Found ${balanceIssues.length} balance calculation issues:`);
        balanceIssues.forEach(issue => {
            console.log(`   Row ${issue.index}:`);
            console.log(`     Previous Balance: ${issue.previousBalance}`);
            console.log(`     Balance Change: ${issue.balanceChange}`);
            console.log(`     Expected Balance: ${issue.expected}`);
            console.log(`     Actual Balance: ${issue.actual}`);
            console.log(`     Difference: ${issue.difference}`);
        });
    }

    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log('======================');
    console.log(`Total Transactions: ${transactions.length}`);
    console.log(`Date Range: ${transactions[transactions.length - 1]?.date} to ${transactions[0]?.date}`);
    console.log(`Total Debits: ${transactions.reduce((sum, tx) => sum + tx.debitAmount, 0).toLocaleString()}`);
    console.log(`Total Credits: ${transactions.reduce((sum, tx) => sum + tx.creditAmount, 0).toLocaleString()}`);
    console.log(`Final Balance: ${transactions[0]?.balanceAmount?.toLocaleString()}`);
    console.log(`Sorting Issues: ${sortingIssues.length}`);
    console.log(`Balance Issues: ${balanceIssues.length}`);

    return {
        transactions,
        sortingIssues,
        balanceIssues,
        isValid: sortingIssues.length === 0 && balanceIssues.length === 0
    };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    console.log('🚀 Customer Ledger Sorting & Balance Checker loaded!');
    console.log('📋 Run checkLedgerSorting() to analyze the current page');

    // Make function globally available
    window.checkLedgerSorting = checkLedgerSorting;
} else {
    // Export for Node.js usage
    module.exports = { checkLedgerSorting };
}
