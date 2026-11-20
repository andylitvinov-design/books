import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../components/my-coach-live-dialogue.module.css',import.meta.url),'utf8')
const card=readFileSync(new URL('../components/my-coach-session-state-card.jsx',import.meta.url),'utf8')

test('coach header: Profile before language before Back, portrait intact',()=>{
  const header=ui.slice(ui.indexOf('<header className={styles.sessionTopbar}>'),ui.indexOf('</header>'))
  assert.ok(header.indexOf('headerProfileControl')<header.indexOf('data-coach-language-control'))
  assert.ok(header.indexOf('data-coach-language-control')<header.indexOf('className={styles.chooseCoach}'))
  assert.match(header,/onClick=\{openCoachProfile\}/)
  assert.match(header,/<ArrowLeft size=\{16\}/)
  assert.match(ui,/data-coach-hero-play/)
  assert.match(ui,/data-coach-motion-video/)
})
test('Basic Groq or consented Gemini Free; Summary keeps real PDF workflow',()=>{
  const row=ui.slice(ui.indexOf('data-coach-inline-voice'),ui.indexOf('data-coach-voice-consent-one-play'))
  assert.match(row,/data-coach-basic-pro-toggle/)
  assert.match(row,/setCoachEngine\('groq_stream'\)/)
  assert.match(row,/setCoachEngine\('gemini_free'\)/)
  assert.match(row,/experienceTextConsent/)
  assert.match(row,/geminiCapabilities\.gemini_free/)
  assert.match(row,/geminiCapabilities\.gemini_tts_free/)
  assert.doesNotMatch(row,/setCoachEngine\('gemini_paid'\)/)
  assert.match(ui,/onClick=\{endWithProtocol\}/)
  assert.match(ui,/data-coach-finish-with-protocol/)
  assert.match(css,/grid-template-columns:62px minmax\(0,1fr\) 50px 50px 50px/)
})
test('single stage disclosure with authentic stages and read-only confirmation',()=>{
  assert.equal(ui.match(/<MyCoachSessionStateCard/g)?.length,1)
  assert.match(ui,/data-coach-progress-accordion/)
  assert.match(ui,/<summary className=\{styles.sessionProgressSummary\}>/)
  assert.ok(ui.indexOf('data-coach-progress-accordion')<ui.indexOf('className={styles.voicePrivacyDetails}'))
  assert.match(card,/data-coach-stage-checklist/)
  assert.match(card,/ReadOnlyCheckbox checked=\{done\}/)
  assert.match(card,/stageProgressVerified&&card\.stageVerifiedByDirector/)
  assert.match(css,/:has\(\[data-coach-progress-accordion\]\[open\]\)/)
  assert.doesNotMatch(ui,/data-coach-key-info-toggle/)
})
