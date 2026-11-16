'use client'
import {useEffect,useMemo,useState} from 'react'
import {CLIENT_ABOUT_ME_GROUP_LABELS,CLIENT_ABOUT_ME_INTRO,CLIENT_ABOUT_ME_QUESTIONS,
  getClientAboutMeQuestion,clientAboutMeQuestionsForGroup} from '@/lib/holistic-support/client-memory-questions.mjs'
import styles from './client-about-me.module.css'

const TEXT={
 ru:{title:'Обо мне',description:'Короткие вопросы помогают подбирать подходящую поддержку. Каждый ответ сохраняется только по вашему решению.',
  start:'Первое знакомство',all:'Темы профиля',answer:'Ваш ответ',next:'Далее',save:'Сохранить ответ',
  update:'Обновить ответ',skip:'Пропустить',back:'Назад',delete:'Забыть ответ',
  done:'Вы прошли вопросы этой темы. Можно выбрать другую.',counter:'вопрос',saved:'Сохранено',
  optional:'Все вопросы необязательны.',consent:'Чтобы сохранять ответы, включите персональную память выше.',
  sensitive:'Личные сведения сохраняются только с отдельным разрешением.',close:'Выбрать тему'},
 en:{title:'About me',description:'Short questions help personalize support. Each answer is saved only when you choose to save it.',
  start:'Getting acquainted',all:'Profile topics',answer:'Your answer',next:'Next',save:'Save answer',
  update:'Update answer',skip:'Skip',back:'Back',delete:'Forget answer',
  done:'You have reached the end of this topic. Choose another topic if you like.',counter:'Question',saved:'Saved',
  optional:'Every question is optional.',consent:'Enable personal memory above to save answers.',
  sensitive:'Private details require separate permission.',close:'Choose a topic'},
 es:{title:'Sobre mí',description:'Preguntas breves permiten personalizar la ayuda. Guardamos cada respuesta solo si tú lo decides.',
  start:'Conozcámonos',all:'Temas del perfil',answer:'Tu respuesta',next:'Siguiente',save:'Guardar respuesta',
  update:'Actualizar respuesta',skip:'Omitir',back:'Anterior',delete:'Olvidar respuesta',
  done:'Llegaste al final de este tema. Puedes elegir otro.',counter:'Pregunta',saved:'Guardado',
  optional:'Todas las preguntas son opcionales.',consent:'Activa la memoria personal arriba para guardar respuestas.',
  sensitive:'Los datos personales requieren permiso separado.',close:'Elegir un tema'}
}
const groupKeys=Object.keys(CLIENT_ABOUT_ME_GROUP_LABELS)
export default function ClientAboutMe({locale='en',items=[],memoryEnabled=false,sensitiveEnabled=false,
 busy=false,onConfirm,onEdit,onForget}){
 const lang=TEXT[locale]?locale:'en',t=TEXT[lang]
 const [view,setView]=useState('intro')
 const [index,setIndex]=useState(0)
 const [draft,setDraft]=useState('')
 const [finished,setFinished]=useState(false)
 const safeItems=useMemo(()=>items.filter(item=>item?.privacyClass!=='sensitive'||sensitiveEnabled),[items,sensitiveEnabled])
 const questions=useMemo(()=>view==='intro'?CLIENT_ABOUT_ME_INTRO.map(getClientAboutMeQuestion):
   view==='groups'?[]:clientAboutMeQuestionsForGroup(view,{sensitiveEnabled}),[view,sensitiveEnabled])
 const question=questions[index]||null
 const existing=question?safeItems.find(item=>item.questionKey===question.key):null
 const answeredCount=new Set(safeItems.map(item=>item.questionKey).filter(Boolean)).size
 useEffect(()=>{setDraft(existing?.value||'')},[question?.key,existing?.id,existing?.revision])
 function choose(next){setView(next);setIndex(0);setFinished(false)}
 function forward(){
   if(index+1<questions.length){setIndex(i=>i+1);return}
   setFinished(true);setView('groups');setIndex(0)
 }
 async function save(){
   if(!memoryEnabled||busy||!question||!draft.trim())return
   const clean=draft.trim()
   if(clean.length>300)return
   const success=existing?await onEdit(existing,clean):await onConfirm(question,clean)
   if(success)forward()
 }
 return <section className={styles.root} aria-labelledby="about-me-heading">
   <div className={styles.heading}>
     <h2 id="about-me-heading">{t.title}</h2>
     <span className={styles.count} aria-label={`${answeredCount} / 76`}>{answeredCount} / 76</span>
   </div>
   <p className={styles.description}>{t.description}</p>
   <div className={styles.tabs}>
     <button type="button" className={view==='intro'?styles.selected:''} onClick={()=>choose('intro')}>{t.start}</button>
     <button type="button" className={view!=='intro'?styles.selected:''} onClick={()=>choose('groups')}>{t.all}</button>
   </div>
   {!memoryEnabled&&<p className={styles.hint} role="status">{t.consent}</p>}
   {view==='groups'&&<div className={styles.groupGrid}>
     {groupKeys.map(group=>{
       const count=clientAboutMeQuestionsForGroup(group,{sensitiveEnabled}).length
       const filled=safeItems.filter(item=>getClientAboutMeQuestion(item.questionKey)?.group===group).length
       return <button key={group} type="button" className={styles.group} onClick={()=>choose(group)}>
         <span>{CLIENT_ABOUT_ME_GROUP_LABELS[group][lang]}</span>
         <small>{Math.min(count,filled)} / {count}</small>
       </button>
     })}
     {finished&&<p className={styles.hint}>{t.done}</p>}
   </div>}
   {question&&<div className={styles.question}>
     <div className={styles.step}>
       <small>{t.counter} {index+1} / {questions.length}</small>
       {existing&&<small className={styles.saved}>{t.saved}</small>}
     </div>
     <label htmlFor="about-me-answer">{question.prompt[lang]}</label>
     {question.sensitive&&<p className={styles.hint}>{t.sensitive}</p>}
     <textarea id="about-me-answer" value={draft} maxLength={300} rows={3}
       placeholder={t.answer} disabled={!memoryEnabled||busy}
       onChange={event=>setDraft(event.target.value)} />
     <div className={styles.actions}>
       <button type="button" className={styles.primary} disabled={!memoryEnabled||busy||!draft.trim()||
          (question.sensitive&&!sensitiveEnabled)||draft.trim()===existing?.value} onClick={save}>
         {existing?t.update:t.save}
       </button>
       <button type="button" disabled={busy} onClick={forward}>{t.skip}</button>
     </div>
     <div className={styles.secondary}>
       {index>0&&<button type="button" disabled={busy} onClick={()=>setIndex(i=>i-1)}>{t.back}</button>}
       {view!=='intro'&&<button type="button" disabled={busy} onClick={()=>choose('groups')}>{t.close}</button>}
       {existing&&<button type="button" disabled={busy||!memoryEnabled} onClick={()=>onForget(existing)}>{t.delete}</button>}
     </div>
   </div>}
   <p className={styles.footer}>{t.optional}</p>
 </section>
}
