'use client'
import {useEffect,useRef,useState} from 'react'
const endpoint='/api/admin/caesar-static-video'
export default function CaesarStaticVideoLab(){
  const [approval,setApproval]=useState(null),[confirmed,setConfirmed]=useState(false),[state,setState]=useState('checking'),[result,setResult]=useState(null)
  const attempted=useRef(false)
  useEffect(()=>{const c=new AbortController();fetch(endpoint,{cache:'no-store',signal:c.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!c.signal.aborted){setApproval(d?.approval||null);setState(d?.approval?'ready':'blocked')}}).catch(()=>{if(!c.signal.aborted)setState('blocked')});return()=>c.abort()},[])
  async function start(){
    if(!approval||!confirmed||attempted.current||state!=='ready')return
    attempted.current=true;setState('recording')
    try{const response=await fetch(endpoint,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({job:approval.job,freeOnly:true,editorialOnly:true})});const data=await response.json();if(!response.ok||data.status!=='PROVIDER_URL_RECEIVED_QA_PENDING')throw Error('LOCKED');setResult(data);setState('review')}
    catch{setState('locked')}
  }
  return <section><h2>Caesar · записать MP4</h2><p>Оригинальный аватар Simli. Только готовое приветствие Caesar RU/EN или 5 секунд нейтральной паузы; без данных клиента. Один разрешённый запуск.</p>
    {state==='blocked'&&<p role="status">Запись отключена: требуется подтверждение Static API, бесплатного лимита и прав использования.</p>}
    {approval&&<><p>Разрешённый вариант: {approval.job}; до {approval.maxSeconds} сек.</p><label><input type="checkbox" checked={confirmed} disabled={state!=='ready'} onChange={e=>setConfirmed(e.target.checked)}/> Подтверждаю редакционное видео без доплат.</label><p><button type="button" disabled={!confirmed||state!=='ready'} onClick={start}>Записать один MP4</button></p></>}
    {state==='checking'&&<p role="status">Проверка доступности…</p>}{state==='recording'&&<p role="status">Запрос отправлен. Не повторяйте его.</p>}{state==='locked'&&<p role="status">Результат не подтверждён. Не повторяйте генерацию; проверьте Simli и лимит.</p>}
    {result&&<p role="status">Получена приватная ссылка. Видео ещё не проверено и не опубликовано. <a href={result.mp4Url} target="_blank" rel="noreferrer">Открыть MP4 для проверки</a></p>}
  </section>
}
