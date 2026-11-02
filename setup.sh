#!/usr/bin/env bash
#
# setup.sh — подготовка окружения и вставка ключа LLM.
#
# Запуск:  bash setup.sh
#
# Что делает:
#   1. Создаёт .env из .env.example (если его ещё нет)
#   2. Говорит точный путь до .env
#   3. Открывает файл в редакторе, чтобы вставить ключ

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

ENV_FILE="$DIR/.env"
EXAMPLE="$DIR/.env.example"

echo
echo "  Свой круг — настройка окружения"
echo "  ─────────────────────────────────────────────"
echo "  Папка проекта: $DIR"
echo

if [[ ! -f "$EXAMPLE" ]]; then
  echo "  ✗ Не найден .env.example — возможно, проект перенесён не полностью."
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "  ✓ Файл .env уже существует:"
else
  cp "$EXAMPLE" "$ENV_FILE"
  echo "  ✓ Создан файл .env:"
fi

echo "    $ENV_FILE"
echo
echo "  Открываю его в редакторе."
echo "  Впиши ключ после знака «=» в строке KIE_API_KEY, сохрани и закрой."
echo

# Открываем в редакторе: nano / vim в терминале, иначе — через open
EDITOR_CMD="${EDITOR:-}"
if [[ -z "$EDITOR_CMD" ]]; then
  if command -v nano >/dev/null 2>&1; then EDITOR_CMD="nano"
  elif command -v vim >/dev/null 2>&1; then EDITOR_CMD="vim"
  fi
fi

if [[ -n "$EDITOR_CMD" && -t 0 ]]; then
  "$EDITOR_CMD" "$ENV_FILE" || true
else
  # Терминала нет — открываем в приложении по умолчанию (TextEdit)
  open -e "$ENV_FILE" 2>/dev/null || open "$ENV_FILE" || true
  echo "  Файл открыт в приложении по умолчанию."
  read -r -p "  Нажми Enter, когда закончишь редактирование… " _ || true
fi

echo
# Проверяем, что ключ реально вписан
if grep -qE '^KIE_API_KEY=.+' "$ENV_FILE"; then
  echo "  ✓ Ключ KIE_API_KEY заполнен."
  echo "    Теперь можно запускать:  bash start.sh"
else
  echo "  ! Ключ KIE_API_KEY пока пустой."
  echo "    Приложение всё равно запустится, но тексты разбора будут шаблонными."
  echo "    Впиши ключ в файл:"
  echo "      $ENV_FILE"
fi
echo
