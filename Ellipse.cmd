@echo off
title Ellipse - Lanceur
cd /d "%~dp0"

REM Lanceur unique : les services demarrent en processus caches (aucune autre fenetre).
REM Logs : generated\logs\*.log - Arret : Ellipse-Stop.cmd
node tools\launch-ellipse.mjs
if errorlevel 1 (
  echo.
  echo Un service n'a pas demarre - details ci-dessus et dans generated\logs\.
  pause
  exit /b 1
)
REM Pause courte compatible stdin redirige (timeout /t exige une console interactive).
ping -n 4 127.0.0.1 >nul
exit /b 0
