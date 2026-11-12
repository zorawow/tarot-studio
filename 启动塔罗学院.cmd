@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22.12 或更新版本，然后重新打开此文件。
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo 正在安装塔罗学院所需的依赖，请稍候...
  call npm ci
  if errorlevel 1 (
    echo 安装未完成，请检查网络后重试。
    pause
    exit /b 1
  )
)
echo 塔罗学院即将打开。保持此窗口开启；按 Ctrl+C 停止网站。
call npm run dev -- --open
if errorlevel 1 pause
