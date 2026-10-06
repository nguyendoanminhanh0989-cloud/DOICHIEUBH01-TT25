@echo off
chcp 65001 >nul
echo ==========================================
echo   TU DONG DEPLOY LEN VERCEL PRODUCTION
echo ==========================================
echo.
echo [1/2] Dang deploy len Vercel...
npx vercel --prod --yes
echo.
if %errorlevel%==0 (
    echo ==========================================
    echo   THANH CONG! Da len production.
    echo   https://doichieubh01-tt25.vercel.app
    echo ==========================================
) else (
    echo [LOI] Deploy that bai! Kiem tra lai.
)
