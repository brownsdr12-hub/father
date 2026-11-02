import * as Astronomy from 'astronomy-engine';
import tzLookup from 'tz-lookup';
import { Engine } from 'caelus';
import { embeddedData } from 'caelus/data-embedded';
import { describeLongitude, toJulianDate } from './chart.js';

const houseEngine = new Engine(embeddedData);

const BODY_NAMES = [
  ['Солнце', 'Sun', '☉'], ['Луна', 'Moon', '☽'], ['Меркурий', 'Mercury', '☿'],
  ['Венера', 'Venus', '♀'], ['Марс', 'Mars', '♂'], ['Юпитер', 'Jupiter', '♃'],
  ['Сатурн', 'Saturn', '♄'], ['Уран', 'Uranus', '♅'],
  ['Нептун', 'Neptune', '♆'], ['Плутон', 'Pluto', '♇'],
];

export const BODY_KEYS = Object.fromEntries(BODY_NAMES.map(([name,key]) => [name,key]));

export function bodyLongitude(key, date) {
  return Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[key], date, true)).elon;
}

function localParts(date, zone) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23',
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  const p = Object.fromEntries(fmt.formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type,Number(x.value)]));
  return [p.year,p.month,p.day,p.hour,p.minute];
}

export function birthUtc(input) {
  const { date, time, latitude, longitude } = input;
  const [year,month,day] = date.split('-').map(Number);
  const [hour,minute] = (time || '12:00').split(':').map(Number);
  const parsed = new Date(Date.UTC(year,month-1,day,hour,minute));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude)>90 || Math.abs(longitude)>180
      || parsed.getUTCFullYear()!==year || parsed.getUTCMonth()!==month-1
      || parsed.getUTCDate()!==day || hour>23 || minute>59) {
    throw new Error('Проверьте дату, время и координаты рождения.');
  }
  const zone = tzLookup(latitude, longitude);
  const local = [year,month,day,hour,minute];
  const naive = Date.UTC(...[year,month-1,day,hour,minute]);
  const matches=[];
  for(let offset=-12*60;offset<=14*60;offset+=15){
    const utc=new Date(naive-offset*60_000);
    if(localParts(utc,zone).every((n,i)=>n===local[i]))matches.push({utc,offset});
  }
  if(!matches.length)throw new Error('Такого местного времени не было из-за перевода часов. Уточните время рождения.');
  return { utc:matches[0].utc, zone, offsetHours:matches[0].offset/60,
    ambiguous:matches.length>1, hasTime:Boolean(time) };
}

export function calculateAccurateChart(input) {
  const birth=birthUtc(input);
  const jd=toJulianDate(birth.utc);
  const houseChart=birth.hasTime
    ? houseEngine.chartAt(jd,input.latitude,input.longitude,'placidus')
    : null;
  const bodies=BODY_NAMES.map(([name,key,glyph])=>({name,glyph,
    ...describeLongitude(bodyLongitude(key,birth.utc)),
    house:houseChart?.bodies[key.toLowerCase()]?.house??null}));
  const houses=houseChart?{
    requested:'placidus',system:houseChart.houseSystem,
    cusps:houseChart.cusps.map((longitude,index)=>({number:index+1,...describeLongitude(longitude)})),
    midheaven:describeLongitude(houseChart.angles.mc),
    fallback:houseChart.houseSystem!=='placidus',
  }:null;
  return {
    input:{...input,hasTime:birth.hasTime,tzOffsetHours:birth.offsetHours,time:input.time||null},
    utc:birth.utc.toISOString(),julianDate:Number(jd.toFixed(6)),
    timezone:birth.zone,ambiguousLocalTime:birth.ambiguous,
    bodies,
    ascendant:{name:'Асцендент',glyph:'AC',approximate:!birth.hasTime,
      provisional:false,...(houseChart?describeLongitude(houseChart.angles.asc):{sign:null,longitude:null})},
    houses,
    accuracy:{engine:'astronomy-engine-2.1.19',
      houseEngine:'caelus-0.25.0',houseSystem:houses?.system??null,
      warning:birth.hasTime
        ?`Планеты и дома рассчитаны. ${houses.fallback?'На этой широте Плацидус заменён цельнознаковой системой.':''}`
        :'Время рождения не указано: Асцендент и дома не рассчитываются.',
      ascendantApproximate:!birth.hasTime},
  };
}

export { Astronomy };
