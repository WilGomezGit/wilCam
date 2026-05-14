@echo off
title WilCam NVR
color 0A
echo.
echo  ==========================================
echo   WilCam NVR - Iniciando...
echo  ==========================================
echo.

cd /d "%~dp0"

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo en: https://nodejs.org
    pause
    exit /b 1
)

:: Verificar FFmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [AVISO] FFmpeg no encontrado en PATH.
    echo Sin FFmpeg no hay video en vivo ni grabaciones.
    echo Descargalo en: https://ffmpeg.org/download.html
    echo.
)

:: Instalar dependencias del backend si faltan
if not exist "backend\node_modules" (
    echo [SETUP] Instalando dependencias del backend...
    cd backend
    npm install
    cd ..
)

:: Compilar Angular si no existe el build
if not exist "frontend\dist\wilcam\browser\index.html" (
    echo [BUILD] Compilando frontend ^(primera vez, tarda 1-2 minutos^)...
    cd frontend
    call npm install
    call npx ng build --configuration production
    cd ..
)

:: Obtener la IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /V "172\."') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP: =!
    goto :found_ip
)
:found_ip

echo.
echo  ==========================================
echo   WilCam listo!
echo.
echo   Desde este PC:     http://localhost:3000
echo   Desde tu celular:  http://%LOCAL_IP%:3000
echo   (celular debe estar en el mismo WiFi)
echo  ==========================================
echo.

cd backend
node src/index.js
