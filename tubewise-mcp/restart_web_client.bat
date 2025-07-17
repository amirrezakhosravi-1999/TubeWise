@echo off
echo Stopping any running Next.js servers...
taskkill /f /im node.exe

echo Starting web client...
cd web-client
npm run dev
