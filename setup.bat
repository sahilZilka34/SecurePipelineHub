@echo off
REM Create all directories
mkdir src 2>nul
mkdir scanners 2>nul
mkdir processing 2>nul
mkdir config 2>nul
mkdir api\routes 2>nul
mkdir dashboard\public 2>nul
mkdir dashboard\src\components 2>nul
mkdir tests\sample_data 2>nul
mkdir docs 2>nul

REM Create Python package markers
type nul > processing\__init__.py
type nul > api\__init__.py

REM Create requirements.txt
(
echo # SecurePipeline Hub - Python Dependencies
echo flask>=3.0.0
echo flask-cors>=4.0.0
echo requests>=2.31.0
echo pytest>=7.4.0
) > requirements.txt

echo ✅ Folder structure created!
pause