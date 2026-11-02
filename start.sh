#!/usr/bin/env bash
#
# start.sh — запуск демо-приложения.
#
# Запуск:  bash start.sh
#
# Перед первым запуском выполни:  bash setup.sh

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

ENV_FILE="$DIR/.env"
PORT="$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2 || true)"
PORT="${PORT:-3000}"

echo
echo "  Свой круг — запуск"
echo "  ─────────────────────────────────────────────"
echo "  Папка: $DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "  ! Файла .env нет. Сначала выполни:  bash setup.sh"
  echo
fi

if grep -qE '^KIE_API_KEY=.+' "$ENV_FILE" 2>/dev/null; then
  echo "  Тексты разбора: живые (KIE, ключ найден)"
elif grep -qE '^DEEPSEEK_API_KEY=.+' "$ENV_FILE" 2>/dev/null; then
  echo "  Тексты разбора: живые (DeepSeek напрямую)"
else
  echo "  Тексты разбора: шаблонные (ключа LLM нет)"
fi

echo "  Адрес: http://localhost:$PORT"
echo
echo "  Остановить: Ctrl + C"
echo

node server.js
