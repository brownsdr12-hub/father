/**
 * Расчёт положений планет.
 *
 * ⚠️ ЧЕСТНОЕ ПРЕДУПРЕЖДЕНИЕ
 * Сейчас здесь упрощённая аналитическая модель (средние элементы орбит + первый
 * порядок уравнения центра). Точность — порядка 0.1–1° для Солнца и Луны.
 *
 * Этого ХВАТАЕТ, чтобы демо выглядело и работало, но НЕ хватает для продакшена:
 * натальная карта чувствительна к градусам.
 *
 * Старый аналитический движок оставлен для сравнения. Серверная демоверсия
 * использует Astronomy Engine из astro.js. Swiss Ephemeris имеет отдельные
 * условия лицензирования и не подключён к этому проекту.
 */

const DEG = Math.PI / 180;
const J2000 = 2451545.0;

const SIGNS = [
  'Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева',
  'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы',
];

/** Unicode-символы знаков. Требуют symbol-шрифтов в CSS (см. .zy в index.html) */
export const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
export const SIGN_NAMES = SIGNS;

const PLANET_GLYPHS = { Солнце: '☉', Луна: '☽', Меркурий: '☿', Венера: '♀', Марс: '♂', Юпитер: '♃', Сатурн: '♄' };

/** Юлианская дата из UTC */
export function toJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function norm360(x) {
  return ((x % 360) + 360) % 360;
}

/**
 * Решение уравнения Кеплера M = E - e·sin(E) методом Ньютона.
 * @param {number} M средняя аномалия, радианы
 * @param {number} e эксцентриситет
 */
function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 12; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/**
 * Гелиоцентрическая эклиптическая долгота и радиус.
 * @param {number} T столетия от J2000
 * @param {object} el элементы: a (а.е.), e, i, L (средняя долгота), w (аргумент перигелия), om (долгота узла)
 */
function heliocentric(T, el) {
  const a = el.a + (el.aDot ?? 0) * T;
  const e = el.e + (el.eDot ?? 0) * T;
  const i = (el.i + (el.iDot ?? 0) * T) * DEG;
  const L = (el.L + (el.LDot ?? 0) * T) * DEG;
  const w = (el.w + (el.wDot ?? 0) * T) * DEG;
  const om = (el.om + (el.omDot ?? 0) * T) * DEG;

  const M = L - w;                 // средняя аномалия
  const E = solveKepler(M, e);

  // Истинная аномалия
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E));  // радиус-вектор

  // Аргумент широты
  const u = nu + w;

  // Гелиоцентрические эклиптические координаты
  const x = r * (Math.cos(om) * Math.cos(u) - Math.sin(om) * Math.sin(u) * Math.cos(i));
  const y = r * (Math.sin(om) * Math.cos(u) + Math.cos(om) * Math.sin(u) * Math.cos(i));
  const z = r * (Math.sin(u) * Math.sin(i));

  return { x, y, z, r, lon: norm360(Math.atan2(y, x) / DEG) };
}

// Средние элементы орбит планет на J2000 (JPL, приближение)
const ELEMENTS = {
  Меркурий: { a: 0.38709927, aDot: 0.00000037, e: 0.20563593, eDot: 0.00001906, i: 7.00497902, iDot: -0.00594749, L: 252.25032350, LDot: 149472.67411175, w: 77.45779628, wDot: 0.16047689, om: 48.33076593, omDot: -0.12534081 },
  Венера:   { a: 0.72333566, aDot: 0.00000390, e: 0.00677672, eDot: -0.00004107, i: 3.39467605, iDot: -0.00078890, L: 181.97909950, LDot: 58517.81538729, w: 131.60246718, wDot: 0.00268329, om: 76.67984255, omDot: -0.27769418 },
  Земля:    { a: 1.00000261, aDot: 0.00000562, e: 0.01671123, eDot: -0.00004392, i: -0.00001531, iDot: -0.01294668, L: 100.46457166, LDot: 35999.37244981, w: 102.93768193, wDot: 0.32327364, om: 0.0, omDot: 0.0 },
  Марс:     { a: 1.52371034, aDot: 0.00001847, e: 0.09339410, eDot: 0.00007882, i: 1.84969142, iDot: -0.00813131, L: -4.55343205, LDot: 19140.30268499, w: -23.94362959, wDot: 0.44441088, om: 49.55953891, omDot: -0.29257343 },
  Юпитер:   { a: 5.20288700, aDot: -0.00011607, e: 0.04838624, eDot: -0.00013253, i: 1.30439695, iDot: -0.00183714, L: 34.39644051, LDot: 3034.74612775, w: 14.72847983, wDot: 0.21252668, om: 100.47390909, omDot: 0.20469106 },
  Сатурн:   { a: 9.53667594, aDot: -0.00125060, e: 0.05386179, eDot: -0.00050991, i: 2.48599187, iDot: 0.00193609, L: 49.95424423, LDot: 1222.49362201, w: 92.59887831, wDot: -0.41897216, om: 113.66242448, omDot: -0.28867794 },
};

/**
 * Геоцентрическая эклиптическая долгота планеты, градусы.
 */
function planetLongitude(T, name) {
  const earth = heliocentric(T, ELEMENTS.Земля);
  const p = heliocentric(T, ELEMENTS[name]);
  // Вектор Земля → планета
  const dx = p.x - earth.x;
  const dy = p.y - earth.y;
  return norm360(Math.atan2(dy, dx) / DEG);
}

/**
 * Долгота Солнца, как видно с Земли.
 * Солнце находится в противоположной от Земли точке: lon = lon(Земля) + 180°
 * (приближение, но для Солнца даёт хорошую точность).
 */
