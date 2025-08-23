#!/bin/bash

# Ittehad Iron Store - Production Build Script

echo "🏪 Building Ittehad Iron Store for Production..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Check if cargo is available
if ! command -v cargo &> /dev/null; then
    print_error "Rust/Cargo is not installed or not in PATH"
    exit 1
fi

print_status "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    exit 1
fi

print_status "Building Tauri application..."
npm run tauri build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
    echo ""
    print_status "Build artifacts location:"
    echo "  📁 Windows: src-tauri/target/release/bundle/msi/"
    echo "  📁 macOS: src-tauri/target/release/bundle/macos/"
    echo "  📁 Linux: src-tauri/target/release/bundle/deb/"
    echo ""
    print_status "Installer files:"
    
    # List the generated files
    find src-tauri/target/release/bundle -name "*.msi" -o -name "*.dmg" -o -name "*.deb" -o -name "*.rpm" 2>/dev/null | while read file; do
        echo "  📦 $file"
    done
    
    echo ""
    print_success "🎉 Ready for distribution!"
    print_warning "Remember to test the installer on a clean machine before distributing to clients."
    
else
    print_error "Build failed"
    exit 1
fi
