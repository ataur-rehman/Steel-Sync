#!/bin/bash

# macOS Installation Script for Ittehad Iron Store
# This script helps Mac users install the application

echo "🍎 Ittehad Iron Store - macOS Installation Helper"
echo "=================================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only"
    exit 1
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "❌ Please install Homebrew first: https://brew.sh"
        exit 1
    fi
fi

# Add macOS targets for Rust
echo "🔧 Adding macOS targets..."
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for macOS
echo "🚀 Building macOS application..."
cargo tauri build --target universal-apple-darwin

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📁 Your app is located at:"
    echo "   src-tauri/target/universal-apple-darwin/release/bundle/macos/Ittehad Iron Store.app"
    echo ""
    echo "💾 DMG installer is at:"
    echo "   src-tauri/target/universal-apple-darwin/release/bundle/dmg/Ittehad Iron Store_*.dmg"
    echo ""
    echo "🎉 Installation complete!"
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi
