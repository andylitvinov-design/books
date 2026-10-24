import styles from './coaching-dialogue-turn.module.css'

// One compact editorial coach reply. Never interpreted as a live human or AI
// response: the caller supplies reviewed localized copy from local session state.
export default function CoachingDialogueTurn({turn}){
  if(!turn)return null
  return <aside className={styles.turn} data-coaching-conversational-turn>
    <span className={styles.label}>{turn.label}</span>
    <p className={styles.body}>{turn.response}{turn.quote&&<> <q className={styles.quote}>{turn.quote}</q></>} {turn.bridge}</p>
  </aside>
}
