import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PUBLIC_COACH_PERSONA_IDS} from '../lib/coaching/persona-registry.mjs'
import {getCoachCompactProfile} from '../lib/coaching/coach-compact-profiles.mjs'

test('one concise localized profile for each of the six public coaches',()=>{
  assert.deepEqual(PUBLIC_COACH_PERSONA_IDS,['mira','max','sofia','alex','merlin','harry'])
  for(const locale of ['ru','en','es']){
    for(const id of PUBLIC_COACH_PERSONA_IDS){
      const profile=getCoachCompactProfile(id,locale)
      assert.ok(profile,'profile '+id+' '+locale)
      for(const field of ['name','role','character','model','quote'])
        assert.ok(profile[field]?.length>2,field+' '+id+' '+locale)
      assert.equal(profile.tags.length,3)
      assert.ok(profile.tags.every(tag=>tag.length>1))
      assert.equal(profile.focus.length,3)
      assert.equal(profile.features.length,3)
      assert.ok(profile.steps.length>=5)
      assert.ok(profile.steps.length<=6)
      assert.ok(profile.availableMethods.includes(profile.methodId))
      assert.ok(profile.steps.every(step=>step.length>1))
    }
  }
  assert.equal(getCoachCompactProfile('unknown','ru'),null)
  assert.equal(getCoachCompactProfile('lea','ru'),null)
})
test('coaching model follows persona allowlist, never a forged method',()=>{
  for(const id of PUBLIC_COACH_PERSONA_IDS){
    const original=getCoachCompactProfile(id,'en')
    const alternate=original.availableMethods[1]
    assert.ok(alternate)
    assert.equal(getCoachCompactProfile(id,'ru',alternate).methodId,alternate)
    assert.equal(getCoachCompactProfile(id,'en','forged_method').methodId,original.methodId)
    assert.equal(getCoachCompactProfile(id,'ru','grow').methodId,
      original.availableMethods.includes('grow')?'grow':original.methodId)
  }
})
test('profile stays inside existing live conversation with user-invoked Back',()=>{
  const live=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const component=readFileSync(new URL('../components/my-coach-compact-profile.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/my-coach-compact-profile.module.css',import.meta.url),'utf8')
  assert.match(live,/data-my-coach-immersive-session/)
  assert.match(live,/MyCoachCompactProfile/)
  assert.match(live,/setCoachProfileOpen\(true\)/)
  assert.match(live,/setCoachProfileOpen\(false\)/)
  // Owner-approved layout: Profile moved from voice toolbar into the header.
  assert.match(live,/className=\{styles\.headerProfileControl\}/)
  const header=live.slice(live.indexOf('<header className={styles.sessionTopbar}>'),live.indexOf('</header>'))
  assert.ok(header.indexOf('headerProfileControl')<header.indexOf('data-coach-language-control'))
  assert.ok(header.indexOf('data-coach-language-control')<header.indexOf('className={styles.chooseCoach}'))
  assert.match(component,/dialog\.showModal\(\)/)
  assert.match(component,/onCancel=\{event=>/)
  assert.match(component,/data-coach-profile-screen/)
  assert.match(component,/onClick=\{onBack\}/)
  assert.match(css,/height:100dvh/)
  assert.match(css,/max-width:355px/)
  assert.match(css,/max-height:735px/)
})

test('approved profile has separate large cards, localized 100 XP price and a clear lighthouse photo',()=>{
  const component=readFileSync(new URL('../components/my-coach-compact-profile.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/my-coach-compact-profile.module.css',import.meta.url),'utf8')
  let i=-1
  for(const key of ['styles.characterCard','styles.archetypeCard','styles.styleCard','styles.workCard',
    'styles.modelCard','styles.focusCard','styles.featuresCard']){
    const j=component.indexOf(key,i+1)
    assert.ok(j>i,'separate large section '+key);i=j
  }
  assert.match(component,/100 XP \/ 20 min session/)
  assert.match(component,/100 XP \/ сеанс 20 мин/)
  assert.match(component,/100 XP \/ sesión de 20 min/)
  assert.match(component,/data-coach-session-price="100xp-20min"/)
  assert.match(component,/data-coach-style-passport=\{personaId\}/)
  assert.doesNotMatch(component,/styles\.quoteArt/)
  assert.match(css,/report-lighthouse-coast\.avif/)
  assert.match(css,/\.inlineProfile \.card h2/)
  assert.match(css,/\.inlineProfile \.card p/)
  assert.match(css,/\.page \.hero\{flex:0 0 auto;min-height:clamp\(310px/)
  assert.match(css,/\.inlineProfile \.quote/)
  assert.match(css,/@media\(max-width:355px\)/)
})

test('public coach profile is inline before Play; only real session shows stage lamps',()=>{
  const live=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const compact=readFileSync(new URL('../components/my-coach-compact-profile.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/my-coach-live-dialogue.module.css',import.meta.url),'utf8')
  const profileCss=readFileSync(new URL('../components/my-coach-compact-profile.module.css',import.meta.url),'utf8')
  assert.match(live,/const sessionHasStarted=sessionClockStarted\|\|voiceState\.phase!=='idle'\|\|turns\.length>0/)
  assert.match(live,/data-coach-prestart-profile=\{sessionHasStarted\?'false':'true'\}/)
  const inline=live.indexOf('{!sessionHasStarted&&<MyCoachInlineProfile')
  const lamps=live.indexOf('{sessionHasStarted&&<details className={styles.sessionProgress}')
  assert.ok(inline>0&&lamps>inline,'inline profile before director-confirmed progress')
  assert.match(live,/stageProgressVerified=\{progressValid\}/)
  assert.match(live,/onSessionStart=\{\(\)=>\{setGeminiLiveConsent\(true\);setSessionClockStarted\(true\);setIntroComplete\(true\)\}\}/)
  assert.match(compact,/export function MyCoachInlineProfile/)
  assert.match(compact,/function CoachProfileSections/)
  assert.equal((compact.match(/<CoachProfileSections profile=\{profile\} personaId=\{personaId\} t=\{t\}\/>/g)||[]).length,2)
  assert.match(compact,/data-coach-inline-profile=\{personaId\}/)
  assert.match(profileCss,/\.inlineProfile\{/)
  assert.match(css,/data-coach-prestart-profile='true'\][\s\S]*?overflow-y:auto/)
  assert.match(css,/data-coach-prestart-profile='true'\] \.voiceWorkspace\{[\s\S]*?overflow:visible/)
  for(const id of PUBLIC_COACH_PERSONA_IDS){
    for(const locale of ['ru','en','es'])assert.ok(getCoachCompactProfile(id,locale),'inline profile '+id+' '+locale)
  }
})
