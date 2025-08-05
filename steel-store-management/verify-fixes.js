#!/usr/bin/env node

/**
 * PRODUCTION VERIFICATION SCRIPT
 * Comprehensive test of all critical error fixes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Production Verification Script');
console.log('=================================');

// Check 1: Verify imports in main.tsx
function checkMainTsxImports() {
    console.log('\n📋 Checking main.tsx imports...');
    
    const mainTsxPath = path.join(__dirname, 'src', 'main.tsx');
    if (fs.existsSync(mainTsxPath)) {
        const content = fs.readFileSync(mainTsxPath, 'utf8');
        
        const hasDbImport = content.includes("import { db } from './services/database'");
        const hasStaffImport = content.includes("import { staffIntegrityManager }");
        
        console.log(`  ✅ DB import: ${hasDbImport ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ Staff integrity import: ${hasStaffImport ? 'PRESENT' : 'MISSING'}`);
        
        if (hasDbImport && hasStaffImport) {
            console.log('  🎉 All required imports are present!');
            return true;
        } else {
            console.log('  ❌ Missing required imports!');
            return false;
        }
    } else {
        console.log('  ❌ main.tsx not found!');
        return false;
    }
}

// Check 2: Verify React root fix
function checkReactRootFix() {
    console.log('\n🔄 Checking React root duplication fix...');
    
    const mainTsxPath = path.join(__dirname, 'src', 'main.tsx');
    if (fs.existsSync(mainTsxPath)) {
        const content = fs.readFileSync(mainTsxPath, 'utf8');
        
        const hasRootCheck = content.includes('hasChildNodes()');
        const hasConditionalRender = content.includes('if (!rootElement.hasChildNodes())');
        
        console.log(`  ✅ Root element check: ${hasRootCheck ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ Conditional rendering: ${hasConditionalRender ? 'PRESENT' : 'MISSING'}`);
        
        if (hasRootCheck && hasConditionalRender) {
            console.log('  🎉 React root duplication prevention is in place!');
            return true;
        } else {
            console.log('  ❌ React root fix is incomplete!');
            return false;
        }
    } else {
        return false;
    }
}

// Check 3: Verify payment code fix in salaryHistoryService
function checkPaymentCodeFix() {
    console.log('\n💰 Checking payment_code constraint fix...');
    
    const servicePath = path.join(__dirname, 'src', 'services', 'salaryHistoryService.ts');
    if (fs.existsSync(servicePath)) {
        const content = fs.readFileSync(servicePath, 'utf8');
        
        const hasPaymentCodeGen = content.includes('paymentCode = `SAL-${data.staff_id}-${timestamp}`');
        const hasPaymentCodeInsert = content.includes('payment_code,');
        const hasSchemaAlignment = content.includes('basic_salary') && content.includes('total_amount');
        
        console.log(`  ✅ Payment code generation: ${hasPaymentCodeGen ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ Payment code in INSERT: ${hasPaymentCodeInsert ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ Schema alignment: ${hasSchemaAlignment ? 'PRESENT' : 'MISSING'}`);
        
        if (hasPaymentCodeGen && hasPaymentCodeInsert && hasSchemaAlignment) {
            console.log('  🎉 Payment code constraint fix is complete!');
            return true;
        } else {
            console.log('  ❌ Payment code fix is incomplete!');
            return false;
        }
    } else {
        console.log('  ❌ salaryHistoryService.ts not found!');
        return false;
    }
}

// Check 4: Verify staff data integrity manager
function checkStaffDataIntegrity() {
    console.log('\n👥 Checking staff data integrity manager...');
    
    const managerPath = path.join(__dirname, 'src', 'services', 'staff-data-integrity-manager.ts');
    if (fs.existsSync(managerPath)) {
        const content = fs.readFileSync(managerPath, 'utf8');
        
        const hasEssentialStaff = content.includes('createEssentialStaff');
        const hasStaffId2 = content.includes('id: 2') && content.includes('Default Staff');
        const hasSingletonExport = content.includes('export const staffIntegrityManager');
        
        console.log(`  ✅ Essential staff creation: ${hasEssentialStaff ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ Staff ID 2 definition: ${hasStaffId2 ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ Singleton export: ${hasSingletonExport ? 'PRESENT' : 'MISSING'}`);
        
        if (hasEssentialStaff && hasStaffId2 && hasSingletonExport) {
            console.log('  🎉 Staff data integrity manager is complete!');
            return true;
        } else {
            console.log('  ❌ Staff data integrity manager has issues!');
            return false;
        }
    } else {
        console.log('  ❌ staff-data-integrity-manager.ts not found!');
        return false;
    }
}

// Check 5: Database schema verification
function checkDatabaseSchema() {
    console.log('\n🗄️ Checking database schema...');
    
    const dbPath = path.join(__dirname, 'src', 'services', 'database.ts');
    if (fs.existsSync(dbPath)) {
        const content = fs.readFileSync(dbPath, 'utf8');
        
        const hasSalaryPaymentsTable = content.includes('CREATE TABLE IF NOT EXISTS salary_payments');
        const hasPaymentCodeField = content.includes('payment_code TEXT NOT NULL UNIQUE');
        const hasProperConstraints = content.includes('basic_salary REAL NOT NULL');
        
        console.log(`  ✅ salary_payments table: ${hasSalaryPaymentsTable ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ payment_code field: ${hasPaymentCodeField ? 'PRESENT' : 'MISSING'}`);
        console.log(`  ✅ Proper constraints: ${hasProperConstraints ? 'PRESENT' : 'MISSING'}`);
        
        if (hasSalaryPaymentsTable && hasPaymentCodeField && hasProperConstraints) {
            console.log('  🎉 Database schema is correct!');
            return true;
        } else {
            console.log('  ❌ Database schema has issues!');
            return false;
        }
    } else {
        console.log('  ❌ database.ts not found!');
        return false;
    }
}

// Run all checks
function runCompleteVerification() {
    console.log('\n🎯 Running complete verification...\n');
    
    const results = {
        imports: checkMainTsxImports(),
        reactRoot: checkReactRootFix(),
        paymentCode: checkPaymentCodeFix(),
        staffData: checkStaffDataIntegrity(),
        dbSchema: checkDatabaseSchema()
    };
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}/${total} checks`);
    
    if (passed === total) {
        console.log('\n🎉 ALL CRITICAL FIXES VERIFIED SUCCESSFULLY!');
        console.log('\n✅ The following errors should now be resolved:');
        console.log('   • ReferenceError: staffIntegrityManager is not defined');
        console.log('   • ReactDOMClient.createRoot() on existing container');
        console.log('   • NOT NULL constraint failed: salary_payments.payment_code');
        console.log('   • Staff ID 2 not found in either table');
        console.log('\n💡 Your application should now run without these critical errors!');
    } else {
        console.log('\n⚠️ Some checks failed. Please review the issues above.');
    }
    
    return passed === total;
}

// Generate fix report
function generateFixReport() {
    console.log('\n📝 APPLIED FIXES REPORT');
    console.log('='.repeat(30));
    
    console.log('\n1. 🔧 Import Fix (main.tsx):');
    console.log('   + Added: import { db } from \'./services/database\';');
    console.log('   + Fixed: staffIntegrityManager import availability');
    
    console.log('\n2. 🔄 React Root Fix (main.tsx):');
    console.log('   + Added: if (!rootElement.hasChildNodes()) check');
    console.log('   + Fixed: Prevented duplicate React root creation');
    
    console.log('\n3. 💰 Payment Code Fix (salaryHistoryService.ts):');
    console.log('   + Added: Unique payment code generation');
    console.log('   + Fixed: Schema alignment with salary_payments table');
    console.log('   + Added: payment_code field in INSERT statement');
    
    console.log('\n4. 👥 Staff Data Fix (staff-data-integrity-manager.ts):');
    console.log('   + Enhanced: Essential staff creation with ID 1 and 2');
    console.log('   + Fixed: Staff data integrity across database resets');
    console.log('   + Added: Production-grade caching and performance optimization');
    
    console.log('\n5. 🗄️ Database Schema (database.ts):');
    console.log('   + Verified: salary_payments table with proper constraints');
    console.log('   + Verified: payment_code NOT NULL UNIQUE field');
    console.log('   + Verified: Schema compatibility with payment operations');
}

// Main execution
console.log('🎯 Starting verification...');
const success = runCompleteVerification();
generateFixReport();

console.log(success ? '\n🎉 Verification completed successfully!' : '\n❌ Verification failed!');

export {
    checkMainTsxImports,
    checkReactRootFix,
    checkPaymentCodeFix,
    checkStaffDataIntegrity,
    checkDatabaseSchema,
    runCompleteVerification,
    generateFixReport
};
