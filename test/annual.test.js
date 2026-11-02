import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAccurateChart } from '../src/astro.js';
import { buildAnnualReport } from '../src/annual.js';

const mark={name:'Марк',date:'1996-04-08',time:'11:13',latitude:59.1269,longitude:37.9092};
const now=new Date('2026-10-10T12:00:00Z');

test('historical timezone and natal positions match control chart',()=>{
  const chart=calculateAccurateChart(mark);
  assert.equal(chart.utc,'1996-04-08T07:13:00.000Z');
  assert.equal(chart.input.tzOffsetHours,4);
  assert.equal(chart.bodies.find(b=>b.name==='Венера').sign,'Близнецы');
  assert.equal(chart.bodies.find(b=>b.name==='Юпитер').sign,'Козерог');
  assert.equal(chart.bodies.length,10);
  assert.equal(chart.houses.system,'placidus');
  assert.equal(chart.houses.cusps.length,12);
  // Independent Swiss Ephemeris 2.10.03 house calculation for this UTC instant.
  assert(Math.abs(chart.ascendant.longitude-112.538957)<0.005);
  assert(Math.abs(chart.houses.cusps[1].longitude-124.357261)<0.005);
  assert(Math.abs(chart.houses.midheaven.longitude-341.556949)<0.005);
  assert.equal(chart.bodies.find(b=>b.name==='Солнце').house,11);
});

test('missing birth time omits houses and high latitude reports fallback',()=>{
  const noTime=calculateAccurateChart({...mark,time:undefined});
  assert.equal(noTime.houses,null);
  assert.equal(noTime.ascendant.sign,null);
  const northern=calculateAccurateChart({...mark,latitude:69.0,longitude:33.1});
  assert.equal(northern.houses.fallback,true);
  assert.equal(northern.houses.system,'whole_sign');
});

test('full year uses 12 computed periods and personal aspects',async()=>{
  const report=await buildAnnualReport(calculateAccurateChart(mark),{now,useLlm:false});
  assert.equal(report.months.length,12);
  assert.equal(report.period.from,'Ноябрь 2026');
  assert.equal(report.period.to,'Октябрь 2027');
  assert(report.months[0].events.some(e=>e.date==='2026-11-08'&&e.label==='Уран соединяется с Венерой'));
  assert(report.months.every(m=>m.article.title&&m.article.reading&&m.phases.length));
});

test('different birth details produce different chart and annual markers',async()=>{
  const anna=calculateAccurateChart({name:'Анна',date:'1990-06-15',time:'09:30',latitude:55.7558,longitude:37.6173});
  const annaReport=await buildAnnualReport(anna,{now,useLlm:false});
  const markReport=await buildAnnualReport(calculateAccurateChart(mark),{now,useLlm:false});
  assert.notEqual(anna.bodies[0].sign,markReport.bodies[0].sign);
  assert.notDeepEqual(annaReport.months[0].events,markReport.months[0].events);
});

test('calendar export contains one valid all-day event per highlighted date',async()=>{
  globalThis.window={};
  await import('../public/annual-report.js');
  const report=await buildAnnualReport(calculateAccurateChart(mark),{now,useLlm:false});
  const html=window.AnnualView.render(report);
  assert.match(html,/О чём для вас этот год/);
  assert.match(html,/Марк, этот год может стать для вас сильным/);
  assert.match(html,/тема отношений и того, что для вас по-настоящему ценно/);
  const personalized=window.AnnualView.render({...report,conclusion:{
    meaning:'Личная линия года проходит через выбор близкого круга и новые договорённости.',
    direction:'К осени стоит вернуться к решениям весны и проверить, что изменилось.',
    closing:'Марк, оставьте место для важных людей и собственных решений.',
  }});
  assert.match(personalized,/Личная линия года проходит через выбор близкого круга/);
  assert.match(personalized,/Марк, оставьте место для важных людей/);
  const {text,count}=window.AnnualView.calendarFile(report);
  assert(text.startsWith('BEGIN:VCALENDAR\r\n'));
  assert(text.endsWith('END:VCALENDAR\r\n'));
  assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,count);
  assert.equal((text.match(/END:VEVENT/g)||[]).length,count);
  assert.includes ? assert.includes(text, 'DTSTART;VALUE=DATE:20261108') : assert(text.includes('DTSTART;VALUE=DATE:20261108'));
  assert(text.includes('Уран соединяется с Венерой'));
});

test('duet view renders couple synastry and 12 relationship months with custom theme', async () => {
  await import('../public/duet-report.js');
  const report = await buildAnnualReport(calculateAccurateChart(mark), { now, useLlm: false });
  const partner = { name: 'Алина', date: '1995-04-18', sign: 'Овен', score: 92 };
  const html = window.DuetView.render(report, partner, { input: { name: 'Марк' } });
  
  assert.match(html, /Марк <em>&<\/em> Алина/);
  assert.match(html, /АТЛАС СОЮЗА 2027 · ТАРИФ «ДУЭТ»/);
  assert.match(html, /92%/);
  assert.match(html, /КОСМОГРАММА СОЮЗА/);
  assert.match(html, /Золотой день для двоих/);
  assert.match(html, /День взаимной чуткости и бережности/);
  assert.match(html, /4 правила сохранения любви в 2027 году/);
});
