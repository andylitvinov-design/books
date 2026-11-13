'use strict';
/* HH_COMPETITOR_CATALOG_V1: entirely read-only against third-party systems.
   Local edits/export/import are browser-only; they never publish a feed or trigger CI. */
(function(){
  const KEY='hh.market-intelligence.catalog.v1';
  const seed=window.HH_COMPETITORS_SEED;
  const $=id=>document.getElementById(id);
  const safeText=x=>String(x==null?'':x);
  const categories={practice:'Персональное видео',pro:'Видеопродакшн',coach:'AI-коуч',psych:'AI-поддержка',hr:'AI HR'};
  const filters={video:[['all','Все'],['practice','Практики'],['pro','Профессиональное видео']],coaching:[['all','Все'],['coach','AI-коуч'],['psych','AI-психолог'],['hr','HR / Assessment']]};
  let editMode=false, data=clone(seed||{schema:'HH_COMPETITOR_CATALOG_V1',version:'not-loaded',items:[],sourceDocs:[],nextAction:{}}),changed=false;
  let tab=new URLSearchParams(location.search).get('tab')==='coaching'?'coaching':'video';
  let filter='all', search='', sort='rank', showArchive=false, opened=new Set();
  function clone(obj){return JSON.parse(JSON.stringify(obj));}
  function node(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=safeText(text);return x;}
  function link(label,href,cls){const a=node('a',cls,label);a.href=validUrl(href)?href:'#';a.rel='noopener noreferrer';a.target='_blank';a.addEventListener('click',e=>{e.stopPropagation();if(a.href==='#')e.preventDefault()});return a;}
  function validUrl(raw){try{const u=new URL(raw);return u.protocol==='https:' && !!u.hostname;}catch{return false;}}
  function retrieve(){try{const s=localStorage.getItem(KEY);if(!s)return;const d=JSON.parse(s);if(validate(d)){data=d;changed=true}}catch{}}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));changed=true;return true}catch{return false}}
  function validate(d){return d&&d.schema==='HH_COMPETITOR_CATALOG_V1'&&Array.isArray(d.items)&&d.items.length<=200&&d.items.every(x=>x&&typeof x.name==='string'&&x.name.length<200&&typeof x.id==='string'&&x.id.length<130&&['video','coaching'].includes(x.tab)&&Number.isFinite(Number(x.rank))&&validUrl(x.url));}
  function showToast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.hidden=true,3200);}
  function setTab(t){tab=t;filter='all';search='';$('search').value='';try{const u=new URL(location.href);u.searchParams.set('tab',t);history.replaceState(null,'',u)}catch{}render();}
  function makeChip(id,label){const b=node('button','chip'+(filter===id?' active':''),label);b.type='button';b.setAttribute('aria-pressed',filter===id?'true':'false');b.onclick=()=>{filter=id;render()};return b;}
  function screenshotUrl(url){return 'https://s.wordpress.com/mshots/v1/'+encodeURIComponent(url)+'?w=640&h=400';}
  function createCard(entry){
    const item=clone(entry), details=node('details','competitor-card');
    details.dataset.id=item.id;
    if(opened.has(item.id))details.open=true;
    details.addEventListener('toggle',()=>{if(details.open)opened.add(item.id);else opened.delete(item.id)});
    const summary=node('summary','card-summary');
    const preview=node('div','preview');
    const fallback=node('div','preview-fallback');
    fallback.append(node('b',null,item.name.replace(' — архив','').split(' ').slice(0,2).join(' ')));
    let domain='';try{domain=new URL(item.url).hostname.replace(/^www\./,'')}catch{}
    fallback.append(node('small',null,domain));preview.append(fallback);
    const img=node('img');img.loading='lazy';img.alt='Публичный снимок сайта '+item.name;
    img.referrerPolicy='no-referrer';img.decoding='async';img.src=screenshotUrl(item.url);
    img.onerror=()=>{img.hidden=true};img.onload=()=>{if(img.naturalWidth<80)img.hidden=true};
    preview.append(img,node('span','preview-type',categories[item.segment]||item.segment));
    const content=node('div','card-content'),up=node('div','card-upper');
    up.append(node('span','priority',item.status==='archived'?'АРХИВ':'№ '+item.rank),node('span','kind'+(item.status==='archived'?' historic':''),categories[item.segment]||item.segment));
    content.append(up,node('h2',null,item.name),node('p',null,item.focus));
    const meta=node('div','card-meta');
    meta.append(link('Открыть приложение ↗',item.url,'open-site'));
    meta.append(node('span',null,'Источник: '+(item.checked||'не указан')));
    content.append(meta);
    summary.append(preview,content,node('span','chevron','⌄'));details.append(summary);
    const body=node('div','card-detail'),grid=node('div','detail-grid');
    const left=node('section','detail-pane'),right=node('section','detail-pane action');
    left.append(node('h3',null,'✦ Сильное преимущество'),node('p',null,item.strength||'Не установлено'));
    right.append(node('h3',null,'↗ Наша стратегия доработки'),node('p',null,item.action||'Требуется аудит'));
    grid.append(left,right);body.append(grid);
    const notes=node('div','detail-notes');
    if(item.test){const p=node('p');p.append(node('b',null,'Проверка результата: '),document.createTextNode(item.test));notes.append(p)}
    if(item.risk){const p=node('p');p.append(node('b',null,'Ограничение: '),document.createTextNode(item.risk));notes.append(p)}
    if(notes.childElementCount)body.append(notes);
    const links=node('div','detail-links');links.append(link('Сайт / приложение ↗',item.url));
    if(item.source!==item.url&&validUrl(item.source))links.append(link('Первоисточник ↗',item.source));
    links.append(node('small',null,(item.verified||'NOT_VERIFIED')+' · наблюдение по официальным материалам, не hands-on E2E'));
    body.append(links);
    if(editMode){const editor=node('div','editor');editor.append(node('h3',null,'Редактирование на этом устройстве'));
      const fields=node('div','editor-grid'), controls={};
      [['rank','Приоритет №','number'],['focus','Фокус компании','textarea'],['strength','Преимущество','textarea'],['action','Наша стратегия','textarea'],['test','Критерий проверки','textarea'],['risk','Риск / ограничение','textarea'],['url','Ссылка на приложение','url'],['source','Ссылка на источник','url']].forEach(([key,label,type])=>{
        const wrap=node('label','editor-field'+(type==='textarea'?' row-span':''));wrap.append(node('span',null,label));
        const input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=safeText(item[key]);controls[key]=input;wrap.append(input);fields.append(wrap);
      });editor.append(fields);
      const save=node('button','save','Сохранить локально');save.onclick=()=>{
        const rank=Number(controls.rank.value);if(!Number.isFinite(rank)||rank<1||rank>999){showToast('Приоритет должен быть от 1 до 999');return}
        if(!validUrl(controls.url.value)||!validUrl(controls.source.value)){showToast('Нужна корректная HTTPS-ссылка');return}
        Object.keys(controls).forEach(k=>item[k]=(k==='rank'?rank:controls[k].value.trim().slice(0,1500)));
        item.editedAt=new Date().toISOString().slice(0,10);
        const idx=data.items.findIndex(v=>v.id===item.id);if(idx>=0){data.items[idx]=item;const ok=persist();render();opened.add(item.id);showToast(ok?'Сохранено в браузере. Экспортируйте JSON для переноса.':'Изменено в текущем сеансе. Скачайте JSON.')}
      };
      const cancel=node('button','cancel','Отмена');cancel.onclick=()=>{editMode=false;render()};editor.append(save,cancel);body.append(editor);
    }
    details.append(body);return details;
  }
  function render(){
    const countV=data.items.filter(x=>x.tab==='video'&&x.status!=='archived').length;
    const countC=data.items.filter(x=>x.tab==='coaching'&&x.status!=='archived').length;
    $('v-count').textContent=countV;$('c-count').textContent=countC;
    $('tab-video').setAttribute('aria-selected',String(tab==='video'));
    $('tab-coaching').setAttribute('aria-selected',String(tab==='coaching'));
    const suggest=data.nextAction&&data.nextAction[tab];$('insight-copy').textContent=suggest||'Сначала подтвердить реальный пользовательский путь и данные.';
    $('editor-toggle').textContent=editMode?'Режим просмотра':'✎ Править';
    $('editor-toggle').setAttribute('aria-pressed',editMode?'true':'false');
    $('version').textContent='Данные: '+(data.generatedAt||'—')+' · версия '+(data.version||'—')+(changed?' · локальная редакция':'');
    const filtersEl=$('filters');filtersEl.replaceChildren();(filters[tab]||[]).forEach(([id,label])=>filtersEl.append(makeChip(id,label)));
    const cards=$('cards');cards.replaceChildren();let chosen=data.items.filter(x=>x.tab===tab&&(filter==='all'||x.segment===filter)&&(showArchive||x.status!=='archived'));
    const term=search.trim().toLocaleLowerCase('ru');if(term)chosen=chosen.filter(x=>['name','focus','strength','action','risk'].some(k=>safeText(x[k]).toLocaleLowerCase('ru').includes(term)));
    chosen.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'ru'):sort==='date'?safeText(b.checked).localeCompare(safeText(a.checked))||Number(a.rank)-Number(b.rank):Number(a.rank)-Number(b.rank)||a.name.localeCompare(b.name,'ru'));
    chosen.forEach(x=>cards.append(createCard(x)));
    if(!chosen.length)cards.append(node('div','empty','Ничего не найдено. Измените фильтр или запрос.'));
    $('visible-count').textContent=chosen.length;
    $('total-count').textContent=data.items.filter(x=>x.tab===tab).length;
    $('archive-toggle').checked=showArchive;
  }
  function exportData(){const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='holistic-house-competitors-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),700);showToast('JSON экспортирован — изменения не опубликованы на сайте');}
  function importData(file){if(!file||file.size>1200000){showToast('Файл пустой или слишком большой');return}const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);if(!validate(incoming))throw Error('Неверный формат каталога');data=incoming;persist();opened.clear();render();showToast('Импортировано локально. Для общей публикации требуется релиз JSON.')}catch(e){showToast('Ошибка импорта: '+e.message)}};reader.readAsText(file,'utf-8')}
  $('tab-video').addEventListener('click',()=>setTab('video'));
  $('tab-coaching').addEventListener('click',()=>setTab('coaching'));
  $('search').addEventListener('input',e=>{search=e.target.value;render()});
  $('sort').addEventListener('change',e=>{sort=e.target.value;render()});
  $('archive-toggle').addEventListener('change',e=>{showArchive=e.target.checked;render()});
  $('editor-toggle').addEventListener('click',()=>{editMode=!editMode;render()});
  $('export').addEventListener('click',exportData);
  $('import-btn').addEventListener('click',()=>$('import').click());
  $('import').addEventListener('change',e=>{importData(e.target.files[0]);e.target.value='' });
  $('restore').addEventListener('click',()=>{if(!confirm('Сбросить только локальные правки и вернуться к исходной версии?'))return;data=clone(seed);changed=false;try{localStorage.removeItem(KEY)}catch{}opened.clear();render();showToast('Исходная версия восстановлена')});
  $('reload').addEventListener('click',()=>{location.reload()});
  retrieve();render();
})();