#!/bin/bash

# 🍎 Ittehad Iron Store - Mac Build Script
# This script builds the application for macOS distribution

echo "🍎 Building Ittehad Iron Store for Mac..."
echo "========================================"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS"
    exit 1
fi

# Check if required tools are installed
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first."
    echo "   Run: brew install node"
    exit 1
fi

# Check Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install it first."
    echo "   Run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
    echo "🔧 Installing Tauri CLI..."
    cargo install tauri-cli
fi

echo "✅ All prerequisites found!"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf src-tauri/target/release/bundle/
rm -rf dist/

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️ Building application for Mac..."
npm run tauri build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Create distribution folder
echo "📁 Creating distribution package..."
mkdir -p dist/mac

# Copy the DMG file
if ls src-tauri/target/release/bundle/dmg/*.dmg 1> /dev/null 2>&1; then
    cp src-tauri/target/release/bundle/dmg/*.dmg dist/mac/
    echo "✅ DMG file copied to dist/mac/"
else
    echo "❌ DMG file not found!"
fi

# Copy the APP bundle
if [ -d "src-tauri/target/release/bundle/macos" ]; then
    cp -r src-tauri/target/release/bundle/macos/*.app dist/mac/
    echo "✅ APP bundle copied to dist/mac/"
fi

# Create installation instructions
cat > dist/mac/INSTALL_INSTRUCTIONS.txt << 'EOF'
# Installing Ittehad Iron Store on Mac

## Installation Steps:
1. Double-click "Ittehad Iron Store.dmg"
2. Drag "Ittehad Iron Store" to Applications folder
3. Open Applications folder
4. Right-click "Ittehad Iron Store" → Open
5. Click "Open" in security dialog

## Login Information:
- Username: admin
- Password: admin123

## System Requirements:
- macOS 10.13 or later
- 100MB free disk space

## Troubleshooting:
- If blocked by security: System Preferences → Security & Privacy → Allow
- If app won't open: Right-click → Open instead of double-clicking

For support, contact: support@itehadironstore.com
EOF

# Show results
echo ""
echo "🎉 Build completed successfully!"
echo "=================================="
echo "📍 Distribution files location:"
echo "   $(pwd)/dist/mac/"
echo ""
echo "📦 Files created:"
ls -la dist/mac/
echo ""
echo "📋 Next steps:"
echo "   1. Test the DMG file on a Mac"
echo "   2. Share the DMG file with users"
echo "   3. Include the INSTALL_INSTRUCTIONS.txt file"
echo ""
echo "✅ Your Mac installer is ready for distribution!"
