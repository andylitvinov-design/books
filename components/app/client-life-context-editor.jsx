'use client'
import {useEffect,useMemo,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {
 LIFE_CONTEXT_FIELDS,LIFE_CONTEXT_SECTIONS,emptyLifeContext,
 normalizeLifeContext,lifeContextProgress,firstUnansweredLifeQuestion
} from '@/lib/profile/client-life-context.mjs'
import styles from './client-life-context-editor.module.css'

const COPY={
 en:{title:'My Life Profile',desc:'A few optional reflections about your life, wishes, strengths and the way you want to work. You can complete them gradually.',
  progress:'answered',start:'Start my profile',resume:'Continue profile',edit:'Review my answers',
  back:'Back',next:'Next question',finish:'Finish questions',skip:'Skip for now',
  save:'Save my answers privately',saving:'Saving…',saved:'Saved to your private profile.',
  conflict:'Your profile changed in another tab. Your answers are still on this screen; review them before reloading.',
  failed:'Could not save. Your answers are still here.',login:'Sign in to save.',
  incomplete:'You can leave questions unanswered.',privacy:'Your text stays private in your account. It is not automatically shared with AI coaches, practitioners or messengers.',
  count:'of',question:'Question',limit:'Up to 500 characters',empty:'No answers saved yet.'},
 ru:{title:'Мой личный профиль',desc:'Необязательные вопросы о вашей жизни, желаниях, ресурсах и удобном формате работы. Можно заполнять постепенно.',
  progress:'заполнено',start:'Начать заполнение',resume:'Продолжить профиль',edit:'Посмотреть мои ответы',
  back:'Назад',next:'Следующий вопрос',finish:'Закончить вопросы',skip:'Пропустить пока',
  save:'Сохранить ответы приватно',saving:'Сохраняем…',saved:'Ответы сохранены в вашем личном профиле.',
  conflict:'Профиль изменился в другом окне. Ваши ответы остались на экране; проверьте их перед обновлением.',
  failed:'Не удалось сохранить. Ваши ответы остаются на экране.',login:'Войдите, чтобы сохранить.',
  incomplete:'Необязательно отвечать на все вопросы.',privacy:'Ваш текст остаётся приватным в аккаунте и не передаётся автоматически AI-коучам, специалистам или в мессенджеры.',
  count:'из',question:'Вопрос',limit:'До 500 символов',empty:'Сохранённых ответов пока нет.'},
 es:{title:'Mi perfil de vida',desc:'Preguntas opcionales sobre tu vida, deseos, recursos y cómo prefieres trabajar. Puedes completarlas poco a poco.',
  progress:'respondidas',start:'Crear mi perfil',resume:'Continuar mi perfil',edit:'Revisar mis respuestas',
  back:'Anterior',next:'Pregunta siguiente',finish:'Finalizar preguntas',skip:'Omitir por ahora',
  save:'Guardar mis respuestas en privado',saving:'Guardando…',saved:'Guardado en tu perfil privado.',
  conflict:'El perfil cambió en otra pestaña. Tus respuestas permanecen aquí; revísalas antes de actualizar.',
  failed:'No se pudo guardar. Tus respuestas permanecen aquí.',login:'Inicia sesión para guardar.',
  incomplete:'Puedes dejar preguntas sin responder.',privacy:'Tus respuestas permanecen privadas. No se comparten automáticamente con coaches IA, profesionales ni mensajería.',
  count:'de',question:'Pregunta',limit:'Hasta 500 caracteres',empty:'Aún no has guardado respuestas.'}
}
export default function ClientLifeContextEditor({accountId,locale='en',goals,revision=0,onSaved,onSessionLost}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 const [answers,setAnswers]=useState(()=>normalizeLifeContext(goals?.lifeContext)?.answers||{})
 const [dirty,setDirty]=useState(false)
 const [busy,setBusy]=useState(false)
 const [editing,setEditing]=useState(false)
 const [index,setIndex]=useState(0)
 const [notice,setNotice]=useState('')
 const [error,setError]=useState('')
 // A concurrent vectors save must never silently erase a local narrative draft.
 useEffect(()=>{
  if(!dirty)setAnswers(normalizeLifeContext(goals?.lifeContext)?.answers||{})
 },[goals?.lifeContext,dirty])
 const profile=useMemo(()=>normalizeLifeContext({version:1,answers})||emptyLifeContext(),[answers])
 const summary=lifeContextProgress(profile)
 const field=LIFE_CONTEXT_FIELDS[index]||LIFE_CONTEXT_FIELDS[0]
 const section=LIFE_CONTEXT_SECTIONS.find(group=>group.questions.some(q=>q.id===field.id))
 const value=answers[field.id]||''
 const open=()=>{
  const first=firstUnansweredLifeQuestion(profile)
  setIndex(first>=0?first:0);setEditing(true);setNotice('');setError('')
 }
 const update=next=>{
  setAnswers(previous=>({...previous,[field.id]:next}))
  setDirty(true);setError('');setNotice('')
 }
 const forward=()=>{
  if(index+1>=LIFE_CONTEXT_FIELDS.length){setEditing(false)}
  else setIndex(index+1)
 }
 const save=async()=>{
  if(!accountId||!dirty||busy||!goals||!Number.isSafeInteger(revision))return
  const lifeContext=normalizeLifeContext({version:1,answers})
  if(!lifeContext){setError(t.failed);return}
  setBusy(true);setError('');setNotice('')
  try{
   const result=await appFetch('development-goals',{...goals,lifeContext,revision},'POST',{accountId})
   const accepted=normalizeLifeContext(result?.goals?.lifeContext)
   if(!result?.saved||!accepted||!Number.isSafeInteger(result.revision))throw Error('BAD_RESPONSE')
   setAnswers(accepted.answers);setDirty(false);setNotice(t.saved)
   onSaved?.(result)
  }catch(e){
   if(e?.status===401||e?.status===403||e?.code==='ACCOUNT_CHANGED')onSessionLost?.()
   setError(e?.code==='DEVELOPMENT_GOALS_CONFLICT'?t.conflict:t.failed)
  }finally{setBusy(false)}
 }
 if(!accountId)return null
 return <section className={styles.root} data-client-life-profile>
  <header className={styles.heading}>
   <div><small>MY CONTEXT</small><h2>{t.title}</h2><p>{t.desc}</p></div>
   <strong className={styles.count} data-profile-answered>{summary.answered} {t.count} {summary.total} · {t.progress}</strong>
  </header>
  {!editing?<button type="button" className={styles.open} onClick={open}>
   {summary.answered===0?t.start:summary.answered<summary.total?t.resume:t.edit}
  </button>:<div className={styles.question} data-profile-question={field.id}>
    <p className={styles.step}>{t.question} {index+1}/{LIFE_CONTEXT_FIELDS.length} · {section?.title[lang]}</p>
    <label htmlFor={'life-context-'+field.id}>{field.prompt[lang]}</label>
    <textarea id={'life-context-'+field.id} value={value}
     onChange={event=>update(event.target.value)} rows={4} maxLength={500}
     placeholder={t.incomplete} disabled={busy}/>
    <small>{value.trim().length}/500 · {t.limit}</small>
    <div className={styles.navigation}>
     <button type="button" disabled={index===0||busy} onClick={()=>setIndex(index-1)}>{t.back}</button>
     <button type="button" disabled={busy} onClick={forward}>{index+1===LIFE_CONTEXT_FIELDS.length?t.finish:t.next}</button>
     {!value.trim()&&<button type="button" disabled={busy} onClick={forward}>{t.skip}</button>}
    </div>
   </div>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {notice&&<p role="status" className={styles.notice}>{notice}</p>}
  {dirty&&<button type="button" className={styles.save} disabled={busy} onClick={()=>void save()}>
   {busy?t.saving:t.save}
  </button>}
  <p className={styles.privacy}>{t.privacy}</p>
 </section>
}
