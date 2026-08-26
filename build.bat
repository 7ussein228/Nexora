@echo off
echo ============================================
echo   NEXORA - Production Build
echo ============================================
echo.
echo Building optimized production bundle...
echo.
cmd /c npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo.
echo ============================================
echo   Build complete!
echo   Output folder: dist/
echo ============================================
echo.
echo To preview locally, run: npm run preview
echo To deploy, upload the dist/ folder to your hosting provider.
echo.
pause