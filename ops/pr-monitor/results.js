'use strict';
/* On-demand read-only rendering from a dated PUBLIC summary.
 * Neither the private admin endpoint nor GitHub/CI is queried here.
 */
(function(){
 const root=document.getElementById('hh-results-root');
 if(!root)return;
 const make=(tag,className,content)=>{
  const e=document.createElement(tag);
  if(className)e.className=className;
  if(content!==undefined)e.textContent=String(content);
  return e;
 };
 const link=(label,href,className)=>{
  const a=make('a',className,label);
  a.href=href;
  if(href.startsWith('https://')){a.rel='noopener noreferrer';a.referrerPolicy='no-referrer'}
  return a;
 };
 const allowedUrls=new Set(['/pr-monitor.html','https://holistichouse.vercel.app/admin/video-library']);
 const safeUrl=url=>allowedUrls.has(url)?url:'/pr-monitor.html';
 const validInt=n=>Number.isSafeInteger(n)&&n>=0;
 function panel(id,title,tag){
  const el=make('section','hh-r-panel');el.id=id;
  const head=make('div','hh-r-head');
  head.append(make('h2',undefined,title),make('span','hh-r-label',tag));
  el.append(head);root.append(el);return el;
 }
 function readableSnapshot(date){
  const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||'');
  return parts?parts[3]+'.'+parts[2]+'.'+parts[1]:'дата не подтверждена';
 }
 function draw(data){
  root.replaceChildren();
  const hero=make('section','hh-cc-hero');
  hero.append(make('p','hh-cc-eyebrow','✦ HOLISTIC HOUSE · STRATEGY OS'),
   make('h1',undefined,'Мониторинг результатов'),
   make('p',undefined,'PR, видеобиблиотека и направления проекта · показатели с указанием источника'));
  root.append(hero);
  const tabs=make('nav','hh-r-tabs');tabs.setAttribute('aria-label','Направления результатов');
  for(const section of data.sections)tabs.append(link(section.name,'#'+section.id));
  root.append(tabs);
  for(const section of data.sections){
   const isVideo=section.id==='video',isPr=section.id==='pr';
   const status=isVideo?'Снимок '+readableSnapshot(data.observedDate):isPr?'Действующий монитор':'Нет источника';
   const card=panel(section.id,section.name,status);
   card.append(make('p','hh-r-note',section.description));
   if(isPr){
    card.append(link('Открыть PR → CI → Merge → LIVE','/pr-monitor.html','hh-r-action'));
   }else if(isVideo){
    const meter=make('div','hh-r-metrics');meter.setAttribute('aria-label','Показатели видеобиблиотеки');
    for(const item of data.video.metrics){
     const metric=make('div','hh-r-card');metric.append(make('strong',undefined,item.value),make('span',undefined,item.label));meter.append(metric);
    }
    card.append(meter,make('h3','hh-r-subtitle','Покрытие тем MyTube'));
    for(const entry of data.video.coverage){
     const wrap=make('div','hh-r-progress');
     const title=make('div','hh-r-progress-title');
     title.append(make('span',undefined,entry.label),make('strong',undefined,entry.count+'/'+entry.total));
     const track=make('div','hh-r-track');
     track.setAttribute('role','progressbar');
     track.setAttribute('aria-label',entry.label);
     track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(entry.total));
     track.setAttribute('aria-valuenow',String(entry.count));
     const fill=make('span');fill.style.width=(100*entry.count/entry.total).toFixed(1)+'%';
     track.append(fill);wrap.append(title,track);card.append(wrap);
    }
    const warnings=make('ul','hh-r-gaps');
    for(const note of data.video.gaps)warnings.append(make('li',undefined,note));
    card.append(warnings);
    card.append(make('p','hh-r-evidence','Источник: '+data.video.basis+
      '. Зафиксированный срез, не онлайн-проверка. При следующем обновлении данные нужно пересчитать по исходному каталогу.'));
    card.append(link('Открыть подробный аудит видеобиблиотеки',safeUrl(data.video.sourceUrl),'hh-r-action'));
   }else card.append(make('p','hh-r-unknown','— Источник ещё не подключён'));
  }
  root.append(make('p','hh-r-footer','Статусы независимы: наличие MP4, тематический подбор, проверка кадров и готовый экспорт — разные уровни доказательств. Публичный монитор не показывает данные клиентов, не запускает PR/CI и не опрашивает приватную БД.'));
 }
 function verify(data){
  if(!data||data.schema!=='HH_RESULTS_SNAPSHOT_V1'||data.refreshMode!=='manual_snapshot_not_live'||
   !Array.isArray(data.sections)||data.sections.length<4||!data.video||
   !Array.isArray(data.video.metrics)||data.video.metrics.length!==6||
   !Array.isArray(data.video.coverage)||data.video.coverage.length!==2||
   !Array.isArray(data.video.gaps))return false;
  const ids=data.sections.map(s=>s.id);
  if(new Set(ids).size!==ids.length||!['pr','video','site','courses','clients'].every(id=>ids.includes(id)))return false;
  const vals=Object.fromEntries(data.video.metrics.map(m=>[m.id,m.value]));
  if(![vals.mp4,vals.local,vals.motion,vals.story].every(validInt)||
     vals.mp4!==vals.local+vals.motion||vals.story!==0||
     vals.topics!=='29/64'||vals.four!=='17/64')return false;
  return data.video.coverage.every(c=>validInt(c.count)&&validInt(c.total)&&c.total>0&&c.count<=c.total);
 }
 async function main(){
  try{
   const response=await fetch('/results-metrics.json',{cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(!verify(data))throw Error('Неизвестная схема или противоречивые показатели');
   draw(data);
  }catch(error){
   root.append(make('p','hh-r-error','Показатели не удалось загрузить: '+String(error.message||error)+'. Цифры не подменяются нулями.'));
  }
 }
 main();
})();
