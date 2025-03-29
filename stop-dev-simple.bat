@echo off
setlocal enabledelayedexpansion
title Netsphere 服务停止工具 (简化版)

echo ===============================================
echo         Netsphere 服务停止工具 (简化版)
echo ===============================================
echo.
echo 此工具将停止所有 Netsphere 相关服务进程。
echo.
pause

echo.
echo [步骤 1/4] 停止前端服务 (端口 3000)...
echo ----------------------------------------------
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    set pid=%%a
    echo 正在停止使用端口 3000 的进程 PID: !pid!
    taskkill /F /PID !pid! 2>nul
    if not errorlevel 1 (
        echo 成功停止进程 !pid!
    ) else (
        echo 无法停止进程或进程已不存在
    )
)

echo.
echo [步骤 2/4] 停止后端服务 (端口 3001)...
echo ----------------------------------------------
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    set pid=%%a
    echo 正在停止使用端口 3001 的进程 PID: !pid!
    taskkill /F /PID !pid! 2>nul
    if not errorlevel 1 (
        echo 成功停止进程 !pid!
    ) else (
        echo 无法停止进程或进程已不存在
    )
)

echo.
echo [步骤 3/4] 停止相关 Node.js 进程...
echo ----------------------------------------------
echo 正在查找与 Netsphere 相关的 Node.js 进程...
taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *Netsphere*" 2>nul
if not errorlevel 1 (
    echo Node.js 进程停止成功
) else (
    echo 未找到相关 Node.js 进程或无法停止
)

echo.
echo [步骤 4/4] 验证端口状态...
echo ----------------------------------------------
netstat -ano | findstr :3000 | findstr LISTENING > nul
if not errorlevel 1 (
    echo 警告: 端口 3000 仍有服务在运行
) else (
    echo 端口 3000 已释放
)

netstat -ano | findstr :3001 | findstr LISTENING > nul
if not errorlevel 1 (
    echo 警告: 端口 3001 仍有服务在运行
) else (
    echo 端口 3001 已释放
)

echo.
echo ===============================================
echo                 操作完成
echo ===============================================
echo.
echo 如果仍有服务无法停止，请考虑以下解决方法：
echo 1. 使用任务管理器手动终止相关进程
echo 2. 重启计算机
echo.
pause
