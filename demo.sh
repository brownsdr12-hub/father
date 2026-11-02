#!/usr/bin/env bash
#
# demo.sh — запуск приложения вместе с публичным адресом для ВК.
#
# Запуск:  bash demo.sh
#
# Что делает:
#   1. Поднимает сервер приложения
#   2. Поднимает туннель Cloudflare (публичный HTTPS-адрес)
#   3. Показывает готовый адрес крупным текстом
#
# Остановить: Ctrl + C (остановит и сервер, и туннель)
#
# ⚠️ Адрес меняется при каждом запуске. После запуска его надо
#    вставить в настройки приложения ВК — в ТРИ поля.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="$(grep -E '^PORT=' .env 2>/dev/null | head -1 | cut -d= -f2 || true)"
PORT="${PORT:-3000}"

LOG="$DIR/deck/tunnel.log"
mkdir -p "$DIR/deck"

# ── Убираем прошлые процессы, чтобы не занимали порт ─────────
pkill -f "node server.js" 2>/dev/null || true
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
sleep 1

# ── Остановка по Ctrl+C ──────────────────────────────────────
cleanup() {
  echo
  echo "  Останавливаю сервер и туннель…"
  pkill -f "node server.js" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url" 2>/dev/null || true
  echo "  Готово."
  exit 0
}
trap cleanup INT TERM

echo
echo "  Свой круг — запуск демо"
echo "  ─────────────────────────────────────────────────────"

# ── Сервер ───────────────────────────────────────────────────
PUBLIC_DEMO=1 node server.js > "$DIR/deck/server.log" 2>&1 &
sleep 2

if curl -s -m 5 -o /dev/null "http://localhost:$PORT/"; then
  echo "  ✓ сервер запущен"
  echo "    браузерное демо: включено (без входа ВК, с лимитами запросов)"
  if grep -qE '^KIE_API_KEY=.+' .env 2>/dev/null; then
    echo "    тексты разбора: живые (ключ KIE найден)"
  elif grep -qE '^DEEPSEEK_API_KEY=.+' .env 2>/dev/null; then
    echo "    тексты разбора: живые (ключ DeepSeek найден)"
  else
    echo "    тексты разбора: шаблонные (ключа LLM нет)"
  fi
  if grep -qE '^VK_SECURE_KEY=.+' .env 2>/dev/null; then
    echo "    проверка подписи ВК: включена"
  else
    echo "    проверка подписи ВК: ВЫКЛЮЧЕНА (нет VK_SECURE_KEY)"
  fi
else
  echo "  ✗ сервер не поднялся — смотри deck/server.log"
  exit 1
fi

# ── Туннель ──────────────────────────────────────────────────
rm -f "$LOG"
cloudflared tunnel --url "http://localhost:$PORT" > "$LOG" 2>&1 &
echo "  … поднимаю публичный адрес"

URL=""
for _ in $(seq 1 40); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "  ✗ не удалось получить адрес — смотри deck/tunnel.log"
  cleanup
fi

# Проверяем, что адрес реально работает
if curl -s -m 20 -o /dev/null "$URL/"; then
  echo "  ✓ публичный адрес работает"
else
  echo "  ! адрес получен, но пока не отвечает — подожди 10 секунд"
fi

# ── Итог ─────────────────────────────────────────────────────
cat <<EOF

  ══════════════════════════════════════════════════════════
   ПУБЛИЧНЫЙ АДРЕС  (скопируй его целиком)

   $URL

  ══════════════════════════════════════════════════════════

  Вставь этот адрес в настройки приложения ВК — в ТРИ поля:

    dev.vk.com → приложение → Размещение
      • Мобильное приложение        → URL
      • Десктопная версия сайта     → URL
      • Мобильная версия сайта      → URL

  Затем «Сохранить» и открыть:
    https://vk.ru/app54799453

  ⚠️  Адрес живёт, пока работает это окно.
      Закроешь терминал или уснёт ноутбук — ссылка умрёт.
      Для встречи: открой этот скрипт перед презентацией.

  Остановить: Ctrl + C

EOF

wait
