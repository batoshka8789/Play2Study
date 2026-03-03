#!/bin/bash

echo "→ Запуск Play2Study (macOS/Linux)"

# 1. Запускаем бэкенд в фоне
echo "→ Запускаем FastAPI сервер..."
cd backend || { echo "Папка backend не найдена!"; exit 1; }
pip install -r requirements.txt
uvicorn main:app --reload --port 8000 &
BACK_PID=$!
cd ..

# Даём серверу 3 секунды на старт
sleep 3

# 2. Открываем браузер
echo "→ Открываем фронтенд в браузере..."
open "http://localhost:5500" || xdg-open "http://localhost:5500"

# 3. Запускаем live-server для фронтенда
echo "→ Запускаем live-server (фронтенд будет на http://localhost:5500)"
cd frontend || { echo "Папка frontend не найдена!"; kill $BACK_PID; exit 1; }
npx live-server --port=5500 --no-browser

# При завершении live-server убиваем и бэкенд
kill $BACK_PID 2>/dev/null
echo "→ Серверы остановлены"