'use strict';
/* HH_CI_FIRST_LAST_V1. On-demand, read-only; no new cron, background requests or tokens. */
(()=>{
  const KEY='hh_pr_first_last_ci_v1', STAGES={
    runner_wait:'Первый CI: ожидание runner',
    checks:'Первая волна: выполняемые проверки',
    repeat_ci:'Повторные CI: очередь и выполнение',
    repair_after_failure:'Подтверждённые исправления',
    conflict_resolution:'Устранение конфликтов',
    unattributed:'Без подтверждённой причины'
  };
  const ms=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:null;};
  const good=u=>typeof u==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+(?:\/job\/\d+)?$/.test(u)?u:null;
  const fmt=v=>Number.isFinite(v)&&v>=0?(v>=3600000?Number((v/3600000).toFixed(2))+' ч':v>=60000?Number((v/60000).toFixed(1))+' мин':Math.round(v/1000)+' сек'):'—';
  const when=v=>ms(v)===null?'Нет метки':new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(v));
  const element=(t,c,v)=>{const n=document.createElement(t);if(c)n.className=c;if(v!==undefined)n.textContent=String(v);return n;};
  let records=[];
  try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))records=v.filter(x=>Number.isSafeInteger(x.pr)&&Number.isFinite(x.elapsed_ms)&&x.elapsed_ms>=0).slice(-70);}catch{}
  let card,content,status,submit,csvButton,loading=false;
  function measure(d){
    if(d?.schema!=='HH_PR_ATTRIBUTION_V1'||!Number.isSafeInteger(d.pr_number))return null;
    const runs=(Array.isArray(d.attempt_details)?d.attempt_details:[]).filter(x=>ms(x.queued_at)!==null&&good(x.run_url)).sort((x,y)=>ms(x.queued_at)-ms(y.queued_at));
    if(!runs.length)return null;
    const start=ms(runs[0].queued_at),lastQueued=ms(runs[runs.length-1].queued_at);
    const completions=(Array.isArray(d.chronology)?d.chronology:[]).filter(x=>x.kind==='job_completed'&&ms(x.at)!==null&&ms(x.at)>=start&&good(x.url)).sort((x,y)=>ms(x.at)-ms(y.at));
    if(!completions.length)return null;
    const last=completions.at(-1),end=ms(last.at),closed=ms(d.ended_at);
    if(end<lastQueued||end<start||(closed!==null&&end>closed))return null;
    const rows=(Array.isArray(d.intervals)?d.intervals:[]).map(x=>({...x,a:ms(x.start_at),b:ms(x.end_at)})).filter(x=>x.a!==null&&x.b!==null&&x.b>x.a&&x.b>start&&x.a<end).sort((x,y)=>x.a-y.a||x.b-y.b);
    let cursor=start,known=0;
    const stages={};
    for(const row of rows){
      const a=Math.max(start,cursor,row.a),b=Math.min(end,row.b);
      if(b<=a)continue;
      cursor=b;
      if(row.stage==='unattributed')continue;
      if(Object.hasOwn(STAGES,row.stage)){stages[row.stage]=(stages[row.stage]||0)+b-a;known+=b-a;}
    }
    stages.unattributed=Math.max(0,end-start-known);
    const merged=ms(d.merged_at),partial=d.source?.history_partial===true||runs.length>=6;
    const final=d.state==='merged'&&merged!==null&&merged>=end&&!partial;
    return {pr:d.pr_number,measured_at:new Date().toISOString(),created_at:d.created_at||null,merged_at:d.merged_at||null,
      first_ci_at:new Date(start).toISOString(),last_ci_at:new Date(end).toISOString(),
      first_url:runs[0].run_url,last_url:last.url,elapsed_ms:end-start,attempts:runs.length,repeats:Math.max(0,runs.length-1),
      errors:Number.isSafeInteger(d.failures)?d.failures:null,stages,final,partial};
  }
  function selection(){
    const h=Number(document.getElementById('hh-pr-merge-speed')?.dataset.mergePeriodHours);
    return [1,6,24,72].includes(h)?h:24;
  }
  function updateCard(){
    if(window.__hhCiArchiveActive)return;
    if(!card)return;
    const now=Date.now(),h=selection(),p=records.filter(x=>x.final===true&&ms(x.merged_at)!==null&&ms(x.merged_at)>=now-h*3600000&&ms(x.merged_at)<=now);
    if(!p.length){
      const last=records.at(-1);
      if(!last||ms(last.last_ci_at)===null||ms(last.last_ci_at)<now-h*3600000)return;
      const value=card.querySelector('strong'),sample=card.querySelector('small');
      const shown='≥ '+fmt(last.elapsed_ms),hint='PR #'+last.pr+' · наблюдаемый интервал';
      if(value&&value.textContent!==shown)value.textContent=shown;
      if(sample&&sample.textContent!==hint)sample.textContent=hint;
      card.title='Нижняя граница измеренного периода CI для PR #'+last.pr+'. История GitHub неполная; не медиана всей очереди.';
      return;
    }
    const v=p.map(x=>x.elapsed_ms).sort((a,b)=>a-b),m=v.length>>1,median=v.length%2?v[m]:(v[m-1]+v[m])/2;
    const value=card.querySelector('strong'),sample=card.querySelector('small');
    const newValue=fmt(median),newSample='n='+p.length+' PR · локально проверено';
    if(value&&value.textContent!==newValue)value.textContent=newValue;
    if(sample&&sample.textContent!==newSample)sample.textContent=newSample;
    card.title='Медиана от первого Core CI queued до последнего Core job completed. Только проверенные на этом устройстве смерженные PR в выбранном периоде; это не полная очередь.';
  }
  function show(r){
    content.replaceChildren();
    if(!r){content.append(element('p','hh-ci-journey-muted','Нет полной пары событий CI queued → completed. Это не ноль минут.'));return;}
    const title=element('div','hh-ci-journey-summary');
    title.append(element('strong','', 'PR #'+r.pr+' · '+fmt(r.elapsed_ms)),element('span','',r.final?'Путь подтверждён, PR смержен':r.partial?'История CI неполная — показан минимум':'Промежуточный срез, CI могут продолжиться'));
    content.append(title);
    const dates=element('div','hh-ci-journey-dates');
    for(const [label,stamp,url] of [['Первый CI: поставлен в очередь',r.first_ci_at,r.first_url],['Последний CI: завершился job',r.last_ci_at,r.last_url]]){
      const line=element('div');line.append(element('span','',label));
      const a=element(good(url)?'a':'strong','',when(stamp));
      if(good(url)){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
      line.append(a);dates.append(line);
    }
    content.append(dates,element('p','hh-ci-journey-muted','Попыток: '+r.attempts+' · Повторных: '+r.repeats+' · Ошибок проверок: '+(r.errors??'неизвестно')));
    const parts=element('div','hh-ci-journey-parts');
    for(const [key,label] of Object.entries(STAGES)){
      const line=element('div');line.append(element('span','',label),element('b','',key==='unattributed'||r.stages[key]>0?fmt(r.stages[key]||0):'Не измерено'));parts.append(line);
    }
    content.append(parts,element('p','hh-ci-journey-muted',
      'Сумма этапов равна времени между первой постановкой CI и последним завершённым job. Неподтверждённые промежутки не объявляются ожиданием ремонта или CI. Даты — Торонто.'+
      (r.partial?' История запусков усечена.':'')));
  }
  async function check(n){
    if(loading)return;loading=true;submit.disabled=true;status.textContent='Читаю подтверждённые события PR #'+n+'…';
    try{
      const response=await fetch('/api/pr-attribution?pr='+encodeURIComponent(n),{cache:'no-store'});
      const d=await response.json();
      if(!response.ok||d.schema!=='HH_PR_ATTRIBUTION_V1')throw Error(d.error||'HTTP '+response.status);
      const record=measure(d);if(!record)throw Error('Нет проверенной пары первого и последнего CI');
      records=[...records.filter(x=>x.pr!==n),record].slice(-70);
      try{localStorage.setItem(KEY,JSON.stringify(records));}catch{}
      show(record);updateCard();csvButton.disabled=false;
      status.textContent=record.final?'Длительности сохранены локально. PR включён в медиану выбранного периода.':record.partial?'Сохранён минимум подтверждённого времени. История GitHub неполная — это не полная медиана.':'Сохранён промежуточный срез. После merge проверьте PR снова.';
    }catch(e){status.textContent='Нет подтверждённого пути: '+String(e.message||e).slice(0,100)+'. Неизвестное время ≠ ноль.';}
    finally{loading=false;submit.disabled=false;}
  }
  function exportCsv(){
    const keys=['pr','measured_at','created_at','merged_at','first_ci_at','last_ci_at','elapsed_ms','attempts','repeats','errors','final','partial',...Object.keys(STAGES)];
    const lines=[keys.join(','),...records.map(r=>keys.map(k=>'"'+String(Object.hasOwn(STAGES,k)?(r.stages?.[k]??''):(r[k]??'')).replaceAll('"','""')+'"').join(','))];
    const u=URL.createObjectURL(new Blob(['\ufeff',lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=element('a');a.href=u;a.download='holistic-house-ci-first-last.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(u);
  }
  function mount(){
    if(document.getElementById('hh-ci-journey'))return true;
    const host=document.getElementById('hh-ci-phase-metrics'),grid=host?.querySelector('.hh-ci-phase-grid');
    if(!grid||grid.children.length<3)return false;card=grid.children[1];
    const box=element('section','hh-ci-journey');box.id='hh-ci-journey';
    box.append(element('h5','', 'Первый → последний CI · детальная проверка'),
      element('p','hh-ci-journey-muted','Введите № PR. Покажем проверенные интервалы и даты GitHub, сохраним измерение на этом устройстве. Новых периодических запросов нет.'));
    const form=element('form','hh-ci-journey-form'),input=element('input');
    input.type='number';input.min='1';input.max='999999';input.required=true;input.placeholder='№ PR';input.inputMode='numeric';input.setAttribute('aria-label','Номер PR');
    submit=element('button','','Проверить');submit.type='submit';
    csvButton=element('button','','CSV');csvButton.type='button';csvButton.disabled=!records.length;
    form.append(input,submit,csvButton);
    status=element('p','hh-ci-journey-muted','Без проверенных PR общая длительность не может быть подтверждена.');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    content=element('div','hh-ci-journey-content');
    box.append(form,status,content);grid.insertAdjacentElement('afterend',box);
    form.addEventListener('submit',e=>{e.preventDefault();const n=Number(input.value);if(Number.isSafeInteger(n)&&n>0&&n<=999999)void check(n);});
    csvButton.addEventListener('click',exportCsv);
    const current=Number(new URLSearchParams(location.search).get('pr'));
    if(Number.isSafeInteger(current)&&current>0&&current<=999999)input.value=String(current);
    const observer=new MutationObserver(updateCard);
    for(const n of [card.querySelector('strong'),card.querySelector('small')])if(n)observer.observe(n,{subtree:true,childList:true,characterData:true});
    document.getElementById('hh-pr-merge-speed')?.addEventListener('click',()=>queueMicrotask(updateCard));
    document.getElementById('refresh')?.addEventListener('click',()=>queueMicrotask(updateCard));
    const style=element('style');style.textContent='.hh-ci-journey{margin:12px 0;padding:12px;border:1px solid #355772;background:#0b1d30;border-radius:12px;color:#eaf3ff}.hh-ci-journey h5{font-size:14px;margin:0}.hh-ci-journey-muted{font-size:11px;line-height:1.45;color:#abc4da;margin:8px 0}.hh-ci-journey-form{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.hh-ci-journey-form input{min-width:75px;max-width:135px;flex:1;background:#08192b;color:#eef7ff;border:1px solid #496781;border-radius:8px;padding:9px;font-size:14px}.hh-ci-journey-form button{background:#244259;color:#f4fbff;border:1px solid #55758e;border-radius:8px;padding:9px 11px;font-size:12px;font-weight:750}.hh-ci-journey-form button:disabled{opacity:.5}.hh-ci-journey-summary{display:flex;flex-wrap:wrap;gap:9px;align-items:baseline}.hh-ci-journey-summary strong{font-size:18px;color:#70dfbb}.hh-ci-journey-summary span{font-size:11px;color:#b1c8df}.hh-ci-journey-dates,.hh-ci-journey-parts{display:grid;gap:8px;margin:12px 0}.hh-ci-journey-dates>div,.hh-ci-journey-parts>div{display:flex;flex-wrap:wrap;gap:7px;justify-content:space-between;font-size:12px}.hh-ci-journey-dates span,.hh-ci-journey-parts span{color:#b6cbe0}.hh-ci-journey-dates a{color:#92ceff;text-decoration:underline}.hh-ci-journey-parts{padding-top:9px;border-top:1px solid #365470}';
    document.head.append(style);
    show(records.at(-1)||null);updateCard();return true;
  }
  if(mount())return;
  const wait=new MutationObserver(()=>{if(mount())wait.disconnect()});
  wait.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{if(mount())wait.disconnect()},{once:true});
})();