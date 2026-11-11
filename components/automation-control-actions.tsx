'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import styles from '@/app/admin/automations/automations.module.css';

type Locale='ru'|'en'|'es';
type Action='pause'|'resume'|'run_now';
type TaskId='video-scout-hourly'|'video-classifier-batch'|'council-video-review-weekly'|'video-scout-digest-daily';
const translations={
  ru:{pause:'Приостановить',resume:'Включить почасовой поиск',run_now:'Проверить сейчас',
    working:'Выполняю действие…',done:'Команда проверена. Обновляю результаты.',
    refused:'Действие не подтверждено. Проверьте журнал и настройки.',
    enabled:'Автоматизация включена',disabled:'Поиск приостановлен'},
  en:{pause:'Pause',resume:'Enable hourly search',run_now:'Check now',
    working:'Processing…',done:'Action verified. Refreshing results.',
    refused:'Action not confirmed. Check the history and settings.',
    enabled:'Automation enabled',disabled:'Search paused'},
  es:{pause:'Pausar',resume:'Activar búsqueda cada hora',run_now:'Comprobar ahora',
    working:'Procesando…',done:'Acción verificada. Actualizando resultados.',
    refused:'Acción sin confirmar. Revisa el historial y la configuración.',
    enabled:'Automatización activada',disabled:'Búsqueda pausada'},
} as const;

export default function AutomationControlActions({locale,enabled,taskId='video-scout-hourly'}:
  {locale:Locale;enabled:boolean;taskId?:TaskId}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const t=translations[locale];
  const classifier=taskId==='video-classifier-batch';
  const council=taskId==='council-video-review-weekly';
  const digest=taskId==='video-scout-digest-daily';
  const enableLabel=digest?(locale==='ru'?'Включить ежедневный отчёт':
    locale==='es'?'Activar informe diario':'Enable daily report'):
    council?(locale==='ru'?'Включить еженедельный Совет':
    locale==='es'?'Activar Consejo semanal':'Enable weekly AI Council'):
    classifier?(locale==='ru'?'Включить AI-классификацию':
    locale==='es'?'Activar clasificación IA':'Enable AI classification'):t.resume;
  async function execute(action:Action){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/automations',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({taskId,action,requestId:crypto.randomUUID()}),
      });
      const payload=await response.json().catch(()=>null);
      if(!response.ok||!payload||payload.error||
        ['unconfirmed','stale','revoked','not_production','failed'].includes(payload.status)){
        setMessage(t.refused);return;
      }
      setMessage(t.done);router.refresh();
    }catch{setMessage(t.refused)}
    finally{setBusy(false)}
  }
  return <div className={styles.actionPanel}>
    <div className={styles.actions}>
      <button className={styles.primary} type="button" disabled={busy}
        onClick={()=>execute(enabled?'pause':'resume')}>
        {busy?t.working:enabled?t.pause:enableLabel}
      </button>
      {!digest&&<button className={styles.secondary} type="button" disabled={busy||!enabled}
        onClick={()=>execute('run_now')}>{t.run_now}</button>}
    </div>
    <p className={styles.note}>{digest?(locale==='ru'?'Один отчёт за сутки · в личный Telegram владельца':
      locale==='es'?'Un resumen diario · Telegram privado del propietario':
        'One daily report · private owner Telegram only'):
      council?
      (locale==='ru'?'Предложения ждут решения владельца · ничего не выполняется автоматически':
        locale==='es'?'Propuestas pendientes del propietario · sin ejecución automática':
          'Owner approval required for every proposal · no automatic execution'):
      classifier?
      (locale==='ru'?'Только проверенные бесплатные модели · метаданные · без проверки прав':
        locale==='es'?'Solo IA gratuita verificada · metadatos · revisión humana obligatoria':
          'Verified free AI only · metadata · human rights review required'):
      (enabled?t.enabled:t.disabled)}</p>
    <p className={styles.feedback} role="status" aria-live="polite">{message}</p>
  </div>;
}
