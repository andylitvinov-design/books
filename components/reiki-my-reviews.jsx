'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Check, ChevronDown, LockKeyhole, MessageSquareText, ShieldCheck } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './reiki-my-reviews.module.css'

const VERSION = '2026-10-18.p1'
const LESSONS = [
  {id:'flight-04',en:'Flight to the Sun',ru:'Полёт к Солнцу'},
  {id:'tan-04',en:'Tantra Reiki',ru:'Тантра Рейки'},
  {id:'kun-04',en:'Kundalini Reiki',ru:'Кундалини Рейки'},
  {id:'ygg-04',en:'Reiki Yggdrasil',ru:'Рейки Иггдрасиль'},
]
const LEGACY = /^Feeling:(?:10|[0-9])\/10\n([\s\S]*)$/
const textOnly = text => LEGACY.exec(text || '')?.[1] ?? (text || '')
const enough = text => Array.from(text.trim()).length >= 15
const COPY = {
  ru:{
    title:'Мои отзывы о Reiki-курсе',description:'Здесь хранятся ваши отзывы о четырёх медитациях. Вы можете их дополнять и редактировать.',
    loading:'Загружаем ваши отзывы…',start:'Начните Reiki Practitioner, чтобы записать первые впечатления.',
    open:'Открыть курс',notSaved:'Отзыв пока не написан.',saved:'Сохранено',private:'Личный отзыв',
    edit:'Редактировать',save:'Сохранить изменения',saving:'Сохраняем…',min:'От 15 символов',
    editHint:'Расскажите подробнее: что вы заметили, почувствовали или осознали?',
    share:'Разрешаю передать мои отзывы и учебные ответы Андрею в его закрытую CRM.',
    shareButton:'Передать в CRM',shared:'Отзывы доступны Андрею в закрытой CRM.',
    publishConsent:'Разрешаю опубликовать этот отзыв анонимно на странице курса после проверки Андреем.',
    submit:'Предложить к публикации',pending:'На проверке',approved:'Опубликовано на странице курса',
    rejected:'Не опубликовано',withdraw:'Отозвать согласие на публикацию',
    changed:'Изменение текста снимет опубликованный отзыв. Вы сможете отправить новый.',
    failed:'Не удалось сохранить. Попробуйте снова.',conflict:'Курс обновлён в другом окне. Обновите страницу.',
    done:'Сохранено. Вы можете продолжить обучение.',sent:'Отзыв отправлен на проверку.',
    withdrawn:'Публичная публикация отозвана.',needSave:'Сначала сохраните изменения.',
    privacy:'Ваши личные отзывы не публикуются и не передаются преподавателю без отдельных согласий.',
  },
  en:{
    title:'My Reiki course reviews',description:'Your reflections on four meditations are saved here. You can return to edit or expand them.',
    loading:'Loading your reviews…',start:'Begin Reiki Practitioner to write your first review.',
    open:'Open course',notSaved:'No review saved yet.',saved:'Saved',private:'Private review',
    edit:'Edit review',save:'Save changes',saving:'Saving…',min:'At least 15 characters',
    editHint:'Tell us more about what you noticed, felt or discovered.',
    share:'I agree to share my reviews and course answers with Andrey in his private CRM.',
    shareButton:'Share with teacher',shared:'Andrey can read your reviews in his private CRM.',
    publishConsent:'I consent to an anonymous publication of this review on the course page, after Andrey approves it.',
    submit:'Submit for publication',pending:'Awaiting approval',approved:'Published on the course page',
    rejected:'Not published',withdraw:'Withdraw public consent',
    changed:'Editing withdraws any public version. You can submit the edited review again.',
    failed:'Could not save. Please try again.',conflict:'Your course changed in another tab. Reload this page.',
    done:'Saved. You can continue learning.',sent:'Review submitted for approval.',
    withdrawn:'Public publication withdrawn.',needSave:'Save your changes first.',
    privacy:'Reviews stay private unless you separately opt in to teacher sharing or public publication.',
  },
}

