@echo off
rem Double-click launcher for enable-stats-api.ps1 (Windows doesn't run .ps1 files with a double click).
rem The bypass only applies to this script, it doesn't change any system setting.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0enable-stats-api.ps1" %*
