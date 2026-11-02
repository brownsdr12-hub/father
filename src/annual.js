import { Astronomy, bodyLongitude, BODY_KEYS } from './astro.js';
import { generateAnnualNarrative } from './report.js';

const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const TARGETS=[
  {angle:0,label:'соединение',kind:'соединяется с'},
  {angle:60,label:'секстиль',kind:'в секстиле к'},
  {angle:90,label:'квадрат',kind:'в квадрате к'},
  {angle:120,label:'тригон',kind:'в тригоне к'},
  {angle:180,label:'оппозиция',kind:'в оппозиции к'},
  {angle:240,label:'тригон',kind:'в тригоне к'},
  {angle:270,label:'квадрат',kind:'в квадрате к'},
  {angle:300,label:'секстиль',kind:'в секстиле к'},
];
const TRANSITS=['Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const TRANSIT_RU={Mars:'Марс',Jupiter:'Юпитер',Saturn:'Сатурн',Uranus:'Уран',Neptune:'Нептун',Pluto:'Плутон'};
const NATAL_CASES={
  Солнце:['Солнцем','Солнцу'],Луна:['Луной','Луне'],Меркурий:['Меркурием','Меркурию'],
  Венера:['Венерой','Венере'],Марс:['Марсом','Марсу'],Юпитер:['Юпитером','Юпитеру'],
  Сатурн:['Сатурном','Сатурну'],
};
const NATAL_GENITIVE={Солнце:'Солнца',Луна:'Луны',Меркурий:'Меркурия',Венера:'Венеры',
  Марс:'Марса',Юпитер:'Юпитера',Сатурн:'Сатурна'};
const PLANET_THEMES={
  Солнце:'личные цели и выбранную роль',Луна:'потребность в опоре и эмоциональный ритм',
  Меркурий:'разговоры, обучение и способ принимать решения',
  Венера:'ценности, близость и условия обмена',Марс:'усилия, инициативу и границы',
  Юпитер:'масштаб планов и ресурсы для роста',Сатурн:'ответственность, сроки и устойчивость',
};
const TRANSIT_THEMES={
  Mars:'действие и темп',Jupiter:'расширение и проверку возможностей',
  Saturn:'структуру и предел ресурсов',Uranus:'обновление привычных правил',
  Neptune:'воображение и риск идеализации',Pluto:'глубокий пересмотр мотивов',
};

const wrap180=n=>((n+180)%360+360)%360-180;
const monthKey=date=>date.toISOString().slice(0,7);
const moscowDate=date=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const fromMoscowMonth=(year,month)=>new Date(Date.UTC(year,month-1,1)-3*3600_000);

function aspectEvents(chart,start,end){
  const natal=chart.bodies.filter(b=>b.name in PLANET_THEMES);
  const times=[];
  for(let ms=start.getTime()-86400_000;ms<end.getTime()+86400_000;ms+=86400_000)times.push(ms);
  const found=[];
  for(const key of TRANSITS){
    const lons=times.map(ms=>bodyLongitude(key,new Date(ms)));
    for(const target of natal){
      for(const a of TARGETS){
        for(let i=1;i<times.length;i++){
          let left=wrap180(lons[i-1]-target.longitude-a.angle);
          let right=wrap180(lons[i]-target.longitude-a.angle);
          if(Math.abs(left-right)>30 || left*right>0)continue;
          let lo=times[i-1],hi=times[i];
          for(let j=0;j<24;j++){
            const mid=(lo+hi)/2;
            const value=wrap180(bodyLongitude(key,new Date(mid))-target.longitude-a.angle);
            if((left<=0 && value<=0)||(left>=0 && value>=0)){lo=mid;left=value;}else hi=mid;
          }
          const instant=new Date((lo+hi)/2);
          if(instant<start||instant>=end)continue;
          if(found.some(e=>e.transit===key&&e.natal===target.name&&e.aspect===a.label&&Math.abs(new Date(e.utc)-instant)<2*86400_000))continue;
          found.push({utc:instant.toISOString(),date:moscowDate(instant),transit:key,natal:target.name,
            aspect:a.label,label:`${TRANSIT_RU[key]} ${a.kind} ${NATAL_CASES[target.name][a.angle===0?0:1]}`,
            priority:({Pluto:6,Neptune:5,Uranus:5,Saturn:4,Jupiter:3,Mars:2})[key]});
        }
      }
    }
  }
  return found.sort((a,b)=>a.utc.localeCompare(b.utc));
}

function lunarPhases(start,end){
  const found=[];
  for(const [angle,label] of [[0,'Новолуние'],[180,'Полнолуние']]){
    let cursor=new Date(start.getTime()-33*86400_000);
    while(cursor<end){
      const phase=Astronomy.SearchMoonPhase(angle,cursor,40);
      if(!phase)break;
      const instant=phase.date;
      if(instant>=start&&instant<end)found.push({date:moscowDate(instant),label});
      cursor=new Date(instant.getTime()+86400_000);
    }
  }
  return found.sort((a,b)=>a.date.localeCompare(b.date));
}

function fallbackMonth(month,prev){
  const e=month.events[0];
  const second=month.events[1];
  if(!e)return {
    title:'Период внутренней опоры и интеграции',
    lead:`В ${month.name.toLowerCase()} на небе нет резких и напряженных аспектов к вашей карте. Это гармоничный месяц для закрепления результатов и спокойного движения в своем темпе.`,
    reading:'Такие месяцы особенно ценны: они дают передышку между активными периодами. В отношениях это время теплого, стабильного сближения без драмы и выяснения отношений. В делах — идеальный момент, чтобы довести начатое до финала, упорядочить дела и накопить силы. Обратите внимание на новолуние и полнолуние месяца: они подскажут естественный ритм активности и отдыха.',
    practice:'Посвятите этот месяц наведению порядка в делах и укреплению связи с теми, кто вам дорог. Запланируйте совместный отдых или спокойные выходные.',
    question:'В чем я сейчас чувствую наибольшую стабильность и благодарность за пройденный путь?',
  };

  const dayNum = Number(e.date.slice(-2));
  const monthName = month.name.toLowerCase().split(' ')[0];

  // Specific themes by planetary pairing
  if(e.natal === 'Венера' || e.transit === 'Neptune'){
    return {
      title:'Любовь и искренность: перезагрузка чувств',
      lead:`${dayNum} ${monthName} формируется точный ${e.aspect} ${TRANSIT_RU[e.transit]} к натальной Венере. В центре внимания — сфера чувств, близость и эмоциональный баланс.`,
      reading:`В личной жизни этот период обостряет интуицию и помогает яснее увидеть, где в союзе накопилась усталость, а где открывается второе дыхание. Если вы в паре, самое время поговорить о сокровенных желаниях без взаимных упреков — сейчас партнер услышит вас намного глубже. Если вы в поиске, это период повышенного обаяния, когда искренность притягивает достойных людей сильнее любых масок. ${second ? `К ${Number(second.date.slice(-2))} числа (${second.label}) этот импульс поможет перевести намерения в конкретные решения.` : ''}`,
      practice:'Озвучьте близкому человеку одно свое сокровенное желание или благодарность, которую давно носили в себе.',
      question:'Чего я по-настоящему хочу от отношений на этом этапе — безопасности, свободы или глубокой страсти?',
    };
  }

  if(e.natal === 'Марс' || e.transit === 'Mars' || e.transit === 'Pluto'){
    return {
      title:'Точка воли и смелых решений',
      lead:`${dayNum} ${monthName} аспект ${e.aspect} с участием ${TRANSIT_RU[e.transit]} задает импульс к решительным действиям, защите личных границ и лидерству.`,
      reading:`Месяц несет заряд высокой концентрации сил. Если вы долго сомневались в каком-то решении или откладывали сложный разговор, сейчас появляется энергия расставить точки над «i». Главное — не поддаваться резким порывам на пике эмоций: направьте этот огонь не в споры, а в созидание своих планов и проектов. В личной сфере смелость сказать прямо о своих границах вернет вам внутреннее уважение. ${second ? `Дополнительный аспект ${Number(second.date.slice(-2))} числа (${second.label}) поможет зафиксировать результат.` : ''}`,
      practice:'Определите один затянувшийся вопрос и сделайте по нему решительный, необратимый шаг на этой неделе.',
      question:'На что я трачу свои силы прямо сейчас — на достижение своих целей или на обслуживание чужих страхов?',
    };
  }

  if(e.natal === 'Солнце' || e.transit === 'Jupiter'){
    return {
      title:'Личная сила и расширение горизонтов',
      lead:`${dayNum} ${monthName} точный ${e.aspect} ${TRANSIT_RU[e.transit]} к Солнцу открывает окно для уверенного проявления себя и новых возможностей.`,
      reading:`Период подъема веры в себя и прояснения жизненных ориентиров. Вы яснее чувствуете свою уникальную силу и то, с какими людьми вам по пути, а какие форматы себя исчерпали. В делах и общении открываются двери для презентации идей и признания вашего вклада. Будьте щедры на внимание и не бойтесь брать инициативу: ваша уверенность привлекает надежных единомышленников и открывает новые перспективы.`,
      practice:'Сформулируйте ключевую цель на сезон и открыто поделитесь своими планами с теми, чьей поддержкой дорожите.',
      question:'В чем я готов позволить себе больше масштаба и признания?',
    };
  }

  if(e.natal === 'Луна'){
    return {
      title:'Внутренний ресурс и душевная опора',
      lead:`${dayNum} ${monthName} аспект к натальной Луне обращает внимание на душевное состояние, уют и потребность в заботе о себе.`,
      reading:`Период, когда особенно важно услышать свои истинные эмоциональные потребности. Если ритм жизни стал слишком напряженным, сбавьте темп: сейчас восстановление сил важнее гонки за чужими ожиданиями. Проведите время с теми, с кем можно снять броню и быть собой. В доме и семье этот месяц помогает восстановить доверительную атмосферу и залечить старые эмоциональные шероховатости.`,
      practice:'Выделите вечер без информационного шума и дел, посвятив его отдыху и тому, что наполняет вас тихой радостью.',
      question:'Что прямо сейчас дает мне наибольшее чувство душевного покоя и безопасности?',
    };
  }

  // Mercury / Saturn / Uranus / others
  return {
    title:'Деловой фокус и обновление договоренностей',
    lead:`${dayNum} ${monthName} ${TRANSIT_RU[e.transit]} ${e.aspect === 'соединение' ? 'соединяется с' : `в ${e.aspect} к`} ${NATAL_CASES[e.natal]?.[1] || e.natal}. Время структурирования планов и кристаллизации договоренностей.`,
    reading:`Месяц благоприятен для наведения порядка в делах, прояснения взаимных обязательств и пересмотра устаревших правил. В работе и сотрудничестве ваши аргументы звучат убедительно, а способность видеть детали убережет от досадных просчетов. Если какие-то правила в отношениях или проектах стали тесными, спокойно обновите условия — зрелый диалог укрепит союз сильнее слепого следования старым привычкам.`,
    practice:'Составьте список из трех ключевых договоренностей месяца и убедитесь, что вы и вторая сторона понимаете их одинаково.',
    question:'Какое правило или привычку мне пора обновить, чтобы освободить место для нового роста?',
  };
}

export async function buildAnnualReport(chart,{useLlm=true,now=new Date()}={}){
  const baseYear=now.getUTCFullYear(),baseMonth=now.getUTCMonth()+2;
  const start=fromMoscowMonth(baseYear,baseMonth);
  const end=fromMoscowMonth(baseYear,baseMonth+12);
  const events=aspectEvents(chart,start,end);
  const phases=lunarPhases(start,end);
  const months=Array.from({length:12},(_,i)=>{
    const date=new Date(Date.UTC(baseYear,baseMonth-1+i,1));
    const key=monthKey(date);
    const perMonth=events.filter(e=>e.date.slice(0,7)===key)
      .sort((a,b)=>b.priority-a.priority||a.date.localeCompare(b.date)).slice(0,5)
      .sort((a,b)=>a.date.localeCompare(b.date));
    return {key,name:`${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
      events:perMonth,phases:phases.filter(p=>p.date.slice(0,7)===key)};
  });
  months.forEach((m,i)=>{m.article=fallbackMonth(m,months[i-1]);});
  let narrativeSource='calculated-demo';
  let conclusion=null;
  if(useLlm){
    const generated=await generateAnnualNarrative(chart,months);
    if(generated){
      months.forEach((m,i)=>{
        if(generated.months[i]) m.article=generated.months[i];
      });
      conclusion=generated.conclusion;
      narrativeSource='llm';
    }
  }
  return {
    title:`Годовой атлас · ${chart.input.name||'Ваша карта'}`,
    subject:chart.input.name||'Вы',birth:chart.input,utc:chart.utc,timezone:chart.timezone,
    bodies:chart.bodies,ascendant:chart.ascendant,houses:chart.houses,accuracy:chart.accuracy,
    period:{from:months[0].name,to:months[11].name},months,conclusion,
    source:narrativeSource,method:`Тропические геоцентрические долготы Astronomy Engine; ${chart.houses?.system==='placidus'?'дома Плацидуса':chart.houses?'цельнознаковые дома':'без домов'}; точные мажорные транзитные аспекты и фазы Луны.`,
  };
}
