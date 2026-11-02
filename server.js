/**
 * Демо-сервер VK Mini App «Натальная карта».
 *
 * Что делает:
 *   - отдаёт статику фронтенда
 *   - проверяет подпись параметров запуска VK (на сервере, ключ не утекает в браузер)
 *   - считает натальную карту
 *   - простой геокодер по городам
 *
 * Запуск:  node server.js
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { verifyLaunchParams } from './src/launch-params.js';
import { calculateAccurateChart } from './src/astro.js';
import { buildReport } from './src/report.js';
import { buildAnnualReport } from './src/annual.js';
import { searchCities, findCity } from './src/cities.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');

// ── Загрузка .env (без зависимостей) ─────────────────────────
async function loadEnv() {
  try {
    const raw = await readFile(join(__dirname, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const value = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env нет — работаем на переменных окружения
  }
}
await loadEnv();

const PORT = Number(process.env.PORT || 3000);
const SECURE_KEY = process.env.VK_SECURE_KEY || '';
const VK_APP_ID = String(process.env.VK_APP_ID || '');
const REQUIRE_VK_AUTH = process.env.VK_REQUIRE_AUTH === '1';
const PUBLIC_DEMO = process.env.PUBLIC_DEMO === '1';
if (REQUIRE_VK_AUTH && !PUBLIC_DEMO && (!SECURE_KEY || !VK_APP_ID)) {
  throw new Error('VK_REQUIRE_AUTH needs VK_SECURE_KEY and VK_APP_ID');
}

// A short-lived cap protects the paid model during private VK demonstrations.
const demoRequests = new Map();
function withinDemoLimit(userId, pathname) {
  const key = `${userId}:${pathname}`;
  const now = Date.now();
  const recent = (demoRequests.get(key) || []).filter((time) => now - time < 60 * 60 * 1000);
  const limit = pathname === '/api/annual' ? 6 : pathname === '/api/report' ? 12 : 40;
  if (recent.length >= limit) return false;
  recent.push(now);
  demoRequests.set(key, recent);
  return true;
}

// Public preview is intentionally bounded: annual text generation calls a paid model.
// Cloudflare supplies the visitor IP; a global daily cap also limits spoofed headers.
function withinPublicDemoLimit(req, pathname) {
  const ip = String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const perIpLimit = pathname === '/api/annual' ? 8 : pathname === '/api/report' ? 16 : 50;
  const globalLimit = pathname === '/api/annual' ? 30 : pathname === '/api/report' ? 60 : 200;
  const ipKey = `public:${ip}:${pathname}`;
  const globalKey = `public:all:${pathname}`;
  const recentIp = (demoRequests.get(ipKey) || []).filter((time) => now - time < hour);
  const recentGlobal = (demoRequests.get(globalKey) || []).filter((time) => now - time < day);
  if (recentIp.length >= perIpLimit || recentGlobal.length >= globalLimit) return false;
  recentIp.push(now);
  recentGlobal.push(now);
  demoRequests.set(ipKey, recentIp);
  demoRequests.set(globalKey, recentGlobal);
  return true;
}

/**
 * Кэш посчитанных карт в памяти — чтобы разбор не считал карту заново.
 * Для демо этого достаточно; в продакшене здесь БД.
 */
const chartCache = new Map();
const CHART_CACHE_LIMIT = 200;
const annualCache = new Map();
const ANNUAL_CACHE_LIMIT = 30;

function chartKey(body = {}) {
  return [
    body.name ?? '', body.date ?? '', body.time ?? '',
    body.latitude ?? '', body.longitude ?? '', body.tzOffsetHours ?? '',
  ].join('|');
}

function cacheSet(key, value) {
  if (chartCache.size >= CHART_CACHE_LIMIT) {
    chartCache.delete(chartCache.keys().next().value);   // вытесняем самый старый
  }
  chartCache.set(key, value);
}

