// /**
//  * Simple Backup System Test
//  * Quick test to validate backup system components
//  */

// export interface TestResult {
//     name: string;
//     success: boolean;
//     duration: number;
//     message: string;
//     details?: any;
// }

// export async function runBasicBackupTests(): Promise<TestResult[]> {
//     const results: TestResult[] = [];
//     console.log('🧪 Running Basic Backup System Tests...\n');

//     // Test 1: Environment Service
//     try {
//         const startTime = Date.now();
//         const { environmentService } = await import('./environment');
//         await environmentService.initialize();

//         const config = environmentService.getConfig();
//         const hasBasicConfig = !!(config && config.backup);

//         results.push({
//             name: 'Environment Service',
//             success: hasBasicConfig,
//             duration: Date.now() - startTime,
//             message: hasBasicConfig ? 'Environment service initialized' : 'Environment service failed',
//             details: { hasConfig: hasBasicConfig }
//         });
//     } catch (error) {
//         results.push({
//             name: 'Environment Service',
//             success: false,
//             duration: 0,
//             message: `Failed: ${error}`,
//         });
//     }

//     // Test 2: Backup Integration
//     try {
//         const startTime = Date.now();
//         const { backupIntegration } = await import('../backup-integration');

//         const isInitialized = backupIntegration.isInitialized();

//         results.push({
//             name: 'Backup Integration',
//             success: true,
//             duration: Date.now() - startTime,
//             message: 'Backup integration service accessible',
//             details: { isInitialized }
//         });
//     } catch (error) {
//         results.push({
//             name: 'Backup Integration',
//             success: false,
//             duration: 0,
//             message: `Failed: ${error}`,
//         });
//     }

//     // Test 3: Backup Configuration
//     try {
//         const startTime = Date.now();
//         const { BackupConfigManager } = await import('./config');
//         const configManager = BackupConfigManager.getInstance();

//         const config = configManager.getConfig();
//         const hasValidConfig = !!(config && config.providers);

//         results.push({
//             name: 'Backup Configuration',
//             success: hasValidConfig,
//             duration: Date.now() - startTime,
//             message: hasValidConfig ? 'Configuration manager working' : 'Configuration manager failed',
//             details: {
//                 hasConfig: hasValidConfig,
//                 providers: config?.providers ? Object.keys(config.providers) : []
//             }
//         });
//     } catch (error) {
//         results.push({
//             name: 'Backup Configuration',
//             success: false,
//             duration: 0,
//             message: `Failed: ${error}`,
//         });
//     }

//     // Test 4: Encryption Test (Simple)
//     try {
//         const startTime = Date.now();

//         // Test Web Crypto API availability
//         const hasWebCrypto = !!(window.crypto && window.crypto.subtle);
//         const testData = new TextEncoder().encode('test data');

//         if (hasWebCrypto) {
//             // Simple encryption test using Web Crypto directly
//             const key = await window.crypto.subtle.generateKey(
//                 { name: 'AES-GCM', length: 256 },
//                 true,
//                 ['encrypt', 'decrypt']
//             );

//             const iv = window.crypto.getRandomValues(new Uint8Array(12));
//             const encrypted = await window.crypto.subtle.encrypt(
//                 { name: 'AES-GCM', iv },
//                 key,
//                 testData
//             );

//             const decrypted = await window.crypto.subtle.decrypt(
//                 { name: 'AES-GCM', iv },
//                 key,
//                 encrypted
//             );

//             const decryptedText = new TextDecoder().decode(decrypted);
//             const success = decryptedText === 'test data';

//             results.push({
//                 name: 'Encryption Test',
//                 success,
//                 duration: Date.now() - startTime,
//                 message: success ? 'Web Crypto API working' : 'Encryption test failed',
//                 details: {
//                     hasWebCrypto,
//                     encryptedSize: encrypted.byteLength,
//                     originalSize: testData.length
//                 }
//             });
//         } else {
//             results.push({
//                 name: 'Encryption Test',
//                 success: false,
//                 duration: Date.now() - startTime,
//                 message: 'Web Crypto API not available',
//             });
//         }
//     } catch (error) {
//         results.push({
//             name: 'Encryption Test',
//             success: false,
//             duration: 0,
//             message: `Failed: ${error}`,
//         });
//     }

//     // Test 5: Local Storage Test
//     try {
//         const startTime = Date.now();
//         const testKey = 'backup-system-test';
//         const testValue = 'test-data-' + Date.now();

//         // Test localStorage
//         localStorage.setItem(testKey, testValue);
//         const retrieved = localStorage.getItem(testKey);
//         localStorage.removeItem(testKey);

//         const success = retrieved === testValue;

//         results.push({
//             name: 'Local Storage Test',
//             success,
//             duration: Date.now() - startTime,
//             message: success ? 'Local storage working' : 'Local storage failed',
//         });
//     } catch (error) {
//         results.push({
//             name: 'Local Storage Test',
//             success: false,
//             duration: 0,
//             message: `Failed: ${error}`,
//         });
//     }

//     // Print results
//     console.log('\n📊 Test Results:');
//     results.forEach(result => {
//         const icon = result.success ? '✅' : '❌';
//         console.log(`${icon} ${result.name} (${result.duration}ms): ${result.message}`);
//         if (result.details) {
//             console.log(`   Details:`, result.details);
//         }
//     });

//     const passed = results.filter(r => r.success).length;
//     const total = results.length;
//     console.log(`\n🎯 Summary: ${passed}/${total} tests passed (${((passed / total) * 100).toFixed(1)}%)`);

//     return results;
// }

// // Test function for individual components
// export async function testEnvironmentService(): Promise<boolean> {
//     try {
//         const { environmentService } = await import('./environment');
//         await environmentService.initialize();
//         return true;
//     } catch (error) {
//         console.error('Environment service test failed:', error);
//         return false;
//     }
// }

// export async function testBackupIntegration(): Promise<boolean> {
//     try {
//       //  const { backupIntegration } = await import('../backup-integration');
//        // return backupIntegration.isInitialized();
//     } catch (error) {
//         console.error('Backup integration test failed:', error);
//         return false;
//     }
// }

// // Quick health check
// export async function quickHealthCheck(): Promise<{
//     overall: boolean;
//     environment: boolean;
//     integration: boolean;
//     crypto: boolean;
// }> {
//     const environment = await testEnvironmentService();
//     const integration = await testBackupIntegration();
//     const crypto = !!(window.crypto && window.crypto.subtle);

//     return {
//         overall: environment && integration && crypto,
//         environment,
//         integration,
//         crypto
//     };
// }
