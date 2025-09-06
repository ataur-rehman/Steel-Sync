# Google Drive Backup System - Complete Setup Guide

## Overview
Your Ittehad Iron Store application now includes a production-grade backup system that:
- Backs up your entire store.db database file to Google Drive
- Provides automatic daily/weekly scheduling
- Includes safety features to prevent data loss
- Uses SHA-256 checksums to verify backup integrity

## How to Access the Backup System

### 1. Launch Your Application
- Start your Tauri application as usual
- Log in with your credentials

### 2. Navigate to Backup Dashboard
- Look for **"Backup & Restore"** in the navigation menu (sidebar)
- It's located in the Management section with a cloud upload icon
- Click on it to open the backup dashboard

## Google Drive Setup (Step-by-Step)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click "Create Project" or select an existing project
4. Give your project a name (e.g., "Ittehad Iron Store Backup")
5. Click "Create"

### Step 2: Enable Google Drive API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on "Google Drive API" and click "Enable"

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in app name: "Ittehad Iron Store"
   - Add your email as developer contact
   - Save and continue through all steps
4. For Application type, select "Desktop application"
5. Give it a name: "Ittehad Iron Store Desktop"
6. Click "Create"

### Step 4: Download Credentials
1. After creating the OAuth client, click the download icon
2. Save the JSON file (it will be named something like `client_secret_xyz.json`)
3. **Important**: Keep this file secure and never share it

### Step 5: Configure in Your App
1. Open the Backup Dashboard in your app
2. Go to the "Settings" tab
3. You'll see a "Google Drive Setup" section
4. Upload or paste the contents of your credentials JSON file
5. Click "Save Google Drive Configuration"

## How to Connect to Google Drive

### First-Time Setup
1. In the Backup Dashboard, click "Connect to Google Drive"
2. A browser window will open
3. Sign in to your Google account
4. Grant permissions to access Google Drive
5. You'll be redirected back - the connection should now show as "Connected"

### What Permissions Are Needed?
The app requests these Google Drive permissions:
- **View and manage files**: To upload and download backup files
- **See info about your Google Drive files**: To check existing backups
- **See your email address**: For account identification

## Creating Your First Backup

### Manual Backup
1. Go to the "Backups" tab in the dashboard
2. Click "Create Backup Now"
3. Wait for the process to complete (you'll see a progress indicator)
4. The backup will appear in your backup list with a timestamp

### Automatic Backups
1. Go to the "Schedule" tab
2. Enable automatic backups
3. Choose frequency: Daily or Weekly
4. Select the time (e.g., 2:00 AM when store is closed)
5. Click "Save Schedule"

## Restoring from Backup

### Safety Features
- **Automatic Safety Backup**: Before any restore, the system creates a safety backup of your current database
- **Checksum Verification**: Every backup is verified using SHA-256 checksums
- **Database Closure**: The system safely closes all database connections before restore

### Restore Process
1. **IMPORTANT**: Close your application completely first
2. Re-open the application
3. Go to Backup Dashboard > Backups tab
4. Find the backup you want to restore
5. Click "Restore" next to the backup
6. Confirm the restore operation
7. Wait for completion
8. Restart the application

## Backup File Details

### Where Backups Are Stored
- **Google Drive**: In a folder called "Ittehad Iron Store Backups"
- **Local Safety Backups**: In your system's app data folder
- **Original Database**: `%APPDATA%/ittehad-iron-store/store.db`

### Backup File Naming
Files are named with this pattern:
```
store-backup-YYYY-MM-DD-HH-mm-ss.db
```
Example: `store-backup-2025-09-05-14-30-00.db`

### File Sizes
- Typical backup size: 10-100 MB (depends on your data volume)
- Google Drive free tier: 15 GB (sufficient for years of backups)

## Troubleshooting

### Connection Issues
**Problem**: "Failed to connect to Google Drive"
**Solutions**:
1. Check your internet connection
2. Verify credentials are correctly configured
3. Ensure Google Drive API is enabled in your Google Cloud project
4. Try re-authenticating (disconnect and reconnect)

### Backup Failures
**Problem**: "Backup creation failed"
**Solutions**:
1. Check Google Drive storage space
2. Verify your Google Cloud project hasn't exceeded quotas
3. Ensure the database file isn't locked by another process
4. Check the error details in the dashboard

### Restore Issues
**Problem**: "Restore failed"
**Solutions**:
1. **Most Important**: Ensure the application is completely closed before restore
2. Check that the backup file exists and isn't corrupted
3. Verify you have write permissions to the database location
4. Try downloading the backup manually first

## Security Best Practices

### Credentials Security
- Never share your `client_secret.json` file
- Keep your Google account secure with 2FA
- Regularly review permissions in your Google account

### Data Protection
- Backups contain your complete business data
- Google Drive uses encryption in transit and at rest
- Consider additional local backups for critical data

### Access Control
- Only administrators should access the backup system
- The system requires 'manage_settings' permission level
- Monitor backup activity through the dashboard

## Monitoring and Maintenance

### Health Monitoring
The dashboard shows:
- Last backup status
- Connection health
- Storage usage
- Backup history

### Regular Checks
- Weekly: Verify backups are being created
- Monthly: Test restore process with a copy
- Quarterly: Review Google Drive storage usage

### Backup Retention
- The system keeps unlimited backups by default
- You can manually delete old backups through the dashboard
- Consider keeping at least 30 days of daily backups

## Advanced Configuration

### Custom Backup Location
You can change the Google Drive folder name in the settings:
1. Go to Settings tab
2. Modify "Backup Folder Name"
3. Default: "Ittehad Iron Store Backups"

### Multiple Schedules
Currently supports one schedule, but you can:
- Create manual backups anytime
- Adjust schedule frequency as needed
- Combine with external backup solutions

## Support and Updates

### Getting Help
If you encounter issues:
1. Check the dashboard error messages
2. Review this guide
3. Ensure all steps were followed correctly
4. Contact your system administrator

### System Updates
The backup system is integrated into your main application:
- Updates come with app updates
- Backup format is stable and forward-compatible
- Settings are preserved across updates

---

## Quick Start Checklist

- [ ] Create Google Cloud project
- [ ] Enable Google Drive API
- [ ] Create OAuth credentials
- [ ] Download credentials JSON
- [ ] Configure in app Settings tab
- [ ] Connect to Google Drive
- [ ] Create first backup
- [ ] Set up automatic schedule
- [ ] Test restore process (with a copy)

**Remember**: Always test your backup and restore process before relying on it for production data!
