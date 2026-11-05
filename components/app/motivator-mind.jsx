import { buildMotivatorMessage } from '@/lib/assessments/motivator-mind.mjs'
import styles from './motivator-mind.module.css'

// Reusable closing block; pure planner, no API request or profile access.
export function MotivatorMind({report,result,locale='en',focusScaleKey=null,
  tone='gentle',format='paragraph',safetyState='ok'}) {
  const message=buildMotivatorMessage({report,result,locale,focusScaleKey,tone,format,safetyState})
  if (!message) return null
  return <aside className={styles.card} data-motivator-mind data-motivator-version={message.version}
    lang={message.locale} aria-label={message.headline}>
    <p className={styles.label}><span aria-hidden="true">✦ </span>{message.headline}</p>
    <p className={styles.message}>{message.paragraph}</p>
    <p className={styles.note}>{message.disclosure}</p>
  </aside>
}
