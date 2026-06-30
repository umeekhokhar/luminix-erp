@echo off

:: Start Backend
start cmd /k "cd /d D:\Coding\BB\luminix-erp\backend && python manage.py runserver"

:: Start Frontend
start cmd /k "cd /d D:\Coding\BB\luminix-erp\frontend && npm start"

exit