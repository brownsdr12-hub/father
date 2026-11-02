(function(){
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  
  const signs = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  const elements = {
    'Овен': 'Огонь', 'Лев': 'Огонь', 'Стрелец': 'Огонь',
    'Телец': 'Земля', 'Дева': 'Земля', 'Козерог': 'Земля',
    'Близнецы': 'Воздух', 'Весы': 'Воздух', 'Водолей': 'Воздух',
    'Рак': 'Вода', 'Скорпион': 'Вода', 'Рыбы': 'Вода'
  };

  const elementCombos = {
    'Огонь-Огонь': 'Яркий, страстный союз двух лидеров. Важно не соревноваться за власть, а объединять силу.',
    'Огонь-Земля': 'Союз вдохновения и надежности. Огонь дает импульс и страсть, Земля — устойчивость и уют.',
    'Огонь-Воздух': 'Неиссякаемый интерес и легкость. Воздух раздувает огонь идей, а Огонь делает мечты реальностью.',
    'Огонь-Вода': 'Глубокая эмоциональная химия. Чувства вспыхивают ярко: берегите границы друг друга.',
    'Земля-Земля': 'Надежный, крепкий фундамент. Вы понимаете ценность преданности, заботы и стабильности.',
    'Земля-Воздух': 'Интеллектуально-практичный союз. Умение договариваться и находить разумные решения.',
    'Земля-Вода': 'Плодородный, чуткий контакт. Земля защищает нежность Воды, а Вода наполняет союз теплом.',
    'Воздух-Воздух': 'Союз родственных душ. Невероятная легкость в общении, дружба и общие интересы.',
    'Воздух-Вода': 'Тонкая романтическая связь. Интуитивное понимание полутонов и невысказанных желаний.',
    'Вода-Вода': 'Океан взаимной преданности и нежности. Способность чувствовать состояние партнера без слов.'
  };

  function dateRu(iso){
    if(!iso) return '';
    const [y,m,d] = iso.split('-');
    return `${Number(d)}.${m}.${y}`;
  }

  function birthDateRu(iso){
    if(!iso) return '';
    const [y,m,d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y,m-1,d)).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  }

  function page(n, kind, body){
    return `<section class="atlas-page duet-theme ${kind}" id="duet-page-${n}">
      ${body}
      <div class="atlas-num">СВОЙ КРУГ · АТЛАС СОЮЗА · ${String(n).padStart(2,'0')}</div>
    </section>`;
  }

  function calendar(month){
    const [year,m] = month.key.split('-').map(Number);
    const first = (new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7;
    const last = new Date(Date.UTC(year,m,0)).getUTCDate();
    const eventDates = new Set(month.events.map(e=>Number(e.date.slice(-2))));
    const phaseDates = new Set(month.phases.map(e=>Number(e.date.slice(-2))));
    
    // Pick romantic golden day (15th or aspect date) and gentle day (7th or 22nd)
    const goldDay = [...eventDates][0] || 14;
    const cautionDay = [...eventDates][1] || ((goldDay + 9) % last) + 1;

    let h = '<div class="atlas-calendar duet-cal">' + ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>`<span class="head">${d}</span>`).join('');
    for(let i=0;i<first;i++) h += '<span class="empty"></span>';
    for(let d=1;d<=last;d++){
      const isGold = d === goldDay;
      const isCaution = d === cautionDay;
      const isEvent = eventDates.has(d);
      const isPhase = phaseDates.has(d);
      const cls = isGold ? 'gold-day' : isCaution ? 'caution-day' : isEvent ? 'personal' : isPhase ? 'phase' : '';
      h += `<span class="${cls}">${d}${isGold ? ' ♡' : isCaution ? ' ⚠' : isEvent ? ' ✦' : ''}</span>`;
    }
    return h + '</div><div class="atlas-legend"><i class="gold"></i> золотой день свиданий и близости <i class="warn"></i> день взаимной чуткости <i class="moon"></i> фаза Луны</div>';
  }

  function duetDoubleWheel(userName, partnerName, userSign, partnerSign, score){
    return `
      <div class="duet-synastry-visual" aria-hidden="true">
        <svg viewBox="0 0 500 240" class="duet-orbit-svg">
          <defs>
            <linearGradient id="userGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#7ce1db" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#f3ca7f" stop-opacity="0.4"/>
            </linearGradient>
            <linearGradient id="partnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f8a9a4" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#f3ca7f" stop-opacity="0.4"/>
            </linearGradient>
            <radialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ff70a6" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="#ff70a6" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- User orbit -->
          <circle cx="180" cy="120" r="95" fill="none" stroke="url(#userGrad)" stroke-width="2.5" stroke-dasharray="6 4" class="orbit-rotate-cw"/>
          <circle cx="180" cy="120" r="70" fill="none" stroke="rgba(124,225,219,0.2)" stroke-width="1"/>
          
          <!-- Partner orbit -->
          <circle cx="320" cy="120" r="95" fill="none" stroke="url(#partnerGrad)" stroke-width="2.5" stroke-dasharray="6 4" class="orbit-rotate-ccw"/>
          <circle cx="320" cy="120" r="70" fill="none" stroke="rgba(248,169,164,0.2)" stroke-width="1"/>

          <!-- Intersection Resonance Zone -->
          <circle cx="250" cy="120" r="52" fill="url(#heartGlow)"/>
          <circle cx="250" cy="120" r="42" fill="rgba(26,12,34,0.85)" stroke="#f7d597" stroke-width="1.8"/>
          
          <text x="250" y="114" text-anchor="middle" font-family="'Cormorant',Georgia,serif" font-weight="700" font-size="22" fill="#f7d597">${score}%</text>
          <text x="250" y="132" text-anchor="middle" font-size="9" fill="#f8a9a4" letter-spacing="1">СОЮЗ</text>

          <!-- User Node -->
          <circle cx="115" cy="120" r="18" fill="#142642" stroke="#7ce1db" stroke-width="1.5"/>
          <text x="115" y="125" text-anchor="middle" font-size="12" fill="#f3ca7f">☉</text>
          <text x="115" y="152" text-anchor="middle" font-size="11" fill="#eef6ff" font-weight="600">${esc(userName)}</text>
          <text x="115" y="165" text-anchor="middle" font-size="9.5" fill="#7ce1db">${esc(userSign)}</text>

          <!-- Partner Node -->
          <circle cx="385" cy="120" r="18" fill="#2d1330" stroke="#f8a9a4" stroke-width="1.5"/>
          <text x="385" y="125" text-anchor="middle" font-size="12" fill="#f8a9a4">♡</text>
          <text x="385" y="152" text-anchor="middle" font-size="11" fill="#eef6ff" font-weight="600">${esc(partnerName)}</text>
          <text x="385" y="165" text-anchor="middle" font-size="9.5" fill="#f8a9a4">${esc(partnerSign)}</text>
        </svg>
      </div>
    `;
  }

  function getMonthThemes(monthName, monthIndex, partnerName){
    const themes = [
      {
        title: 'Новая глубина доверия и прояснение ожиданий',
        lead: `В ${monthName.toLowerCase()} отношения выходят на этап искренности. Уходит недосказанность, а взаимный интерес становится более осознанным и теплым.`,
        dynamic: `Этот период идеален для того, чтобы сверить ориентиры. Вы яснее чувствуете истинные мотивы партнера: ${partnerName} готов слышать вас, если разговор строится без скрытых претензий. В быту царит гармония, если не перегружать друг друга критикой по мелочам.`,
        golden: 'Идеальные дни для теплого домашнего свидания, глубокого разговора по душам и маленьких сюрпризов.',
        caution: 'Дни, когда накопившаяся усталость может проявиться в раздражении. Совет: дайте партнеру час тишины и не требуйте немедленных решений.',
        practice: 'Приготовьте вместе любимое блюдо или заварите чай без гаджетов, поблагодарив друг друга за важную мелочь.',
        question: 'Что делает наш союз самым безопасным и теплым местом на свете?'
      },
      {
        title: 'Уют, совместные планы и бытовой штиль',
        lead: `В ${monthName.toLowerCase()} акцент смещается в сторону домашнего пространства, заботы и создания крепкого совместного фундамента.`,
        dynamic: `В отношениях наступает период душевного покоя. Прекрасное время для обустройства совместного гнездышка, покупки вещей для дома или обсуждения совместных поездок на весну. С ${partnerName} легче найти компромисс в денежных и бытовых вопросах.`,
        golden: 'Дни для совместных покупок, планирования отпуска и нежных объятий перед сном.',
        caution: 'Моменты легкого упрямства. Не спорьте из-за бытовых деталей — уступите в малом, чтобы сохранить главное.',
        practice: 'Обсудите одно общее желание на ближайшие полгода и сделайте первый совместный шаг к нему.',
        question: 'О какой совместной традиции мы давно мечтали, но откладывали?'
      },
      {
        title: 'Эмоциональное тепло и искра нежности',
        lead: `В ${monthName.toLowerCase()} раскрывается романтическая грань союза. Партнеры чувствуют потребность в физической близости и тактильности.`,
        dynamic: `Взаимное влечение выходит на передний план. Партнер проявляет больше инициативы и внимания. Если между вами было напряжение, сейчас оно тает: искренний взгляд и прикосновение лечат старые недопонимания быстрее длинных споров.`,
        golden: 'Идеальное время для романтического ужина, неожиданного свидания или подарка без повода.',
        caution: 'Период повышенной чувствительности к интонациям. Будьте бережны к словам: случайная колкость может ранить глубже обычного.',
        practice: 'Сделайте партнеру искренний комплимент о том, что вас в нем восхищает и возбуждает.',
        question: 'Какое наше общее воспоминание до сих пор вызывает у нас обоих мурашки?'
      },
      {
        title: 'Весенний всплеск страсти и спонтанности',
        lead: `В ${monthName.toLowerCase()} пробуждается сильная сексуальная и чувственная энергия. Время спонтанных поступков и огня в паре.`,
        dynamic: `Марсианские и венерианские энергии пробуждают страсть. В союзе появляется азарт, флирт и ощущение влюбленности, как в первые недели знакомства. ${partnerName} особенно чутко реагирует на вашу привлекательность и открытость.`,
        golden: 'Дни для ярких страстных свиданий, выезда на природу или смены обстановки вдвоем.',
        caution: 'Дни избытка эмоций: страсть может перерасти в спор на пустом месте из-за ревности. Держите фокус на любви, а не на контроле.',
        practice: 'Устройте спонтанное свидание в необычном месте, оставив все повседневные заботы за порогом.',
        question: 'Что новое мы хотим попробовать в наших отношениях этой весной?'
      },
      {
        title: 'Золотой пик гармонии и совместного расцвета',
        lead: `В ${monthName.toLowerCase()} формируется самый сильный гармоничный резонанс года. Отношения переживают настоящий подъем.`,
        dynamic: `Благоприятные аспекты планет любви создают атмосферу полного взаимопонимания. Вы с ${partnerName} на одной волне: мысли угадываются с полуслова, решения принимаются легко и единодушно. Прекрасный период для помолвки, важного признания или крупного общего шага.`,
        golden: 'Лучшие дни года для главных решений в отношениях, предложения руки и сердца или признания в любви.',
        caution: 'Месяц очень гармоничен: главное предостережение — не закрываться в рутине работы, а прожить эти дни вместе.',
        practice: 'Напишите партнеру теплое письмо или записку со словами поддержки и спрячьте в карман.',
        question: 'В чем наша главная сила как пары, когда мы действуем заодно?'
      },
      {
        title: 'Зона терпения: бережность к личным границам',
        lead: `В ${monthName.toLowerCase()} на небе активируются сдержанные аспекты. Важно дать друг другу пространство и не требовать непрерывного внимания.`,
        dynamic: `Этот месяц требует мудрости. У одного из партнеров может накопиться усталость от внешних задач. ${partnerName} может казаться более молчаливым или задумчивым — это не признак охлаждения чувств, а естественная потребность восстановить силы.`,
        golden: 'Дни для тихого спокойного вечера, просмотра любимого фильма и ненавязчивой поддержки.',
        caution: 'Дни повышенной обидчивости. Не требуйте: «почему ты молчишь?» и не делайте поспешных выводов о разрыве.',
        practice: 'Дайте партнеру провести вечер так, как хочется ему (с друзьями или за хобби), занявшись собой.',
        question: 'Как я могу проявить любовь, когда партнер переживает сложный день?'
      },
      {
        title: 'Легкость, разговоры по душам и новые горизонты',
        lead: `В ${monthName.toLowerCase()} возвращается легкое летнее настроение, вдохновение и тяга к совместным приключениям.`,
        dynamic: `Меркурий и Венера поддерживают открытый диалог. В паре легко обсуждать любые темы — от глубоких философских вопросов до шуток и легкого флирта. Отличное время для совместной поездки к морю или путешествия на выходные.`,
        golden: 'Идеальные дни для поездок, долгих ночных прогулок и откровенных разговоров под звездами.',
        caution: 'Не распыляйте внимание на чужие советы и сплетни родственников. Ваш союз — это ваше закрытое пространство.',
        practice: 'Отправьтесь на прогулку в незнакомую часть города без четкого плана, просто держась за руки.',
        question: 'Какое путешествие нашей мечты мы хотим осуществить в этом году?'
      },
      {
        title: 'Летний пик близости и совместного отдыха',
        lead: `В ${monthName.toLowerCase()} союз наполняется солнечным теплом и глубоким чувством благодарности друг другу.`,
        dynamic: `Период максимальной расслабленности и наслаждения жизнью. В отношениях нет места суете. ${partnerName} проявляет заботу и гордость за ваш союз. Время, когда совместные фото получаются самыми счастливыми, а вечера — незабываемыми.`,
        golden: 'Дни абсолютного наслаждения, пляжного отдыха, романтических закатов и страстных ночей.',
        caution: 'Дни солнцестояния: избыток солнца и алкоголя может поднять старые обиды. Пейте больше воды и цените момент.',
        practice: 'Сделайте серию красивых совместных фотографий и распечатайте одну для дома.',
        question: 'За что я больше всего благодарен(на) судьбе за встречу с этим человеком?'
      },
      {
        title: 'Серьезный диалог о совместном будущем',
        lead: `В ${monthName.toLowerCase()} энергия планет помогает структурировать планы пары на осень и грядущий год.`,
        dynamic: `Отношения становятся более взрослыми и осмысленными. Время обсудить бюджет, цели, возможное расширение семьи или смену жилья. Вы с ${partnerName} чувствуете себя не просто влюбленными, но надежными союзниками и командой.`,
        golden: 'Дни для конструктивных переговоров, подписания договоров, совместных инвестиций и покупок.',
        caution: 'Дни критики. Следите за тем, чтобы конструктивный разговор не превратился в перечень взаимных претензий.',
        practice: 'Запишите на одном листе три главные цели вашей пары на осень и согласуйте роли каждого.',
        question: 'Каким мы видим наш союз через три года?'
      },
      {
        title: 'Дни взаимной чуткости: проверка на зрелость',
        lead: `В ${monthName.toLowerCase()} начинается осенняя перестройка биоритмов. Важно проявить максимум заботы и снизить планку требований.`,
        dynamic: `Сентябрь часто приносит проверку на прочность из-за рабочей нагрузки. Партнеры могут быть уставшими. Не принимайте резких решений и не хлопайте дверью: этот месяц учит зрелой безусловной любви, когда ценят не только праздник, но и поддержку в буднях.`,
        golden: 'Дни для уютного согревающего вечера, совместной ванны при свечах и массажа.',
        caution: 'Дни риска импульсивных ссор. Запретите себе произносить слова: «мы не подходим друг другу» на эмоциях.',
        practice: 'Когда партнер раздражен, молча обнимите его и скажите: «Я с тобой, все будет хорошо».',
        question: 'Что помогает мне сохранять спокойствие и любовь, когда вокруг шторм?'
      },
      {
        title: 'Выход на новый уровень: перерождение чувств',
        lead: `В ${monthName.toLowerCase()} союз обновляется. Преодолев осеннюю притирку, пара ощущает новый уровень страсти и верности.`,
        dynamic: `Скорпионий и весовский резонанс углубляет привязанность. Отношения очищаются от шелухи и сомнений. ${partnerName} видит в вас своего главного человека и готов защищать союз от любых внешних влияний.`,
        golden: 'Дни магнетического притяжения, глубоких откровений и укрепления союза.',
        caution: 'Остерегайтесь беспричинной ревности и попыток проверить телефон партнера. Доверие — ваш главный щит.',
        practice: 'Поделитесь сокровенным секретом или переживанием, о котором боялись рассказать раньше.',
        question: 'В чем наш союз стал сильнее за прошедший год?'
      },
      {
        title: 'Триумф любви, тепло очага и фундамент будущего',
        lead: `В ${monthName.toLowerCase()} подводятся итоги года для пары. Время благодарности, подарков и праздничного единения.`,
        dynamic: `Финал года приносит ощущение победы: вы прошли через разные фазы и стали ближе. В доме царит волшебная атмосфера. Время загадывать общие желания под бой курантов и благодарить друг друга за верность и любовь.`,
        golden: 'Идеальные дни для выбора подарков вдвоем, совместной предновогодней поездки и романтики у елки.',
        caution: 'Предпраздничная суета и очереди могут утомить. Не ссорьтесь из-за сценария праздника — главное, быть вместе.',
        practice: 'Напишите друг другу по 5 главных благодарностей за этот год и прочитайте их вслух за ужином.',
        question: 'Какое главное чудо подарила нам любовь в этом году?'
      }
    ];
    return themes[monthIndex % 12];
  }

  function render(annual, partner, userChart){
    const userName = annual.subject || userChart?.input?.name || 'Вы';
    const partnerName = partner?.name || 'Партнер';
    const partnerDate = partner?.date || '1993-07-15';
    const partnerSign = partner?.sign || 'Телец';
    const score = partner?.score || 88;
    
    const userSun = annual.bodies?.find(b=>b.name==='Солнце')?.sign || userChart?.bodies?.find(b=>b.name==='Солнце')?.sign || 'Стрелец';
    const userMoon = annual.bodies?.find(b=>b.name==='Луна')?.sign || 'Водолей';
    const userVenus = annual.bodies?.find(b=>b.name==='Венера')?.sign || 'Весы';
    
    const userElement = elements[userSun] || 'Огонь';
    const partnerElement = elements[partnerSign] || 'Земля';
    const comboKey = `${userElement}-${partnerElement}`;
    const comboDesc = elementCombos[comboKey] || elementCombos[`${partnerElement}-${userElement}`] || 'Гармоничный союз противоположностей, взаимно обогащающий партнеров.';

    let h = `
      <div class="duet-partner-bar no-print">
        <div class="duet-partner-info">
          <span class="heart-icon">♡</span>
          <span>Атлас союза: <strong>${esc(userName)} + ${esc(partnerName)}</strong> (${esc(partnerSign)}, ${dateRu(partnerDate)}) · Резонанс <strong>${score}%</strong></span>
        </div>
        <button id="duet-change-partner-btn" class="duet-change-partner-btn" type="button">✎ Сменить партнера · 300 ₽</button>
      </div>
    `;

    // PAGE 1: Romantic Cover
    h += page(1, 'cover duet-cover', `
      <div class="duet-cover-header">
        <span class="atlas-kicker duet-kicker">✦ АТЛАС СОЮЗА 2027 · ТАРИФ «ДУЭТ» ✦</span>
        <h1>${esc(userName)} <em>&</em> ${esc(partnerName)}</h1>
        <p class="duet-cover-sub">Карта союза и ритмы отношений на 2027 год</p>
      </div>
      
      ${duetDoubleWheel(userName, partnerName, userSun, partnerSign, score)}

      <div class="duet-cover-details">
        <div class="duet-meta-badge">
          <b>${esc(annual.period.from)} — ${esc(annual.period.to)}</b>
          <span>12 глав отношений · Золотые дни свиданий · Календарь чуткости</span>
        </div>
        <div class="duet-features-grid">
          <div><b>Сексуальный резонанс</b><span>Влечение и страсть Венеры и Марса</span></div>
          <div><b>Бытовая совместимость</b><span>Точки эмоционального покоя и доверия</span></div>
          <div><b>Календарь дат для двоих</b><span>Дни близости vs Дни бережности к границам</span></div>
          <div><b>Вектор развития союза</b><span>Общие горизонты и решения пары</span></div>
        </div>
      </div>
      <small class="duet-bottom-brand">СВОЙ КРУГ · ИНДИВИДУАЛЬНЫЙ АТЛАС СОЮЗА ДЛЯ ДВОИХ</small>
    `);

    // PAGE 2: Cosmogram & Elements
    h += page(2, 'duet-page', `
      <span class="atlas-kicker duet-kicker">01 · КОСМОГРАММА СОЮЗА</span>
      <h2>Пересечение двух орбит</h2>
      <div class="atlas-rule duet-rule"></div>
      <p class="atlas-lead">Когда соединяются две натальные карты, рождается новая энергия — поле союза. Здесь важны не только совпадения, но и то, как различия дополняют друг друга.</p>
      
      <div class="duet-elements-box">
        <div class="elem-card">
          <small>СТИХИЯ ${esc(userName.toUpperCase())}</small>
          <strong>${esc(userElement)} (${esc(userSun)})</strong>
          <span>Ведущая сила проявления</span>
        </div>
        <div class="elem-heart">♡</div>
        <div class="elem-card">
          <small>СТИХИЯ ${esc(partnerName.toUpperCase())}</small>
          <strong>${esc(partnerElement)} (${esc(partnerSign)})</strong>
          <span>Ведущая сила ответа</span>
        </div>
      </div>
      <div class="duet-combo-callout">
        <b>Синтез стихий: ${esc(userElement)} + ${esc(partnerElement)}</b>
        <p>${esc(comboDesc)}</p>
      </div>

      <h3>Баланс планет в паре</h3>
      <div class="duet-planets-table">
        <div class="duet-table-row head">
          <span>Сфера жизни</span>
          <span>${esc(userName)}</span>
          <span>${esc(partnerName)}</span>
          <span>Резонанс</span>
        </div>
        <div class="duet-table-row">
          <b>Суть и эго (Солнце)</b>
          <span>${esc(userSun)}</span>
          <span>${esc(partnerSign)}</span>
          <span class="tag-good">${esc(partner?.resonance || 'Взаимное уважение')}</span>
        </div>
        <div class="duet-table-row">
          <b>Чувства и уют (Луна)</b>
          <span>${esc(userMoon)}</span>
          <span>Чувствительность</span>
          <span class="tag-warm">${partner?.distance != null && partner.distance <= 2 ? 'Глубокая привязка и покой' : (partner?.distance === 3 ? 'Эмоциональные качели' : 'Разный стиль эмоций')}</span>
        </div>
        <div class="duet-table-row">
          <b>Страсть и влечение (Венера/Марс)</b>
          <span>${esc(userVenus)}</span>
          <span>Инициатива</span>
          <span class="tag-spark">${partner?.distance != null && partner.distance % 2 === 0 ? 'Гармоничный магнетизм' : 'Искры страсти через контраст'}</span>
        </div>
      </div>
      <p class="atlas-small">Данные союза рассчитаны по астрономическим эфемеридам для двух дат рождения. Время партнера не требовалось для расчета базовых положений космограммы.</p>
    `);

    // PAGE 3: Three Nodes of Intimacy
    h += page(3, 'duet-page', `
      <span class="atlas-kicker duet-kicker">02 · ТРИ УЗЛА СВЯЗИ</span>
      <h2>Химия, Быт и Общий Вектор</h2>
      <div class="atlas-rule duet-rule"></div>
      <p class="atlas-lead">Любые долгие отношения опираются на три фундаментальные опоры. Понимание сильных сторон и уязвимых зон каждого узла помогает избежать 90% типичных кризисов.</p>
      
      <div class="duet-nodes-grid">
        <div class="duet-node-item">
          <div class="node-head-row">
            <span class="node-icon">♀ ♂</span>
            <h4>1. Страсть и сексуальный резонанс</h4>
          </div>
          <p><strong>Сила союза:</strong> Венера и Марс в вашей синастрии дают живой эмоциональный отклик и быстрое взаимное влечение.<br><strong>Зона риска:</strong> Рутина и предсказуемость гасят искру. Если страсть не подогревать спонтанными свиданиями и новизной, напряжение перерастает в бытовую холодность.</p>
        </div>
        <div class="duet-node-item">
          <div class="node-head-row">
            <span class="node-icon">☽ ♄</span>
            <h4>2. Эмоциональный комфорт и бытовые триггеры</h4>
          </div>
          <p><strong>Сила союза:</strong> Способность пары создавать островок тишины и уюта посреди внешнего хаоса.<br><strong>Зона риска:</strong> Разный темп реакции на стресс. Когда ${partnerName} устает, естественная реакция — закрыться и помолчать, в то время как вам может хотеться немедленного диалога. Главный закон: не давить в моменты пауз, а дать партнеру восстановиться.</p>
        </div>
        <div class="duet-node-item">
          <div class="node-head-row">
            <span class="node-icon">☉ ♃</span>
            <h4>3. Общие цели и рост союза в 2027</h4>
          </div>
          <p><strong>Сила союза:</strong> Юпитер поддерживает масштабные совместные планы: поездки, крупные покупки, обустройство дома или общее дело.<br><strong>Зона риска:</strong> Борьба за первенство при принятии решений. Если не распределить сферы ответственности заранее, споры о лидерстве отнимают тепло у настоящего.</p>
        </div>
      </div>

      <div class="atlas-callout duet-callout duet-golden-rule-box">
        <b>Золотое правило вашей пары</b>
        <p>Не додумывайте за партнера его скрытые мотивы. Один теплый и спокойный вопрос за чашкой чая предотвращает 90% скрытых недопониманий и бережет доверие.</p>
      </div>
    `);

    // PAGES 4–15: 12 Relationship Months
    annual.months.forEach((m, idx) => {
      const pageNum = idx + 4;
      const theme = getMonthThemes(m.name, idx, partnerName);
      
      // Determine dates
      const baseDates = m.events.map(e => Number(e.date.slice(-2)));
      const goldDate = baseDates[0] || (idx * 2 + 10) % 27 + 1;
      const cautionDate = baseDates[1] || ((goldDate + 11) % 27) + 1;
      const monthShort = m.name.toLowerCase().split(' ')[0];

      h += page(pageNum, 'duet-month', `
        <span class="atlas-kicker duet-kicker">03 · МЕСЯЦ ${String(idx+1).padStart(2,'0')} / 12 · ОТНОШЕНИЯ ПАРЫ</span>
        <h2>${esc(m.name)}</h2>
        <div class="atlas-rule duet-rule"></div>
        <span class="atlas-pill duet-pill">♡ ${esc(theme.title)}</span>
        <p class="atlas-lead">${esc(theme.lead)}</p>

        <div class="duet-month-body">
          <div class="duet-section-block">
            <b>Ритм союза в этом месяце</b>
            <p>${esc(theme.dynamic)}</p>
          </div>

          <div class="duet-dates-box">
            <div class="duet-date-row gold">
              <span class="date-badge">♡ ${goldDate} ${monthShort}</span>
              <div class="duet-date-text">
                <strong>Золотой день для двоих</strong>
                <p>${esc(theme.golden)}</p>
              </div>
            </div>
            <div class="duet-date-row caution">
              <span class="date-badge warn">⚠ ${cautionDate} ${monthShort}</span>
              <div class="duet-date-text">
                <strong>День взаимной чуткости и бережности</strong>
                <p>${esc(theme.caution)}</p>
              </div>
            </div>
          </div>

          <div class="atlas-callout duet-practice-callout">
            <b>Фокус сближения в этом месяце</b>
            <p>${esc(theme.practice)}</p>
          </div>

          <blockquote class="duet-quote">${esc(theme.question)}</blockquote>

          <h3>Календарь союза · ${esc(m.name)}</h3>
          ${calendar(m)}
        </div>
      `);
    });

    // PAGE 16: Expert Line 2
    h += page(16, 'afterword duet-afterword', `
      <span class="atlas-kicker duet-kicker">04 · ВТОРАЯ ЛИНИЯ · ЖИВОЙ ДИАЛОГ</span>
      <h2>Разбор отношений со специалистом</h2>
      <div class="atlas-rule duet-rule"></div>
      <p class="atlas-lead">Алгоритм рассчитывает циклы и даты пары. Но реальные отношения всегда полны тонких нюансов: если между вами назрели сомнения, сложный разговор или повторяющийся конфликт — разберите ситуацию индивидуально.</p>
      
      <div class="atlas-method duet-method">
        <div>
          <b>Глубокий синастрический анализ</b>
          <p>Практикующий астро-психолог сообщества анализирует две карты в связке с вашей реальной историей, а не по шаблону.</p>
        </div>
        <div>
          <b>Голосовой ответ в закрытом диалоге</b>
          <p>Персональный разбор в личных сообщениях ВКонтакте: как донести свои чувства до партнера и вернуть тепло в дом.</p>
        </div>
      </div>

      <div class="atlas-callout duet-contact">
        <h3>Остался вопрос по сложным периодам пары?</h3>
        <p>Напишите в сообщения сообщества кодовое слово <strong class="duet-codeword-gold">«СОЮЗ»</strong>. Специалист второй линии подключится к вашей ситуации и поможет бережно разобрать наболевшие вопросы.</p>
      </div>

      <div class="atlas-callout duet-export">
        <h3>Сохранить любовный календарь в телефон</h3>
        <p>Скачайте персональный календарь союза, чтобы золотые даты свиданий и дни чуткости всегда были в вашем смартфоне.</p>
        <button id="duet-export-calendar" class="duet-primary-btn" type="button">Скачать календарь пары (.ics)</button>
        <p id="duet-calendar-status" class="atlas-small" aria-live="polite"></p>
      </div>
    `);

    // PAGE 17: Big Annual Synthesis & Trajectory
    h += page(17, 'conclusion duet-conclusion', `
      <span class="atlas-kicker duet-kicker">05 · БОЛЬШОЙ ИТОГ 2027 ГОДА: ТРАЕКТОРИЯ СОЮЗА</span>
      <h2>${esc(userName)} и ${esc(partnerName)}: Архитектура года</h2>
      <div class="atlas-rule duet-rule"></div>
      <p class="atlas-lead">Обобщая 12 глав и синастрические ритмы, 2027 год для вашего союза станет периодом перехода от притирки характеров к осознанной партнерской силе. Год делится на четыре ключевые фазы:</p>

      <div class="duet-synthesis-seasons">
        <div class="duet-season-card">
          <span class="season-badge">❄ Зима 2026/27</span>
          <strong>Прояснение ожиданий и закладка фундамента</strong>
          <p>Период откровенности без масок. Вы определяете внутренние правила года: от распределения быта и финансов до неприкосновенности личных границ. Искренний диалог зимой страхует пару от весенних обид.</p>
        </div>
        <div class="duet-season-card">
          <span class="season-badge">❀ Весна 2027</span>
          <strong>Эмоциональное обновление и романтический подъем</strong>
          <p>Пик взаимного тепла и возрождения страсти. Уходит зимняя усталость, в отношениях появляется азарт первых свиданий. Лучшее время года для спонтанных поездок на выходные, экспериментов и признаний.</p>
        </div>
        <div class="duet-season-card">
          <span class="season-badge">☀ Лето 2027</span>
          <strong>Совместные вершины и проверка на командность</strong>
          <p>Период масштабных решений и совместного отдыха. Важно действовать не как соперники в лидерстве, а как слаженный экипаж: вовремя подхватывать штурвал, когда один из вас перегружен.</p>
        </div>
        <div class="duet-season-card">
          <span class="season-badge">🍁 Осень 2027</span>
          <strong>Сбор плодов и глубокое зрелое доверие</strong>
          <p>Время душевного штиля и взаимного восхищения пройденным путем. Отношения переходят на уровень спокойной, несокрушимой уверенности друг в друге, с которой не страшны любые внешние бури.</p>
        </div>
      </div>

      <div class="duet-growth-box">
        <b>3 трансформации, которые пройдет союз в 2027 году:</b>
        <ul>
          <li><strong>От уязвимости — к безопасности:</strong> осознание, что рядом с партнером не нужно защищаться или казаться идеальным.</li>
          <li><strong>От бытовой рутины — к ритуалам близости:</strong> ежедневные маленькие знаки заботы становятся крепкой броней союза.</li>
          <li><strong>От раздельных планов — к общему горизонту:</strong> объединение индивидуальных амбиций в единую вдохновляющую траекторию.</li>
        </ul>
      </div>
    `);

    // PAGE 18: Couple Code & Intimacy Rules
    h += page(18, 'conclusion duet-conclusion', `
      <span class="atlas-kicker duet-kicker">06 · КОДЕКС СОЮЗА И НАПУТСТВИЕ НА 2027 ГОД</span>
      <h2>Кодекс бережности пары</h2>
      <div class="atlas-rule duet-rule"></div>
      <p class="atlas-lead">4 правила сохранения любви в 2027 году: ключевые принципы, которые сохранят глубину чувств, страсть и покой в вашем доме на протяжении всего года:</p>

      <div class="duet-manifesto-list">
        <div class="manifesto-rule">
          <span class="rule-num">I</span>
          <div class="rule-body">
            <strong>Не спорьте на усталости.</strong>
            <p>Если один из вас истощен рабочим днем, любые принципиальные выяснения переносятся на утро после чашки горячего чая. В истощении говорят обиды, а не любовь.</p>
          </div>
        </div>
        <div class="manifesto-rule">
          <span class="rule-num">II</span>
          <div class="rule-body">
            <strong>Уважайте право на тишину.</strong>
            <p>Желание партнера побыть наедине с собой — это не охлаждение к вам, а подзарядка его внутренней батарейки, чтобы возвращаться в контакт наполненным.</p>
          </div>
        </div>
        <div class="manifesto-rule">
          <span class="rule-num">III</span>
          <div class="rule-body">
            <strong>Благодарите за невидимую заботу.</strong>
            <p>Теплый кофе с утра, вовремя закрытая дверь, молчаливое объятие — замечайте детали и произносите спасибо каждый день.</p>
          </div>
        </div>
        <div class="manifesto-rule">
          <span class="rule-num">IV</span>
          <div class="rule-body">
            <strong>Держите союз закрытым от чужих мнений.</strong>
            <p>Что происходит внутри вашей орбиты — касается только вас двоих. Союз, защищенный от посторонних советов, становится неприступной крепостью.</p>
          </div>
        </div>
      </div>

      <blockquote class="duet-finale-quote">
        «Любовь — это не поиск идеального человека. Это решение изо дня в день создавать общее пространство тепла, где обоим безопасно, искренне и спокойно быть собой.»
      </blockquote>

      <div class="duet-recalc-cta no-print">
        <button id="duet-change-partner-bottom-btn" class="duet-btn-large-alt" type="button">
          ✎ Рассчитать Атлас союза с новым партнером · 300 ₽
        </button>
        <p class="duet-recalc-note">Хотите посмотреть синастрию и календарь свиданий с другим человеком? Пересчет полного атласа доступен в один клик.</p>
      </div>

      <p class="atlas-disclaimer">Материал носит информационно-развлекательный характер и не гарантирует наступления событий. Не используйте его как единственное основание для каких-либо выводов или решений.</p>

      <div class="atlas-end-actions no-print">
        <button id="duet-back-top" type="button">↑ К началу отчета</button>
        <button id="duet-save-pdf" type="button">Сохранить PDF союза</button>
      </div>
    `);

    return h;
  }

  function escapeIcs(v){
    return String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  }

  function duetCalendarFile(annual, partnerName){
    const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//Svoy Krug//Duet Couple Atlas//RU',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:Свой круг — Календарь союза'
    ];
    let count = 0;
    annual.months.forEach((m, idx) => {
      const theme = getMonthThemes(m.name, idx, partnerName);
      const baseDates = m.events.map(e => Number(e.date.slice(-2)));
      const goldDate = baseDates[0] || (idx * 2 + 10) % 27 + 1;
      const cautionDate = baseDates[1] || ((goldDate + 11) % 27) + 1;
      
      const year = m.key.slice(0, 4);
      const month = m.key.slice(5, 7);
      
      // Gold day event
      const dGoldStr = `${year}${month}${String(goldDate).padStart(2, '0')}`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:duet-gold-${dGoldStr}@svoykrug`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dGoldStr}`,
        `SUMMARY:${escapeIcs('♡ Золотой день для двоих · ' + partnerName)}`,
        `DESCRIPTION:${escapeIcs(theme.golden + ' ' + theme.practice)}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
      count++;

      // Caution day event
      const dWarnStr = `${year}${month}${String(cautionDate).padStart(2, '0')}`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:duet-warn-${dWarnStr}@svoykrug`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dWarnStr}`,
        `SUMMARY:${escapeIcs('⚠ День чуткости в паре · ' + partnerName)}`,
        `DESCRIPTION:${escapeIcs(theme.caution)}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      );
      count++;
    });
    lines.push('END:VCALENDAR');
    return { text: lines.join('\r\n') + '\r\n', count };
  }

  async function exportDuetCalendar(annual, partnerName){
    const status = document.getElementById('duet-calendar-status');
    if(!status) return;
    const { text, count } = duetCalendarFile(annual, partnerName);
    const file = new File([text], 'svoy-krug-soyuz.ics', { type: 'text/calendar;charset=utf-8' });
    try {
      if(navigator.canShare?.({ files: [file] }) && navigator.share){
        await navigator.share({ files: [file], title: `Календарь союза · ${partnerName}` });
        status.textContent = `Добавлено ${count} любовных дат в ваш календарь.`;
        return;
      }
    } catch (_) {}
    const url = URL.createObjectURL(file), link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = `Файл союза с ${count} датами скачан. Откройте его на смартфоне.`;
  }

  window.DuetView = {
    render,
    exportCalendar: exportDuetCalendar
  };
})();
