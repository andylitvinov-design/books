import styles from './coaching-dialogue-turn.module.css'

// The user excerpt is a redacted, bounded local display value; this is not a
// claim of a live human coach or generative response.
export default function CoachingDialogueTurn({turn}){
  if(!turn)return null
  return <aside className={styles.turn} data-coaching-conversational-turn aria-label={turn.label}>
    {turn.quote&&<div className={styles.clientLine} data-coaching-client-bubble>
      <span className={styles.clientCaption}>{turn.response}</span>
      <q className={styles.quote}>{turn.quote}</q>
    </div>}
    <div className={styles.coachLine} data-coaching-reply-bubble>
      <span className={styles.avatar} aria-hidden="true">✦</span>
      <div className={styles.coachMessage}>
        <span className={styles.label}>{turn.label}</span>
        <p className={styles.body}>{turn.coachReply||turn.response} {turn.bridge}</p>
      </div>
    </div>
  </aside>
}
