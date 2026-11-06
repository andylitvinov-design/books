'use strict';
/* HH_PR_OPEN_QUEUE_V1: the whole OPEN production-PR population, not CI queue.
 * Two normal anonymous GitHub read requests for ~130 open PR. Cached for 15 min;
 * one manual refresh. Never starts CI or replaces unknown counts with zero.
 */
(function (env) {
  const REPO='andylitvinov-design/books', BASE='codex/public-book-library';
  const KEY='hh-open-queue-v1-'+REPO, TTL=15*60*1000, MAX_PAGES=6;
  const tech=/^(?:ci|core|infra|infrastructure|devops|ops|vercel|deployment|deploy|build|runner|workflow|workflows|automation|release|security|benchmark|performance|monitor|monitoring|observability|metrics|telemetry|lint|refactor|tooling|config|configuration|maintenance|cache|testing|e2e|scripts|github)$/i;
  const func=/^(?:frontend|ui|ux|profile|cabinet|library|video|audio|voice|messenger|crm|course|courses|reiki|practitioner|payment|checkout|home|mytube|coaching|support|design|assessment|assessments|therapy|psychologist|business|services|service|learning|landing|onboarding|hypno|constellations|revenue|app|client|meditation|academy|intelligence|pdf|myhouse|dot|temple|pwa|seo|marketing|story|generator)$/i;
  function classify(pr) {
    const labels=(pr?.labels||[]).map(x=>String(typeof x==='string'?x:x?.name||'').toLowerCase());
    if (labels.some(x=>/^(?:hh:kind:technical|kind:technical|type:technical)$/.test(x)))return 'technical';
    if (labels.some(x=>/^(?:hh:kind:functional|kind:functional|type:functional)$/.test(x)))return 'functional';
    const title=String(pr?.title||'').trim(),m=title.match(/^(?:P[0-4]\s+)?(feat|fix|perf|refactor|chore|ci|build|test|docs|style|security)\(([^)]+)\)\s*:/i);
    const action=(m?.[1]||'').toLowerCase(),scope=(m?.[2]||'').toLowerCase();
    if(['ci','perf','refactor','chore','build','test','security'].includes(action))return 'technical';
    if (scope) {
      const words=scope.split(/[,\/\s-]+/).filter(Boolean);
      const t=words.some(w=>tech.test(w)), f=words.some(w=>func.test(w));
      if(t&&f)return 'unknown';
      if(t)return 'technical';
      if(f)return 'functional';
    }
    if(action==='feat')return 'functional';
    if(/^\s*(?:P[0-4]\s+)?(?:fix|improve)\b.+\b(?:CI|runner|workflow|build pipeline|merge gate)\b/i.test(title))return 'technical';
    if(/\b(?:video|audio|profile|client|customer|cabinet|landing|meditation|booking|payment|reiki|assessment|messenger)\b/i.test(title))return 'functional';
    return 'unknown';
  }
  function tally(prs) {
    if(!Array.isArray(prs))throw Error('INVALID_PR_LIST');
    const out={total:0,production:0,other:0,ready:0,draft:0,functional:0,technical:0,unknown:0};
    const seen=new Set();
    for(const p of prs){
      if(!Number.isSafeInteger(p?.number)||p.number<1||seen.has(p.number)||typeof p.title!=='string'||typeof p.base?.ref!=='string'||!Array.isArray(p.labels)||typeof p.draft!=='boolean')throw Error('INCOMPLETE_PR_ROW');
      seen.add(p.number);out.total++;
      if(p.base.ref!==BASE){out.other++;continue;}
      out.production++;
      out[p.draft?'draft':'ready']++;
      out[classify(p)]++;
    }
    if(out.production!==out.functional+out.technical+out.unknown||out.production!==out.ready+out.draft||out.total!==out.production+out.other)throw Error('PR_TOTALS_INVALID');
    return out;
  }
  function verifyCache(record,now) {
    const c=record?.counts;
    if(record?.schema!=='HH_PR_OPEN_QUEUE_V1'||!Number.isFinite(record.at)||record.at>now||now-record.at>60*60*1000||!c||Object.values(c).some(x=>!Number.isSafeInteger(x)||x<0)||c.total!==c.production+c.other||c.production!==c.ready+c.draft||c.production!==c.functional+c.technical+c.unknown)return null;
    return record;
  }
  if(typeof module==='object'&&module.exports)module.exports={classify,tally,verifyCache};
  if(!env?.document||!env.fetch)return;
  const doc=env.document;
  let root=null,loading=false,stored=null;
  const find=name=>root?.querySelector('[data-hhq="'+name+'"]');
  const put=(name,value)=>{const el=find(name);if(el)el.textContent=value;};
  function display(record,isStale) {
    const c=record.counts;
    for(const key of Object.keys(c))put(key,String(c[key]));
    const at=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit'}).format(new Date(record.at));
    put('status',(isStale?'Сохранённый срез':'GitHub · проверено')+' в '+at+' Toronto · классификация по названию и меткам.');
  }
  function readCache(){try{return verifyCache(JSON.parse(env.localStorage.getItem(KEY)||'null'),Date.now());}catch{return null;}}
  async function listAll(){
    let all=[];
    for(let p=1;p<=MAX_PAGES;p++){
      const url='https://api.github.com/repos/'+REPO+'/pulls?state=open&per_page=100&sort=updated&direction=desc&page='+p;
      const r=await env.fetch(url,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
      if(!r.ok)throw Error('GitHub HTTP '+r.status);
      const rows=await r.json();
      if(!Array.isArray(rows)||rows.length>100)throw Error('INVALID_PAGE');
      all.push(...rows);
      if(rows.length<100)return all;
    }
    throw Error('PAGINATION_INCOMPLETE');
  }
  async function refresh(force){
    if(loading||!root)return;
    const cache=readCache();
    if(cache){stored=cache;display(cache,Date.now()-cache.at>TTL);}
    if(cache&&!force&&Date.now()-cache.at<TTL)return;
    loading=true;
    const button=find('refresh');if(button)button.disabled=true;
    put('status',cache?'Обновление GitHub… предыдущий срез сохранён.':'Читаю полную очередь GitHub…');
    try {
      const c=tally(await listAll());stored={schema:'HH_PR_OPEN_QUEUE_V1',at:Date.now(),counts:c};
      try{env.localStorage.setItem(KEY,JSON.stringify(stored));}catch{}
      display(stored,false);
    }catch(e){
      if(stored)display(stored,true);
      put('status','Не удалось обновить GitHub: '+String(e.message||e).slice(0,70)+(stored?'. Показан прошлый срез.':'. Данные не равны нулю.'));
    }finally{loading=false;if(button)button.disabled=false;}
  }
  function mount(){
    const header=doc.querySelector('#hh-pr-two-screens .hh2-ci-kpis');
    if(!header)return false;
    if(doc.getElementById('hh-open-queue'))return true;
    root=doc.createElement('section');root.id='hh-open-queue';root.className='hh-open-queue';root.setAttribute('aria-label','Открытые PR в production');
    root.innerHTML='<div class="hhq-row"><span class="hhq-title">Очередь PR <b data-hhq="production">—</b></span><span class="hhq-kind">Ф <b data-hhq="functional">—</b></span><span class="hhq-kind">Т <b data-hhq="technical">—</b></span><span class="hhq-kind">? <b data-hhq="unknown">—</b></span><button type="button" data-hhq="refresh" aria-label="Обновить очередь PR">↻</button></div>'+ 
      '<div class="hhq-footer"><span title="Не Draft означает только открытый PR; CI и merge могут быть заблокированы">Не Draft <b data-hhq="ready">—</b> · Draft <b data-hhq="draft">—</b> · все базы <b data-hhq="total">—</b> (другие <b data-hhq="other">—</b>)</span> <a href="https://github.com/andylitvinov-design/books/pulls?q=is%3Apr+is%3Aopen" target="_blank" rel="noopener noreferrer">Открыть PR</a></div>'+
      '<p class="hhq-status" data-hhq="status" role="status" aria-live="polite">Проверяю GitHub…</p>';
    header.insertAdjacentElement('afterend',root);
    find('refresh').addEventListener('click',()=>refresh(true));
    void refresh(false);
    return true;
  }
  if(!mount()){
    const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
    observer.observe(doc.documentElement,{childList:true,subtree:true});
  }
})(typeof window==='undefined'?null:window);