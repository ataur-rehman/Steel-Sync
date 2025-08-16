# 🍎 Simple Mac Distribution Guide

## 📦 **Quick Setup for Mac Users**

### **For Developers (Building the App):**

#### **1. One-Time Setup on Mac:**
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install node
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
xcode-select --install
cargo install tauri-cli
```

#### **2. Build the Mac App:**
```bash
# Navigate to project folder
cd ittehad-iron-store

# Install dependencies
npm install

# Build for Mac
npm run tauri build
```

#### **3. Find Your Installer:**
The installer will be created at:
```
src-tauri/target/release/bundle/dmg/Ittehad Iron Store_1.0.0_x64.dmg
```

---

### **For End Users (Installing the App):**

#### **1. Download the DMG file**
- Get `Ittehad Iron Store.dmg` from your developer

#### **2. Install (3 simple steps):**
1. **Double-click** the DMG file
2. **Drag** "Ittehad Iron Store" to Applications folder  
3. **Open** Applications folder and launch the app

#### **3. First Launch:**
- **Right-click** the app → Select "Open"
- Click **"Open"** in the security dialog
- Enter login: `admin` / `admin123`

---

## 🎯 **That's It!**

### **What You Get:**
- ✅ Native Mac application
- ✅ Works offline with local database
- ✅ Professional installer experience
- ✅ No browser required
- ✅ Runs like any other Mac app

### **System Requirements:**
- macOS 10.13 or later
- 100MB free space

### **Support:**
If you have issues:
1. Try right-clicking → Open instead of double-clicking
2. Check System Preferences → Security & Privacy → Allow
3. Contact your developer for assistance

**Your professional Mac application is ready! 🚀**
