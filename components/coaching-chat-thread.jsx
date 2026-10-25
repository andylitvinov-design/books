import Image from 'next/image'
import styles from './coaching-chat-thread.module.css'

// The coach's explanation is authored in the existing shared turn helper.
// Only its reviewed/redacted excerpt is shown; never echo raw private answers.
const copy={
  en:{you:'You',guide:'Holistic House',disclosure:'Self-guided session · not a live chat',
    history:'Coaching conversation',portrait:'Portrait of Andrey'},
  ru:{you:'Вы',guide:'Holistic House',disclosure:'Самостоятельная сессия · не живой чат',
    history:'Диалог коучинг-сессии',portrait:'Портрет Андрея'},
  es:{you:'Tú',guide:'Holistic House',disclosure:'Sesión autoguiada · no es un chat en vivo',
    history:'Conversación de coaching',portrait:'Retrato de Andrey'},
}
export default function CoachingChatThread({locale='en',turn,children}){
  const t=copy[locale]||copy.en
  // The semantic helper suppresses unsafe excerpts, and redacts URLs/contact
  // data; do not bypass its decision with the original answer value.
  const previous=typeof turn?.quote==='string'?turn.quote.trim():''
  const shortened=Array.from(previous).slice(0,260).join('')
  return <section className={styles.thread} data-coaching-chat-thread aria-label={t.history}>
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
        {turn&&<p className={styles.reply}>{turn.coachReply||turn.response} {turn.bridge}</p>}
        <div className={styles.question}>{children}</div>
      </div>
    </div>
  </section>
}
