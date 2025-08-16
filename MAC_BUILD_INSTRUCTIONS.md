# macOS Build Instructions

## Quick Single Command (Run on macOS):

```bash
cargo tauri build
```

This creates:
- `src-tauri/target/release/bundle/macos/Ittehad Iron Store.app`
- `src-tauri/target/release/bundle/dmg/Ittehad Iron Store_1.0.0_x64.dmg`

## Alternative: Use the GitHub Action

1. Push your code to GitHub
2. Go to Actions tab
3. Run "Build macOS App" workflow
4. Download the generated DMG file

## Manual Steps for macOS Users:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd steel-store-management
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build for macOS:**
   ```bash
   cargo tauri build
   ```

4. **Find your installer at:**
   ```
   src-tauri/target/release/bundle/dmg/Ittehad Iron Store_1.0.0_x64.dmg
   ```

## What gets created:

- ✅ **DMG File**: Drag-and-drop installer for macOS
- ✅ **App Bundle**: Ready-to-run application
- ✅ **Universal Binary**: Works on Intel and Apple Silicon Macs

## Installation for End Users:

1. Download the DMG file
2. Double-click to mount
3. Drag "Ittehad Iron Store" to Applications folder
4. Launch from Applications or Spotlight
