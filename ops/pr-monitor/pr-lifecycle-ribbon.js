'use strict';
/* Six PR delivery milestones. An event interval is NOT a causal duration.
 * Only /api/pr-attribution data already fetched by the existing PR detail.
 */
(function(root){
  const ISO=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
  const phases=[
    ['commit','Commit','source_published'],['ci','CI','first_ci_queued'],
    ['fix','Fix','repair_started'],['green','Green','merge_gate_green'],
    ['merge','Merge','merged'],['live','LIVE','live_verified']];
  const reasons={
    commit:'Исходный commit/push не подтверждён отдельной GitHub-меткой; PR created_at не подменяет commit.',
    ci:'Первая CI отсутствует в проверенной истории; это не доказательство, что она не запускалась.',
    fix:'После ошибки CI нет проверенного начала Repair или истории публикации исправления.',
    green:'Последний успешный mandatory exact-HEAD Gate пока не подтверждён.',
    merge:'Зафиксированного merge нет; неизвестно, блокируют ли проверки, review или lease.',
    live:'Отсутствует независимо проверенная квитанция deployment SHA + функциональный LIVE smoke.'
  };
  function normalize(data){
    if(!data||data.schema!=='HH_PR_ATTRIBUTION_V1'||!data.journey||!Array.isArray(data.journey.checkpoints))
      throw Error('INVALID_PR_ATTRIBUTION');
    const cp=new Map(data.journey.checkpoints.map(x=>[x.key,x]));
    const incomplete=data.source?.history_partial===true,hasError=Number(data.failures||0)>0;
    const exactHeadGreen=data.journey?.green_exact_head===true;
    const seen=phases.map(([key,label,from])=>{
      const v=cp.get(from),raw=v?.evidence==='GITHUB_VERIFIED_EVENT'&&ISO(v.at)!==null?v.at:null;
      const firstCI=cp.get('first_ci_queued')?.at;
      const at=key==='commit'&&ISO(firstCI)!==null&&ISO(raw)!==null&&ISO(raw)>ISO(firstCI)?null:raw;
      let status=at?'VERIFIED':'UNKNOWN';
      if(key==='fix'&&!hasError&&!incomplete){status='NOT_APPLICABLE';}
      let note=at?'Подтверждённое событие GitHub.':reasons[key];
      if(key==='fix'&&!hasError&&!incomplete)note='Ошибок в подтверждённой CI-истории не найдено; этап исправления не обязателен.';
      if(key==='green'&&(!exactHeadGreen||incomplete)){
        status=incomplete?'HISTORY_PARTIAL':'UNKNOWN';
        note='Последний обязательный Green на текущем HEAD не подтверждён; Green старого HEAD недопустим.';
      }
      return {key,label,at:status==='VERIFIED'?at:null,url:status==='VERIFIED'?v.url:null,status,note,
        minutes_to_next:null,interval_end:null};
    });
    // Require chronological, verified adjacent endpoints; skip non-applicable Fix.
    for(let i=0;i<seen.length-1;i++){
      const a=seen[i];if(a.status!=='VERIFIED')continue;
      const next=seen.slice(i+1).find(x=>x.status!=='NOT_APPLICABLE');
      if(!next||next.status!=='VERIFIED')continue;
      const start=ISO(a.at),end=ISO(next.at);
      if(start!==null&&end!==null&&end>=start){
        a.minutes_to_next=Math.round((end-start)/600)/100;
        a.interval_end=next.key;
      }
    }
    const merged=seen.find(x=>x.key==='merge');
    if(merged?.status==='VERIFIED'&&seen.find(x=>x.key==='live')?.status!=='VERIFIED')
      seen.find(x=>x.key==='live').note=reasons.live;
    return {phases:seen,history_partial:incomplete,verified:seen.filter(x=>x.status==='VERIFIED').length,
      blocker:typeof data.journey?.stop_reason==='string'?data.journey.stop_reason:null};
  }
  function render(parent,data){
    let result;try{result=normalize(data);}catch{return;}
    if(!parent||typeof document==='undefined')return;
    const doc=parent.ownerDocument||document;
    const make=(tag,cl,value)=>{const el=doc.createElement(tag);if(cl)el.className=cl;
      if(value!=null)el.textContent=String(value);return el;};
    const section=make('section','hh-pr-lifecycle');
    section.append(make('h3','','Commit → CI → Fix → Green → Merge → LIVE'),
      make('p','hh-pr-lifecycle-note','Только подтверждённые метки GitHub. Промежуток между событиями не равен времени работы команды.'));
    const list=make('ol','hh-pr-lifecycle-steps');
    const displayTime=at=>at?new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(at)):'—';
    for(const p of result.phases){
      const item=make('li','hh-pr-lifecycle-step '+p.status.toLowerCase());
      item.append(make('b','',p.label),make('strong','',p.status==='VERIFIED'?displayTime(p.at):p.status==='NOT_APPLICABLE'?'Н/П':'—'));
      item.append(make('small','',p.note));
      if(p.minutes_to_next!==null){item.append(make('em','',
        `→ ${p.interval_end}: ${p.minutes_to_next} мин (наблюдаемый промежуток)`));}
      if(typeof p.url==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\//.test(p.url)){
        const a=make('a','','Доказательство');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';item.append(a);
      }
      list.append(item);
    }
    section.append(list);
    if(result.blocker)section.append(make('p','hh-pr-lifecycle-warning','Причина остановки: '+result.blocker));
    if(result.history_partial)section.append(make('p','hh-pr-lifecycle-warning',
      'История частичная. Отсутствующее время и неподтверждённый текущий Green не равны нулю или успеху.'));
    const old=parent.querySelector('.hh-pr-lifecycle');if(old)old.remove();
    parent.prepend(section);
  }
  const api={normalize,render};
  if(root)root.HHPrLifecycle=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?null:window);
