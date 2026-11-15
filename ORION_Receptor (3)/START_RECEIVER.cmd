@echo off
cd /d "%~dp0"
set ORION_WATCH_HOST=192.168.20.101
node server/watch-server.mjs
pause
