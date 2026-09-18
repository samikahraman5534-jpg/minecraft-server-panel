@echo off
title Minecraft Server Web Panel & Playit.gg
color 0A

echo ========================================================
echo   MINECRAFT SERVER WEB CONTROL PANEL & PLAYIT.GG
echo   Gelistirici: Sami Kahraman
echo ========================================================
echo.
echo [1/2] Bagimliliklar kontrol ediliyor...
if not exist node_modules (
  echo Ilk kurulum yapiliyor, kutuphaneler yukleniyor...
  call npm.cmd install
)

echo [2/2] Web Paneli baslatiliyor...
echo.
echo ========================================================
echo   Web Paneli: http://localhost:3000
echo   Bu pencereyi kapatmayiniz.
echo ========================================================
echo.

start http://localhost:3000
node server/app.js

pause
