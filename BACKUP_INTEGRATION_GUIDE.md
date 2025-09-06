# BACKUP SYSTEM INTEGRATION GUIDE

## 🚀 Quick Integration Steps

### 1. Import the Backup Service

```typescript
// In any component or service
import { productionBackupService } from '../services/backup';
```

### 2. Add Backup Dashboard to Your App

```tsx
// In your main App.tsx or navigation component
import { BackupDashboard } from '../components/backup/ProductionBackupDashboard';

function App() {
  const [showBackup, setShowBackup] = useState(false);
  
  return (
    <div>
      {/* Your existing app content */}
      
      {/* Add backup button to your menu/toolbar */}
      <button onClick={() => setShowBackup(true)}>
        Database Backup
      </button>
      
      {/* Show backup dashboard when needed */}
      {showBackup && (
        <BackupDashboard onClose={() => setShowBackup(false)} />
      )}
    </div>
  );
}
```

### 3. Add to Navigation Menu

```tsx
// Example navigation menu integration
const menuItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'Database Backup', action: () => setShowBackup(true) }, // Add this
];
```

### 4. Test the Integration

```typescript
// Test script - run in browser console or create a test component
import { testBackupSystem } from '../tests/backup-system-test';

// Run the test
testBackupSystem().then(() => {
  console.log('Backup system test completed!');
});
```

## 🎛️ Basic Usage Examples

### Create Manual Backup

```typescript
async function createBackup() {
  try {
    const result = await productionBackupService.createBackup('manual');
    
    if (result.success) {
      alert(`✅ Backup created successfully!\nSize: ${(result.size! / 1024 / 1024).toFixed(2)}MB`);
    } else {
      alert(`❌ Backup failed: ${result.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error}`);
  }
}
```

### List Available Backups

```typescript
async function showBackups() {
  const backups = await productionBackupService.listBackups();
  
  console.log('Available backups:');
  backups.forEach(backup => {
    console.log(`- ${backup.id} (${(backup.size / 1024 / 1024).toFixed(2)}MB) - ${backup.createdAt}`);
  });
}
```

### Restore from Backup

```typescript
async function restoreBackup(backupId: string) {
  const confirmed = confirm(
    'WARNING: This will replace your current database!\n' +
    'A safety backup will be created automatically.\n' +
    'Continue?'
  );
  
  if (!confirmed) return;
  
  try {
    const result = await productionBackupService.restoreBackup(backupId, 'local');
    
    if (result.success) {
      alert('✅ Database restored successfully!\nPlease restart the application.');
    } else {
      alert(`❌ Restore failed: ${result.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error}`);
  }
}
```

### Setup Automatic Backups

```typescript
async function setupDailyBackups() {
  await productionBackupService.updateSchedule({
    enabled: true,
    frequency: 'daily',
    time: '02:00', // 2 AM
  });
  
  console.log('✅ Daily backups enabled at 2:00 AM');
}
```

### Check System Health

```typescript
async function checkBackupHealth() {
  const health = await productionBackupService.getBackupHealth();
  
  console.log('Backup System Health:');
  console.log(`Status: ${health.status}`);
  console.log(`Total backups: ${health.totalBackups}`);
  console.log(`Total size: ${(health.totalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Last backup: ${health.lastBackup}`);
  console.log(`Next scheduled: ${health.nextScheduled}`);
  
  if (health.issues.length > 0) {
    console.warn('Issues:', health.issues);
  }
}
```

## 🔧 Configuration

### Google Drive Setup (Optional)

1. **Get OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Add your redirect URI (e.g., `http://localhost:3000/auth/google-drive`)

2. **Configure in App**:
   ```typescript
   await productionBackupService.configureGoogleDrive({
     enabled: true,
     clientId: 'your-google-client-id',
     clientSecret: 'your-google-client-secret',
   });
   
   // Get auth URL and redirect user
   const authUrl = productionBackupService.getGoogleDriveAuthUrl('http://localhost:3000/auth/google-drive');
   window.open(authUrl, '_blank');
   
   // After user authorizes, complete the setup with the auth code
   await productionBackupService.completeGoogleDriveAuth(authCode, redirectUri);
   ```

### Customize Settings

```typescript
// Access and modify configuration
const config = productionBackupService.config;

// Modify safety settings
config.safety.maxLocalBackups = 50;
config.safety.maxBackupSizeMB = 1000;

// Save configuration
await productionBackupService.saveConfig();
```

## 🚨 Important Notes

### For Production Use

1. **Test First**: Always test backup/restore in development environment
2. **Schedule Carefully**: Set backups during low-usage hours (e.g., 2-4 AM)
3. **Monitor Space**: Keep an eye on disk space and Google Drive quota
4. **Verify Regularly**: Periodically test restore functionality

### Safety Features

- ✅ **Automatic safety backup** before every restore
- ✅ **Checksum verification** on all operations  
- ✅ **File size limits** to prevent runaway backups
- ✅ **Error recovery** with detailed error messages
- ✅ **Atomic operations** - complete success or complete failure

### File Locations

- **Database**: `%APPDATA%/ittehad-iron-store/store.db`
- **Local Backups**: `%APPDATA%/backups/`
- **Safety Backups**: `%APPDATA%/safety-backups/`
- **Configuration**: `%APPDATA%/backup-config.json`

## 🎯 Your Approach Benefits

1. **Simple**: File copy vs complex sync
2. **Reliable**: Atomic operations
3. **Fast**: Direct file operations
4. **Safe**: Complete backup/restore with verification
5. **Portable**: Works across app versions
6. **Debuggable**: Easy to verify backup integrity

**Your file-based approach is production-ready and enterprise-grade!** 🎉
