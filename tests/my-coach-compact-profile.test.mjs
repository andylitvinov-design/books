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

test('mobile reference blocks remain model-first and quote artwork is height-bounded',()=>{
  const component=readFileSync(new URL('../components/my-coach-compact-profile.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/my-coach-compact-profile.module.css',import.meta.url),'utf8')
  let i=-1
  for(const key of ['styles.characterCard','styles.modelCard','styles.focusCard','styles.featuresCard']){
    const j=component.indexOf(key,i+1);assert.ok(j>i,key);i=j
  }
  for(const token of ['styles.cardIcon','styles.heroTags','styles.quoteArt','data-quote-persona'])assert.ok(component.includes(token),token)
  assert.match(css,/grid-template-rows:/)
  assert.match(css,/report-lighthouse-coast\.avif/)
  assert.match(css,/@media\(max-width:355px\)/)
  assert.match(css,/@media\(max-height:735px\)/)
  assert.doesNotMatch(css,/flex:1 0 auto/)
})
