'use strict';
/* HH_PR_DENSE_NUMERIC_V1
 * Presentation only. Reads already-rendered PR widgets and hides redundant
 * detail panels until asked. No API calls, polling, CI, or false zero values.
 */
(function (env) {
  function compactValue(raw) {
    const s=String(raw==null?'':raw).replace(/[\u00a0\u202f]/g,' ').trim();
    if (!s || /^(?:—|–|-|н\/д|n\/a|nan|undefined|null)$/i.test(s)) return null;
    const m=s.match(/^[≈≥≤]?\s*(?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d+)?(?:\s*\/\s*\d+)?(?:\s*(?:сек|мин|ч|%))?\*?/u);
    return m?m[0].trim():null;
  }
  function visibleRows(entries) {
    const seen=new Set();
    return entries.filter(function(r) {
      if(!r||seen.has(r.key))return false;
      seen.add(r.key);
      return compactValue(r.now)!==null||compactValue(r.week)!==null;
    }).map(function(r) {
      return {key:r.key,label:r.label,now:compactValue(r.now),week:compactValue(r.week)};
    });
  }
  if(typeof module==='object'&&module.exports)module.exports={compactValue,visibleRows};
  if(!env||!env.document||env.__hhPrDenseNumericMounted)return;
  env.__hhPrDenseNumericMounted=true;
  const doc=env.document, specs=[
    {key:'repair',label:'Ошибка → Repair',type:'kpi',index:0},
    {key:'first',label:'CI с 1-й волны',type:'kpi',index:1},
    {key:'gate',label:'Green → Merge',type:'kpi',index:2},
    {key:'one',label:'1 CI-волна / PR',type:'wave',index:0},
    {key:'extra',label:'Повторные CI-волны',type:'wave',index:1}
  ];
  let box,rowsNode,note,detailButton,main,signature='',queued=false;
  function el(tag,className,value) {
    const n=doc.createElement(tag);if(className)n.className=className;
    if(value!==undefined)n.textContent=String(value);return n;
  }
  function directText(n) {
    if(!n)return '';
    let s='';for(const child of n.childNodes)if(child.nodeType===3)s+=child.nodeValue;
    return s.trim()||(!n.querySelector('small')?n.textContent.trim():'');
  }
  function read() {
    const kpis=[...doc.querySelectorAll('#hh-pr-three-kpis .hh-kpi-data .hh-kpi-item')];
    const waves=[...doc.querySelectorAll('#hh-pr-three-kpis .hh-kpi-wave-grid .hh-kpi-wave-card')];
    return specs.map(function(s) {
      let n,w;
      if(s.type==='kpi'){
        const item=kpis[s.index];
        const cells=item?.querySelectorAll('.hh-kpi-row .hh-kpi-number')||[];
        n=directText(cells[0]);w=directText(cells[1]);
      }else{
        const item=waves[s.index];
        n=item?.querySelector('.hh-kpi-wave-value')?.textContent||'';
        w=(item?.querySelector('.hh-kpi-wave-prev')?.textContent||'')
          .replace(/^7 дней назад:\s*/i,'');
      }
      return {key:s.key,label:s.label,now:n,week:w};
    });
  }
  function mount() {
    main=doc.querySelector('main.wrap')||doc.querySelector('main');
    const speed=doc.getElementById('hh-pr-merge-speed');
    if(!main||!speed||!main.contains(speed))return false;
    if(box)return true;
    box=el('section','hh-pr-dense-view');box.id='hh-pr-dense-view';
    box.setAttribute('aria-label','Ключевые цифры PR за 24 часа и неделю назад');
    const head=el('div','hh-pr-dense-head');
    head.append(el('h2','','Скорость PR'),el('small','','24ч / −7д'));
    const table=el('div','hh-pr-dense-table');table.setAttribute('role','table');
    const heading=el('div','hh-pr-dense-row hh-pr-dense-labels');
    heading.setAttribute('role','row');
    for(const title of ['Показатель','24ч','−7д']) {
      const cell=el('span','',title);cell.setAttribute('role','columnheader');heading.append(cell);
    }
    rowsNode=el('div','hh-pr-dense-rows');table.append(heading,rowsNode);
    const foot=el('div','hh-pr-dense-foot');
    note=el('small','hh-pr-dense-status','Сверка значений…');note.setAttribute('role','status');
    detailButton=el('button','hh-pr-dense-toggle','Все детали');
    detailButton.type='button';detailButton.setAttribute('aria-expanded','false');
    detailButton.addEventListener('click',function(){
      const expanded=doc.body.classList.toggle('hh-pr-dense-expanded');
      detailButton.textContent=expanded?'Скрыть детали':'Все детали';
      detailButton.setAttribute('aria-expanded',String(expanded));
    });
    foot.append(note,detailButton);box.append(head,table,foot);
    speed.insertAdjacentElement('afterend',box);
    doc.body.classList.add('hh-pr-dense');
    return true;
  }
  function paint() {
    if(!mount())return;
    const entries=read(),rows=visibleRows(entries);
    const missed=specs.length-rows.length;
    const next=JSON.stringify(rows)+'|'+missed;
    if(next===signature)return;
    signature=next;rowsNode.replaceChildren();
    if(!rows.length){
      const message=el('p','hh-pr-dense-no-data','Нет подтверждённых чисел за выбранный период');
      message.setAttribute('role','status');rowsNode.append(message);
    }else for(const data of rows){
      const row=el('div','hh-pr-dense-row');row.setAttribute('role','row');
      for(const value of [data.label,data.now||'н/д',data.week||'н/д']){
        const cell=el('span','',value);cell.setAttribute('role','cell');row.append(cell);
      }
      rowsNode.append(row);
    }
    note.textContent=rows.length+'/'+specs.length+' измерений'+
      (missed?' · без данных: '+missed:'')+' · охват в деталях';
    // Essential scorecard remains the single source for created/merged/open.
    // Replace only an empty glyph, not an unknown GitHub number with zero.
    doc.querySelectorAll('#hh-pr-merge-speed .hh-pr-speed-grid .hh-pr-speed-card strong')
      .forEach(function(node){
        if(node.textContent.trim()==='—')node.textContent='н/д';
      });
  }
  function schedule() {
    if(queued)return;queued=true;
    Promise.resolve().then(function(){queued=false;paint();});
  }
  function start() {
    if(!mount()){
      const startObserver=new MutationObserver(function(){
        if(mount()){startObserver.disconnect();start();}
      });
      startObserver.observe(doc.documentElement,{childList:true,subtree:true});
      return;
    }
    new MutationObserver(schedule).observe(main,{subtree:true,childList:true,characterData:true});
    schedule();
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(typeof window==='undefined'?null:window);
