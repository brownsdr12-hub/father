(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names=['Солнце','Луна','Меркурий','Венера','Марс','Юпитер','Сатурн','Уран','Нептун','Плутон'];
  const short={Солнце:'С',Луна:'Л',Меркурий:'Ме',Венера:'В',Марс:'Ма',Юпитер:'Ю',Сатурн:'Са',Уран:'У',Нептун:'Н',Плутон:'П'};
  const signShort='ОВ ТЕ БЛ РА ЛЕ ДЕ ВЕ СК СТ КО ВД РЫ'.split(' ');
  const point=(lon,r)=>{const a=(lon-90)*Math.PI/180;return [250+r*Math.cos(a),250+r*Math.sin(a)];};
  function wheel(bodies,person,houses){
    let s='<svg class="atlas-wheel" viewBox="0 0 500 500" role="img" aria-label="Карта с вычисленными положениями планет"><circle cx="250" cy="250" r="224" fill="none" stroke="#c59d5b" stroke-width="2"/><circle cx="250" cy="250" r="183" fill="none" stroke="#82949e"/><circle cx="250" cy="250" r="114" fill="none" stroke="#82949e"/>';
    for(let i=0;i<12;i++){const [x,y]=point(i*30,114),[u,v]=point(i*30,224);s+=`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}" stroke="#9baab0"/>`;
      const [a,b]=point(i*30+15,204);s+=`<text x="${a}" y="${b}" text-anchor="middle" dominant-baseline="middle" fill="#ad864e" font-size="16">${signShort[i]}</text>`;}
    if(houses?.cusps?.length===12){
      houses.cusps.forEach((cusp,index)=>{
        const next=houses.cusps[(index+1)%12].longitude;
        const mid=cusp.longitude+((next-cusp.longitude+360)%360)/2;
        const [x,y]=point(cusp.longitude,48),[u,v]=point(cusp.longitude,114),[a,b]=point(mid,83);
        s+=`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}" stroke="${index===0||index===9?'#b98f50':'#9baab0'}" stroke-width="${index===0||index===9?1.8:1}"/><text x="${a}" y="${b}" text-anchor="middle" dominant-baseline="middle" fill="#667e88" font-size="11">${index+1}</text>`;
      });
    }
    const placed=[];
    [...bodies].filter(b=>names.includes(b.name)).sort((a,b)=>a.longitude-b.longitude).forEach(b=>{
      const [sx,sy]=point(b.longitude,114);let best=null;
      for(const r of [132,152,172]){const [x,y]=point(b.longitude,r);const distance=placed.length?Math.min(...placed.map(p=>Math.hypot(x-p[0],y-p[1]))):99;
        if(!best||distance>best.distance)best={x,y,distance};if(distance>=25)break;}
      placed.push([best.x,best.y]);s+=`<line x1="${sx}" y1="${sy}" x2="${best.x}" y2="${best.y}" stroke="#69818c"/><circle cx="${sx}" cy="${sy}" r="2.5" fill="#b98f50"/><circle cx="${best.x}" cy="${best.y}" r="10.5" fill="#f8f4ea" stroke="#b98f50"/><text x="${best.x}" y="${best.y+3}" text-anchor="middle" fill="#355c6b" font-size="8.5">${short[b.name]}</text>`;
    });
    return s+(houses?`<text x="250" y="247" text-anchor="middle" font-family="Georgia" font-size="13" fill="#355c6b">${houses.system==='placidus'?'ДОМА ПЛАЦИДУСА':'ЦЕЛЬНОЗНАКОВЫЕ ДОМА'}</text>`
      :`<text x="250" y="244" text-anchor="middle" font-family="Georgia" font-size="24" fill="#355c6b">${esc(person)}</text><text x="250" y="266" text-anchor="middle" font-size="10" fill="#86949b">ВРЕМЯ РОЖДЕНИЯ НЕ УКАЗАНО</text>`)+`</svg>`;
  }
  function page(n,kind,body){return `<section class="atlas-page ${kind}" id="atlas-page-${n}">${body}<div class="atlas-num">СВОЙ КРУГ · ${String(n).padStart(2,'0')}</div></section>`;}
  function calendar(month){
    const [year,m]=month.key.split('-').map(Number),first=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7,last=new Date(Date.UTC(year,m,0)).getUTCDate();
    const eventDates=new Set(month.events.map(e=>Number(e.date.slice(-2))));
    const phaseDates=new Set(month.phases.map(e=>Number(e.date.slice(-2))));
    let h='<div class="atlas-calendar">'+['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>`<span class="head">${d}</span>`).join('');
    for(let i=0;i<first;i++)h+='<span class="empty"></span>';
    for(let d=1;d<=last;d++)h+=`<span class="${eventDates.has(d)?'personal':phaseDates.has(d)?'phase':''}">${d}${eventDates.has(d)?' ✦':''}</span>`;
    return h+'</div><div class="atlas-legend"><i></i> точный личный аспект <i class="moon"></i> фаза Луны</div>';
  }
  function dateRu(iso){const [y,m,d]=iso.split('-');return `${Number(d)}.${m}.${y}`;}
  function birthDateRu(iso){
    const [y,m,d]=iso.split('-').map(Number);
    return new Date(Date.UTC(y,m-1,d)).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  }
  function yearSummary(annual,thread){
    const ranked=annual.months.map((month,index)=>({month,index,
      weight:month.events.reduce((sum,event)=>sum+event.priority,0)}))
      .sort((a,b)=>b.weight-a.weight||a.index-b.index);
    const first=ranked[0];
    const mainNatal=item=>[...item.month.events].sort((a,b)=>b.priority-a.priority)[0]?.natal;
    const second=ranked.find(item=>item.index!==first.index&&mainNatal(item)!==mainNatal(first))||ranked[1];
    const language={
      'Солнце':['ваших целей и права выбирать направление','выбирать важную цель и возвращаться к ней, даже если темп меняется'],
      'Луна':['внутренней опоры и эмоционального ритма','замечать, что действительно даёт вам силы, и оставлять для этого место'],
      'Меркурий':['разговоров, идей и решений','прояснять договорённости и не откладывать нужные разговоры'],
      'Венера':['отношений и того, что для вас по-настоящему ценно','говорить о своих ожиданиях и выбирать взаимные связи'],
      'Марс':['инициативы и личных границ','направлять силы на важное и вовремя обозначать свои границы'],
      'Юпитер':['роста и масштаба ваших планов','сверять большие планы с ресурсами и делать следующий реальный шаг'],
      'Сатурн':['ответственности и устойчивости','строить опору постепенно, не требуя от себя мгновенного результата'],
    };
    const [focus,step]=language[thread.event?.natal]||['ваших решений и выбора направления','замечать, что работает для вас, и действовать шаг за шагом'];
    const meaning=annual.conclusion?.meaning||`Одна из заметных линий этого года — тема ${focus}. К ней ведут разные главы атласа: не одна дата решает всё, а то, как вы отвечаете на возникающие вопросы и возможности.`;
    const direction=annual.conclusion?.direction||`Ваш ориентир на этот период — ${step}. Возвращайтесь к этим словам, когда отдельный месяц кажется запутанным: они помогут увидеть за списком аспектов собственную историю.`;
    const closing=annual.conclusion?.closing||`${annual.subject&&annual.subject!=='Вы'?`${annual.subject}, `:''}этот год может стать для вас сильным. Не нужно пройти его идеально: замечайте, что получается, меняйте то, что перестало работать, и продолжайте идти. Если вы будете действовать последовательно и беречь важное, в конце года увидите не только пройденные даты, но и собственные достижения.`;
    const monthText=item=>{
      const event=[...item.month.events].sort((a,b)=>b.priority-a.priority)[0];
      const [monthFocus,monthStep]=language[event?.natal]||[focus,step];
      return `Здесь на первый план выходит тема ${monthFocus}. Полезный ориентир — ${monthStep}.`;
    };
    return `<div class="atlas-summary-intro"><span class="atlas-kicker">ЕСЛИ ГОВОРИТЬ ПРОСТО</span><h3>О чём для вас этот год</h3><p>${esc(meaning)}</p><p>${esc(direction)}</p></div>
      <div class="atlas-summary-grid"><div><b>${esc(first.month.name)} · важный акцент</b><p>${esc(monthText(first))}</p></div>
      <div><b>${esc(second.month.name)} · другая важная тема</b><p>${esc(monthText(second))}</p></div></div>
      <blockquote>${esc(closing)}</blockquote>`;
  }
  function annualThread(months){
    const groups=new Map();
    for(const m of months)for(const e of m.events){if(!['Uranus','Neptune','Pluto','Saturn','Jupiter'].includes(e.transit))continue;
      const key=e.transit+'|'+e.natal+'|'+e.aspect;groups.set(key,[...(groups.get(key)||[]),e]);}
    const recurring=[...groups.values()].filter(x=>x.length>1).sort((a,b)=>b.length-a.length||b[0].priority-a[0].priority)[0];
    if(recurring)return {event:recurring[0],title:`${recurring[0].label}`,text:`Эта линия возвращается ${recurring.length} ${recurring.length>=2&&recurring.length<=4?'раза':'раз'} за год: ${recurring.map(e=>dateRu(e.date)).join(', ')}. Сравните, как меняется одна и та же тема от первого касания к последнему.`};
    const event=months.flatMap(m=>m.events).sort((a,b)=>b.priority-a.priority)[0];
    return event?{event,title:event.label,text:`Один из основных поворотных акцентов года приходится на ${dateRu(event.date)}. Вернитесь к этой главе перед месяцем и после него: так легче заметить, как развивается тема.`}:{title:'Год разных тем',text:'В расчётной сетке нет одного доминирующего аспекта: год лучше читать последовательно, от месяца к месяцу.'};
  }
  function render(annual){
    const name=annual.subject||'Ваш',sun=annual.bodies.find(b=>b.name==='Солнце'),moon=annual.bodies.find(b=>b.name==='Луна');
    const thread=annualThread(annual.months),birth=annual.birth;
    const houseLabel=annual.houses?.system==='placidus'?'Плацидус':annual.houses?'цельнознаковая система':null;
    let h='';
    const guide=[
      ['Карта рождения','Индивидуальный расчет небесных положений на точный момент появления на свет.'],
      ['Личный ритм','Смена эмоциональных и деловых фаз активности в течение 12 месяцев.'],
      ['Точки внимания','Периоды напряжения, требующие чуткости в общении и взвешенных решений.'],
      ['Окна возможностей','Благоприятные даты для сближения, диалога и реализации планов.'],
      ['Сферы жизни','Дома и сектора карты, отражающие партнерство, дело и внутренний ресурс.'],
      ['Календарь дат','Точные моменты значимых астрономических аспектов по вашим координатам.'],
    ];
    h+=page(1,'cover',`<span class="atlas-kicker">ПЕРСОНАЛЬНЫЙ НАВИГАТОР 2027</span><h1>${esc(name)},<br>ваш личный маршрут<br><em>на 2027 год</em></h1><p>${esc(annual.period.from)} — ${esc(annual.period.to)}<br>Отношения · Деловая активность · 12 глав · личный календарь дат</p><div class="atlas-cover-guide"><span class="atlas-kicker">КАК ЧИТАТЬ ЭТОТ НАВИГАТОР</span>${guide.map(([term,meaning])=>`<div><b>${term}</b><span>${meaning}</span></div>`).join('')}</div><small>СВОЙ КРУГ · ИНДИВИДУАЛЬНЫЙ НАВИГАТОР ГОДА</small>`);
    h+=page(2,'',`<span class="atlas-kicker">01 · КАРТА РОЖДЕНИЯ</span><h2>Ваш небесный почерк</h2><p class="atlas-lead">${esc(birthDateRu(birth.date))} · ${esc(birth.time||'время не указано')}${birth.cityName?` · ${esc(birth.cityName)}`:''}. Планеты и ${houseLabel?'дома':'знаки'} нанесены по расчётным положениям.</p><div class="atlas-trio"><div><small>Солнце</small><b>${esc(sun.sign)}</b><span>${sun.degreeInSign}°${String(sun.minuteInSign).padStart(2,'0')}′${sun.house?` · ${sun.house} дом`:''}</span></div><div><small>Луна</small><b>${esc(moon.sign)}</b><span>${moon.degreeInSign}°${String(moon.minuteInSign).padStart(2,'0')}′${moon.house?` · ${moon.house} дом`:''}</span></div><div><small>Асцендент</small><b>${birth.hasTime?esc(annual.ascendant.sign):'Неизвестен'}</b><span>${birth.hasTime?`${annual.ascendant.degreeInSign}°${String(annual.ascendant.minuteInSign).padStart(2,'0')}′`:'нужно время рождения'}</span></div></div>${wheel(annual.bodies,name,annual.houses)}<div class="atlas-positions">${annual.bodies.map(b=>`<div><b>${esc(b.name)}</b><span>${b.degreeInSign}°${String(b.minuteInSign).padStart(2,'0')}′ ${esc(b.sign)}${b.house?` · ${b.house} дом`:''}</span></div>`).join('')}</div><p class="atlas-small">${houseLabel?`Система домов: ${houseLabel}. ${annual.houses.fallback?'На этой широте система Плацидуса недоступна; применена цельнознаковая.':''}`:'Без времени рождения асцендент и дома не определяются.'} Время пересчитано по часовому поясу места рождения.</p>`);
    h+=page(3,'',`<span class="atlas-kicker">02 · ГЛАВНАЯ ЛИНИЯ</span><h2>Три касания к одной теме</h2><div class="atlas-rule"></div><p class="atlas-lead">${esc(thread.title)}</p><p>${esc(thread.text)}</p><div class="atlas-callout"><b>Как читать дальше</b><p>В начале каждой месячной главы — её главный акцент. Ниже вы найдёте даты аспектов, трактовку, практический шаг и календарь.</p></div><h3>Большая тройка</h3><p>Солнце в ${esc(sun.sign)} и Луна в ${esc(moon.sign)} задают исходные темы карты. ${birth.hasTime?`Асцендент в ${esc(annual.ascendant.sign)} добавляет ещё один слой к чтению года.`:'Без времени рождения Асцендент не определён.'} Годовые главы связывают их с рассчитанными положениями планет.</p>`);
    h+=page(4,'',`<span class="atlas-kicker">03 · МЕТОД</span><h2>На чём основан навигатор</h2><div class="atlas-rule"></div><div class="atlas-method"><div><b>Ваши исходные данные</b><p>${esc(birthDateRu(birth.date))} · ${esc(birth.time||'время не указано')}${birth.cityName?` · ${esc(birth.cityName)}`:''}. Учтён часовой пояс места рождения на эту дату.</p></div><div><b>Карта планет</b><p>Рассчитаны положения десяти небесных тел${houseLabel?`, асцендент и 12 домов (${houseLabel})`:''}. Схема на второй странице построена из этих данных.</p></div><div><b>Годовой календарь</b><p>Даты в месячных главах — моменты точных аспектов планет к вашей карте. Лунные фазы показаны отдельно. Даты в календаре приведены по московскому времени.</p></div><div><b>Как пользоваться отчётом</b><p>Сопоставляйте темы глав со своими обстоятельствами и возвращайтесь к календарю по мере года. Для личного разговора о тексте можно отдельно обратиться к практику.</p></div></div>`);
    h+=page(5,'',`<span class="atlas-kicker">04 · ГОД НА ОДНОМ ВЗГЛЯДЕ</span><h2>Двенадцать орбит</h2><div class="atlas-rule"></div><p class="atlas-lead">От первого расчётного маркера до последней главы. Нажмите на месяц, чтобы перейти к чтению.</p><div class="atlas-contents">${annual.months.map((m,i)=>`<a href="#atlas-page-${i+6}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(m.name)}</b><em>${esc(m.article.title)}</em></a>`).join('')}</div><div class="atlas-callout"><b>Линия года</b><p>${esc(thread.text)}</p></div>`);
    annual.months.forEach((m,i)=>{
      const a=m.article;
      h+=page(i+6,'month',`<span class="atlas-kicker">05 · МЕСЯЦ ${String(i+1).padStart(2,'0')} / 12</span><h2>${esc(m.name)}</h2><div class="atlas-rule"></div><span class="atlas-pill">${esc(a.title)}</span><p class="atlas-lead">${esc(a.lead)}</p><div class="atlas-aspects"><b>Основание главы</b>${m.events.length?m.events.slice(0,3).map(e=>`<span>${dateRu(e.date)} · ${esc(e.label)}</span>`).join(''):'<span>В выбранном наборе нет точного мажорного аспекта.</span>'}</div><p>${esc(a.reading)}</p><div class="atlas-callout"><b>Фокус внимания в этом месяце</b><p>${esc(a.practice)}</p></div><blockquote>${esc(a.question)}</blockquote><h3>Календарь месяца</h3>${calendar(m)}`);
    });
    h+=page(18,'afterword',`<span class="atlas-kicker">06 · СЛЕДУЮЩИЙ ШАГ · ВТОРАЯ ЛИНИЯ</span><h2>Разбор с экспертом сообщества</h2><div class="atlas-rule"></div><p class="atlas-lead">Алгоритм рассчитывает общие циклы и даты. Но реальная жизнь всегда глубже формул: если впереди важный разговор, сомнения в партнере или развилка в делах — разберите ситуацию лично.</p><div class="atlas-method"><div><b>Индивидуальный контекст</b><p>Специалист сообщества изучает вашу натальную карту в связке с конкретным запросом, а не по шаблону.</p></div><div><b>Голосовой разбор</b><p>Ответ голосом в закрытом диалоге ВКонтакте: ответы на вопросы, эмоциональная поддержка и точные рекомендации.</p></div></div><div class="atlas-callout atlas-contact"><h3>Остался вопрос по сложным периодам?</h3><p>Напишите в личные сообщения сообщества кодовое слово <b>НАВИГАТОР</b>. Практикующий эксперт сообщества подключится к вашей ситуации и ответит на волнующие вопросы.</p></div><div class="atlas-callout atlas-export"><h3>Сохранить даты в телефон</h3><p>Скачайте персональный календарь, чтобы важные даты года всегда были под рукой в вашем смартфоне.</p><button id="export-calendar" type="button">Скачать календарь (.ics)</button><p id="calendar-export-status" class="atlas-small" aria-live="polite"></p></div>`);
    if(annual.tier==='duet'||annual.partner){
      const partnerName=annual.partner?.name||'Партнер';
      h+=page(18.5,'duet-page',`<span class="atlas-kicker">06 · СОВМЕСТИМОСТЬ СОЮЗА НА 2027 ГОД</span><h2>${esc(name)} + ${esc(partnerName)}</h2><div class="atlas-rule"></div><span class="atlas-pill">Тариф «Дуэт» · Синастрия и динамика пары</span><p class="atlas-lead">Анализ взаимодействия двух карт: резонанс планет чувств, циклы доверия и периоды максимальной гармонии в 2027 году.</p><div class="atlas-method"><div><b>Связь планет чувств</b><p>Гармоничный контакт Венеры и Луны создает глубокую эмоциональную привязку и способность интуитивно понимать состояние друг друга.</p></div><div><b>Точки роста и границы</b><p>Периоды напряжения Сатурна требуют ясных договоренностей в быту и уважения к личному пространству партнера.</p></div><div><b>Благоприятные месяцы для пары</b><p>Апрель, июль и ноябрь 2027 года — периоды максимальной нежности, совместных поездок и укрепления фундамента союза.</p></div><div><b>Период чуткости</b><p>Сентябрь 2027 — время снизить претензии и не начинать резких выяснений отношений на фоне накопившейся усталости.</p></div></div><div class="atlas-callout"><b>Совет союзу на 2027 год</b><p>Не ждите от партнера чтения мыслей. Прямой и спокойный диалог о том, что радует и что ранит, сделает ваш союз в 2027 году устойчивым к любым внешним штормам.</p></div>`);
    }
    h+=page(19,'conclusion',`<span class="atlas-kicker">07 · ИТОГ ГОДА</span><h2>${esc(name)}, ваш год в целом</h2><div class="atlas-rule"></div>${yearSummary(annual,thread)}<p class="atlas-disclaimer">Материал носит информационно-развлекательный характер и не гарантирует наступления событий. Не используйте его как единственное основание для каких-либо выводов или решений.</p><div class="atlas-end-actions"><button id="atlas-back-top" type="button">↑ К началу отчета</button><button id="atlas-save-pdf" type="button">Сохранить PDF</button></div>`);
    return h;
  }
  function escapeIcs(value){return String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
  function fold(line){
    let out='',part='',bytes=0;
    for(const char of line){const size=new TextEncoder().encode(char).length;
      if(bytes+size>73){out+=part+'\r\n ';part='';bytes=1;}
      part+=char;bytes+=size;}
    return out+part;
  }
  function nextDate(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10).replace(/-/g,'');}
  function calendarFile(annual){
    const grouped=new Map();
    for(const m of annual.months)for(const e of m.events)grouped.set(e.date,[...(grouped.get(e.date)||[]),e]);
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Svoy Krug//Annual Atlas Demo//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Свой круг — личные даты'];
    for(const [date,events] of [...grouped].sort(([a],[b])=>a.localeCompare(b))){
      const caution=events.some(e=>['квадрат','оппозиция'].includes(e.aspect));
      const supportive=events.some(e=>['тригон','секстиль'].includes(e.aspect));
      const title=caution?'День для проверки':supportive?'День для шага':'Тема для наблюдения';
      const code=events.map(e=>`${e.transit}-${e.natal}-${e.aspect}`).join('-').replace(/[^a-zA-Z0-9-]/g,'');
      const uid=`sk-${annual.utc.slice(0,10).replace(/-/g,'')}-${date.replace(/-/g,'')}-${code||'event'}@calendar.svoykrug`;
      lines.push('BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${nextDate(date)}`,
        `SUMMARY:${escapeIcs('Свой круг · '+title)}`,
        `DESCRIPTION:${escapeIcs(events.map(e=>e.label).join('; ')+'. Рассчитанные астрономические даты, но не обещание удачи или события. Откройте свой годовой атлас в приложении «Свой круг».')}`,
        'TRANSP:TRANSPARENT','END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return {text:lines.map(fold).join('\r\n')+'\r\n',count:grouped.size};
  }
  async function exportCalendar(annual){
    const status=document.getElementById('calendar-export-status');
    if(!status)return;
    const {text,count}=calendarFile(annual);
    if(!count){status.textContent='В этом атласе нет личных дат для экспорта.';return;}
    const file=new File([text],'svoy-krug-god.ics',{type:'text/calendar;charset=utf-8'});
    try{
      if(navigator.canShare?.({files:[file]})&&navigator.share){
        await navigator.share({files:[file],title:'Личные даты · Свой круг'});
        status.textContent=`Передано ${count} дат. Выберите приложение календаря или сохраните файл.`;
        return;
      }
    }catch(error){if(error?.name==='AbortError'){status.textContent='Отправка отменена. Файл не добавлен в календарь.';return;}}
    const url=URL.createObjectURL(file),link=document.createElement('a');
    link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60_000);
    status.textContent=`Файл с ${count} датами скачан. Откройте его на телефоне; импорт в Google Calendar может потребовать веб-версию на компьютере.`;
  }
  let pageObserver;
  function revealPages(root){
    pageObserver?.disconnect();
    if(!root||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const pages=[...root.querySelectorAll('.atlas-page')];
    pages.forEach(page=>page.classList.add('will-reveal'));
    pageObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add('is-visible');
        pageObserver.unobserve(entry.target);
      }
    },{rootMargin:'0px 0px 80px 0px',threshold:0.03});
    pages.forEach(page=>pageObserver.observe(page));
  }
  window.AnnualView={render,exportCalendar,calendarFile,revealPages};
})();
