@echo off
title Zia-Billing Desktop Launcher
cd /d "%~dp0"
echo ========================================================
echo        Starting Zia-Billing Enterprise Desktop...
echo ========================================================
start "" "dist-electron\win-unpacked\Zia-Billing.exe"
exit