export function ReikiMyReviews({locale='en',accountId}) {
  const lang=locale==='ru'?'ru':'en'
  const t=COPY[lang]
  const [progress,setProgress]=useState(null)
  const [drafts,setDrafts]=useState({})
  const [checked,setChecked]=useState({})
  const [teacherChecked,setTeacherChecked]=useState(false)
  const [editing,setEditing]=useState({})
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  useEffect(()=>{
    let active=true
    setProgress(null);setDrafts({});setChecked({});setEditing({})
    setLoading(true);setError('');setNotice('');setTeacherChecked(false)
    if(!accountId){setLoading(false);return}
    appFetch('academy-energywork',undefined,'GET',{accountId}).then(data=>{
      if(!active || data.accountId!==accountId)return
      setProgress(data)
      setDrafts(Object.fromEntries(LESSONS.map(item=>[item.id,textOnly(data.answers?.[item.id])])))
    }).catch(()=>{
      if(active)setError(t.failed)
    }).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[accountId,lang,t.failed])

  const saved=LESSONS.filter(item=>Boolean(textOnly(progress?.answers?.[item.id]).trim()))
  const courseUrl='/'+lang+'/academy/principles-of-energywork/learn'
  async function command(body,{id,completedNotice}={}){
    if(!progress?.enrolled||busy)return
    setBusy(true);setError('');setNotice('')
    try{
      const data=await appFetch('academy-energywork',
        {version:VERSION,expectedRevision:progress.revision,...body},'POST',{accountId})
      if(data.accountId!==accountId||!data.enrolled)throw new Error('ACCOUNT_CHANGED')
      setProgress(data)
      if(id&&body.action==='save'){
        setDrafts(current=>({...current,[id]:textOnly(data.answers?.[id])}))
        setEditing(current=>({...current,[id]:false}))
      }
      if(id&&body.action==='submit-review')setChecked(current=>({...current,[id]:false}))
      if(body.action==='share')setTeacherChecked(false)
      setNotice(completedNotice||t.done)
    }catch(e){
      setError(e?.status===409?t.conflict:t.failed)
    }finally{setBusy(false)}
  }

  return <section className={styles.shell} data-reiki-my-reviews>
    <details className={styles.details}>
      <summary className={styles.summary}>
        <span className={styles.icon}><MessageSquareText size={19} aria-hidden="true"/></span>
        <span><strong>{t.title}</strong><small>{progress?.enrolled?saved.length+' / 4':t.private}</small></span>
        <ChevronDown className={styles.chevron} size={18} aria-hidden="true"/>
      </summary>
      <div className={styles.inner}>
        <p className={styles.description}>{t.description}</p>
        {loading?<p role="status">{t.loading}</p> : progress?.enrolled ? <>
          {LESSONS.map(item=>{
            const serverText=textOnly(progress.answers?.[item.id])
            const draft=drafts[item.id]??serverText
            const isEditing=Boolean(editing[item.id])
            const changed=draft!==serverText
            const status=progress.publicReviews?.find(review=>review.slideId===item.id)?.status
            return <article className={styles.card} key={item.id} data-reiki-review-id={item.id}>
              <div className={styles.head}>
                <h3>{item[lang]}</h3>
                <span className={styles.status}>{status?t[status]:serverText.trim()?t.saved:t.private}</span>
              </div>
              {isEditing ? <>
                <label className={styles.visuallyHidden} htmlFor={'my-reiki-review-'+item.id}>{t.edit}</label>
                <textarea id={'my-reiki-review-'+item.id} rows={4} maxLength={1600}
                  placeholder={t.editHint} value={draft} disabled={busy}
                  onChange={e=>setDrafts(current=>({...current,[item.id]:e.target.value}))}/>
                <div className={styles.editFooter}>
                  <span>{Math.min(15,Array.from(draft.trim()).length)} / 15</span>
                  <button type="button" disabled={busy||!enough(draft)||!changed}
                    onClick={()=>void command({action:'save',slideId:item.id,nextSlideId:item.id,answer:draft},{id:item.id})}>
                    {busy?t.saving:t.save}
                  </button>
                </div>
                {status&&changed?<p className={styles.hint}>{t.changed}</p>:null}
              </> : serverText.trim()?<>
                <p className={styles.reviewText}>{serverText}</p>
                <button type="button" className={styles.secondary} disabled={busy}
                  onClick={()=>setEditing(current=>({...current,[item.id]:true}))}>{t.edit}</button>
              </> : <p className={styles.hint}>{t.notSaved} <Link href={courseUrl}>{t.open}</Link></p>}
              {Boolean(serverText.trim()) && !isEditing ? <>
                {status ? <button type="button" className={styles.withdraw} disabled={busy}
                  onClick={()=>void command({action:'withdraw-review',slideId:item.id},{completedNotice:t.withdrawn})}>
                  {t.withdraw}
                </button> : <>
                  <label className={styles.consent}>
                    <input type="checkbox" checked={Boolean(checked[item.id])} disabled={busy}
                      onChange={e=>setChecked(current=>({...current,[item.id]:e.target.checked}))}/>
                    <span>{t.publishConsent}</span>
                  </label>
                  <button type="button" className={styles.publish} disabled={busy||!checked[item.id]||!enough(serverText)}
                    onClick={()=>void command({action:'submit-review',slideId:item.id,locale:lang,consent:true},
                      {id:item.id,completedNotice:t.sent})}>{t.submit}</button>
                </>}
              </> : null}
            </article>
          })}
          <div className={styles.teacher}>
            <ShieldCheck size={17} aria-hidden="true"/>
            <div>
              {progress.sharingWithTeacher ? <p>{t.shared}</p> : <>
                <label className={styles.consent}>
                  <input type="checkbox" checked={teacherChecked} disabled={busy}
                    onChange={e=>setTeacherChecked(e.target.checked)}/>
                  <span>{t.share}</span>
                </label>
                <button type="button" disabled={busy||!teacherChecked}
                  onClick={()=>void command({action:'share',consent:true,teacherConsent:true})}>{t.shareButton}</button>
              </>}
            </div>
          </div>
          <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true"/>{t.privacy}</p>
        </> : <p>{t.start} <Link href={courseUrl}>{t.open}</Link></p>}
        {error?<p role="alert" className={styles.error}>{error}</p>:null}
        {notice?<p role="status" className={styles.notice}><Check size={16} aria-hidden="true"/>{notice}</p>:null}
      </div>
    </details>
  </section>
}
