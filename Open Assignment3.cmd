@echo off
rem Starts a local server for this folder and opens the page.
cd /d "%~dp0"
start "Assignment 3 server" cmd /k python -m http.server 8123
timeout /t 2 /nobreak >nul
start "" http://localhost:8123/