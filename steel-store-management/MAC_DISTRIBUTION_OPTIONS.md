# 🍎 macOS Distribution Options for Ittehad Iron Store

## ✅ **Option 1: Use the Windows Installer (Easiest)**

You already have working Windows installers:
- **MSI Installer**: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/Ittehad Iron Store_1.0.0_x64_en-US.msi`
- **NSIS Installer**: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Ittehad Iron Store_1.0.0_x64-setup.exe`

## ✅ **Option 2: Web-based macOS App (Ready Now!)**

I just created a web-based version that works on Mac:

### **Single Command to Deploy:**
```bash
# Copy the web-dist-mac folder to any Mac and run:
cd web-dist-mac
node server.js
```

**What you get:**
- ✅ Runs in Safari on macOS
- ✅ Can be installed as a PWA (Progressive Web App)
- ✅ Works offline after installation
- ✅ Looks and feels like a native Mac app

## ✅ **Option 3: Mac Users Can Build Locally**

Mac users can use the installation script:

### **Single Command for Mac Users:**
```bash
# Save install-mac.sh to their Mac and run:
chmod +x install-mac.sh
./install-mac.sh
```

This automatically:
- ✅ Installs Rust and Node.js if needed
- ✅ Builds the native macOS app
- ✅ Creates a DMG installer

## ✅ **Option 4: GitHub Actions (Auto-build)**

The GitHub Action is set up to automatically build macOS apps:
- ✅ Triggers on every push to test01 branch
- ✅ Creates universal binaries (Intel + Apple Silicon)
- ✅ Generates DMG installers
- ✅ Available as downloadable artifacts

## 🎯 **Recommended Approach:**

1. **For immediate distribution**: Use Option 2 (Web-based app)
2. **For Mac users who want native**: Use Option 3 (Local build script)
3. **For automated releases**: Use Option 4 (GitHub Actions)

## 📦 **Files Created:**

1. `web-dist-mac/` - Ready-to-deploy web version
2. `install-mac.sh` - macOS build script  
3. `.github/workflows/build-mac.yml` - GitHub Actions workflow

## 🚀 **Distribution Methods:**

### **Immediate (Web App):**
- Host the `web-dist-mac` folder on any web server
- Mac users visit the URL and can install as PWA

### **Native App:**
- Share the `install-mac.sh` script with Mac users
- They run it to build the native app locally

### **Professional:**
- Use GitHub Actions to create releases
- Distribute DMG files through GitHub releases

All options are ready to use! 🎉
