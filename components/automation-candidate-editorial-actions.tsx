'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import styles from '@/app/admin/automations/automations.module.css';

type Locale='ru'|'en'|'es';
type Decision='shortlist'|'needs_evidence'|'reject';
const labels={
  ru:{shortlist:'В проверку прав',needs_evidence:'Нужно уточнить',reject:'Отклонить',
    working:'Сохраняем…',saved:'Редакторское решение сохранено.',failed:'Решение не подтверждено.',
    rights:'Это НЕ подтверждение лицензии или готовности MP4.'},
  en:{shortlist:'Review rights',needs_evidence:'Needs evidence',reject:'Reject',
    working:'Saving…',saved:'Editorial decision saved.',failed:'Decision not confirmed.',
    rights:'This does NOT approve licence or MP4 readiness.'},
  es:{shortlist:'Revisar derechos',needs_evidence:'Faltan pruebas',reject:'Rechazar',
    working:'Guardando…',saved:'Decisión editorial guardada.',failed:'Decisión no confirmada.',
    rights:'Esto NO aprueba licencias ni disponibilidad del MP4.'}
} as const;
export default function AutomationCandidateEditorialActions({candidateId,locale,currentDecision}:
  {candidateId:string;locale:Locale;currentDecision:string|null}){
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState('');
  const router=useRouter(),t=labels[locale];
  async function save(decision:Decision){
    if(busy)return;
    setBusy(true);setFeedback('');
    try{
      const response=await fetch('/api/admin/automations/candidates/review',{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({candidateId,decision,requestId:crypto.randomUUID()}),
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok||result?.status!=='reviewed'||result?.rightsApproved!==false||
        result?.vaultEligible!==false||result?.publicationAuthorized!==false){
        setFeedback(t.failed);return;
      }
      setFeedback(t.saved);router.refresh();
    }catch{setFeedback(t.failed)}
    finally{setBusy(false)}
  }
  const selected:Record<Decision,string>={
    shortlist:'shortlisted_for_rights_review',needs_evidence:'needs_more_evidence',reject:'rejected'
  };
  return <div className={styles.editorialActions}>
    <div className={styles.editorialButtons} role="group" aria-label={t.rights}>
      {(['shortlist','needs_evidence','reject'] as const).map(action=><button key={action}
        type="button" disabled={busy||currentDecision===selected[action]}
        aria-pressed={currentDecision===selected[action]}
        onClick={()=>save(action)}>{busy?t.working:t[action]}</button>)}
    </div>
    <small>{t.rights}</small>
    <span className={styles.feedback} role="status" aria-live="polite">{feedback}</span>
  </div>;
}
