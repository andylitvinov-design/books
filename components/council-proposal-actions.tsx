'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import styles from '@/app/admin/automations/automations.module.css';
const WORDS={
 ru:{accept:'Принять для планирования',reject:'Отклонить',busy:'Сохраняю…',done:'Решение сохранено. Исполнение не запускалось.',error:'Не удалось подтвердить решение.'},
 en:{accept:'Accept for planning',reject:'Reject',busy:'Saving…',done:'Decision saved. No execution was started.',error:'Decision could not be verified.'},
 es:{accept:'Aceptar para planificar',reject:'Rechazar',busy:'Guardando…',done:'Decisión guardada, sin ejecutar.',error:'No se pudo verificar la decisión.'},
} as const;
type Locale='ru'|'en'|'es';
export default function CouncilProposalActions({proposalId,locale}:{proposalId:string;locale:Locale}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const router=useRouter(),words=WORDS[locale];
 async function decide(action:'accept_proposal'|'reject_proposal'){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const resp=await fetch('/api/admin/automations',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({
      taskId:'council-video-review-weekly',action,proposalId,requestId:crypto.randomUUID()})});
   const data=await resp.json().catch(()=>null);
   if(!resp.ok||data?.status!=='reviewed'||data.appliedToTasks!==false){setMessage(words.error);return;}
   setMessage(words.done);router.refresh();
  }catch{setMessage(words.error)}finally{setBusy(false)}
 }
 return <div className={styles.actionPanel}>
  <div className={styles.actions}>
   <button type="button" className={styles.primary} disabled={busy} onClick={()=>decide('accept_proposal')}>{busy?words.busy:words.accept}</button>
   <button type="button" className={styles.secondary} disabled={busy} onClick={()=>decide('reject_proposal')}>{words.reject}</button>
  </div><p role="status" aria-live="polite" className={styles.feedback}>{message}</p>
 </div>;
}
