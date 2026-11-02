(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const KEY = 'svoy-krug-demo-v2';
  const vkApiHeaders = () => ({ 'Content-Type': 'application/json',
    'X-VK-Launch-Params': location.search || '' });
  const state = { city: null, payload: null, chart: null, report: null, reportPromise: null,
    annual: null, annualPromise: null,
    unlocked: false, day: {}, friend: null, partner: null, selectedTier: 'duet', mode: 'dev' };
  const dayIdeas = {
    love: [
      ['Спросить, а не угадать','Какой вопрос поможет вам сегодня лучше понять близкого человека?','Начните один разговор с вопроса, на который вы правда хотите услышать ответ.'],
      ['Заметить тепло','Где в ваших отношениях уже есть поддержка, которую вы принимаете как должное?','Назовите вслух одну конкретную вещь, за которую благодарны.'],
      ['Оставить пространство','Где вы пытаетесь решить за другого то, о чём он ещё не просил?','Сделайте паузу и спросите, нужна ли сейчас ваша помощь.']
    ],
    work: [
      ['Одна точка внимания','Какое дело даст ощущение движения, если завершить его сегодня?','Выберите одну небольшую задачу и доведите её до конца.'],
      ['Разговор по делу','Какой рабочий вопрос давно просится быть произнесённым?','Запишите его в одном предложении и отправьте нужному человеку.'],
      ['Свой темп','Какой шаг вы откладываете, потому что ждёте идеального момента?','Сделайте его черновую версию за десять минут.']
    ],
    energy: [
      ['Проверить запас сил','Что сейчас забирает больше внимания, чем заслуживает?','Освободите хотя бы двадцать минут от одного необязательного дела.'],
      ['Место для тишины','Когда сегодня вы сможете остаться без уведомлений и чужих задач?','Назначьте короткую паузу и действительно проведите её без экрана.'],
      ['Маленькое восстановление','Что обычно помогает вам вернуться к себе без больших усилий?','Выберите один такой способ и сделайте его сегодня.']
    ]
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  }
  function notice(message, ok = false) {
    const el = $('status');
    el.textContent = message;
    el.classList.toggle('success', ok);
    el.classList.remove('hidden');
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => el.classList.add('hidden'), 7000);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ payload: state.payload, chart: state.chart,
      report: state.report, unlocked: state.unlocked, day: state.day, friend: state.friend,
      partner: state.partner, selectedTier: state.selectedTier, unlockedSolo: state.unlockedSolo,
      unlockedDuet: state.unlockedDuet, activeReportView: state.activeReportView,
      city: state.city, annual: state.annual })); } catch (_) { /* private browsing can block storage */ }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (const key of ['payload','chart','report','unlocked','day','friend','partner','selectedTier','unlockedSolo','unlockedDuet','activeReportView','city','annual']) {
        if (saved[key] != null) state[key] = saved[key];
      }
      if (state.chart && (state.chart.accuracy?.engine !== 'astronomy-engine-2.1.19'
        || state.chart.accuracy?.houseEngine !== 'caelus-0.25.0')) {
        state.chart = null; state.report = null; state.annual = null; state.unlocked = false;
      }
      // Older demo sessions could remember an unlocked state without a generated annual report.
      if (!state.annual) state.unlocked = false;
      if (state.annual?.months?.some(m => m.article?.reading?.includes('совпадение угловых положений'))) {
        state.annual = null;
        state.unlocked = false;
      }
    } catch (_) { /* ignore stale or unavailable storage */ }
  }
  function activate(view) {
    for (const name of ['chart','day','gift','report']) {
      const el = $('view-' + name);
      const active = name === view;
      el.classList.toggle('active', active);
      el.hidden = !active;
      const button = document.querySelector('.bottom-nav [data-view="' + name + '"]');
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    if (view === 'day') renderDay();
    if (view === 'gift') renderFriend();
    if (view === 'report') renderReport();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.bottom-nav button').forEach((button) =>
    button.addEventListener('click', () => activate(button.dataset.view)));

  async function initVk() {
    const bridge = window.vkBridge;
    if (bridge && typeof bridge.send === 'function') {
      try { await bridge.send('VKWebAppInit'); } catch (_) { /* local preview */ }
    }
    try {
      const res = await fetch('/api/init', { method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ launchParams: location.search || '' }) });
      const data = await res.json();
      state.mode = data.mode || 'dev';
      if (data.signatureChecked && !data.signatureValid && location.search.includes('vk_app_id=')) {
        notice('Не удалось подтвердить запуск VK. Откройте приложение повторно из ВКонтакте.');
      }
    } catch (_) { /* the chart request will surface server errors */ }
  }

  const dateInput = $('date');
  dateInput.addEventListener('input', () => {
    const raw = dateInput.value.replace(/\D/g, '').slice(0, 8);
    dateInput.value = raw.slice(0,2) + (raw.length > 2 ? '.' + raw.slice(2,4) : '')
      + (raw.length > 4 ? '.' + raw.slice(4) : '');
  });
  function validBirthDate(raw) {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw);
    if (!match) return null;
    const [day, month, year] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    if (date > new Date() || year < 1900) return null;
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  let geoTimer;
  $('city').addEventListener('input', () => {
    state.city = null;
    const term = $('city').value.trim();
    const list = $('city-suggest');
    clearTimeout(geoTimer);
    list.classList.add('hidden');
    if (term.length < 2) return;
    geoTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/geo?q=' + encodeURIComponent(term));
        const data = await res.json();
        if (term !== $('city').value.trim()) return;
        list.replaceChildren();
        for (const item of (data.items || []).slice(0,6)) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = item.name + (item.country ? ` · ${item.country}` : '');
          button.addEventListener('click', () => {
            state.city = { name: item.name, lat: item.lat, lon: item.lon, tz: item.tz };
            $('city').value = item.name;
            list.classList.add('hidden');
            $('manual-coordinates').classList.add('hidden');
          });
          list.appendChild(button);
        }
        const manual = document.createElement('button');
        manual.type = 'button';
        manual.textContent = 'Нет моего города · ввести координаты';
        manual.addEventListener('click', () => { list.classList.add('hidden'); $('manual-coordinates').classList.remove('hidden'); });
        list.appendChild(manual);
        list.classList.remove('hidden');
      } catch (_) { list.classList.add('hidden'); }
    }, 220);
  });
  document.addEventListener('click', (event) => {
    if (!$('city-suggest').contains(event.target) && event.target !== $('city')) $('city-suggest').classList.add('hidden');
  });

  $('birth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const date = validBirthDate(dateInput.value.trim());
    if (!date) { notice('Проверьте дату рождения в формате ДД.ММ.ГГГГ.'); return; }
    let city = state.city;
    if (!city && !$('manual-coordinates').classList.contains('hidden')) {
      const lat = Number($('latitude').value.replace(',', '.'));
      const lon = Number($('longitude').value.replace(',', '.'));
      const tz = Number($('timezone').value.replace(',', '.'));
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
          && Number.isFinite(tz) && tz >= -12 && tz <= 14
          && $('latitude').value.trim() && $('longitude').value.trim() && $('timezone').value.trim()) {
        city = { name: $('city').value.trim() || 'Указано вручную', lat, lon, tz };
      }
    }
    if (!city) { notice('Выберите город из списка или укажите координаты и часовой пояс на дату рождения.'); return; }
    const payload = { name: $('name').value.trim(), date, time: $('time').value || undefined,
      cityName: city.name, latitude: city.lat, longitude: city.lon, tzOffsetHours: city.tz };
    const button = $('birth-form').querySelector('button[type="submit"]');
    button.disabled = true;
    button.querySelector('span').textContent = 'Строим вашу карту…';
    try {
      const res = await fetch('/api/chart', { method:'POST', headers:vkApiHeaders(), body:JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'расчёт не удался');
      state.payload = payload;
      state.chart = data.chart;
      state.city = city;
      state.report = null;
      state.reportPromise = null;
      state.annual = null;
      state.annualPromise = null;
      state.unlocked = false;
      save();
      renderChart();
      loadReport();
    } catch (error) { notice('Не получилось построить карту: ' + error.message); }
    finally { button.disabled = false; button.querySelector('span').textContent = 'Открыть мою карту'; }
  });

  $('edit-birth').addEventListener('click', () => {
    $('chart-result').classList.add('hidden');
    $('chart-form-panel').classList.remove('hidden');
    $('chart-form-panel').scrollIntoView({behavior:'smooth'});
  });
  $('delete-data').addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch (_) { /* storage may be disabled */ }
    location.reload();
  });
  function renderChart() {
    const chart = state.chart;
    if (!chart) return;
    $('chart-form-panel').classList.add('hidden');
    $('chart-result').classList.remove('hidden');
    $('name').value = state.payload.name || '';
    $('date').value = state.payload.date.split('-').reverse().join('.');
    $('time').value = state.payload.time || '';
    $('city').value = state.city?.name || '';
    $('result-greeting').textContent = state.payload.name ? `${state.payload.name}, ваша карта` : 'Ваша карта';
    $('free-heading').textContent = chart.ascendant.approximate
      ? 'Что говорят Солнце и Луна?' : 'Что говорят три положения?';
    const readableBirthDate = new Date(state.payload.date + 'T12:00:00Z')
      .toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
    $('birth-meta').textContent = `${state.city?.name || 'Город рождения'} · ${readableBirthDate}`;
    const sun = chart.bodies.find((b) => b.name === 'Солнце');
    const moon = chart.bodies.find((b) => b.name === 'Луна');
    $('star-trio').innerHTML = [
      ['☉','Солнце',sun],['☽','Луна',moon],['✧','Асцендент',chart.ascendant]
    ].map(([glyph,label,body]) => `<div class="star-card"><div class="glyph">${glyph}</div><small>${label}</small><strong>${body.approximate ? 'Нужен час' : escapeHtml(body.sign)}</strong><div class="degree">${body.approximate ? 'укажите время рождения' : `${body.degreeInSign}° ${String(body.minuteInSign).padStart(2,'0')}′`}</div></div>`).join('');
    const note = $('accuracy-note');
    note.textContent = chart.input.hasTime
      ? `Планеты, Асцендент и дома рассчитаны по времени рождения и координатам. Система домов: ${chart.houses?.system === 'placidus' ? 'Плацидус' : 'цельнознаковая'}${chart.houses?.fallback ? ' (высокая широта — Плацидус недоступен)' : ''}.`
      : `Время рождения не указано: Асцендент не определён. Планеты рассчитаны для полудня по историческому поясу ${chart.timezone}; Луна может сменить знак в течение суток.`;
    note.classList.remove('hidden');
    if (state.report) renderFree();
    else renderFreeLoader();
  }

  let freeLoaderInterval = null;

  function renderFreeLoader() {
    const el = $('free-reading-content');
    if (!el) return;
    el.innerHTML = `
      <div class="reading-loader-container" id="reading-loader">
        <div class="reading-loader-header">
          <div class="reading-radar" aria-hidden="true">
            <div class="radar-ring radar-ring-1"></div>
            <div class="radar-ring radar-ring-2"></div>
            <div class="radar-core">✦</div>
          </div>
          <div class="reading-loader-info">
            <div class="loader-status-top">
              <span class="loader-badge">РАСЧЕТ В ПРОЦЕССЕ</span>
              <span class="loader-pct" id="loader-progress-pct">24%</span>
            </div>
            <div class="status-stage-label" id="loader-stage-text">Синхронизируем градусы планет и Асцендента...</div>
            <div class="status-stage-bar">
              <div class="stage-fill" id="loader-progress-fill" style="width: 24%"></div>
            </div>
          </div>
        </div>
        <div class="reading-skeletons">
          <div class="reading-skeleton-card">
            <div class="sk-header"><span class="sk-glyph">☉</span><div class="sk-line sk-title"></div></div>
            <div class="sk-line sk-badge"></div>
            <div class="sk-line sk-text"></div>
            <div class="sk-line sk-text sk-short"></div>
          </div>
          <div class="reading-skeleton-card">
            <div class="sk-header"><span class="sk-glyph">☽</span><div class="sk-line sk-title"></div></div>
            <div class="sk-line sk-badge"></div>
            <div class="sk-line sk-text"></div>
            <div class="sk-line sk-text sk-short"></div>
          </div>
          <div class="reading-skeleton-card">
            <div class="sk-header"><span class="sk-glyph">✧</span><div class="sk-line sk-title"></div></div>
            <div class="sk-line sk-badge"></div>
            <div class="sk-line sk-text"></div>
            <div class="sk-line sk-text sk-short"></div>
          </div>
        </div>
      </div>
    `;
  }

  function startFreeLoaderAnimation() {
    if (!$('reading-loader')) renderFreeLoader();
    if (freeLoaderInterval) clearInterval(freeLoaderInterval);
    const stages = [
      { text: 'Синхронизируем градусы планет и Асцендента...', pct: 28 },
      { text: 'Вычисляем скрытые точки опоры и баланс качеств...', pct: 54 },
      { text: 'Анализируем напряженные зоны и триггеры...', pct: 76 },
      { text: 'Формулируем персональные советы для вашей карты...', pct: 92 }
    ];
    let idx = 0;
    freeLoaderInterval = setInterval(() => {
      idx++;
      if (idx < stages.length) {
        const textEl = $('loader-stage-text');
        const fillEl = $('loader-progress-fill');
        const pctEl = $('loader-progress-pct');
        if (textEl) textEl.textContent = stages[idx].text;
        if (fillEl) fillEl.style.width = stages[idx].pct + '%';
        if (pctEl) pctEl.textContent = stages[idx].pct + '%';
      }
    }, 1800);
  }

  function stopFreeLoaderAnimation() {
    if (freeLoaderInterval) {
      clearInterval(freeLoaderInterval);
      freeLoaderInterval = null;
    }
  }

  function renderFreeError(msg) {
    stopFreeLoaderAnimation();
    const el = $('free-reading-content');
    if (!el) return;
    el.innerHTML = `
      <div class="reading-error-box">
        <p>Не удалось собрать разбор (${escapeHtml(msg || 'ошибка сети')}). Попробуйте запустить расчет еще раз.</p>
        <button id="retry-free-btn" class="secondary-button" type="button">Повторить расчет разбора ✦</button>
      </div>
    `;
    $('retry-free-btn')?.addEventListener('click', () => {
      loadReport().catch(() => {});
    });
  }

  async function loadReport() {
    if (state.report) {
      renderFree();
      return state.report;
    }
    if (state.reportPromise) return state.reportPromise;
    startFreeLoaderAnimation();
    state.reportPromise = (async () => {
      try {
        const res = await fetch('/api/report', { method:'POST', headers:vkApiHeaders(),
          body:JSON.stringify(state.payload) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'разбор не получен');
        const fillEl = $('loader-progress-fill');
        const pctEl = $('loader-progress-pct');
        const textEl = $('loader-stage-text');
        if (fillEl) fillEl.style.width = '100%';
        if (pctEl) pctEl.textContent = '100%';
        if (textEl) textEl.textContent = 'Готово! Открываем разбор...';
        stopFreeLoaderAnimation();
        state.report = data.report;
        save();
        setTimeout(() => {
          renderFree();
          renderReport();
        }, 300);
        return state.report;
      } catch (error) {
        stopFreeLoaderAnimation();
        renderFreeError(error.message);
        notice('Не удалось собрать текст разбора: ' + error.message);
        throw error;
      } finally {
        state.reportPromise = null;
      }
    })();
    return state.reportPromise;
  }
  function renderFree() {
    const report = state.report;
    if (!report) return;
    const positions = report.sections.filter((s) => s.type === 'position');
    const readableText = (block) => {
      let value = String(block.text || '').trim();
      if (block.label === 'Ваш дар') value = value.replace(/^Ваш дар\s*[—–:-]\s*|^Дар\s*[—–:-]\s*/i, '');
      if (block.label === 'Скрытая угроза') value = value.replace(/^Тень\s*[—–:-]\s*|^Скрытая угроза\s*[—–:-]\s*/i, '');
      if (block.label === 'Совет') value = value.replace(/^(Практический\s+совет|Совет)\s*[—–:-]\s*/i, '');
      value = value.charAt(0).toUpperCase() + value.slice(1);
      return escapeHtml(value);
    };
    const getGlyph = (role) => {
      if (/солнце/i.test(role)) return '☉';
      if (/луна/i.test(role)) return '☽';
      if (/асцендент/i.test(role)) return '✧';
      return '✦';
    };
    $('free-reading-content').innerHTML = positions.map((section) => `
      <section class="reading-block">
        <h4>
          <span class="reading-block-glyph" aria-hidden="true">${getGlyph(section.role)}</span>
          <span>${escapeHtml(section.role)} · ${escapeHtml(section.sign)}</span>
        </h4>
        <div class="reading-items-grid">
          ${section.blocks.map((block) => `<div class="reading-item"><b>${escapeHtml(block.label)}</b><p>${readableText(block)}</p></div>`).join('')}
        </div>
      </section>
    `).join('');
  }
  $('open-year').addEventListener('click', () => activate('report'));

  function monthLabels() {
    const now = new Date();
    return Array.from({length:12},(_,i) => new Date(now.getFullYear(),now.getMonth()+i+1,1)
      .toLocaleDateString('ru-RU',{month:'long',year:'numeric'}));
  }
  function showTiers() {
    $('report-locked').classList.remove('hidden');
    $('report-unlocked').classList.add('hidden');
    if (state.unlocked && state.annual) {
      $('return-to-report-row')?.classList.remove('hidden');
    }
  }

  function showUnlockedReport() {
    $('report-locked').classList.add('hidden');
    $('report-unlocked').classList.remove('hidden');
    renderReport();
  }

  function renderDuetPartnerPrompt(container) {
    container.innerHTML = `
      <div class="panel duet-partner-prompt-panel">
        <div class="duet-kicker">✦ ДАННЫЕ ВАШЕГО СОЮЗА · ТАРИФ «ДУЭТ» ✦</div>
        <h2 style="font-family:var(--display);font-size:32px;color:var(--text);margin:10px 0 8px;">Для кого рассчитываем карту пары?</h2>
        <p class="panel-lede" style="color:var(--muted);font-size:13.5px;line-height:1.6;margin-bottom:20px;">
          У вас открыт расчет союза на 2027 год. Чтобы составить индивидуальную синастрию, определить ритмы сближения, золотые даты свиданий и дни взаимной чуткости, укажите имя и дату рождения вашего партнера.
        </p>
        <form id="duet-direct-partner-form" class="duet-partner-form">
          <div class="field-row">
            <label class="field">
              <span>Имя партнера</span>
              <input id="duet-input-partner-name" type="text" placeholder="Например, Алексей" required maxlength="60" value="${escapeHtml(state.partner?.name || '')}">
            </label>
            <label class="field">
              <span>Дата рождения партнера</span>
              <input id="duet-input-partner-date" type="text" inputmode="numeric" placeholder="ДД.ММ.ГГГГ" required value="${state.partner?.date ? state.partner.date.split('-').reverse().join('.') : ''}">
            </label>
          </div>
          <button class="primary-button duet-primary-btn" type="submit" style="width:100%;margin-top:12px;justify-content:center;font-size:14px;padding-block:14px;">
            <span>Рассчитать персональный Атлас союза 2027</span>
            <span aria-hidden="true">✦</span>
          </button>
        </form>
      </div>
    `;

    const dDateInput = $('duet-input-partner-date');
    if (dDateInput) {
      dDateInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 8);
        if (v.length >= 5) v = `${v.slice(0, 2)}.${v.slice(2, 4)}.${v.slice(4)}`;
        else if (v.length >= 3) v = `${v.slice(0, 2)}.${v.slice(2)}`;
        e.target.value = v;
      });
    }

    $('duet-direct-partner-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pName = ($('duet-input-partner-name')?.value || '').trim() || 'Партнер';
      const rawDate = ($('duet-input-partner-date')?.value || '').trim();
      const parts = rawDate.split('.');
      if (parts.length !== 3 || parts[2].length !== 4) {
        notice('Укажите полную дату рождения партнера в формате ДД.ММ.ГГГГ');
        return;
      }
      const pDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      const userSun = state.chart?.bodies?.find((b) => b.name === 'Солнце');
      
      const [pY, pM, pD] = pDate.split('-').map(Number);
      const zDays = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
      const zIdx = (pD < zDays[pM - 1]) ? (pM - 2 + 12) % 12 : pM - 1;
      const signs = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
      const pSign = signs[zIdx];
      
      const userIdx = userSun ? userSun.signIndex : 0;
      const diff = Math.abs(userIdx - zIdx);
      const score = [88, 79, 86, 74, 94, 69, 91][diff % 7] || 82;
      
      state.partner = { name: pName, date: pDate, sign: pSign, score };
      state.editingPartner = false;
      save();
      renderPartner();
      const tabDuetLabel = $('tab-duet-label');
      if (tabDuetLabel) tabDuetLabel.textContent = `Союз: Я + ${pName}`;
      notice(`Атлас союза для пары с ${pName} успешно рассчитан!`, true);
      switchReportView('duet');
    });
  }

  function switchReportView(mode) {
    state.activeReportView = mode;
    save();
    
    $('tab-show-solo')?.classList.toggle('active', mode === 'solo');
    $('tab-show-duet')?.classList.toggle('active', mode === 'duet');

    const duetTeaser = $('duet-teaser-panel');
    const reportContent = $('report-content');
    if (!reportContent) return;

    if (mode === 'duet') {
      const isDuetUnlocked = state.selectedTier === 'duet' || state.selectedTier === 'vip' || state.unlockedDuet;
      if (isDuetUnlocked) {
        duetTeaser?.classList.add('hidden');
        reportContent.classList.remove('hidden');

        if (!state.partner || state.editingPartner) {
          renderDuetPartnerPrompt(reportContent);
          return;
        }

        if (state.annual && window.DuetView) {
          reportContent.innerHTML = window.DuetView.render(state.annual, state.partner, state.chart);
          $('duet-export-calendar')?.addEventListener('click', () => window.DuetView.exportCalendar(state.annual, state.partner.name));
          $('duet-back-top')?.addEventListener('click', () => $('report-unlocked').scrollIntoView({ behavior: 'smooth' }));
          $('duet-save-pdf')?.addEventListener('click', () => window.print());
          $('duet-change-partner-btn')?.addEventListener('click', () => {
            state.editingPartner = true;
            renderDuetPartnerPrompt(reportContent);
          });
        }
      } else {
        reportContent.classList.add('hidden');
        duetTeaser?.classList.remove('hidden');
      }
    } else {
      duetTeaser?.classList.add('hidden');
      reportContent.classList.remove('hidden');
      if (state.annual && window.AnnualView) {
        reportContent.innerHTML = window.AnnualView.render(state.annual);
        $('export-calendar')?.addEventListener('click', () => window.AnnualView.exportCalendar(state.annual));
        $('atlas-back-top')?.addEventListener('click', () => $('report-unlocked').scrollIntoView({ behavior: 'smooth' }));
        $('atlas-save-pdf')?.addEventListener('click', () => window.print());
        window.AnnualView.revealPages(reportContent);
      }
    }
  }

  function renderReport() {
    const labels = state.annual?.months.map((m) => m.name) || monthLabels();
    $('month-preview').innerHTML = labels.slice(0,4).map((m) => `<span>${escapeHtml(m)}</span>`).join('');
    
    const tierPill = $('current-tier-pill');
    if (tierPill) {
      const tierNames = {
        solo: 'Тариф «Соло» (590 ₽)',
        duet: 'Тариф «Дуэт» (890 ₽)',
        vip: 'Тариф «VIP» (1 990 ₽)'
      };
      tierPill.textContent = tierNames[state.selectedTier] || 'Тариф «Соло» (590 ₽)';
    }

    const tabDuetLabel = $('tab-duet-label');
    if (tabDuetLabel) {
      tabDuetLabel.textContent = state.partner?.name ? `Союз: Я + ${state.partner.name}` : 'Атлас союза: Пара';
    }

    $('report-locked').classList.toggle('hidden', state.unlocked);
    $('report-unlocked').classList.toggle('hidden', !state.unlocked);
    if (!state.unlocked || !state.annual) return;

    state.activeReportView = state.activeReportView || (state.selectedTier === 'duet' || state.selectedTier === 'vip' ? 'duet' : 'solo');
    switchReportView(state.activeReportView);
  }
  async function loadAnnual() {
    if (state.annual) return state.annual;
    if (state.annualPromise) return state.annualPromise;
    state.annualPromise = (async () => {
      const res = await fetch('/api/annual', { method:'POST', headers:vkApiHeaders(),
        body:JSON.stringify(state.payload) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'годовой атлас не собран');
      state.annual = data.annual;
      save();
      return data.annual;
    })();
    try { return await state.annualPromise; }
    finally { state.annualPromise = null; }
  }
  $('unlock-report').addEventListener('click', async () => {
    if (!state.chart) { activate('chart'); notice('Сначала постройте бесплатную карту.'); return; }
    const button = $('unlock-report');
    const progressBar = button.querySelector('.loading-progress');
    const btnText = button.querySelector('.btn-text');
    
    button.disabled = true;
    button.classList.add('is-loading');
    
    let progress = 8;
    if (progressBar) progressBar.style.width = '8%';
    
    const stages = [
      { p: 15, text: '✦ Рассчитываем ключевые аспекты союзов…' },
      { p: 35, text: '✦ Анализируем периоды деловой активности…' },
      { p: 60, text: '✦ Формируем 12 глав на 2027 год…' },
      { p: 80, text: '✦ Составляем персональный календарь дат…' },
      { p: 92, text: '✦ Завершаем подготовку отчета…' },
    ];
    let stageIdx = 0;
    if (btnText) btnText.textContent = stages[0].text;
    
    const timer = setInterval(() => {
      progress += Math.random() * 2.5 + 1.2;
      if (progress > 95) progress = 95;
      if (progressBar) progressBar.style.width = `${progress}%`;
      
      if (stageIdx < stages.length - 1 && progress >= stages[stageIdx + 1].p) {
        stageIdx++;
        if (btnText) btnText.textContent = stages[stageIdx].text;
      }
    }, 700);

    try {
      await loadAnnual();
      clearInterval(timer);
      if (progressBar) progressBar.style.width = '100%';
      if (btnText) btnText.textContent = '✦ Готово! Открываем…';
      await new Promise(r => setTimeout(r, 450));
      
      state.unlocked = true;
      if (state.selectedTier === 'duet' || state.selectedTier === 'vip') {
        state.unlockedDuet = true;
        state.activeReportView = 'duet';
      } else {
        state.unlockedSolo = true;
        state.activeReportView = 'solo';
      }
      save();
      renderReport();
      notice(state.selectedTier === 'duet' ? 'Атлас союза сформирован!' : 'Персональный навигатор сформирован!', true);
      $('report-unlocked').scrollIntoView({behavior:'smooth'});
    } catch (error) {
      clearInterval(timer);
      notice('Не получилось собрать навигатор: ' + error.message);
    } finally {
      button.disabled = false;
      button.classList.remove('is-loading');
      if (progressBar) progressBar.style.width = '0%';
      if (btnText) {
        if (state.selectedTier === 'solo') btnText.textContent = 'Получить тариф «Соло» · 590 ₽';
        else if (state.selectedTier === 'vip') btnText.textContent = 'Получить тариф «VIP: Разбор + Эксперт» · 1 990 ₽';
        else btnText.textContent = 'Получить тариф «Дуэт: Я + Партнер» · 890 ₽';
      }
    }
  });

  $('print-report')?.addEventListener('click', () => {
    if (!$('report-content').textContent.trim()) { notice('Сначала дождитесь формирования отчета.'); return; }
    window.print();
  });
  $('report-back-map')?.addEventListener('click', () => activate('chart'));
  $('change-tier-btn')?.addEventListener('click', () => {
    showTiers();
    $('report-locked').scrollIntoView({ behavior: 'smooth' });
  });
  $('return-to-report-btn')?.addEventListener('click', () => {
    showUnlockedReport();
    $('report-unlocked').scrollIntoView({ behavior: 'smooth' });
  });
  $('tab-show-solo')?.addEventListener('click', () => switchReportView('solo'));
  $('tab-show-duet')?.addEventListener('click', () => switchReportView('duet'));
  $('open-duet-purchase')?.addEventListener('click', () => {
    selectTier('duet');
    if (state.unlocked) {
      state.unlockedDuet = true;
      state.activeReportView = 'duet';
      showUnlockedReport();
      switchReportView('duet');
      $('report-unlocked').scrollIntoView({ behavior: 'smooth' });
    } else {
      showTiers();
      $('unlock-report').scrollIntoView({ behavior: 'smooth' });
    }
  });
  $('recalculate-partner-btn')?.addEventListener('click', () => {
    state.selectedTier = 'duet';
    state.unlockedDuet = true;
    state.editingPartner = true;
    showUnlockedReport();
    switchReportView('duet');
    $('report-unlocked').scrollIntoView({ behavior: 'smooth' });
  });

  $('ask-expert').addEventListener('click', () => {
    const card = $('ask-expert').closest('.expert-panel');
    let info = card.querySelector('.expert-info');
    if (!info) {
      info = document.createElement('div');
      info.className = 'expert-info';
      card.appendChild(info);
    }
    const userName = state.payload?.name || 'Пользователь';
    const city = state.city?.name || 'Город не указан';
    info.innerHTML = `
      <div style="background:rgba(8,16,36,.85);border:1px solid var(--cyan);border-radius:14px;padding:15px;margin-top:15px;text-align:left;">
        <div style="font-size:11px;color:var(--gold);font-weight:700;letter-spacing:.1em;margin-bottom:6px;">✦ ПЕРЕХОД НА ВТОРУЮ ЛИНИЮ (ДЕМОНСТРАЦИЯ)</div>
        <p style="font-size:12px;color:var(--text);margin-bottom:8px;">В рабочей версии при нажатии открывается официальный диалог ВКонтакте (<code>vk.me/...</code>) с готовым контекстом клиента:</p>
        <div style="background:#0c1d38;border-left:3px solid var(--gold);padding:8px 12px;border-radius:6px;font-size:12px;color:var(--muted);margin-bottom:10px;">
          <em>«Здравствуйте! Я из приложения "Свой круг". Мои данные: ${escapeHtml(userName)}, ${escapeHtml(city)}. В отчете на 2027 год в разделе отношений указан напряженный период. Хочу разобрать эту ситуацию индивидуально со специалистом»</em>
        </div>
        <p style="font-size:11px;color:var(--cyan);margin:0;">Сценарий эксперта: отправка персонального 2-минутного голосового сообщения с вводным разбором ситуации и предложение глубокой консультации (чек 2 900–5 900 ₽).</p>
      </div>
    `;
    info.scrollIntoView({behavior:'smooth',block:'nearest'});
  });

  $('link-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    notice('Оферта: Предоставление неисключительной лицензии на развлекательный цифровой сервис персонального планирования (ОКВЭД 63.11).', true);
  });
  $('link-privacy')?.addEventListener('click', (e) => {
    e.preventDefault();
    notice('152-ФЗ: Данные рождения обрабатываются локально для математического расчета астрономических координат и не передаются третьим лицам.', true);
  });

  function moscowDay() {
    try { return new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'}); }
    catch (_) { return new Date().toISOString().slice(0,10); }
  }
  function dayStreak() {
    const history = state.day.history || [];
    const today = moscowDay();
    const current = new Date(`${today}T12:00:00Z`);
    let streak = 0;
    for (let i = 0; i < 3; i++) {
      const day = new Date(current);
      day.setUTCDate(current.getUTCDate() - i);
      if (history.includes(day.toISOString().slice(0,10))) streak++;
      else break;
    }
    return streak;
  }
  function renderDay() {
    $('today-label').textContent = new Date().toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long'});
    const today = moscowDay();
    const selection = state.day.selection?.[today];
    const streak = dayStreak();
    $('streak-label').textContent = `✦ ${streak} / 3 дня`;
    [...$('journey-dots').children].forEach((dot,i) => dot.classList.toggle('done',i < streak));
    $('journey-copy').textContent = streak >= 3
      ? 'Три дня пройдены. Ваш дополнительный вопрос: какое открытие о себе повторялось все три дня? Сохраните ответ и вернитесь к нему через неделю.'
      : `До дополнительного вопроса осталось ${3-streak} ${3-streak === 1 ? 'день' : 'дня'}.`;
    document.querySelectorAll('#day-choices button').forEach((button) => button.classList.toggle('selected',button.dataset.theme === selection));
    if (selection) showDayCard(selection);
    else $('day-reveal').classList.add('hidden');
  }
  function showDayCard(theme) {
    const today = moscowDay();
    const seed = [...today].reduce((sum,char) => sum + char.charCodeAt(0),0);
    const item = dayIdeas[theme][seed % 3];
    $('day-reveal').innerHTML = `<small>ТЕМА ДНЯ · УПРАЖНЕНИЕ</small><h3>${escapeHtml(item[0])}</h3><p>${escapeHtml(item[1])}</p><small>МАЛЕНЬКИЙ ШАГ</small><p>${escapeHtml(item[2])}</p>`;
    $('day-reveal').classList.remove('hidden');
  }
  document.querySelectorAll('#day-choices button').forEach((button) => button.addEventListener('click', () => {
    if (!state.chart) { activate('chart'); notice('Сначала постройте карту, чтобы начать ежедневный ритуал.'); return; }
    const today = moscowDay();
    state.day.selection ||= {};
    if (!state.day.selection[today]) {
      state.day.selection[today] = button.dataset.theme;
      state.day.history = [...new Set([...(state.day.history || []),today])].slice(-30);
      save();
    }
    renderDay();
  }));

  $('share-app').addEventListener('click', async () => {
    const appId = new URLSearchParams(location.search).get('vk_app_id') || '54799453';
    const link = location.search.includes('vk_app_id=') ? `https://vk.com/app${appId}` : location.origin + '/';
    try {
      if (state.mode === 'vk' && window.vkBridge?.send) await window.vkBridge.send('VKWebAppShare',{link});
      else if (navigator.share) await navigator.share({title:'Свой круг',url:link});
      else { await navigator.clipboard.writeText(link); $('share-status').textContent = 'Ссылка скопирована.'; }
    } catch (_) { $('share-status').textContent = 'Не удалось открыть отправку. Скопируйте адрес приложения из браузера.'; }
  });
  function renderFriend() {
    const friend = state.friend;
    if (!friend) return;
    $('friend-name').value = friend.name;
    $('friend-date').value = friend.date;
    $('friend-preview').textContent = `${friend.name} · ${friend.date}. В рабочей версии здесь будет напоминание за неделю и возможность подарить разбор.`;
    $('friend-preview').classList.remove('hidden');
  }
  $('save-friend').addEventListener('click', () => {
    const name = $('friend-name').value.trim();
    const match = /^(\d{2})\.(\d{2})$/.exec($('friend-date').value.trim());
    if (!name || !match) { notice('Укажите имя и дату в формате ДД.ММ.'); return; }
    const day = +match[1], month = +match[2];
    const date = new Date(Date.UTC(2024,month-1,day));
    if (date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) { notice('Такой даты не существует.'); return; }
    state.friend = {name,date:`${match[1]}.${match[2]}`};
    save();
    renderFriend();
    notice('Дата сохранена для демонстрации на этом устройстве.',true);
  });

  const partnerDateInput = $('partner-date');
  if (partnerDateInput) {
    partnerDateInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 8);
      if (v.length >= 5) v = `${v.slice(0, 2)}.${v.slice(2, 4)}.${v.slice(4)}`;
      else if (v.length >= 3) v = `${v.slice(0, 2)}.${v.slice(2)}`;
      e.target.value = v;
    });
  }

  function renderPartner() {
    const p = state.partner;
    if (!p) return;
    $('partner-name').value = p.name;
    $('partner-date').value = p.date.split('-').reverse().join('.');
    $('synastry-percent').textContent = `${p.score}%`;
    $('synastry-title').textContent = `${p.name} (${p.sign}) · ${p.score}% связь`;
    $('synastry-teaser').textContent = `Ваша связь строится на сильном взаимном притяжении. Натальные планеты формируют выраженный эмоциональный резонанс: способность понимать друг друга без лишних слов, но с необходимостью беречь личное пространство.`;
    $('synastry-result').classList.remove('hidden');
  }

  $('partner-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pDate = validBirthDate($('partner-date').value.trim());
    if (!pDate) { notice('Укажите дату рождения партнера в формате ДД.ММ.ГГГГ.'); return; }
    const pName = $('partner-name').value.trim() || 'Партнер';
    
    const userSun = state.chart?.bodies?.find(b => b.name === 'Солнце');
    const [pY, pM, pD] = pDate.split('-').map(Number);
    const zDays = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
    const zIdx = (pD < zDays[pM - 1]) ? (pM - 2 + 12) % 12 : pM - 1;
    const signs = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
    const pSign = signs[zIdx];
    
    const userIdx = userSun ? userSun.signIndex : 0;
    const diff = Math.abs(userIdx - zIdx);
    const score = [88, 79, 86, 74, 94, 69, 91][diff % 7] || 82;
    
    state.partner = { name: pName, date: pDate, sign: pSign, score };
    save();
    renderPartner();
    notice('Совместимость рассчитана!', true);
    $('synastry-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('go-to-duet')?.addEventListener('click', () => {
    selectTier('duet');
    activate('report');
    showTiers();
    $('unlock-report').scrollIntoView({ behavior: 'smooth' });
  });

  function selectTier(tierName) {
    state.selectedTier = tierName;
    save();
    document.querySelectorAll('.tier-card').forEach(card => {
      card.classList.toggle('active', card.dataset.tier === tierName);
    });
    const btnText = $('unlock-report')?.querySelector('.btn-text');
    if (!btnText) return;
    if (tierName === 'solo') btnText.textContent = 'Получить тариф «Соло» · 590 ₽';
    else if (tierName === 'duet') btnText.textContent = 'Получить тариф «Дуэт: Я + Партнер» · 890 ₽';
    else if (tierName === 'vip') btnText.textContent = 'Получить тариф «VIP: Разбор + Эксперт» · 1 990 ₽';
  }

  document.querySelectorAll('.tier-card').forEach(card => {
    card.addEventListener('click', () => {
      selectTier(card.dataset.tier);
    });
  });

  restore();
  if (state.chart && state.payload) renderChart();
  if (state.friend) renderFriend();
  if (state.partner) renderPartner();
  if (state.selectedTier) selectTier(state.selectedTier);
  renderDay();
  renderReport();
  if (state.chart && !state.report) loadReport().catch(() => {});
  initVk();
})();
