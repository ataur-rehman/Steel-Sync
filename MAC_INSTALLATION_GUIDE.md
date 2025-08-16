# 🍎 Mac Installation Guide for Ittehad Iron Store

## 📋 **PREREQUISITES**

### **Required Software:**
1. **Rust** - Programming language for Tauri backend
2. **Node.js** - JavaScript runtime for frontend
3. **Xcode Command Line Tools** - For Mac development tools

---

## 🔧 **STEP 1: Install Development Tools**

### **1.1 Install Homebrew (Package Manager)**
Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### **1.2 Install Xcode Command Line Tools**
```bash
xcode-select --install
```

### **1.3 Install Node.js**
```bash
brew install node
```

### **1.4 Install Rust**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### **1.5 Install Tauri CLI**
```bash
cargo install tauri-cli
```

---

## 🏗️ **STEP 2: Build the Application**

### **2.1 Clone/Copy the Project**
```bash
# If you have the project files, navigate to the directory
cd /path/to/ittehad-iron-store

# Or clone from repository
git clone <your-repository-url>
cd ittehad-iron-store
```

### **2.2 Install Dependencies**
```bash
npm install
```

### **2.3 Build for Production**
```bash
npm run tauri build
```

This will create:
- **DMG file** (disk image for distribution)
- **APP bundle** (application package)
- Located in: `src-tauri/target/release/bundle/`

---

## 📦 **STEP 3: Distribution Options**

### **Option A: Simple DMG Distribution**

#### **3.1 Create Distribution Folder**
```bash
mkdir -p dist/mac
cp src-tauri/target/release/bundle/dmg/*.dmg dist/mac/
```

#### **3.2 Share the DMG**
- Upload the `.dmg` file to cloud storage
- Users can download and drag to Applications folder
- Double-click to install

### **Option B: Professional Installer (Advanced)**

#### **3.1 Code Signing (Optional but Recommended)**
```bash
# You'll need an Apple Developer Certificate
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" src-tauri/target/release/bundle/macos/Ittehad\ Iron\ Store.app
```

#### **3.2 Notarization (For Distribution)**
```bash
# Submit for Apple notarization
xcrun notarytool submit src-tauri/target/release/bundle/dmg/Ittehad\ Iron\ Store_*.dmg --keychain-profile "AC_PASSWORD" --wait
```

---

## 🚀 **STEP 4: User Installation Instructions**

### **For End Users:**

#### **4.1 Download the DMG**
- Download `Ittehad Iron Store.dmg` from provided link

#### **4.2 Install the Application**
1. Double-click the downloaded DMG file
2. Drag "Ittehad Iron Store" to the Applications folder
3. Eject the DMG by clicking the eject button

#### **4.3 Run the Application**
1. Open Finder → Applications
2. Find "Ittehad Iron Store"
3. Right-click → Open (first time only, for security)
4. Click "Open" in the security dialog

#### **4.4 Login**
- Username: `admin`
- Password: `admin123`

---

## 🛠️ **STEP 5: Automated Build Script**

Create a build script for easy distribution:

### **5.1 Create build-mac.sh**
```bash
#!/bin/bash
echo "🍎 Building Ittehad Iron Store for Mac..."

# Clean previous builds
rm -rf src-tauri/target/release/bundle/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️ Building application..."
npm run tauri build

# Create distribution folder
echo "📁 Creating distribution folder..."
mkdir -p dist/mac
cp src-tauri/target/release/bundle/dmg/*.dmg dist/mac/

echo "✅ Build complete! DMG file available in dist/mac/"
echo "📍 Location: $(pwd)/dist/mac/"
ls -la dist/mac/
```

### **5.2 Make it executable**
```bash
chmod +x build-mac.sh
```

### **5.3 Run the build**
```bash
./build-mac.sh
```

---

## 📱 **STEP 6: Configuration for Mac**

### **6.1 Update Tauri Config for Mac**
Edit `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "identifier": "com.itehadironstore.app",
    "publisher": "Ittehad Iron Store",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns"
    ],
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.13",
      "exceptionDomain": "",
      "signingIdentity": null,
      "entitlements": null
    }
  }
}
```

### **6.2 Create App Icons**
Place Mac-specific icons in `src-tauri/icons/`:
- `icon.icns` (main Mac icon)
- Various PNG sizes for different contexts

---

## 🎯 **STEP 7: Final Distribution**

### **7.1 Package Structure**
```
Ittehad_Iron_Store_Mac_Installer/
├── Ittehad Iron Store.dmg          # Main installer
├── README.txt                      # Installation instructions
├── System Requirements.txt         # Mac version requirements
└── User Guide.pdf                  # Optional user documentation
```

### **7.2 Distribution Methods**
1. **Direct Download** - Host DMG on website/cloud storage
2. **Email Distribution** - Send DMG via email (if size permits)
3. **USB/Physical Media** - Copy DMG to USB drives
4. **App Store** - Submit to Mac App Store (requires developer account)

---

## 📝 **STEP 8: User Setup Instructions**

### **Create a simple instruction file for users:**

```markdown
# Installing Ittehad Iron Store on Mac

## Requirements
- macOS 10.13 or later
- 100MB free disk space

## Installation Steps
1. Download "Ittehad Iron Store.dmg"
2. Double-click the DMG file
3. Drag the app to Applications folder
4. Open Applications folder
5. Right-click "Ittehad Iron Store" → Open
6. Click "Open" in security dialog
7. Login with: admin / admin123

## Troubleshooting
- If blocked by security: System Preferences → Security & Privacy → Allow
- If app won't open: Right-click → Open instead of double-clicking
```

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Rust installed
- [ ] Node.js installed  
- [ ] Xcode Command Line Tools installed
- [ ] Dependencies installed (`npm install`)
- [ ] Build successful (`npm run tauri build`)
- [ ] DMG file created
- [ ] App launches and shows login page
- [ ] Database initializes properly
- [ ] All features working in built app

---

## 🎉 **RESULT**

You'll have a professional Mac application that:
- Installs like any other Mac app
- Runs natively on macOS
- Includes proper Mac-style interface
- Works offline with local database
- Can be distributed to any Mac user

**Your Mac installer is ready for distribution! 🍎**