function sunLongitude(T) {
  const earth = heliocentric(T, ELEMENTS.Земля);
  // Истинная долгота Солнца = долгота Земли + 180°, но с учётом истинной аномалии
  return norm360(earth.lon + 180);
}

/**
 * Долгота Луны — упрощённая модель (основные члены).
 * Точность ~0.3°, для демо достаточно.
 */
function moonLongitude(T) {
  const Lp = 218.3164477 + 481267.88123421 * T;   // средняя долгота Луны
  const D  = 297.8501921 + 445267.1114034 * T;    // средняя элонгация
  const M  = 357.5291092 + 35999.0502909 * T;     // средняя аномалия Солнца
  const Mp = 134.9633964 + 477198.8675055 * T;    // средняя аномалия Луны
  const F  =  93.2720950 + 483202.0175233 * T;    // аргумент широты

  const lon =
    Lp +
    6.288774 * Math.sin(Mp * DEG) +
    1.274027 * Math.sin((2 * D - Mp) * DEG) +
    0.658314 * Math.sin(2 * D * DEG) +
    0.213618 * Math.sin(2 * Mp * DEG) -
    0.185116 * Math.sin(M * DEG) -
    0.114332 * Math.sin(2 * F * DEG) +
    0.058793 * Math.sin((2 * D - 2 * Mp) * DEG) +
    0.057066 * Math.sin((2 * D - M - Mp) * DEG) +
    0.053322 * Math.sin((2 * D + Mp) * DEG) +
    0.045758 * Math.sin((2 * D - M) * DEG);

  return norm360(lon);
}

/** Перевод долготы в знак + градус внутри знака */
export function describeLongitude(lon) {
  const rounded = norm360(Math.round(norm360(lon) * 60) / 60);
  const index = Math.floor(rounded / 30) % 12;
  const inSign = rounded - index * 30;
  const deg = Math.floor(inSign);
  const min = Math.round((inSign - deg) * 60);
  return {
    longitude: Number(norm360(lon).toFixed(4)),
    signIndex: index,
    sign: SIGNS[index],
    signGlyph: SIGN_GLYPHS[index],
    degreeInSign: deg,
    minuteInSign: min,
    label: `${deg}° ${String(min).padStart(2, '0')}' ${SIGNS[index]}`,
  };
}

/**
 * Точка Асцендента.
 * ⚠️ Упрощённая формула (без учёта истинной звёздной поправки и наклона эклиптики
 * в полном виде). Даёт корректный знак в большинстве случаев, но для продакшена
 * нужен полноценный расчёт домов (Плацидус/Кох) из Swiss Ephemeris.
 */
export function ascendantLongitude(jd, latitude, longitude) {
  const T = (jd - J2000) / 36525.0;
  const gmst = 280.46061837 + 360.98564736629 * (jd - J2000);  // звёздное время в Гринвиче
  const lst = norm360(gmst + longitude);                        // местное звёздное время
  const eps = 23.4392911 - 0.0130042 * T;                       // наклон эклиптики
  const asc = Math.atan2(
    Math.cos(lst * DEG),
    -(Math.sin(lst * DEG) * Math.cos(eps * DEG) + Math.tan(latitude * DEG) * Math.sin(eps * DEG)),
  );
  return norm360(asc / DEG);
}

/**
 * Главная функция: считает карту по данным рождения.
 *
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.date  — YYYY-MM-DD
 * @param {string} [input.time] — HH:MM (если нет — берём 12:00 и помечаем приблизительность)
 * @param {number} input.latitude
 * @param {number} input.longitude
 * @param {number} [input.tzOffsetHours=3] — смещение часового пояса
 * @returns {object} карта
 */
export function calculateChart(input) {
  const { name, date, time, latitude, longitude, tzOffsetHours = 3 } = input;

  const [y, m, d] = date.split('-').map(Number);
  const hasTime = Boolean(time);
  const [hh, mm] = hasTime ? time.split(':').map(Number) : [12, 0];

  // Переводим местное время в UTC
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - tzOffsetHours * 3600 * 1000;
  const utcDate = new Date(utcMs);
  const jd = toJulianDate(utcDate);
  const T = (jd - J2000) / 36525.0;

  const bodies = [
    { name: 'Солнце', glyph: PLANET_GLYPHS.Солнце, lon: sunLongitude(T) },
    { name: 'Луна', glyph: PLANET_GLYPHS.Луна, lon: moonLongitude(T) },
    { name: 'Меркурий', glyph: PLANET_GLYPHS.Меркурий, lon: planetLongitude(T, 'Меркурий') },
    { name: 'Венера', glyph: PLANET_GLYPHS.Венера, lon: planetLongitude(T, 'Венера') },
    { name: 'Марс', glyph: PLANET_GLYPHS.Марс, lon: planetLongitude(T, 'Марс') },
    { name: 'Юпитер', glyph: PLANET_GLYPHS.Юпитер, lon: planetLongitude(T, 'Юпитер') },
    { name: 'Сатурн', glyph: PLANET_GLYPHS.Сатурн, lon: planetLongitude(T, 'Сатурн') },
  ];

  const asc = ascendantLongitude(jd, latitude, longitude);

  return {
    input: { name, date, time: time ?? null, hasTime, latitude, longitude, tzOffsetHours },
    utc: utcDate.toISOString(),
    julianDate: Number(jd.toFixed(6)),
    bodies: bodies.map((b) => ({
      name: b.name,
      glyph: b.glyph,
      ...describeLongitude(b.lon),
    })),
    ascendant: {
      name: 'Асцендент',
      glyph: 'AC',
      approximate: !hasTime,
      ...describeLongitude(asc),
    },
    accuracy: {
      engine: 'analytic-lite',
      warning: 'Демо-расчёт (упрощённая модель). Для продакшена — Swiss Ephemeris.',
      ascendantApproximate: !hasTime,
    },
  };
}
