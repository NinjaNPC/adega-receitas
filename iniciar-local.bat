@echo off
cd /d "%~dp0"
echo Adega ^& Receitas rodando em http://localhost:8765  (feche esta janela para parar)
start "" http://localhost:8765
python -m http.server 8765 --bind 127.0.0.1
