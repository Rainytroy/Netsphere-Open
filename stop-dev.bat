@echo off
REM 必须以管理员权限运行该批处理文件
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo 需要管理员权限运行此脚本！
    echo 请右键点击此文件，选择"以管理员身份运行"。
    echo.
    pause
    exit /b
)

setlocal enabledelayedexpansion
title Netsphere服务停止工具

:: 禁用颜色代码，使用纯文本输出
set "SUCCESS_MSG=成功"
set "ERROR_MSG=错误"
set "INFO_MSG=信息"
set "WARNING_MSG=警告"

:: 初始化
set "SUCCESS=0"
set "FAILED_COUNT=0"
set "PORTS_TO_CHECK=3000 3001 3002"
set "APP_NAME=Netsphere"
set "MAX_RETRIES=3"
set "CURRENT_RETRY=0"

cls
echo ====================================================
echo           %APP_NAME% 开发环境停止工具
echo ====================================================
echo.

:: 确认用户操作
echo [%WARNING_MSG%] 此操作将停止所有%APP_NAME%相关服务进程
choice /C YN /N /M "是否继续? (Y=是, N=否)"
if %errorlevel% equ 2 (
    echo.
    echo [%WARNING_MSG%] 用户取消了操作，退出脚本
    goto :end
)
echo.

:: 首先尝试常规方法停止服务
call :stop_services_normal
if %FAILED_COUNT% gtr 0 (
    echo [%WARNING_MSG%] 检测到一些服务未能正常停止，尝试强力方法...
    call :stop_services_aggressive
)

:: 验证服务是否已停止
call :verify_services

:: 如果仍有服务运行，使用终极方法
if %FAILED_COUNT% gtr 0 (
    echo [%WARNING_MSG%] 仍有服务未停止，使用终极方法...
    call :stop_services_ultimate
    call :verify_services
)

:end
echo.
echo ====================================================
if %FAILED_COUNT% equ 0 (
    echo [%SUCCESS_MSG%] 所有%APP_NAME%服务已成功停止
) else (
    echo [%ERROR_MSG%] 某些服务可能仍在运行，请尝试手动停止
)
echo ====================================================
echo.
echo 按任意键退出...
pause > nul
exit /b

:: ========================================================================
:: 函数: 使用常规方法停止服务
:: ========================================================================
:stop_services_normal
echo ====================================================
echo             使用常规方法停止服务
echo ====================================================

for %%p in (%PORTS_TO_CHECK%) do (
    call :check_and_stop_port_normal %%p
)
goto :eof

:: ========================================================================
:: 函数: 使用强力方法停止服务
:: ========================================================================
:stop_services_aggressive
echo ====================================================
echo             使用强力方法停止服务
echo ====================================================

:: 特别针对端口3001的处理（后端API服务）
echo [%WARNING_MSG%] 重点处理端口3001（后端API服务）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo 找到使用端口3001的进程: %%a
    taskkill /F /PID %%a > nul 2>&1
    if !errorlevel! equ 0 (
        echo [%SUCCESS_MSG%] 成功强制终止进程 %%a
    ) else (
        echo [%ERROR_MSG%] 无法终止进程 %%a
    )
)

:: 处理Node.js进程
echo [%WARNING_MSG%] 尝试查找并停止所有Node.js进程...
tasklist /fi "imagename eq node.exe" /fo csv | findstr /i "node.exe" > nul
if %errorlevel% equ 0 (
    echo [%WARNING_MSG%] 发现Node.js进程，尝试停止...
    
    :: 使用WMIC精确定位与项目相关的Node.js进程
    for /f "tokens=1" %%i in ('wmic process where "name='node.exe' and (commandline like '%%Netsphere%%' or commandline like '%%react-scripts%%')" get processid /format:value ^| find "="') do (
        set "pid=%%i"
        set "pid=!pid:ProcessId=!"
        echo 找到%APP_NAME%相关进程: !pid!
        taskkill /F /PID !pid! > nul 2>&1
        if !errorlevel! equ 0 (
            echo [%SUCCESS_MSG%] 成功终止进程 !pid!
        ) else (
            echo [%ERROR_MSG%] 无法终止进程 !pid!
        )
    )
) else (
    echo [%SUCCESS_MSG%] 未发现活动的Node.js进程
)

goto :eof

:: ========================================================================
:: 函数: 使用终极方法停止服务
:: ========================================================================
:stop_services_ultimate
echo ====================================================
echo            使用终极方法停止服务
echo ====================================================

