'use strict';
(() => {
  const anchor = document.querySelector('.throughput');
  if (!anchor || document.getElementById('hh-pr-trends')) return;
  const REPO = 'andylitvinov-design/books';
  const API = 'https://api.github.com';
  const HOUR = 3600000;
  const REFRESH_MS = 60 * 60000;
  const KEY = 'hh-pr-trends-v1-' + REPO;
  const ZONE = 'America/Toronto';
  const formatter = new Intl.NumberFormat('ru-RU');
  const hoursFmt = new Intl.DateTimeFormat('ru-RU', {timeZone: ZONE, hour: '2-digit', hour12: false});
  const clockFmt = new Intl.DateTimeFormat('ru-RU', {timeZone: ZONE, hour: '2-digit', minute: '2-digit', hour12: false});
  const zoneFmt = new Intl.DateTimeFormat('en-US', {timeZone: ZONE, timeZoneName: 'short'});
  const color = {created: '#8bc9ff', processed: '#75e2be', ci: '#ffc576'};
  let selected = 5;
  let currentRows = [];
  let busy = false;
  let cachedAt = null;
  const section = document.createElement('section');
  section.className = 'hh-pr-trends';
  section.id = 'hh-pr-trends';
  section.setAttribute('aria-label', 'Динамика PR и CI за шесть последних часов');
  section.innerHTML = [
    '<div class="hh-trends-head"><div><h2>Динамика PR и CI</h2><p>Последние 6 часов · Торонто</p></div><span id="hh-trends-updated" class="hh-trends-updated">Загрузка…</span></div>',
    '<div class="hh-trends-legend"><span><i class="hh-dot-created"></i>Создано</span><span><i class="hh-dot-processed"></i>Обработано (merge)</span><span><i class="hh-dot-ci"></i>CI запущено</span></div>',
    '<div class="hh-trends-plot"><span class="hh-axis-left" id="hh-pr-axis">PR</span><span class="hh-axis-right" id="hh-ci-axis">CI</span><svg id="hh-trends-svg" viewBox="0 0 332 170" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Три линии: созданные PR, смерженные PR и запуски GitHub Actions по шести часам"></svg></div>',
    '<div id="hh-trends-periods" class="hh-trends-periods" role="group" aria-label="Выберите час для подробностей"></div>',
    '<div class="hh-trends-selected" aria-live="polite"><strong id="hh-trends-selected-time">Текущий период</strong><div class="hh-trends-selected-metrics"><span class="hh-blue">+<b id="hh-selected-created">—</b> PR</span><span class="hh-green"><b id="hh-selected-processed">—</b> merge</span><span class="hh-amber"><b id="hh-selected-ci">—</b> CI</span></div></div>',
    '<p id="hh-trends-note" class="hh-trends-note">Проверяю историю GitHub…</p>'
  ].join('');
  anchor.insertAdjacentElement('afterend', section);
  const el = id => section.querySelector('#' + id);
  const valid = value => Number.isSafeInteger(value) && value >= 0;
  const fmt = value => valid(value) ? formatter.format(value) : '—';
  const hourStart = ms => Math.floor(ms / HOUR) * HOUR;
  const lastHours = () => Array.from({length:6}, (_, i) => hourStart(Date.now()) + (i - 5) * HOUR);
  const iso = ms => new Date(ms).toISOString().replace('.000Z', 'Z');
  const dateHour = ms => hoursFmt.format(new Date(ms));
  const dateClock = ms => clockFmt.format(new Date(ms));
  const tzName = ms => zoneFmt.formatToParts(new Date(ms)).find(x => x.type === 'timeZoneName')?.value || '';
  function draw(rows) {
    const svg = el('hh-trends-svg');
    svg.replaceChildren();
    const create = (name, attrs) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', name);
      Object.keys(attrs).forEach(key => node.setAttribute(key, String(attrs[key])));
      svg.appendChild(node);
      return node;
    };
    const left = 17, right = 315, top = 19, bottom = 151;
    const prMax = Math.max(1, ...rows.flatMap(row => [row.created, row.processed].filter(valid)));
    const ciMax = Math.max(1, ...rows.map(row => row.ci).filter(valid));
    el('hh-pr-axis').textContent = 'PR · 0–' + fmt(prMax);
    el('hh-ci-axis').textContent = 'CI · 0–' + fmt(ciMax);
    for (let k = 0; k <= 3; k++) {
      const y = top + (bottom - top) * k / 3;
      create('line', {x1:left, y1:y, x2:right, y2:y, stroke:'#30445b', 'stroke-width':1, 'stroke-dasharray': k===3?'0':'3 5', opacity:k===3?0.8:0.48});
    }
    const xs = rows.map((row, index) => left + (right - left) * index / 5);
    create('line', {x1:xs[selected], y1:top, x2:xs[selected], y2:bottom, stroke:'#6b85a0', 'stroke-width':1, 'stroke-dasharray':'3 5', opacity:0.7});
    [
      {key:'created', max:prMax, stroke:color.created},
      {key:'processed', max:prMax, stroke:color.processed},
      {key:'ci', max:ciMax, stroke:color.ci}
    ].forEach(series => {
      const points = rows.map((row, index) => valid(row[series.key])
        ? {x:xs[index],y:bottom - row[series.key] / series.max * (bottom-top),i:index} : null);
      let path = '';
      let prev = null;
      points.forEach(point => {
        if (!point) { prev = null; return; }
        if (!prev) path += 'M ' + point.x + ' ' + point.y + ' ';
        else {const dx=(point.x-prev.x)/3;path += 'C '+(prev.x+dx)+' '+prev.y+' '+(point.x-dx)+' '+point.y+' '+point.x+' '+point.y+' ';}
        prev = point;
      });
      if (path) create('path', {d:path, fill:'none',stroke:series.stroke,'stroke-width':2.8,'stroke-linecap':'round','stroke-linejoin':'round'});
      points.forEach(point => {
        if (!point) return;
        create('circle',{cx:point.x,cy:point.y,r:point.i===selected?5:2.9,fill:series.stroke,stroke:'#142239','stroke-width':point.i===selected?2.3:1.2});
      });
    });
  }
  function render(rows, note) {
    currentRows = rows;
    const periodList = el('hh-trends-periods');
    periodList.replaceChildren();
    const labels = rows.map(row => dateHour(row.start));
    rows.forEach((row, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hh-period' + (selected === index ? ' is-selected' : '');
      button.dataset.start=String(row.start);
      button.setAttribute('aria-pressed', selected === index ? 'true' : 'false');
      button.setAttribute('aria-label', dateClock(row.start) + ' ' + tzName(row.start) + ': создано ' + fmt(row.created) + ', merge ' + fmt(row.processed) + ', запусков CI ' + fmt(row.ci));
      const multiple = labels.filter(x => x === labels[index]).length > 1;
      const offset = multiple ? (tzName(row.start)==='EDT'?'a':tzName(row.start)==='EST'?'b':'*') : '';
      button.innerHTML = '<span class="hh-period-hour"></span><span class="hh-period-created"></span><span class="hh-period-processed"></span><span class="hh-period-ci"></span>';
      button.children[0].textContent = labels[index] + offset;
      button.children[1].textContent = '+' + fmt(row.created);
      button.children[2].textContent = '✓' + fmt(row.processed);
      button.children[3].textContent = '▸' + fmt(row.ci);
      button.addEventListener('click', () => {selected = index;render(currentRows,el('hh-trends-note').textContent);});
      periodList.appendChild(button);
    });
    const row=rows[selected];
    const isCurrent=row.start === hourStart(Date.now());
    el('hh-trends-selected-time').textContent = dateClock(row.start) + '–' + (isCurrent ? 'сейчас' : dateClock(row.start + HOUR)) + ' · ' + tzName(row.start);
    el('hh-selected-created').textContent = fmt(row.created);
    el('hh-selected-processed').textContent = fmt(row.processed);
    el('hh-selected-ci').textContent = fmt(row.ci);
    el('hh-trends-note').textContent = note;
    draw(rows);
  }
  function readCache(hours) {
    try {
      const entry=JSON.parse(localStorage.getItem(KEY) || 'null');
      if (entry && valid(entry.fetchedAt) && Array.isArray(entry.rows) && entry.rows.length===6 && entry.rows.every((row,i)=>row.start===hours[i])) return entry;
    } catch (_) {}
    return null;
  }
  function writeCache(rows) {
    cachedAt=Date.now();
    try {localStorage.setItem(KEY, JSON.stringify({fetchedAt:cachedAt, rows}));} catch (_) {}
  }
  async function github(path) {
    const response=await fetch(API+path, {cache:'no-store'});
    if (!response.ok) throw new Error('GitHub API ' + response.status);
    return response.json();
  }
  async function searchPrs(query) {
    let items=[];
    for (let page=1;page<=10;page++) {
      const payload=await github('/search/issues?q='+encodeURIComponent('repo:'+REPO+' is:pr '+query)+'&per_page=100&page='+page);
      if (payload.incomplete_results || !valid(payload.total_count) || payload.total_count>1000 || !Array.isArray(payload.items)) throw new Error('Неполная история PR');
      items=items.concat(payload.items);
      if (items.length>=payload.total_count) return items;
      if (payload.items.length===0) break;
    }
    throw new Error('Не удалось получить полную историю PR');
  }
  async function countCi(start) {
    const end=start+HOUR-1000;
    const query=encodeURIComponent(iso(start)+'..'+iso(end));
    const payload=await github('/repos/'+REPO+'/actions/runs?created='+query+'&per_page=1');
    if (!valid(payload.total_count) || payload.total_count>=1000) throw new Error('Неполная история запусков CI');
    return payload.total_count;
  }
  async function pooled(tasks) {
    let next=0;
    const results=Array(tasks.length);
    await Promise.all(Array.from({length:3}, async () => {
      while(next<tasks.length){
        const i=next++;
        try {results[i]={ok:true,value:await tasks[i]()};}
        catch(err){results[i]={ok:false,error:String(err?.message||err)};}
      }
    }));
    return results;
  }
  function putEvents(rows, items, field, bucket) {
    if (!Array.isArray(items)) return;
    rows.forEach(row => {row[field]=0;});
    for(const event of items){
      const stamp=bucket(event),when=Date.parse(stamp);
      if (!Number.isFinite(when)) continue;
      const row=rows.find(x=>when>=x.start && when<x.start+HOUR);
      if(row) row[field]++;
    }
  }
  async function refresh(force) {
    if(busy) return;
    const hours=lastHours();
    const cache=readCache(hours);
    if(cache){
      cachedAt=cache.fetchedAt;
      render(cache.rows,'История GitHub · последние сохранённые значения. CI = запуски workflow, не отдельные jobs.');
      el('hh-trends-updated').textContent=dateClock(cache.fetchedAt);
      if(!force && Date.now()-cache.fetchedAt<REFRESH_MS) return;
    } else if(!currentRows.length || currentRows[5]?.start!==hours[5]) {
      render(hours.map(start=>({start,created:null,processed:null,ci:null})),'Получаю статистику GitHub…');
    }
    busy=true;
    el('hh-trends-updated').textContent='Обновляю…';
    try {
      const since=iso(hours[0]);
      const tasks=[
        ()=>searchPrs('created:>='+since),
        ()=>searchPrs('merged:>='+since),
        ...hours.map(start=>()=>countCi(start))
      ];
      const results=await pooled(tasks);
      const rows=hours.map(start=>({start,created:null,processed:null,ci:null}));
      if(results[0].ok) putEvents(rows,results[0].value,'created',item=>item.created_at);
      if(results[1].ok) putEvents(rows,results[1].value,'processed',item=>item.pull_request?.merged_at);
      hours.forEach((start,i)=>{if(results[i+2].ok) rows[i].ci=results[i+2].value;});
      const errors=results.filter(r=>!r.ok);
      if(!errors.length) {
        writeCache(rows);
        render(rows,'Текущий час неполный. CI = запуски GitHub Actions workflow, не отдельные jobs.');
      } else {
        if(cache) rows.forEach((row,i)=>['created','processed','ci'].forEach(key=>{if(row[key]===null)row[key]=cache.rows[i][key];}));
        render(rows,'Часть данных GitHub временно недоступна' + (cache?' · использован сохранённый замер':'') + '. Значение «—» означает отсутствие подтверждённых данных.');
      }
      el('hh-trends-updated').textContent = errors.length ? 'Частичные данные' : 'CI '+dateClock(Date.now());
    } catch (_) {
      el('hh-trends-updated').textContent='Нет связи';
      el('hh-trends-note').textContent='Не удалось прочитать GitHub. Доступные сохранённые значения оставлены без изменений.';
    } finally {busy=false;}
  }
  render(lastHours().map(start=>({start,created:null,processed:null,ci:null})), 'Подключаю GitHub…');
  window.setTimeout(()=>refresh(false),1200);
  window.setInterval(()=>{if(!document.hidden)refresh(false)},15*60000);
  const refreshButton=document.getElementById('refresh');
  if(refreshButton) refreshButton.addEventListener('click',()=>window.setTimeout(()=>refresh(true),1300));
})();