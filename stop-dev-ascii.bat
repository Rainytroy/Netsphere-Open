@echo off
REM Admin privilege check
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Administrator privileges required!
    echo Please right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b
)

setlocal enabledelayedexpansion
title Netsphere Service Stopper

:: Initialize
set "SUCCESS=0"
set "FAILED_COUNT=0"
set "PORTS_TO_CHECK=3000 3001 3002"
set "APP_NAME=Netsphere"
set "MAX_RETRIES=3"

cls
echo ====================================================
echo          %APP_NAME% Development Service Stopper
echo ====================================================
echo.

:: Confirm action
echo WARNING: This will stop all %APP_NAME% related processes
choice /C YN /N /M "Continue? (Y=Yes, N=No)"
if %errorlevel% equ 2 (
    echo.
    echo Operation canceled by user
    goto :end
)
echo.

:: Try normal method first
call :stop_services_normal
if %FAILED_COUNT% gtr 0 (
    echo WARNING: Some services could not be stopped normally, trying aggressive method...
    call :stop_services_aggressive
)

:: Verify services
call :verify_services

:: If still running, use ultimate method
if %FAILED_COUNT% gtr 0 (
    echo WARNING: Services still running, using ultimate method...
    call :stop_services_ultimate
    call :verify_services
)

:end
echo.
echo ====================================================
if %FAILED_COUNT% equ 0 (
    echo SUCCESS: All %APP_NAME% services have been stopped
) else (
    echo ERROR: Some services may still be running, try manual termination
)
echo ====================================================
echo.
echo Press any key to exit...
pause > nul
exit /b

:: ========================================================================
:: Function: Stop services using normal method
:: ========================================================================
:stop_services_normal
echo ====================================================
echo            Using normal method to stop services
echo ====================================================

for %%p in (%PORTS_TO_CHECK%) do (
    call :check_and_stop_port_normal %%p
)
goto :eof

:: ========================================================================
:: Function: Stop services using aggressive method
:: ========================================================================
:stop_services_aggressive
echo ====================================================
echo          Using aggressive method to stop services
echo ====================================================

:: Focus on port 3001 (backend API service)
echo WARNING: Focusing on port 3001 (Backend API)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo Found process using port 3001: %%a
    taskkill /F /PID %%a > nul 2>&1
    if !errorlevel! equ 0 (
        echo SUCCESS: Forcefully terminated process %%a
    ) else (
        echo ERROR: Could not terminate process %%a
    )
)

:: Handle Node.js processes
echo WARNING: Attempting to stop all Node.js processes...
tasklist /fi "imagename eq node.exe" /fo csv | findstr /i "node.exe" > nul
if %errorlevel% equ 0 (
    echo WARNING: Found Node.js processes, attempting to stop...
    
    :: Use WMIC to precisely target project-related Node.js processes
    for /f "tokens=1" %%i in ('wmic process where "name='node.exe' and (commandline like '%%Netsphere%%' or commandline like '%%react-scripts%%')" get processid /format:value ^| find "="') do (
        set "pid=%%i"
        set "pid=!pid:ProcessId=!"
        echo Found %APP_NAME% related process: !pid!
        taskkill /F /PID !pid! > nul 2>&1
        if !errorlevel! equ 0 (
            echo SUCCESS: Terminated process !pid!
        ) else (
            echo ERROR: Could not terminate process !pid!
        )
    )
) else (
    echo SUCCESS: No active Node.js processes found
)

goto :eof

:: ========================================================================
:: Function: Stop services using ultimate method
:: ========================================================================
:stop_services_ultimate
echo ====================================================
echo           Using ultimate method to stop services
echo ====================================================

echo WARNING: Attempting to terminate all Node.js processes...
taskkill /F /IM node.exe > nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: Terminated all Node.js processes
) else (
    echo ERROR: Could not terminate all Node.js processes or none active
)

echo WARNING: Using ultimate cleanup for ports 3000 and 3001...
:: Check and clean specific ports
for %%p in (3000 3001) do (
    echo Checking port %%p status...
    netstat -ano | findstr ":%%p" | findstr "LISTENING" > nul
    if !errorlevel! equ 0 (
        echo WARNING: Port %%p still in use, attempting forced release...
        :: Try to get process ID and forcefully terminate
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p" ^| findstr "LISTENING"') do (
            echo WARNING: Forcefully terminating process %%a
            taskkill /F /PID %%a > nul 2>&1
        )
    ) else (
        echo SUCCESS: Port %%p released
    )
)

:: Try restarting HTTP service to release ports
echo WARNING: Attempting to restart HTTP service to release ports...
net stop http /y > nul 2>&1
net start http > nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: HTTP service restarted
) else (
    echo WARNING: HTTP service could not be restarted, or admin rights required
)

goto :eof

:: ========================================================================
:: Function: Verify if services have stopped
:: ========================================================================
:verify_services
echo ====================================================
echo                  Verifying service status
echo ====================================================

set "FAILED_COUNT=0"
for %%p in (%PORTS_TO_CHECK%) do (
    netstat -ano | findstr ":%%p" | findstr "LISTENING" > nul
    if !errorlevel! equ 0 (
        echo ERROR: Service still running on port %%p!
        set /a "FAILED_COUNT+=1"
    ) else (
        echo SUCCESS: Port %%p successfully released
    )
)

goto :eof

:: ========================================================================
:: Function: Check and stop service on specified port (normal method)
:: ========================================================================
:check_and_stop_port_normal
set "port=%~1"
set "service_name="

if "%port%" == "3000" set "service_name=Frontend App"
if "%port%" == "3001" set "service_name=Backend API"
if "%port%" == "3002" set "service_name=Other Netsphere Service"

echo INFO: Checking port %port% (%service_name%)...

:: Check if port is in use
netstat -ano | findstr ":%port%" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    echo SUCCESS: No service running on port %port%
    goto :eof
)

:: Find process ID using the port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%port% ^| findstr LISTENING') do (
    set "pid=%%a"
    
    :: Get process name
    for /f "tokens=1" %%b in ('tasklist /fi "PID eq !pid!" /fo list ^| findstr "Image"') do (
        set "process=%%b"
        set "process=!process:Image Name:=!"
        set "process=!process: =!"
    )
    
    echo WARNING: Found process using port %port%: !pid! (!process!)
    
    :: Try to gracefully terminate process
    echo Attempting to stop process !pid!...
    taskkill /PID !pid! > nul 2>&1
    
    :: Check if successfully terminated
    timeout /t 1 /nobreak > nul
    tasklist /fi "PID eq !pid!" | findstr !pid! > nul
    if !errorlevel! equ 0 (
        echo WARNING: Normal termination failed, trying forced termination...
        taskkill /F /PID !pid! > nul 2>&1
        
        timeout /t 1 /nobreak > nul
        tasklist /fi "PID eq !pid!" | findstr !pid! > nul
        if !errorlevel! equ 0 (
            echo ERROR: Could not terminate process !pid!
            set /a "FAILED_COUNT+=1"
        ) else (
            echo SUCCESS: Forcefully terminated process !pid!
            set /a "SUCCESS+=1"
        )
    ) else (
        echo SUCCESS: Stopped process !pid!
        set /a "SUCCESS+=1"
    )
)

goto :eof
