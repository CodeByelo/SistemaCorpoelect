@echo off
setlocal
echo ===================================================
echo   Setup y Ejecucion del Backend (Python)
echo ===================================================

cd backend

:: 1. Verificacion de Python Global
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no se detecto en el sistema.
    echo Por favor, instala Python desde https://www.python.org/ y marca la opcion "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

:: 2. Limpieza de Entorno Corrupto (Intentar ejecutar python del venv)
if exist "venv" (
    venv\Scripts\python.exe --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [AVISO] El entorno virtual parece invalido o copiado de otra PC. Eliminando...
        rmdir /s /q "venv"
    )
)

:: 3. Crear entorno virtual si no existe
if not exist "venv" (
    echo Creando entorno virtual nuevo...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear el entorno virtual.
        pause
        exit /b 1
    )
)

:: 4. Validar existencia de pip en el entorno
if not exist "venv\Scripts\pip.exe" (
    echo [ERROR] El entorno virtual se creo sin pip. Reintentando instalacion de pip...
    venv\Scripts\python.exe -m ensurepip
)

:: 5. Instalar dependencias (Usando ruta directa para evitar problemas de activacion)
echo Instalando dependencias...
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al instalar dependencias.
    pause
    exit /b 1
)

:: 6. Iniciar servidor (Usando ruta directa)
echo.
echo Iniciando servidor Uvicorn en http://localhost:8000
echo Presiona Ctrl+C para detener.
echo.
venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

if %errorlevel% neq 0 (
    echo [ERROR] El servidor fallo al iniciar.
    pause
) else (
    pause
)
