(function seoPublicBridge(){
'use strict';
const root=document.getElementById('seo-main');if(!root||document.getElementById('seo-firstparty'))return;
const metrics=root.querySelector('.seo-metrics');if(!metrics)return;
const section=document.createElement('section');section.className='seo-card seo-firstparty';section.id='seo-firstparty';
const head=document.createElement('div');head.className='seo-row-head';head.innerHTML='<h2>Собственный счётчик сайта</h2><span class="fp-caption">Только с согласия посетителя</span>';section.append(head);
const status=document.createElement('p');status.id='fp-status';status.className='fp-status';status.setAttribute('role','status');status.textContent='Проверяю подключение…';section.append(status);
const grid=document.createElement('div');grid.className='fp-metrics';
const keys=[['entrances','Входы на сайт'],['pageViews','Просмотры'],['actionClicks','Нажатия']];
for(const [key,name] of keys){const item=document.createElement('div');const label=document.createElement('span');label.textContent=name;const value=document.createElement('strong');value.id='fp-'+key;value.textContent='—';const delta=document.createElement('small');delta.id='fp-'+key+'-diff';delta.textContent='—';item.append(label,value,delta);grid.append(item)}
section.append(grid);
const note=document.createElement('p');note.className='seo-subtle fp-note';note.textContent='Учитываются только добровольные агрегированные события с согласием. Входы не равны уникальным посетителям. Статистика начинается только после согласия посетителей; прошлые посещения не восстановить.';section.append(note);
const link=document.createElement('a');link.href='https://holistichouse.vercel.app/privacy';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Настройки добровольного счётчика';section.append(link);
metrics.before(section);
const fmt=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
const valid=x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
function update(ev){
 const data=ev.detail?.firstParty;if(!data)return;
 const names={OK:'Подключён · реальные добровольные измерения',NO_DATA:'Канал доступен, но измерений за период нет',SOURCE_NOT_LIVE:'Ожидает публикации PR #2951 · события недоступны',
 SOURCE_UNAVAILABLE:'Канал сайта временно недоступен',SOURCE_AUTH_FAILED:'Ошибка связи между сайтами',NOT_CONFIGURED:'Канал не настроен'};
 const state=names[data.status]||'Данные пока недоступны';
 status.textContent=state;status.className='fp-status '+(data.status==='OK'?'fp-ready':data.status==='NO_DATA'?'fp-empty':'fp-offline');
 for(const [key] of keys){
   const value=document.getElementById('fp-'+key),diff=document.getElementById('fp-'+key+'-diff');
   const now=data.totals?.[key]?.value,prior=data.totals?.[key]?.previous;
   value.textContent=valid(now)?fmt.format(now):'—';
   if(!valid(now)||!valid(prior))diff.textContent='Нет сопоставимых данных';
   else if(prior===0)diff.textContent=now===0?'Без изменений':'Появились измерения';
   else{const change=(now-prior)*100/prior;diff.textContent=(change>0?'+':'')+new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(change)+'% к прошлому периоду'}
 }
 drawTrend(data);
 drawDetails(data);
}

const trend=document.createElement('div');trend.id='fp-trend';trend.className='fp-bars';trend.setAttribute('aria-label','Просмотры страниц по дням');trend.style.display='none';section.insertBefore(trend,note);
function drawTrend(data){
 trend.replaceChildren();
 const rows=Array.isArray(data.trend)?data.trend.slice(-12).filter(v=>valid(v.pageViews)&&typeof v.date==='string'):[];
 trend.style.display=data.status==='OK'&&rows.length?'flex':'none';
 if(!rows.length)return;
 const max=Math.max(1,...rows.map(v=>v.pageViews));
 for(const row of rows){
  const col=document.createElement('div'),bar=document.createElement('div'),label=document.createElement('small');
  col.className='fp-bar-col';bar.className='fp-bar';bar.style.height=Math.max(2,Math.round(78*row.pageViews/max))+'px';
  bar.title=row.date+' · '+fmt.format(row.pageViews);label.textContent=row.date.slice(5);
  col.append(bar,label);trend.append(col);
 }
}


const detail=document.createElement('div');detail.id='fp-detail';detail.className='fp-grid';detail.style.display='none';section.insertBefore(detail,note);
const labels={direct:'Прямые', 'google-organic':'Google поиск','google-paid':'Google реклама','bing-organic':'Bing','instagram-organic':'Instagram','instagram-paid':'Instagram реклама','facebook-organic':'Facebook','facebook-paid':'Facebook реклама',youtube:'YouTube',telegram:'Telegram',whatsapp:'WhatsApp',partner:'Партнёры',referral:'Другие сайты',unknown:'Не определён'};
function drawDetails(data){
  detail.replaceChildren();
  const pages=Array.isArray(data.topPages)?data.topPages.filter(x=>valid(x.pageViews)&&typeof x.label==='string').slice(0,8):[];
  const sources=Array.isArray(data.topSources)?data.topSources.filter(x=>valid(x.entrances)&&typeof x.source==='string').slice(0,8):[];
  if(data.status!=='OK'||(!pages.length&&!sources.length)){detail.style.display='none';return;}
  detail.style.display='grid';
  for(const [heading,items,key,isSource] of [['Популярные страницы',pages,'pageViews',false],['Источники входов',sources,'entrances',true]]){
    if(!items.length)continue;
    const block=document.createElement('div'),title=document.createElement('h3');title.textContent=heading;block.append(title);
    for(const item of items){
      const line=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');
      line.className='seo-list-row';label.textContent=isSource?(labels[item.source]||'Не определён'):item.label;
      value.textContent=fmt.format(item[key]);line.append(label,value);block.append(line);
    }
    detail.append(block);
  }
}

window.addEventListener('hh-seo-public-data',update);
})();