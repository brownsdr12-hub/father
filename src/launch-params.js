/**
 * Проверка подписи параметров запуска VK Mini Apps.
 *
 * Документация: https://dev.vk.com/ru/mini-apps/development/launch-params-sign
 *
 * Алгоритм:
 *   1. Взять все параметры с префиксом `vk_`
 *   2. Отсортировать по имени ключа
 *   3. Склеить в строку `ключ=значение` через `&` (значения в URL-кодировке)
 *   4. HMAC-SHA256 от строки с ЗАЩИЩЁННЫМ КЛЮЧОМ приложения
 *   5. base64, заменить `+`→`-`, `/`→`_`, убрать хвостовые `=`
 *   6. Сравнить с переданным `sign`
 *
 * ⚠️ Выполняется ТОЛЬКО на сервере: защищённый ключ не должен попадать в браузер.
 */

import { createHmac } from 'node:crypto';

/**
 * @param {string|Record<string,string>} searchOrQuery — `window.location.search` или объект параметров
 * @param {string} secureKey — защищённый ключ приложения
 * @returns {{ valid: boolean, params: Record<string,string>, userId: string|null, reason?: string }}
 */
export function verifyLaunchParams(searchOrQuery, secureKey) {
  if (!secureKey) {
    return { valid: false, params: {}, userId: null, reason: 'VK_SECURE_KEY не задан' };
  }

  let sign = null;
  const vkParams = [];

  const handle = (key, value) => {
    if (typeof value !== 'string') return;
    if (key === 'sign') sign = value;
    else if (key.startsWith('vk_')) vkParams.push({ key, value });
  };

  const params = {};

  if (typeof searchOrQuery === 'string') {
    const s = searchOrQuery.startsWith('?') ? searchOrQuery.slice(1) : searchOrQuery;
    for (const pair of s.split('&')) {
      if (!pair) continue;
      const idx = pair.indexOf('=');
      const rawKey = idx === -1 ? pair : pair.slice(0, idx);
      const rawVal = idx === -1 ? '' : pair.slice(idx + 1);
      const key = decodeURIComponent(rawKey);
      const value = decodeURIComponent(rawVal.replace(/\+/g, ' '));
      params[key] = value;
      handle(key, value);
    }
  } else {
    for (const [key, value] of Object.entries(searchOrQuery)) {
      params[key] = value;
      handle(key, value);
    }
  }

  if (!sign || vkParams.length === 0) {
    return { valid: false, params, userId: params.vk_user_id ?? null, reason: 'нет sign или vk_ параметров' };
  }

  // ⚠️ Важно: значения в строку подписи идут в URL-кодировке (запятые → %2C, пробелы → %20)
  const queryString = vkParams
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(({ key, value }) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  const expected = createHmac('sha256', secureKey)
    .update(queryString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const valid = timingSafeEqualStr(expected, sign);

  return {
    valid,
    params,
    userId: params.vk_user_id ?? null,
    reason: valid ? undefined : 'подпись не совпадает',
  };
}

/** Сравнение строк без утечки по времени */
function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
