'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import styles from '@/app/admin/automations/automations.module.css';

type Locale='ru'|'en'|'es';
type Action='pause'|'resume'|'run_now';
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

export default function AutomationControlActions({locale,enabled}:{locale:Locale;enabled:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const t=translations[locale];
  async function execute(action:Action){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/automations',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({taskId:'video-scout-hourly',action,requestId:crypto.randomUUID()}),
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
        {busy?t.working:enabled?t.pause:t.resume}
      </button>
      <button className={styles.secondary} type="button" disabled={busy||!enabled}
        onClick={()=>execute('run_now')}>{t.run_now}</button>
    </div>
    <p className={styles.note}>{enabled?t.enabled:t.disabled}</p>
    <p className={styles.feedback} role="status" aria-live="polite">{message}</p>
  </div>;
}
