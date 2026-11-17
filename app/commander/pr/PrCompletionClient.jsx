'use client';
import {useCallback,useEffect,useState} from 'react';
const API='/api/app/commander/pr-completion';
const styles={
 main:{maxWidth:720,margin:'auto',padding:'max(18px,env(safe-area-inset-top)) 18px 120px',
  minHeight:'100dvh',color:'#f7f2ff',background:'#141525',fontFamily:'inherit'},
 box:{border:'1px solid #5a5373',background:'#222136',borderRadius:18,padding:20,marginTop:18},
 input:{width:'100%',padding:'15px 17px',fontSize:20,border:'1px solid #9e90bd',
  borderRadius:14,background:'#161527',color:'#fff',boxSizing:'border-box'},
 button:{minHeight:48,border:0,borderRadius:13,padding:'12px 22px',background:'#826ab8',
  color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer'},
 link:{color:'#cbb3ff',textDecoration:'underline'},
 small:{fontSize:13,color:'#c4bbd8',lineHeight:1.6}
};
const label={QUEUED:'В очереди · ещё не запущен',LEASED:'Watchdog проверяет PR',
 WATCHING:'Отслеживаем CI / Repair / Merge',MERGED:'GitHub смержен',
 CLOSED_UNMERGED:'PR закрыт без merge',BLOCKED:'Требуется исправление блокировки'};
function stamp(value){
 if(!value||!Number.isFinite(Date.parse(value)))return '';
 return new Date(value).toLocaleString('ru-RU',{
  day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'
 });
}
function stageSymbol(status){
 return status==='done'?'✓':status==='attention'?'!':
  status==='working'?'…':status==='waiting'?'○':'?';
}
function parsePR(raw){
 const s=raw.trim();
 const m=/^#?([1-9]\d{0,7})$/.exec(s)||/\b(?:PR|ПР)\s*#?([1-9]\d{0,7})\b/i.exec(s);
 return m?Number(m[1]):null;
}
export default function PrCompletionClient(){
 const [value,setValue]=useState(''),[items,setItems]=useState([]),
  [busy,setBusy]=useState(false),[message,setMessage]=useState(''),
  [authNeeded,setAuthNeeded]=useState(false),[lastAt,setLastAt]=useState(''),
  [expandedId,setExpandedId]=useState(null),
  [journeys,setJourneys]=useState({}),[journeyLoading,setJourneyLoading]=useState({}),
  [journeyErrors,setJourneyErrors]=useState({});
 const load=useCallback(async()=>{
  try{
   const r=await fetch(API,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   const data=await r.json().catch(()=>({}));
   if(r.status===401){setAuthNeeded(true);return}
   if(!r.ok)throw Error(data.error||'OWNER_QUEUE_UNAVAILABLE');
   setAuthNeeded(false);setItems(Array.isArray(data.items)?data.items:[]);
   setLastAt(new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  }catch(err){setMessage('Статус пока не подтверждён: '+String(err.message||err))}
 },[]);
 useEffect(()=>{
  void load();
  const tick=setInterval(()=>{if(document.visibilityState!=='hidden')void load()},60000);
  return ()=>clearInterval(tick);
 },[load]);
 async function loadJourney(item){
  const id=item.requestId;
  if(typeof id!=='string'||journeyLoading[id])return;
  setJourneyLoading(previous=>({...previous,[id]:true}));
  setJourneyErrors(previous=>({...previous,[id]:''}));
  try{
   const url=API+'?pr='+item.prNumber+'&details=1';
   const response=await fetch(url,{credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'}});
   const result=await response.json().catch(()=>({}));
   if(response.status===401)setAuthNeeded(true);
   if(!response.ok)throw Error(result.error||'DETAILS_UNAVAILABLE');
   if(result.schema!=='HH_COMMANDER_PR_JOURNEY_V1'||
     result.prNumber!==item.prNumber||result.requestId!==id||
     !Array.isArray(result.stages))
    throw Error('DETAILS_IDENTITY_UNVERIFIED');
   setJourneys(previous=>({...previous,[id]:result}));
  }catch(error){
   setJourneyErrors(previous=>({...previous,[id]:
    'Не удалось подтвердить этапы: '+String(error.message||error)}));
  }finally{setJourneyLoading(previous=>({...previous,[id]:false}));}
 }
 function toggleJourney(item){
  if(expandedId===item.requestId){setExpandedId(null);return;}
  setExpandedId(item.requestId);
  if(!journeys[item.requestId])void loadJourney(item);
 }
 async function submit(event){
  event.preventDefault();
  const pr=parsePR(value);
  if(!pr){setMessage('Укажите номер PR: например, 4770 или «доведи PR 4770 до LIVE».');return}
  if(busy)return;
  setBusy(true);setMessage('Проверяю текущий PR и сохраняю команду владельца…');
  try{
   const r=await fetch(API,{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({prNumber:pr,requestId:crypto.randomUUID()})});
   const data=await r.json().catch(()=>({}));
   if(r.status===401)setAuthNeeded(true);
   if(!r.ok)throw Error(data.error||'PR_COMMAND_UNAVAILABLE');
   const state=data.item?.status||'QUEUED';
   setMessage('PR #'+pr+': '+(label[state]||state)+'. '+
    (data.duplicate?'Уже есть активная задача — новая не создана.':
     'Команда сохранена. GitHub-результат будет проверен отдельно.')+
    (state==='MERGED'?' Production LIVE проверяется отдельно.':''));
   await load();
  }catch(error){setMessage('Команда не подтверждена: '+String(error.message||error))}
  finally{setBusy(false)}
 }
 return <main style={styles.main}>
  <p style={{fontSize:12,letterSpacing:2,color:'#d0b6ff'}}>HOLISTIC HOUSE · AGENTS COMMANDER</p>
  <h1 style={{fontSize:'clamp(27px,6vw,39px)',margin:'12px 0 8px'}}>Довести PR до LIVE</h1>
  <p style={{...styles.small,fontSize:15}}>Введите только номер PR. Director проверит GitHub,
   передаст разрешённое исправление существующему Repair Worker, отследит CI и merge.
   Статус Production LIVE подтверждается отдельно.</p>
  <section style={styles.box} aria-label="Команда для PR">
   <form onSubmit={submit}>
    <label htmlFor="pr-number" style={{display:'block',marginBottom:9,fontSize:15,fontWeight:650}}>Номер PR или команда</label>
    <input id="pr-number" style={styles.input} autoComplete="off" inputMode="text"
      value={value} onChange={e=>setValue(e.target.value)}
      placeholder="4770" maxLength={180}/>
    <button style={{...styles.button,marginTop:13,width:'100%',opacity:busy?0.65:1}}
     type="submit" disabled={busy}>{busy?'Проверяю…':'Довести PR'}</button>
   </form>
   {message&&<p role="status" aria-live="polite" style={{...styles.small,marginTop:13}}>{message}</p>}
   {authNeeded&&<p style={styles.small}>Необходимо подтвердить Google-вход владельца.{' '}
    <a style={styles.link} href="/commander-connect">Войти в Holistic House</a>.</p>}
  </section>
  <section style={styles.box} aria-label="Очередь моих PR">
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
    <h2 style={{fontSize:20,margin:0}}>Мои PR</h2>
    <button type="button" onClick={()=>void load()} style={{...styles.button,fontSize:13,padding:'9px 12px',minHeight:38}}>Обновить</button>
   </div>
   {lastAt&&<p style={styles.small}>Последняя проверка статуса: {lastAt}</p>}
   {items.length===0&&<p style={styles.small}>Нет подтверждённых задач или требуется авторизация.</p>}
   {items.slice(0,12).map(item=><article key={item.requestId}
    style={{borderTop:'1px solid #48435f',padding:'13px 0'}}>
    <a style={{...styles.link,fontSize:18,fontWeight:650}} href={'https://github.com/andylitvinov-design/books/pull/'+item.prNumber}
      target="_blank" rel="noopener noreferrer">PR #{item.prNumber}</a>
    <p style={{fontWeight:600,margin:'6px 0'}}>
     {journeys[item.requestId]?.productionVerified===true?
       'Production LIVE подтверждён':
       journeys[item.requestId]?.stages?.some(step=>step.id==='merge'&&step.state==='done')
        ?'GitHub смержен · Production LIVE ожидает подтверждения':
         label[item.status]||item.status}
    </p>
    <p style={{...styles.small,margin:'5px 0'}}>HEAD: {(journeys[item.requestId]?.currentHeadSha||item.headSha||'').slice(0,12)} · {item.reasonCode||'Нет подтверждения следующего этапа'}</p>
    {item.mergeSha&&<p style={styles.small}>Merge SHA: {item.mergeSha.slice(0,12)} · {' '}
     {journeys[item.requestId]?.productionVerified===true?
       'Vercel LIVE · '+journeys[item.requestId].deploymentId:
       'Production LIVE не подтверждён'}</p>}
    <button className="hh-pr-details-toggle" type="button"
     aria-expanded={expandedId===item.requestId}
     aria-controls={'hh-pr-details-'+item.requestId}
     onClick={()=>toggleJourney(item)}>
     {expandedId===item.requestId?'Свернуть детали':'Детали'}
     <span aria-hidden="true">{expandedId===item.requestId?'⌃':'⌄'}</span>
    </button>
    {expandedId===item.requestId&&
     <section id={'hh-pr-details-'+item.requestId} className="hh-pr-details" aria-label={'Этапы обработки PR #'+item.prNumber}>
      {journeyLoading[item.requestId]&&<p role="status" className="hh-pr-journey-note">Сверяю Supabase, GitHub и реально обслуживаемую версию Vercel…</p>}
      {journeyErrors[item.requestId]&&<p role="alert" className="hh-pr-journey-error">{journeyErrors[item.requestId]}</p>}
      {journeys[item.requestId]&&(()=>{
       const journey=journeys[item.requestId];
       return <>
        <div className="hh-pr-current-stage">
         <p className="hh-pr-current-eyebrow">{journey.stalled?'Задержка на этапе':'Текущий этап'}</p>
         <strong>{journey.currentStageTitle}</strong>
         {journey.attention&&<p className="hh-pr-journey-error">{journey.attention}</p>}
         {journey.minutesSinceRequest!==null&&
          <p className="hh-pr-journey-note">С момента заявки: {journey.minutesSinceRequest} мин.</p>}
        </div>
        <ol className="hh-pr-stage-list">
         {journey.stages.map(step=><li key={step.id}
          className={'hh-pr-stage hh-pr-stage--'+step.state+
           (journey.currentStage===step.id?' hh-pr-stage--current':'')}>
          <span className="hh-pr-stage-symbol" aria-hidden="true">{stageSymbol(step.state)}</span>
          <div className="hh-pr-stage-body">
           <strong>{step.title}</strong>
           <p>{step.detail}</p>
           {(step.at||step.link)&&
            <div className="hh-pr-stage-meta">
             {step.at&&<time dateTime={step.at}>{stamp(step.at)}</time>}
             {step.link&&<a href={step.link} target="_blank" rel="noopener noreferrer">Открыть проверку CI</a>}
            </div>}
          </div>
         </li>)}
        </ol>
        <p className="hh-pr-journey-note">Данные: личная очередь Supabase и проверенные сведения GitHub.
         Состояние проверки: {stamp(journey.observedAt)}. Отсутствие доказательства не считается выполнением.</p>
       </>;
      })()}
      <button type="button" className="hh-pr-details-refresh"
       disabled={journeyLoading[item.requestId]} onClick={()=>void loadJourney(item)}>
       Проверить этапы ещё раз
      </button>
     </section>}
   </article>)}
  </section>
  <p style={{...styles.small,marginTop:17}}>Без новых платных моделей, повторных CI без нового SHA и обхода branch protection.
   <a style={{...styles.link,marginLeft:8}} href="https://holistic-house-pr-monitor.vercel.app/chats.html">Рабочие чаты Commander</a></p>
 </main>;
}
