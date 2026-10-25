import Image from 'next/image'
import CoachingDialogueTurn from './coaching-dialogue-turn'
import styles from './coaching-chat-thread.module.css'

// Present the reviewed turn as a conversation, never as a live AI or human message.
// Only the immediately preceding, already authorized answer appears on the right.
const copy={
  en:{you:'You',guide:'Holistic House',disclosure:'Self-guided session · not a live chat',
    history:'Coaching conversation',portrait:'Portrait of Andrey'},
  ru:{you:'Вы',guide:'Holistic House',disclosure:'Самостоятельная сессия · не живой чат',
    history:'Диалог коучинг-сессии',portrait:'Портрет Андрея'},
  es:{you:'Tú',guide:'Holistic House',disclosure:'Sesión autoguiada · no es un chat en vivo',
    history:'Conversación de coaching',portrait:'Retrato de Andrey'},
}
export default function CoachingChatThread({locale='en',turn,previousReply='',children}){
  const t=copy[locale]||copy.en
  const previous=typeof previousReply==='string'?previousReply.trim():''
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
        <CoachingDialogueTurn turn={turn} compact/>
        <div className={styles.question}>{children}</div>
      </div>
    </div>
  </section>
}
