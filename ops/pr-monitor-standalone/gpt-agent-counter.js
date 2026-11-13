'use strict';
/* HH_CHATGPT_AGENT_ACTIVITY_V1: latest observed scheduled automations ONLY.
 * One public read per page load, no tokens, timers, paid APIs, or CI dispatch.
 */
(function(){
  const URL='https://api.github.com/repos/andylitvinov-design/books/issues/comments/6693553864';
  const MARKER='<!-- HH_CHATGPT_AGENT_ACTIVITY_V1 -->';
  const SCHEMA='HH_CHATGPT_AGENT_ACTIVITY_V1';
  const FRESH=15*60000,EXPIRE=75*60000;
  function isCount(n){return Number.isSafeInteger(n)&&n>=0&&n<=1000;}
  function parse(body){
    if(typeof body!=='string'||body.length>4000||!body.trimStart().startsWith(MARKER))
      throw Error('UNTRUSTED_ACTIVITY_SOURCE');
    const fence=String.fromCharCode(96).repeat(3);
    const begin=body.indexOf(fence+'json'),end=body.indexOf(fence,begin+fence.length+4);
    if(begin<0||end<0||end-begin>1600)throw Error('UNVERIFIED_AGGREGATE');
    return JSON.parse(body.slice(begin+fence.length+4,end));
  }
  function normalize(p,now=Date.now()){
    if(!p||p.schema!==SCHEMA||p.scope!=='SCHEDULED_CHATGPT_AUTOMATIONS_ONLY'||
       p.source!=='CHATGPT_AUTOMATIONS_PEEK'||!isCount(p.enabled)||
       !isCount(p.observed)||!isCount(p.running)||p.observed>p.enabled||
       p.running>p.observed)throw Error('INVALID_COUNTS');
    const t=Date.parse(p.observed_at||'');
    if(!Number.isFinite(t)||t>now+60000)throw Error('INVALID_TIME');
    const age=Math.max(0,now-t),partial=p.observed!==p.enabled;
    return {count:age>EXPIRE?'—':(partial?'≥':'')+p.running,
      partial,expired:age>EXPIRE,fresh:age<=FRESH,
      enabled:p.enabled,observed:p.observed,at:p.observed_at,ageMin:Math.floor(age/60000)};
  }
  function mount(){
    const first=document.querySelector('#hh-pr-two-screens .hh2-first');
    const target=first?.querySelector('.hh2-ci-kpis');
    if(!first||!target)return false;
    if(first.querySelector('#hh-gpt-agent-counter'))return true;
    const el=document.createElement('section');el.id='hh-gpt-agent-counter';el.className='hh-gpt-counter';
    el.setAttribute('aria-label','Число работающих автоматизаций ChatGPT');
    const label=document.createElement('span');label.className='hh-gpt-counter-title';
    label.textContent='GPT-агенты';
    const value=document.createElement('strong');value.className='hh-gpt-counter-count';
    value.setAttribute('aria-live','polite');value.textContent='—';
    const note=document.createElement('small');note.className='hh-gpt-counter-note';
    note.textContent='Автоматизации, не чаты';
    el.append(label,value,note);target.append(el);
    const scope=document.createElement('p');scope.className='hh-gpt-counter-scope';
    scope.textContent='GPT: проверяю автоматизации; обычные чаты не измеряются.';
    target.insertAdjacentElement('afterend',scope);
    fetch(URL,{cache:'default',headers:{Accept:'application/vnd.github+json'}})
      .then(r=>{if(!r.ok)throw Error('SOURCE_UNAVAILABLE');return r.json();})
      .then(obj=>{
        if(obj?.html_url!=='https://github.com/andylitvinov-design/books/issues/2876#issuecomment-6693553864')
          throw Error('UNTRUSTED_COMMENT');
        const p=normalize(parse(obj.body));value.textContent=p.count;
        el.dataset.fresh=String(p.fresh);
        const clock=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
          hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(p.at));
        note.textContent='Только автоматизации';
        scope.textContent='GPT: '+(p.expired?'данные устарели · ':p.partial?'нижняя граница · ':'')+
          'включено '+p.enabled+' · проверено '+p.observed+' · срез '+clock+
          ' Торонто ('+p.ageMin+' мин назад). Обычные чаты и Work не учтены.';
        value.title='Только последнее наблюдение зарегистрированных автоматизаций ChatGPT';
      })
      .catch(()=>{value.textContent='—';note.textContent='Автоматизации: —';
        scope.textContent='GPT: источник недоступен, значение не равно 0. Обычные чаты и Work не учтены.';});
    return true;
  }
  function start(){
    if(mount())return;
    const watcher=new MutationObserver(()=>{if(mount())watcher.disconnect();});
    watcher.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={parse,normalize};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
})();
