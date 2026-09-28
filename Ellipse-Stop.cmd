@echo off
title Ellipse - Arret
cd /d "%~dp0"
node tools\launch-ellipse.mjs --stop
ping -n 3 127.0.0.1 >nul
exit /b 0
