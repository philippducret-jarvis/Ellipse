@echo off
title Ellipse - Lanceur
cd /d "%~dp0"

echo ============================================
echo   Ellipse - demarrage de la plateforme
echo ============================================
echo.

REM Si le studio repond deja, on ouvre juste le navigateur.
powershell -NoProfile -Command "try{ if((Test-NetConnection -ComputerName localhost -Port 4273 -WarningAction SilentlyContinue).TcpTestSucceeded){exit 0}else{exit 1} }catch{exit 1}"
if not errorlevel 1 (
  echo Studio deja en cours. Ouverture du navigateur...
  start "" http://localhost:4273/
  exit /b 0
)

echo Lancement de l'orchestrateur (API, port 4400)...
start "Ellipse Orchestrator" cmd /k "cd /d "%~dp0" && corepack pnpm --filter @ellipse/orchestrator dev"

echo Lancement de Jarvis (assistant, port 4310)...
start "Ellipse Jarvis" cmd /k "cd /d "%~dp0" && corepack pnpm forge:assistant"

echo Lancement du studio (frontend, port 4273)...
start "Ellipse Studio" cmd /k "cd /d "%~dp0" && corepack pnpm --filter @ellipse/studio dev"

echo.
echo Attente du frontend sur http://localhost:4273 ...
:wait
timeout /t 2 >nul
powershell -NoProfile -Command "try{ if((Test-NetConnection -ComputerName localhost -Port 4273 -WarningAction SilentlyContinue).TcpTestSucceeded){exit 0}else{exit 1} }catch{exit 1}"
if errorlevel 1 goto wait

echo Frontend pret. Ouverture du navigateur...
start "" http://localhost:4273/
echo.
echo Ellipse est lance. Les deux fenetres (Orchestrator / Studio) doivent rester ouvertes.
echo Vous pouvez fermer CETTE fenetre.
timeout /t 4 >nul
exit /b 0
