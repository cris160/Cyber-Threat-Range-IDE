@echo off
echo 🔧 CTR Code Editor - Build Verification Script
echo ==============================================
echo.

cd /d "%~dp0"

echo 📦 Checking Rust installation...
where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Rust/Cargo not found! Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)
cargo --version
echo ✅ Rust installed
echo.

echo 📦 Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo ✅ Node.js installed
echo.

echo 🧹 Cleaning previous builds...
cd src-tauri
cargo clean
cd ..
echo ✅ Clean completed
echo.

echo 📚 Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed!
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo 🔨 Building Tauri application...
echo    This may take a few minutes on first build...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Build successful!
    echo.
    echo 📱 Application built successfully!
    echo    You can find the executable in:
    echo    src-tauri\target\release\ctr.exe
    echo.
    echo 🚀 To run in development mode:
    echo    npm run tauri dev
) else (
    echo.
    echo ❌ Build failed! Please check the error messages above.
)

echo.
pause