echo [%WARNING_MSG%] 尝试终止所有Node.js进程...
taskkill /F /IM node.exe > nul 2>&1
if %errorlevel% equ 0 (
    echo [%SUCCESS_MSG%] 成功终止所有Node.js进程
) else (
    echo [%ERROR_MSG%] 未能终止所有Node.js进程或没有活动的Node.js进程
)

echo [%WARNING_MSG%] 使用终极清理方法清理端口3000和3001...
:: 使用netsh清理特定端口
for %%p in (3000 3001) do (
    echo 检查端口%%p状态...
    netstat -ano | findstr ":%%p" | findstr "LISTENING" > nul
    if !errorlevel! equ 0 (
        echo [%WARNING_MSG%] 端口%%p仍被占用，尝试强制释放...
        :: 尝试获取进程ID并强制终止
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p" ^| findstr "LISTENING"') do (
            echo [%WARNING_MSG%] 正在强制终止进程 %%a
            taskkill /F /PID %%a > nul 2>&1
        )
    ) else (
        echo [%SUCCESS_MSG%] 端口%%p已释放
    )
)

:: 尝试重启HTTP服务以释放端口
echo [%WARNING_MSG%] 尝试重启HTTP服务以释放端口...
net stop http /y > nul 2>&1
net start http > nul 2>&1
if %errorlevel% equ 0 (
    echo [%SUCCESS_MSG%] HTTP服务已重启
) else (
    echo [%WARNING_MSG%] HTTP服务无法重启，或此操作需要管理员权限
)

goto :eof

:: ========================================================================
:: 函数: 验证服务是否已停止
:: ========================================================================
:verify_services
echo ====================================================
echo               验证服务状态
echo ====================================================

set "FAILED_COUNT=0"
for %%p in (%PORTS_TO_CHECK%) do (
    netstat -ano | findstr ":%%p" | findstr "LISTENING" > nul
    if !errorlevel! equ 0 (
        echo [%ERROR_MSG%] 端口%%p上仍有服务在运行！
        set /a "FAILED_COUNT+=1"
    ) else (
        echo [%SUCCESS_MSG%] 端口%%p已成功释放
    )
)

goto :eof

:: ========================================================================
:: 函数: 检查并停止指定端口上的服务（常规方法）
:: ========================================================================
:check_and_stop_port_normal
set "port=%~1"
set "service_name="

if "%port%" == "3000" set "service_name=前端应用服务"
if "%port%" == "3001" set "service_name=后端API服务"
if "%port%" == "3002" set "service_name=其他Netsphere服务"

echo [%INFO_MSG%] 正在检查端口%port%（%service_name%）...

:: 检查端口是否被占用
netstat -ano | findstr ":%port%" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    echo [%SUCCESS_MSG%] 端口%port%上没有运行中的服务
    goto :eof
)

:: 查找使用该端口的进程ID
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%port% ^| findstr LISTENING') do (
    set "pid=%%a"
    
    :: 获取进程名称
    for /f "tokens=1" %%b in ('tasklist /fi "PID eq !pid!" /fo list ^| findstr "Image"') do (
        set "process=%%b"
        set "process=!process:Image Name:=!"
        set "process=!process: =!"
    )
    
    echo [%WARNING_MSG%] 找到使用端口%port%的进程: !pid! (!process!)
    
    :: 尝试优雅地终止进程
    echo 正在尝试停止进程 !pid!...
    taskkill /PID !pid! > nul 2>&1
    
    :: 检查是否成功终止
    timeout /t 1 /nobreak > nul
    tasklist /fi "PID eq !pid!" | findstr !pid! > nul
    if !errorlevel! equ 0 (
        echo [%WARNING_MSG%] 常规终止失败，尝试强制终止...
        taskkill /F /PID !pid! > nul 2>&1
        
        timeout /t 1 /nobreak > nul
        tasklist /fi "PID eq !pid!" | findstr !pid! > nul
        if !errorlevel! equ 0 (
            echo [%ERROR_MSG%] 无法终止进程 !pid!
            set /a "FAILED_COUNT+=1"
        ) else (
            echo [%SUCCESS_MSG%] 成功强制终止进程 !pid!
            set /a "SUCCESS+=1"
        )
    ) else (
        echo [%SUCCESS_MSG%] 成功停止进程 !pid!
        set /a "SUCCESS+=1"
    )
)

goto :eof
