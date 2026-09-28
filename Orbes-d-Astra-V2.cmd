@echo off
setlocal
set "GAME_EXE=%~dp0builds\orbes-astra-v2\windows\Orbes-d-Astra-V2.exe"
if not exist "%GAME_EXE%" (
  echo Build V2 introuvable.
  echo Executez : corepack pnpm orbes:v2:windows
  pause
  exit /b 1
)
start "" "%GAME_EXE%"
