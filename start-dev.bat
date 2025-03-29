@echo off
echo 正在启动 Netsphere 开发环境...
echo.

echo ======================================
echo 启动后端服务(端口3001)...
echo ======================================
start cmd /k "cd server && npm run dev"

REM 使用延迟
choice /C X /N /T 5 /D X > nul

echo ======================================
echo 启动前端服务(端口3000)...
echo ======================================
start cmd /k "cd client && npm start"

echo.
echo 服务启动中，请稍候...
echo 前端服务将在浏览器中自动打开，或访问: http://localhost:3000
echo 后端API可通过 http://localhost:3001/api 访问
echo.
echo 按任意键退出本窗口(服务会继续在后台运行)
pause > nul
