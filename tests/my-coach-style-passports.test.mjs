import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PUBLIC_COACH_PERSONA_IDS,buildCoachBehaviorPolicy} from '../lib/coaching/persona-registry.mjs'
import {COACH_STYLE_PASSPORTS,COACH_STYLE_PASSPORTS_VERSION,getCoachStylePassport} from '../lib/coaching/coach-style-passports.mjs'
import {getCoachCompactProfile} from '../lib/coaching/coach-compact-profiles.mjs'

test('seven immutable distinct three-language character passports feed both public profiles and coach policy',()=>{
  assert.match(COACH_STYLE_PASSPORTS_VERSION,/20261122/)
  assert.deepEqual(Object.keys(COACH_STYLE_PASSPORTS),PUBLIC_COACH_PERSONA_IDS)
  assert.ok(Object.isFrozen(COACH_STYLE_PASSPORTS))
  for(const lang of ['en','ru','es']){
    const archetypes=new Set()
    for(const id of PUBLIC_COACH_PERSONA_IDS){
      const passport=getCoachStylePassport(id)
      assert.ok(Object.isFrozen(passport),id)
      for(const field of ['archetype','style','workStyle','mission','emotionalTone','signatureQuestion','guardrail']){
        assert.ok(Object.isFrozen(passport[field]),id+' '+field)
        assert.ok(passport[field][lang]?.length>9,id+' '+lang+' '+field)
      }
      assert.ok(!archetypes.has(passport.archetype[lang]),'duplicate archetype '+lang)
      archetypes.add(passport.archetype[lang])
      const profile=getCoachCompactProfile(id,lang)
      for(const key of ['archetype','style','workStyle'])
        assert.equal(profile[key],passport[key][lang])
      const policy=buildCoachBehaviorPolicy(id,{},lang).systemInstructions
      assert.ok(policy.includes(passport.archetype[lang]))
      assert.ok(policy.includes(passport.workStyle[lang]))
      assert.ok(policy.includes(passport.guardrail[lang]))
      assert.match(policy,/Ask at most one question/)
    }
  }
  for(const id of ['unknown','lea','noah','iris','ray','__proto__'])
    assert.equal(getCoachStylePassport(id),null)
})

test('compact session and directory reveal archetype, style and working manner without changing session flow',()=>{
  const compact=readFileSync(new URL('../components/my-coach-compact-profile.jsx',import.meta.url),'utf8')
  const catalog=readFileSync(new URL('../components/my-coach-catalog.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/my-coach-compact-profile.module.css',import.meta.url),'utf8')
  for(const key of ['archetype','style','workStyle']){
    assert.ok(compact.includes('profile.'+key))
    assert.ok(catalog.includes('selectedPassport?.'+key))
  }
  assert.match(compact,/data-coach-style-passport=\{personaId\}/)
  assert.match(compact,/function CoachProfileSections/)
  assert.match(compact,/MyCoachInlineProfile/)
  assert.match(compact,/<CoachProfileSections profile=\{profile\} personaId=\{personaId\} t=\{t\}\/>/)
  assert.match(catalog,/data-coach-style-passport=\{selected\.id\}/)
  assert.match(css,/\.stylePassport/)
  for(const t of ['Archetype','Архетип','Arquetipo'])assert.ok(compact.includes(t))
})
