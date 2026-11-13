(function seoClient(){
 'use strict';
 const $=id=>document.getElementById(id),root=document.querySelector('.wrap'),header=root?.querySelector('.header');
 if(!root||!header||$('seo-view'))return;
 const ico=(k)=>k==='pr'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v12m0 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-12a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 12V9a6 6 0 0 0-6-6H9m9 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18M7 15l5-5 4 3 5-7"/></svg>';
 const nav=document.createElement('nav');nav.className='monitor-tabs';nav.setAttribute('aria-label','Разделы мониторинга');
 nav.innerHTML='<button type="button" id="tab-pr" class="monitor-tab" aria-selected="true">'+ico('pr')+' GitHub / PR</button><button type="button" id="tab-seo" class="monitor-tab" aria-selected="false">'+ico('seo')+' SEO / Трафик</button>';
 header.after(nav);
 const sec=document.createElement('section');sec.id='seo-view';sec.hidden=true;
 sec.innerHTML=`
 <div class="seo-head"><div><b>HOLISTIC HOUSE · SEO</b><p>Поиск, посещения и страницы · Торонто</p></div><button class="button" id="seo-refresh">↻ Обновить</button></div>
 <div id="seo-main">
 <div class="seo-periods" role="group" aria-label="Период"><button class="seo-period" data-period="today" aria-pressed="false">Сегодня</button><button class="seo-period" data-period="yesterday" aria-pressed="false">Вчера</button><button class="seo-period" data-period="7d" aria-pressed="true">7 дней</button><button class="seo-period" data-period="30d" aria-pressed="false">30 дней</button></div>
 <p class="seo-subtle" id="seo-period-label">Загружаю отчёт…</p>
 <div id="seo-sources" class="seo-sources" aria-live="polite"></div>
 <div class="seo-metrics">
 <article class="seo-metric"><span>Посещения</span><strong class="blue" id="seo-sessions">—</strong><small id="seo-sessions-delta">—</small><em>GA4 · сессии</em></article>
 <article class="seo-metric"><span>Клики Google</span><strong class="green" id="seo-clicks">—</strong><small id="seo-clicks-delta">—</small><em>Search Console</em></article>
 <article class="seo-metric"><span>Посетители</span><strong id="seo-users">—</strong><small id="seo-users-delta">—</small><em>GA4 · пользователи</em></article>
 <article class="seo-metric"><span>Просмотры страниц</span><strong class="blue" id="seo-pageviews">—</strong><small id="seo-pageviews-delta">—</small><em>GA4 · просмотры</em></article>
 <article class="seo-metric"><span>Показы в Google</span><strong class="amber" id="seo-impressions">—</strong><small id="seo-impressions-delta">—</small><em>Search Console</em></article>
 <article class="seo-metric"><span>CTR поиска</span><strong class="green" id="seo-ctr">—</strong><small id="seo-ctr-delta">—</small><em>Клики / показы</em></article>
 <article class="seo-metric"><span>Средняя позиция</span><strong class="amber" id="seo-position">—</strong><small id="seo-position-delta">—</small><em>Google · меньше лучше</em></article>
 </div>
 <section class="seo-card"><div class="seo-row-head"><h2>Динамика трафика и поиска</h2><span>По дням · реальные измерения</span></div><div class="seo-charts"><div><div class="seo-chart-title">● Посещения · GA4 <b id="seo-sessions-total">—</b></div><div id="seo-sessions-chart"></div></div><div><div class="seo-chart-title">● Клики · Google <b id="seo-clicks-total">—</b></div><div id="seo-clicks-chart"></div></div></div></section>
 <section class="seo-card"><h2>Популярные публичные страницы</h2><div class="seo-lists"><div><h3>Страницы · просмотры GA4</h3><div id="seo-traffic-pages"></div></div><div><h3>Страницы · клики Google</h3><div id="seo-search-pages"></div></div><div><h3>Поисковые запросы (непубличные)</h3><div id="seo-queries"></div></div></div></section>
 <section class="seo-card"><h2>Источники и точность</h2><p class="seo-subtle">Данные загружаются автоматически без ввода кода. Доступны только агрегированные показатели; если Google не подключён или не собирает события, отображается «—», не выдуманный ноль. Search Console и GA4 измеряют разные события. Google может пересчитывать поиск за последние 1–3 дня.</p><div id="seo-source-info"></div><div class="seo-out-links"><a href="https://analytics.google.com/" rel="noopener noreferrer" target="_blank">Google Analytics ↗</a><a href="https://search.google.com/search-console" rel="noopener noreferrer" target="_blank">Search Console ↗</a></div></section>
 <footer class="seo-foot"><span id="seo-freshness">—</span><span>Только агрегированные данные · без авторизации</span></footer>
 </div>`;
 nav.after(sec);
 const heading=header.querySelector('h1');
 let active='pr',period='7d',busy=false,updated=0;
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=new Intl.NumberFormat('ru-RU'),dec=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
 function switchTab(v,changeHash=true){
   active=v==='seo'?'seo':'pr';const seo=active==='seo';
   sec.hidden=!seo;document.body.classList.toggle('seo-active',seo);
   $('tab-pr').setAttribute('aria-selected',String(!seo));$('tab-seo').setAttribute('aria-selected',String(seo));
   heading.textContent=seo?'SEO и трафик':'Очередь PR';document.title=(seo?'SEO':'PR')+' · Holistic House';
   if(changeHash&&history.replaceState)history.replaceState(null,'',seo?'#seo':location.pathname+location.search);
   if(seo&&Date.now()-updated>12*60000)void load();
 }
 $('tab-pr').addEventListener('click',()=>switchTab('pr'));$('tab-seo').addEventListener('click',()=>switchTab('seo'));
 window.addEventListener('hashchange',()=>switchTab(location.hash==='#seo'?'seo':'pr',false));
 sec.querySelectorAll('.seo-period').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.period;sec.querySelectorAll('.seo-period').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));void load()}));
 $('seo-refresh').addEventListener('click',()=>void load(true));
 function fmt(k,v){if(v===null||v===undefined||!Number.isFinite(Number(v)))return '—';if(k==='ctr')return dec.format(v*100)+'%';if(k==='position')return dec.format(v);return num.format(Math.round(Number(v)))}
 function delta(k,a,b){
   if(a==null||b==null)return 'Нет данных для сравнения';
   if(k==='position'){const d=a-b;return (d>0?'+':'')+dec.format(d)+' к прошлому периоду'}
   if(k==='ctr'){const d=(a-b)*100;return (d>0?'+':'')+dec.format(d)+' п.п. к прошлому периоду'}
   if(Number(b)===0)return Number(a)>0?'Появились данные':'Без изменений';
   const d=(a-b)/b*100;return (d>0?'+':'')+dec.format(d)+'% к прошлому периоду';
 }
 function graph(rows,key,color){
   const points=(Array.isArray(rows)?rows:[]).filter(r=>Number.isFinite(r[key])&&r[key]>=0);
   if(!points.length)return '<div class="seo-empty">Нет измерений за период</div>';
   const width=300,height=75,margin=9,mx=Math.max(1,...points.map(r=>r[key])),coords=points.map((r,i)=>[margin+(width-2*margin)*(points.length===1?.5:i/(points.length-1)),height-margin-(height-2*margin)*r[key]/mx]);
   return '<svg class="seo-chart" viewBox="0 0 300 94" role="img" aria-label="Динамика '+safe(key)+' по '+points.length+' дням"><path d="M9 8H291 M9 39H291 M9 66H291" stroke="#31445c" stroke-dasharray="4 6" fill="none"/><path d="'+coords.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ')+'" stroke="'+color+'" fill="none" stroke-width="3.2" stroke-linecap="round"/>'+coords.map(([x,y])=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.8" fill="'+color+'"/>').join('')+'<text x="9" y="91" fill="#9db3c8" font-size="10">'+safe(points[0].date.slice(5))+'</text><text x="291" y="91" text-anchor="end" fill="#9db3c8" font-size="10">'+safe(points.at(-1).date.slice(5))+'</text></svg>';
 }
 function rows(id,data,field){$(id).innerHTML=data?.length?data.slice(0,8).map(x=>'<div class="seo-list-row"><span>'+safe(x.label)+'</span><b>'+fmt('',x[field])+'</b></div>').join(''):'<div class="seo-empty">Данные пока недоступны</div>'}
 const names={ga4:'GA4 · Посещения',gsc:'Google · Поиск'},statuses={OK:'Данные есть',NO_DATA:'Нет измерений',NOT_CONFIGURED:'Не подключён',ERROR:'Источник недоступен'};
 function render(d){
   // Do not show seven empty Google cards as though unavailable data were zero.
   // The separate consent-only first-party card stays visible and source-labelled.
   const ga4Available=!!d.sources?.ga4 && d.sources.ga4.status!=='NOT_CONFIGURED';
   const gscAvailable=!!d.sources?.gsc && d.sources.gsc.status!=='NOT_CONFIGURED';
   for(const [metric,provider] of [['sessions','ga4'],['users','ga4'],['pageviews','ga4'],['clicks','gsc'],['impressions','gsc'],['ctr','gsc'],['position','gsc']]){
     const card=$('seo-'+metric)?.closest('.seo-metric');
     if(card)card.style.display=(provider==='ga4'?ga4Available:gscAvailable)?'':'none';
   }
   const sessionsChart=$('seo-sessions-chart')?.parentElement;
   const clicksChart=$('seo-clicks-chart')?.parentElement;
   if(sessionsChart)sessionsChart.style.display=ga4Available?'':'none';
   if(clicksChart)clicksChart.style.display=gscAvailable?'':'none';
   const chartSection=$('seo-sessions-chart')?.closest('.seo-card');
   if(chartSection)chartSection.style.display=(ga4Available||gscAvailable)?'':'none';
   const pagesSection=$('seo-traffic-pages')?.closest('.seo-card');
   if(pagesSection)pagesSection.style.display=(ga4Available||gscAvailable)?'':'none';
   for(const [id,visible] of [['seo-traffic-pages',ga4Available],['seo-search-pages',gscAvailable],['seo-queries',gscAvailable]]){
     const group=$(id)?.parentElement;if(group)group.style.display=visible?'':'none';
   }
   const p=d.period||{};$('seo-period-label').textContent=(p.from||'—')+' — '+(p.to||'—')+' · Торонто · '+(p.partial?'текущий день неполный · ':'')+'сравнение с прошлым периодом';
   $('seo-sources').innerHTML=['ga4','gsc'].map(k=>'<span class="seo-pill" data-status="'+safe(d.sources?.[k]?.status||'NOT_CONFIGURED')+'">'+names[k]+': '+(statuses[d.sources?.[k]?.status]||'Нет данных')+'</span>').join('')+
     '<span class="seo-pill" data-status="'+(d.firstParty?.status==='OK'?'OK':d.firstParty?.status==='NO_DATA'?'NO_DATA':'NOT_CONFIGURED')+'">Свой счётчик: '+(d.firstParty?.status==='OK'?'Есть события':d.firstParty?.status==='NO_DATA'?'Подключён, нет измерений с согласия':d.firstParty?.status==='SOURCE_NOT_LIVE'?'Ожидает публикации':'Нет подключения')+'</span>';
   for(const k of ['sessions','clicks','users','pageviews','impressions','ctr','position']){$('seo-'+k).textContent=fmt(k,d.metrics?.[k]?.value);$('seo-'+k+'-delta').textContent=delta(k,d.metrics?.[k]?.value,d.metrics?.[k]?.previous);}
   $('seo-sessions-chart').innerHTML=graph(d.trends?.ga4,'sessions','#8bc9ff');$('seo-clicks-chart').innerHTML=graph(d.trends?.gsc,'clicks','#75e2be');
   $('seo-sessions-total').textContent=fmt('',d.metrics?.sessions?.value);$('seo-clicks-total').textContent=fmt('',d.metrics?.clicks?.value);
   rows('seo-traffic-pages',d.topTraffic,'views');rows('seo-search-pages',d.topPages,'clicks');
   $('seo-queries').innerHTML='<div class="seo-empty">Подробные поисковые запросы не публикуются в открытом отчёте. Доступны в Google Search Console.</div>';
   $('seo-source-info').innerHTML=['ga4','gsc'].map(k=>{const status=d.sources?.[k]?.status;let message=status==='OK'?'Получены агрегированные данные':status==='NO_DATA'?'Источник доступен, но за выбранный период не вернул данных. Это не означает ноль посещений.':status==='ERROR'?'Google API: '+(d.sources[k].message||'нет доступа'):'Источник не настроен для передачи статистики. Данные не заменяются нулями.';return '<p><strong>'+names[k]+'</strong>: '+safe(message)+'</p>'}).join('');
   $('seo-freshness').textContent='Источник проверен '+new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}).format(new Date(d.checkedAt||Date.now()))+' · Торонто. GA4/GSC могут публиковать статистику с задержкой.';
 }
 async function load(force=false){
   if(busy)return;busy=true;$('seo-refresh').disabled=true;$('seo-refresh').textContent='Обновляю…';
   $('seo-period-label').textContent='Проверяю реальные источники SEO…';
   try{
     const r=await fetch('/api/seo-public?period='+encodeURIComponent(period),{cache:'default'});
     if(!r.ok)throw Error('SEO API HTTP '+r.status);
     const report=await r.json();
     if(report?.schema!=='HH_SEO_PUBLIC_AGGREGATE_V1')throw Error('Неизвестный формат статистики');
     render(report);updated=Date.now();
     window.dispatchEvent(new CustomEvent('hh-seo-public-data',{detail:report}));
   }catch(e){$('seo-period-label').textContent='Данные временно недоступны: '+String(e.message||e);}
   finally{busy=false;$('seo-refresh').disabled=false;$('seo-refresh').textContent='↻ Обновить';}
 }
 setInterval(()=>{if(active==='seo'&&!document.hidden&&Date.now()-updated>15*60000)void load()},60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active==='seo'&&Date.now()-updated>15*60000)void load()});
 switchTab(location.hash==='#seo'?'seo':'pr',false);
})();
