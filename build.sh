#!/bin/bash

echo "🔧 CTR Code Editor - Build Verification Script"
echo "=============================================="
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "📦 Checking Rust installation..."
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo not found! Please install Rust from https://rustup.rs/"
    exit 1
fi
echo "✅ Rust installed: $(rustc --version)"
echo ""

echo "📦 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js installed: $(node --version)"
echo ""

echo "🧹 Cleaning previous builds..."
cd src-tauri
cargo clean
cd ..
echo "✅ Clean completed"
echo ""

echo "📚 Installing frontend dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

echo "🔨 Building Tauri application..."
echo "   This may take a few minutes on first build..."
npm run tauri build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📱 Application built successfully!"
    echo "   You can find the executable in:"
    echo "   - Windows: src-tauri/target/release/ctr.exe"
    echo "   - macOS: src-tauri/target/release/bundle/macos/"
    echo "   - Linux: src-tauri/target/release/ctr"
    echo ""
    echo "🚀 To run in development mode:"
    echo "   npm run tauri dev"
else
    echo ""
    echo "❌ Build failed! Please check the error messages above."
    exit 1
fi
