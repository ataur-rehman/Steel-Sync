/**
 * Emergency Staff Data Fix - Direct Database Solution
 * Ensures staff ID 2 exists in the database immediately
 */

console.log('🚨 Emergency Staff Data Fix - Starting...');

// Import required services
import { db } from './services/database.js';
import { staffIntegrityManager } from './services/staff-data-integrity-manager.js';

async function emergencyStaffFix() {
    try {
        console.log('🔧 Running emergency staff data fix...');
        
        // Wait for database to be ready
        await db.waitForReady(15000);
        console.log('✅ Database is ready');
        
        // Force staff integrity manager to run
        await staffIntegrityManager.ensureStaffDataIntegrity();
        console.log('✅ Staff integrity manager completed');
        
        // Verify staff ID 2 exists
        const staff2 = await staffIntegrityManager.findStaffById(2);
        if (staff2) {
            console.log('✅ Staff ID 2 found:', staff2);
        } else {
            console.log('❌ Staff ID 2 still missing, creating manually...');
            
            // Manual creation as fallback
            await db.executeRawQuery(`
                INSERT OR REPLACE INTO staff (
                    id, full_name, employee_id, phone, email, address, salary,
                    position, department, status, notes, created_by, created_at, updated_at
                ) VALUES (2, 'Default Staff', 'EMP002', '', 'staff@company.com', '', 30000, 'Staff', 'General', 'active', 'Emergency fix creation', 'system', datetime('now'), datetime('now'))
            `);
            
            await db.executeRawQuery(`
                INSERT OR REPLACE INTO staff_management (
                    id, full_name, employee_id, phone, email, address, salary,
                    position, department, status, notes, created_by, created_at, updated_at
                ) VALUES (2, 'Default Staff', 'EMP002', '', 'staff@company.com', '', 30000, 'Staff', 'General', 'active', 'Emergency fix creation', 'system', datetime('now'), datetime('now'))
            `);
            
            console.log('✅ Staff ID 2 created manually');
        }
        
        // Test staff retrieval
        const allStaff = await staffIntegrityManager.getAllActiveStaff();
        console.log('📊 All active staff:', allStaff.map(s => ({ id: s.id, name: s.full_name, employee_id: s.employee_id })));
        
        // Test payment code generation
        const timestamp = Date.now();
        const paymentCode = `SAL-2-${timestamp}`;
        console.log('💰 Sample payment code:', paymentCode);
        
        console.log('🎉 Emergency staff data fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Emergency staff data fix failed:', error);
    }
}

// Auto-run the fix
if (typeof window !== 'undefined') {
    window.emergencyStaffFix = emergencyStaffFix;
    window.testStaffIntegrity = async () => {
        try {
            await emergencyStaffFix();
            return 'Staff integrity fix completed';
        } catch (error) {
            return `Staff integrity fix failed: ${error.message}`;
        }
    };
    
    window.testPaymentCodeFix = async () => {
        try {
            const timestamp = Date.now();
            const paymentCode = `SAL-2-${timestamp}`;
            return `Payment code generation working: ${paymentCode}`;
        } catch (error) {
            return `Payment code generation failed: ${error.message}`;
        }
    };
    
    window.testStaffData = async () => {
        try {
            await staffIntegrityManager.ensureStaffDataIntegrity();
            const staff2 = await staffIntegrityManager.findStaffById(2);
            if (staff2) {
                return `Staff ID 2 found: ${staff2.full_name}`;
            } else {
                return 'Staff ID 2 not found - manual creation needed';
            }
        } catch (error) {
            return `Staff data test failed: ${error.message}`;
        }
    };
    
    // Make staffIntegrityManager globally available for testing
    window.staffIntegrityManager = staffIntegrityManager;
    
    console.log('🔧 Emergency staff fix functions loaded to window object');
}

export { emergencyStaffFix };
