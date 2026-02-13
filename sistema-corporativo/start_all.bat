@echo off
echo ===================================================
echo   Iniciando Sistema Corporativo Completo
echo ===================================================

echo Iniciando Backend (invocando script de configuracion)...
:: Usamos run_backend.bat porque ya contiene la lógica de validación de venv
start "Backend API" run_backend.bat

echo Iniciando Frontend (Next.js)...
cd frontend
start "Frontend App" cmd /k "npm run dev"

echo.
echo ===================================================
echo   Sistemas iniciados.
echo   - Backend: http://localhost:8000 (Ventana separada)
echo   - Frontend: http://localhost:3000 (Ventana separada)
echo ===================================================
pause
