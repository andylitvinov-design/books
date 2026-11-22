/* PR→LIVE compact task module. Pure owner-only presentation contract. */
(function(root,factory){
  const result=factory();
  if(typeof module==='object'&&module.exports)module.exports=result;
  if(root)root.HHPRCompletionMobileModel=result;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const SHA=/^[0-9a-f]{40}$/i;
  const PR=/^[1-9][0-9]{0,7}$/;
  const active=new Set(['QUEUED','LEASED','WATCHING']);
  const statuses={
    QUEUED:['В очереди','wait'],
    LEASED:['Watchdog проверяет','work'],
    WATCHING:['В работе','work'],
    BLOCKED:['Блокировано','bad'],
    MERGED:['MERGED','good'],
    CLOSED_UNMERGED:['Закрыт без Merge','bad']
  };
  const reasons={
    REQUEST_ACCEPTED_NOT_DISPATCHED:'Заявка ожидает первого захвата Watchdog',
    AWAIT_EXISTING_CORE_AND_AUTO_MERGE:'Ожидаем обязательный Core CI и защищённый Merge',
    MERGE_CONFLICT_REQUIRES_SEMANTIC_REPAIR:'Конфликт слияния: требуется безопасное разрешение',
    MERGE_CONFLICT_RESOLVED_WATCH_ONLY:'Конфликт устранён; наблюдаем без повторной записи кода',
    OWNER_DISPATCH_ACCEPTED_NOT_MODEL_OR_COMMIT:'Передача принята; запуск AI и коммит пока не подтверждены',
    OWNER_REPAIR_DIRECT_WORKER_BUSY:'Исполнитель занят, ожидаем доступное место',
    OWNER_REPAIR_DIRECT_CORE_PRIORITY_PENDING:'Ожидаем освобождения слота Core CI',
    EXISTING_HOLD_NO_OVERRIDE:'Ручная блокировка — её нельзя обходить',
    GITHUB_MERGE_VERIFIED:'GitHub Merge подтверждён; Production LIVE проверяется отдельно',
    GITHUB_CLOSED_NO_MERGE:'PR закрыт без слияния'
  };
  function prNumber(value){
    if(typeof value==='number')return Number.isSafeInteger(value)&&value>0&&value<=99999999?value:null;
    if(typeof value!=='string'||!PR.test(value.trim()))return null;
    const n=Number(value.trim());return Number.isSafeInteger(n)?n:null;
  }
  function safeRow(row){
    if(!row||typeof row!=='object'||Array.isArray(row)||prNumber(row.prNumber)===null||
      !Object.prototype.hasOwnProperty.call(statuses,row.status))return null;
    const sha=SHA.test(row.headSha||'')?row.headSha.toLowerCase():null;
    const mergeSha=SHA.test(row.mergeSha||'')?row.mergeSha.toLowerCase():null;
    const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?x:null;
    return {prNumber:prNumber(row.prNumber),status:row.status,
      reasonCode:typeof row.reasonCode==='string'&&/^[A-Z0-9_]{3,90}$/.test(row.reasonCode)?row.reasonCode:null,
      headSha:sha,mergeSha,statusUpdatedAt:date(row.updatedAt),createdAt:date(row.createdAt),
      firstAttemptAt:date(row.firstAttemptAt),lastCheckedAt:date(row.lastCheckedAt),
      checkedCount:Number.isSafeInteger(row.checkedCount)&&row.checkedCount>=0?row.checkedCount:0,
      dispatchAccepted:row.dispatchAccepted===true,requestId:UUID.test(row.requestId||'')?row.requestId:null};
  }
  function rowsFromStatus(payload){
    if(!payload||payload.schema!=='HH_COMMANDER_PR_COMPLETION_V1'||
      payload.ownerOnly!==true||!Array.isArray(payload.items))return null;
    const seen=new Set(),rows=[];
    for(const record of payload.items.slice(0,20)){
      const row=safeRow(record);
      if(row&&!seen.has(row.prNumber)){seen.add(row.prNumber);rows.push(row);}
    }
    return rows;
  }
  function matchingCI(events,head){
    if(!SHA.test(head||'')||!Array.isArray(events))return null;
    const candidates=events.filter(e=>e&&e.headSha===head&&Number.isSafeInteger(e.runId)&&
       typeof e.conclusion==='string'&&['failure','success','timed_out','startup_failure'].includes(e.conclusion));
    candidates.sort((a,b)=>Date.parse(b.recordedAt||0)-Date.parse(a.recordedAt||0));
    return candidates[0]||null;
  }
  function safeHistoricalLiveProof(row,data){
    const item=safeRow(row),e=data?.live_evidence,j=data?.journey;
    if(!item||item.status!=='MERGED'||!item.mergeSha||
       data?.stale===true||j?.live_receipt_found!==true||
       j?.live_proof_status!=='VERIFIED_HISTORICAL'||!e||
       String(e.merge_sha||'').toLowerCase()!==item.mergeSha||
       !/^dpl_[A-Za-z0-9]{8,64}$/.test(e.deployment_id||'')||
       !/^https:\/\/github\.com\/andylitvinov-design\/books\/pull\/\d+#issuecomment-\d+$/.test(e.receipt_url||'')||
       !e.receipt_url.includes('/pull/'+item.prNumber+'#issuecomment-')||
       !Number.isFinite(Date.parse(e.live_at||'')))return null;
    return {status:'VERIFIED_HISTORICAL',at:e.live_at,receiptUrl:e.receipt_url,
      deploymentId:e.deployment_id};
  }
  function present(row,events=[],historicalLive=null){
    const item=safeRow(row);
    if(!item)return null;
    const label=statuses[item.status];
    const latestCI=matchingCI(events,item.headSha);
    const failedCI=!!latestCI&&latestCI.conclusion!=='success';
    const coreGreen=latestCI?.conclusion==='success'&&latestCI?.workflowName==='HH PR core release gate';
    const merged=item.status==='MERGED'&&!!item.mergeSha;
    const live=merged&&safeHistoricalLiveProof(item,historicalLive);
    const watchdog=!!item.firstAttemptAt||item.checkedCount>0;
    const ci=coreGreen?'done':failedCI?'error':
      item.status==='WATCHING'?'active':'waiting';
    const current=item.status==='MERGED'?
      (live?'LIVE подтверждён историческим GitHub-свидетельством':
        'GitHub Merge подтверждён. LIVE проверяется отдельно'):
      item.status==='CLOSED_UNMERGED'?'PR закрыт без Merge':
      item.status==='BLOCKED'?'Остановка: '+(reasons[item.reasonCode]||item.reasonCode||'причина не определена'):
      item.reasonCode==='OWNER_DISPATCH_ACCEPTED_NOT_MODEL_OR_COMMIT'?
        'Передача Repair Worker — подтверждения коммита пока нет':
      item.reasonCode==='MERGE_CONFLICT_RESOLVED_WATCH_ONLY'?
        'Конфликт устранён, идёт повторная проверка':
      item.reasonCode?.includes('BASE')?'Синхронизация базы':
      failedCI?'Ошибка CI: '+(latestCI.category||latestCI.conclusion):
      item.status==='LEASED'?'Watchdog получил задачу':
      item.status==='QUEUED'?'Ожидаем Watchdog':'Проверка текущего HEAD';
    return {item,title:label[0],tone:label[1],current,
      detail:reasons[item.reasonCode]||item.reasonCode||'Нет зарегистрированной причины',
      ciEvent:latestCI,
      stages:[
        {id:'request',label:'Заявка',state:'done'},
        {id:'watchdog',label:'Watchdog',state:watchdog?'done':'waiting'},
        {id:'ci',label:'CI',state:ci},
        {id:'merge',label:'Merge',state:merged?'done':'waiting'},
        {id:'live',label:'LIVE',state:live?'done':'waiting'}
      ],
      hasLiveProof:!!live,liveProof:live, // Separate signed readback, never inferred from Merge.
      terminal:['MERGED','CLOSED_UNMERGED','BLOCKED'].includes(item.status)};
  }
  function shortSHA(s){return SHA.test(s||'')?s.slice(0,12):'не подтверждён';}
  function time(s){if(!s||!Number.isFinite(Date.parse(s)))return 'нет данных';
    return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'America/Toronto'}).format(new Date(s));
  }
  function needsAutoRefresh(rows){return Array.isArray(rows)&&rows.some(r=>active.has(r.status));}
  return {prNumber,safeRow,rowsFromStatus,matchingCI,present,safeHistoricalLiveProof,
    shortSHA,time,needsAutoRefresh,UUID,SHA};
});
