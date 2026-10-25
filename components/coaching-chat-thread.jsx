'use client'

import {useRef} from 'react'
import Image from 'next/image'
import styles from './coaching-chat-thread.module.css'

// The coach's explanation is authored in the existing shared turn helper.
// Only its reviewed/redacted excerpt is shown; never echo raw private answers.
const copy={
  en:{you:'You',guide:'Andrey · Holistic House',disclosure:'Self-guided session · not a live chat',
    history:'Coaching conversation',portrait:'Portrait of Andrey',pending:'Ready to send',fullNote:'Read the full coach note',closeNote:'Close'},
  ru:{you:'Вы',guide:'Андрей · Holistic House',disclosure:'Самостоятельная сессия · не живой чат',
    history:'Диалог коучинг-сессии',portrait:'Портрет Андрея',pending:'Пока не отправлено',fullNote:'Прочитать пояснение полностью',closeNote:'Закрыть'},
  es:{you:'Tú',guide:'Andrey · Holistic House',disclosure:'Sesión autoguiada · no es un chat en vivo',
    history:'Conversación de coaching',portrait:'Retrato de Andrey',pending:'Listo para enviar',fullNote:'Leer toda la explicación',closeNote:'Cerrar'},
}
export default function CoachingChatThread({locale='en',turn,children,draftPreview='',compact=false}){
  const t=copy[locale]||copy.en
  const detailRef=useRef(null)
  const fullReply=[turn?.coachReply||turn?.response,turn?.bridge].filter(Boolean).join(' ')
  // The semantic helper suppresses unsafe excerpts, and redacts URLs/contact
  // data; do not bypass its decision with the original answer value.
  const previous=typeof turn?.quote==='string'?turn.quote.trim():''
  const shortened=Array.from(previous).slice(0,260).join('')
  // Draft previews contain only the user's currently selected, authored choice.
  // They are never represented as sent or saved messages.
  const preview=typeof draftPreview==='string'?Array.from(draftPreview.trim()).slice(0,170).join(''):''
  return <section className={styles.thread+(compact?' '+styles.compactThread:'')} data-coaching-chat-thread aria-label={t.history}>
    {previous&&<div className={styles.userRow} data-coaching-chat-user-turn>
      <div className={styles.userBubble}>
        <span className={styles.userLabel}>{t.you}</span>
        <p>{shortened}{previous.length>shortened.length?'…':''}</p>
      </div>
    </div>}
    <div className={styles.coachRow} data-coaching-chat-coach-turn>
      <Image className={styles.avatar}
        src="/images/holistic-house/portrait-static/andy-96-b9d7800d1448.webp"
        width={42} height={42} alt={t.portrait} unoptimized/>
      <div className={styles.coachBubble}>
        <div className={styles.byline}>
          <strong>{t.guide}</strong>
          <span>{t.disclosure}</span>
        </div>
        {turn&&<div className={styles.replyRow}>
          <p className={styles.reply}>{fullReply}</p>
          {compact&&fullReply&&<button type="button" className={styles.moreReply} aria-label={t.fullNote}
            onClick={()=>detailRef.current?.showModal()}>…</button>}
        </div>}
        <div className={styles.question}>{children}</div>
      </div>
    </div>
    {!compact&&preview&&<div className={styles.userRow} data-coaching-chat-draft>
      <div className={styles.draftBubble}>
        <span className={styles.draftLabel}>{t.you} · {t.pending}</span>
        <p>{preview}</p>
      </div>
    </div>}
    {compact&&fullReply&&<dialog ref={detailRef} className={styles.replyDialog}
      aria-label={t.fullNote} onClick={event=>{if(event.target===detailRef.current)detailRef.current?.close()}}>
      <strong>{t.guide}</strong><p>{fullReply}</p>
      <button type="button" onClick={()=>detailRef.current?.close()}>{t.closeNote}</button>
    </dialog>}
  </section>
}
