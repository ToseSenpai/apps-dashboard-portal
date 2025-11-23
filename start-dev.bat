@echo off
set ELECTRON_RUN_AS_NODE=

REM Carica variabili da .env se esiste
if exist .env (
    echo Loading environment variables from .env...
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        REM Salta righe vuote e commenti
        echo %%a | findstr /r /c:"^#" >nul || (
            if not "%%a"=="" (
                set "%%a=%%b"
            )
        )
    )
    echo GITHUB_TOKEN loaded: %GITHUB_TOKEN:~0,8%...
)

npm run dev
