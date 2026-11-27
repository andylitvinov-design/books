'use client'
import {useEffect,useRef} from 'react'
import {BookOpen,Check,Clock3,FileCheck,Hourglass,Layers,LogOut,Sprout,UsersRound,X} from 'lucide-react'
import styles from './my-coach-early-exit.module.css'
const copy={
 en:{title:'Leave this session?',subtitle:'Your session is not completed yet.',time:'Session time',min:'min',exit:'Exit',change:'Continue with another coach',close:'Back to session',saved:'Your private draft and elapsed time will be saved. You can choose another coach on the course page. Direct cross-coach resume is not yet available.',unsaved:'Private saving is off. Leaving will not retain this conversation.',error:'Could not confirm the latest private checkpoint. Please retry or return to your session.',saving:'Saving…'},
 ru:{title:'Выйти из сессии?',subtitle:'Ваша сессия ещё не завершена.',time:'Время сессии',min:'мин',exit:'Выйти',change:'Продолжить с другим коучем',close:'Вернуться к сессии',saved:'Черновик и пройденное время сохранятся в профиле. На странице курса можно выбрать другого коуча. Прямое продолжение с другим коучем пока недоступно.',unsaved:'Приватное сохранение выключено. При выходе диалог не сохранится.',error:'Не удалось подтвердить сохранение. Повторите попытку или вернитесь к сессии.',saving:'Сохраняем…'},
 es:{title:'¿Salir de esta sesión?',subtitle:'Tu sesión aún no ha terminado.',time:'Tiempo de sesión',min:'min',exit:'Salir',change:'Continuar con otro coach',close:'Volver a la sesión',saved:'Se guardarán tu borrador privado y el tiempo transcurrido. Puedes elegir otro coach en la página del curso. La continuación directa con otro coach aún no está disponible.',unsaved:'El guardado privado está desactivado. Al salir no se conservará la conversación.',error:'No se pudo confirmar el último guardado. Reintenta o vuelve a la sesión.',saving:'Guardando…'}
}
const completionCopy={
 en:{title:'Session Completed!',partial:'Ready to finish?',subtitle:'Thank you for this meaningful conversation.',saved:'Your session record is saved privately. Review the available results in your Daybook.',pending:'Your session record will be saved privately when you exit or go to your Daybook. Review results before saving if you wish.',unsaved:'Private saving is off or there is no recorded client response. Open the results to review available information before leaving.',materials:'Explore in your Daybook:',results:'Session Results',next:'Recommendations & Next Steps',practice:'Practices & Materials',open:'Open Session Results',daybook:'Go to My Daybook',partialNote:'Results may be partial; only confirmed information is included.',error:'Could not confirm the session save. Retry or open the results to review.'},
 ru:{title:'Сессия завершена!',partial:'Готовы завершить сессию?',subtitle:'Спасибо за эту содержательную беседу.',saved:'Запись сессии сохранена приватно. Доступные итоги можно посмотреть в дневнике.',pending:'Запись сохранится приватно при выходе или переходе в дневник. При желании сначала проверьте итоги.',unsaved:'Приватное сохранение выключено или ответов ещё нет. Перед выходом можно посмотреть доступные итоги.',materials:'В вашем дневнике:',results:'Итоги сессии',next:'Рекомендации и шаги',practice:'Практики и материалы',open:'Открыть итоги сессии',daybook:'Перейти в мой дневник',partialNote:'Итоги могут быть неполными: только подтверждённые сведения.',error:'Не удалось подтвердить сохранение. Повторите попытку или откройте итоги.'},
 es:{title:'¡Sesión completada!',partial:'¿Listo para terminar?',subtitle:'Gracias por esta conversación tan significativa.',saved:'Tu sesión se guardó de forma privada. Consulta los resultados disponibles en tu diario.',pending:'Tu sesión se guardará de forma privada al salir o ir a tu diario. Puedes revisar antes los resultados.',unsaved:'El guardado privado está desactivado o aún no hay respuestas registradas. Revisa los resultados disponibles antes de salir.',materials:'Explora en tu diario:',results:'Resultados de la sesión',next:'Recomendaciones y próximos pasos',practice:'Prácticas y materiales',open:'Abrir resultados',daybook:'Ir a mi diario',partialNote:'Los resultados pueden ser parciales: solo incluyen datos confirmados.',error:'No se pudo confirmar el guardado. Reintenta o abre los resultados.'}
}
export default function MyCoachEarlyExit({locale,seconds,completion=false,reviewComplete=false,saving,error,privateSave,saved=false,locked=false,onDismiss,onChoice}){
 const t=copy[locale]||copy.en,c=completionCopy[locale]||completionCopy.en,dialog=useRef(null)
 useEffect(()=>{const el=dialog.current;if(el&&!el.open)el.showModal();return()=>{if(el?.open)el.close()}},[])
 const elapsed=Math.max(0,Number.isFinite(seconds)?seconds:0),value=Math.min(1200,elapsed)
 const completeTitle=reviewComplete||elapsed>=1200
 return <dialog ref={dialog} className={styles.dialog} data-completion={completion?'true':undefined} aria-labelledby="coach-exit-title" aria-describedby="coach-exit-description" onCancel={event=>{event.preventDefault();if(!locked)onDismiss()}} data-coach-early-exit={completion?undefined:true} data-coach-completion={completion?true:undefined}>
  <button type="button" className={styles.close} aria-label={t.close} onClick={onDismiss} disabled={saving||locked}><X size={23}/></button>
  <div className={styles.art} aria-hidden="true"><span>{completion?<Check size={53} strokeWidth={2.5}/>:<Hourglass size={53} strokeWidth={1.45}/>}</span><i>✧</i><i>✦</i></div>
  <h2 id="coach-exit-title">{completion?(completeTitle?c.title:c.partial):t.title}</h2><p className={styles.subtitle} id="coach-exit-description">{completion?c.subtitle:t.subtitle}</p>
  <div className={styles.ornament} aria-hidden="true">✧</div>
  <div className={styles.time}><Clock3 size={28} aria-hidden="true"/><div><strong>{t.time}: {Math.floor(elapsed/60)} / 20 {t.min}</strong><progress max={1200} value={value} aria-label={t.time}/></div></div>
  <p className={styles.note}>{completion?(saved?c.saved:privateSave?c.pending:c.unsaved):privateSave?t.saved:t.unsaved}</p>
  {completion&&<><p className={styles.partialNote}>{c.partialNote}</p><div className={styles.materials}><strong>{c.materials}</strong><div><span><FileCheck size={27} aria-hidden="true"/>{c.results}</span><span><Sprout size={27} aria-hidden="true"/>{c.next}</span><span><Layers size={27} aria-hidden="true"/>{c.practice}</span></div></div></>}
  {error&&<p role="alert" className={styles.error}>{completion?c.error:t.error}</p>}
  {saving&&<p role="status">{t.saving}</p>}
  <div className={styles.actions}>
   {completion?<><button type="button" className={styles.switch} onClick={()=>onChoice('results')} disabled={saving} data-coach-completion-results><FileCheck size={26}/>{c.open}</button>
   <button type="button" className={styles.exit} onClick={()=>onChoice('daybook')} disabled={saving} data-coach-completion-daybook><BookOpen size={26}/>{c.daybook}</button>
   <button type="button" className={styles.exit} onClick={()=>onChoice('exit')} disabled={saving} data-coach-completion-exit><LogOut size={26}/>{t.exit}</button></>:<><button type="button" className={styles.exit} onClick={()=>onChoice('exit')} disabled={saving}><LogOut size={26}/>{t.exit}</button>
   <button type="button" className={styles.switch} onClick={()=>onChoice('switch')} disabled={saving}><UsersRound size={27}/>{t.change}</button></>}
  </div>
 </dialog>
}
