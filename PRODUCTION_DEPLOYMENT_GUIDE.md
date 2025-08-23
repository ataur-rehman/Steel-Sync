# 🚀 Ittehad Iron Store - Production Deployment Guide

## 📋 Overview
This guide covers building, distributing, and updating your Ittehad Iron Store application for production use.

## 🛠️ Building for Production

### Prerequisites
- Node.js 20.19.0+ or 22.12.0+
- Rust 1.77.2+
- Tauri CLI installed globally: `npm install -g @tauri-apps/cli`

### Build Commands

#### 1. **Full Production Build**
```bash
npm run build-production
```
This creates optimized builds for all platforms.

#### 2. **Windows Installer Only**
```bash
npm run build-installer
```
Creates `.msi` installer for Windows.

#### 3. **Debug Build (for testing)**
```bash
npm run tauri-build-debug
```

### Build Outputs
After building, you'll find files in `src-tauri/target/release/bundle/`:

- **Windows**: 
  - `Ittehad Iron Store_1.0.0_x64_en-US.msi` (Installer)
  - `Ittehad Iron Store_1.0.0_x64.exe` (Portable)
- **macOS**: 
  - `Ittehad Iron Store.app` (Application bundle)
  - `Ittehad Iron Store_1.0.0_aarch64.dmg` (Disk image)
- **Linux**: 
  - `ittehad-iron-store_1.0.0_amd64.deb` (Debian package)
  - `ittehad-iron-store-1.0.0-1.x86_64.rpm` (RPM package)

## 📦 Distribution to Clients

### Option 1: Direct File Sharing
1. Build the application using production commands
2. Share the appropriate installer file:
   - **Windows clients**: Send the `.msi` file
   - **macOS clients**: Send the `.dmg` file
   - **Linux clients**: Send the `.deb` or `.rpm` file

### Option 2: Cloud Distribution
Upload builds to:
- Google Drive / OneDrive / Dropbox
- Your company website
- GitHub Releases (if using version control)

### Installation Instructions for Clients

#### Windows (`.msi` installer):
1. Download the `.msi` file
2. Right-click and select "Install"
3. Follow the installation wizard
4. App will be available in Start Menu

#### Windows (Portable `.exe`):
1. Download the `.exe` file
2. Double-click to run directly
3. No installation required

## 🔄 Auto-Update System

### Setting Up Updates

#### 1. **Version Management**
To release an update:

1. **Update version in package.json:**
```json
{
  "version": "1.0.1"
}
```

2. **Update version in src-tauri/tauri.conf.json:**
```json
{
  "version": "1.0.1"
}
```

3. **Update version in src-tauri/Cargo.toml:**
```toml
[package]
version = "1.0.1"
```

#### 2. **Build with Updates**
```bash
npm run build-production
```

#### 3. **Generate Update Files**
When you build with `createUpdaterArtifacts: true`, Tauri creates:
- `.sig` signature files
- Update manifests
- Compressed update packages

### Update Distribution Methods

#### Method 1: Manual Distribution
1. Build new version
2. Send new installer to clients
3. Clients install over existing version
4. **Data is preserved automatically** (SQLite database persists)

#### Method 2: Automatic Updates (Advanced)
Set up an update server:

1. **Create update server** (Node.js/Express or static hosting)
2. **Upload update artifacts** to your server
3. **Configure endpoint** in `tauri.conf.json`:
```json
"updater": {
  "endpoints": [
    "https://your-domain.com/api/updates/{{target}}/{{arch}}/{{current_version}}"
  ]
}
```

## 💾 Data Preservation

### Automatic Data Safety
- **SQLite Database**: Stored in user's app data directory
- **Settings**: Preserved across updates
- **User Files**: Not affected by updates

### Database Location by OS:
- **Windows**: `%APPDATA%/com.itehadironstore.management/`
- **macOS**: `~/Library/Application Support/com.itehadironstore.management/`
- **Linux**: `~/.local/share/com.itehadironstore.management/`

### Manual Backup (Optional)
Create backup functionality in your app:
```typescript
// Example backup function
const createBackup = async () => {
  const appDataDir = await appDataDir();
  const backupPath = await join(appDataDir, 'backup.db');
  // Copy database to backup location
};
```

## 🚀 Quick Deployment Workflow

### For New Clients:
1. `npm run build-production`
2. Send `Ittehad Iron Store_1.0.0_x64_en-US.msi`
3. Client installs and starts using

### For Updates:
1. Update version numbers (package.json, tauri.conf.json, Cargo.toml)
2. `npm run build-production`
3. Send new installer to clients
4. Clients install over existing version
5. **All data preserved automatically!**

## 🛡️ Security Notes

- App is code-signed automatically by Tauri
- Database files are stored securely in user directory
- No admin privileges required for installation
- Updates maintain file permissions

## 📋 Checklist Before Distribution

- [ ] Test build locally
- [ ] Verify database functionality
- [ ] Test update process
- [ ] Create user documentation
- [ ] Prepare support materials
- [ ] Test on clean Windows machine

## 🔧 Troubleshooting

### Build Issues:
- Ensure Node.js version compatibility
- Run `npm install` to update dependencies
- Clear cache: `npm run clean` (if available)

### Update Issues:
- Verify version numbers are incremented
- Check file permissions
- Test on development machine first

## 📞 Support

For deployment issues, check:
1. Build logs in terminal
2. Tauri documentation: https://tauri.app/
3. Project issues and logs

---

**Remember**: The beauty of this setup is that your clients' data is always safe during updates!