// ── Утилиты ──────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ── Маршруты ─────────────────────────────────────────────────
async function handleApi(req, res, url) {
  if (['/api/chart', '/api/report', '/api/annual'].includes(url.pathname) && PUBLIC_DEMO) {
    if (!withinPublicDemoLimit(req, url.pathname)) {
      return sendJson(res, 429, { ok: false, error: 'Лимит демо-запросов временно исчерпан. Попробуйте позже.' });
    }
  } else if (REQUIRE_VK_AUTH && ['/api/chart', '/api/report', '/api/annual'].includes(url.pathname)) {
    const launchParams = req.headers['x-vk-launch-params'] || '';
    const verified = verifyLaunchParams(launchParams, SECURE_KEY);
    if (!verified.valid || verified.params.vk_app_id !== VK_APP_ID || !verified.userId) {
      return sendJson(res, 403, { ok: false, error: 'Откройте приложение через ВКонтакте.' });
    }
    if (!withinDemoLimit(verified.userId, url.pathname)) {
      return sendJson(res, 429, { ok: false, error: 'Лимит тестовых запросов на этот час исчерпан.' });
    }
  }
  // 1) Проверка запуска
  if (url.pathname === '/api/init' && req.method === 'POST') {
    const raw = await readBody(req);
    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      return sendJson(res, 400, { ok: false, error: 'bad json' });
    }

    const query = payload.launchParams ?? '';
    const result = verifyLaunchParams(query, SECURE_KEY);
    const signatureValid = result.valid && (!VK_APP_ID || result.params.vk_app_id === VK_APP_ID);

    return sendJson(res, 200, {
      ok: true,
      signatureValid,
      signatureChecked: Boolean(SECURE_KEY),
      userId: result.userId,
      reason: result.reason,
      // Сообщаем фронту, режим разработки или реальный запуск
      mode: signatureValid ? 'vk' : PUBLIC_DEMO ? 'demo' : 'dev',
    });
  }

  // 2) Геокодер — подсказки при вводе
  if (url.pathname === '/api/geo' && req.method === 'GET') {
    const q = url.searchParams.get('q') ?? '';
    return sendJson(res, 200, { ok: true, items: searchCities(q) });
  }

  // 2b) Ручной ввод города, которого нет в подсказках
  if (url.pathname === '/api/geo/resolve' && req.method === 'POST') {
    const raw = await readBody(req);
    let body;
    try { body = JSON.parse(raw || '{}'); }
    catch { return sendJson(res, 400, { ok: false, error: 'bad json' }); }

    const name = String(body.name ?? '').trim();
    if (!name) return sendJson(res, 400, { ok: false, error: 'укажите название города' });

    const exact = findCity(name);
    if (exact) {
      return sendJson(res, 200, {
        ok: true,
        matched: true,
        city: { name: exact.name, lat: exact.lat, lon: exact.lon, tz: exact.tz },
      });
    }

    // Города нет в справочнике — предлагаем ближайшие варианты,
    // чтобы человек мог выбрать, а не остаться без результата
    const near = searchCities(name, 4);
    return sendJson(res, 200, {
      ok: true,
      matched: false,
      suggestions: near,
      note: 'Города нет в демо-справочнике. Выберите ближайший или укажите координаты вручную.',
    });
  }

  // 3) Расчёт карты
  if (url.pathname === '/api/chart' && req.method === 'POST') {
    const raw = await readBody(req);
    let body;
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      return sendJson(res, 400, { ok: false, error: 'bad json' });
    }

    const { name, date, time, latitude, longitude, tzOffsetHours } = body;

    if (!date || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return sendJson(res, 400, { ok: false, error: 'нужны date, latitude, longitude' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendJson(res, 400, { ok: false, error: 'date в формате YYYY-MM-DD' });
    }
    if (time && !/^\d{2}:\d{2}$/.test(time)) {
      return sendJson(res, 400, { ok: false, error: 'time в формате HH:MM' });
    }

    const chart = calculateAccurateChart({
      name: String(name ?? '').slice(0, 80),
      date,
      time: time || undefined,
      latitude,
      longitude,
      tzOffsetHours: typeof tzOffsetHours === 'number' ? tzOffsetHours : 3,
    });

    cacheSet(chartKey(body), chart);

    return sendJson(res, 200, { ok: true, chart });
  }

  // 4) Полный разбор (для демо — «после оплаты»)
  if (url.pathname === '/api/report' && req.method === 'POST') {
    const raw = await readBody(req);
    let body;
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      return sendJson(res, 400, { ok: false, error: 'bad json' });
    }

    const key = chartKey(body);
    let chart = chartCache.get(key);

    // Если карту не считали в этой сессии — считаем заново
    if (!chart) {
      chart = calculateAccurateChart({
        name: String(body.name ?? '').slice(0, 80),
        date: body.date,
        time: body.time || undefined,
        latitude: body.latitude,
        longitude: body.longitude,
        tzOffsetHours: typeof body.tzOffsetHours === 'number' ? body.tzOffsetHours : 3,
      });
    }

    const report = await buildReport(chart, { useLlm: body.useLlm !== false });
    return sendJson(res, 200, { ok: true, report });
  }

  // 5) Персональный годовой атлас для демо. Покупки здесь нет.
  if (url.pathname === '/api/annual' && req.method === 'POST') {
    const raw=await readBody(req);
    let body;
    try{body=JSON.parse(raw||'{}');}
    catch{return sendJson(res,400,{ok:false,error:'bad json'});}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(body.date||'')
        ||(body.time&&!/^\d{2}:\d{2}$/.test(body.time))
        ||typeof body.latitude!=='number'||typeof body.longitude!=='number'){
      return sendJson(res,400,{ok:false,error:'Укажите дату, время и координаты рождения.'});
    }
    const key=chartKey(body);
    const chart=chartCache.get(key)||calculateAccurateChart({
      name:String(body.name||'').slice(0,80),date:body.date,time:body.time||undefined,
      latitude:body.latitude,longitude:body.longitude,
    });
    const periodKey=new Date().toISOString().slice(0,7);
    const annualKey=key+'|'+periodKey+'|'+String(body.useLlm!==false);
    let annual=annualCache.get(annualKey);
    if(!annual){
      annual=await buildAnnualReport(chart,{useLlm:body.useLlm!==false});
      if(annualCache.size>=ANNUAL_CACHE_LIMIT)annualCache.delete(annualCache.keys().next().value);
      annualCache.set(annualKey,annual);
    }
    return sendJson(res,200,{ok:true,annual:{...annual,birth:{...annual.birth,
      cityName:String(body.cityName||'').trim().slice(0,100)}}});
  }

  return sendJson(res, 404, { ok: false, error: 'not found' });
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/orbit.html';

  // Защита от выхода за пределы public/
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, safe);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('forbidden');
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) throw new Error('is dir');
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'Content-Length': data.length,
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const t0 = Date.now();

  // Логируем каждый запрос: это единственный способ увидеть, доходит ли
  // запрос с телефона до сервера и с какого он устройства.
  const ua = req.headers['user-agent'] || '';
  const device = /iPhone/i.test(ua) ? 'iPhone'
    : /iPad/i.test(ua) ? 'iPad'
    : /Android/i.test(ua) ? 'Android'
    : /VKAndroidApp|VKiOSApp|VKApp/i.test(ua) ? 'VK-app'
    : 'desktop';

  res.on('finish', () => {
    console.log(`[req] ${device} ${req.method} ${url.pathname} → ${res.statusCode} (${Date.now() - t0}ms)`);
  });

  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (err) {
    console.error('[error]', err);
    sendJson(res, 500, { ok: false, error: 'internal' });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Натальная карта — демо`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Проверка подписи VK: ${SECURE_KEY ? 'включена' : 'ВЫКЛЮЧЕНА (нет VK_SECURE_KEY)'}\n`);
  console.log(`  Публичное демо: ${PUBLIC_DEMO ? 'включено (с лимитами)' : 'выключено'}`);
});
