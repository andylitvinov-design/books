import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const mediaDir='../public/images/holistic-house/my-coach-motion/'
const names=COACH_PERSONAS.map(item=>item.id)

test('all eight coach animations are real lightweight animated WebP with still alternatives',()=>{
  assert.equal(names.length,8)
  for(const name of names){
    const motion=readFileSync(new URL(mediaDir+name+'-living.webp',import.meta.url))
    const still=readFileSync(new URL(mediaDir+name+'-still.webp',import.meta.url))
    for(const file of [motion,still]){
      assert.equal(file.subarray(0,4).toString('ascii'),'RIFF')
      assert.equal(file.subarray(8,12).toString('ascii'),'WEBP')
    }
    assert.ok(motion.includes(Buffer.from('ANIM')),name+' should animate')
    assert.ok(!still.includes(Buffer.from('ANIM')),name+' reduced-motion asset must be static')
    assert.ok(motion.length<200000,name+' animation should stay mobile-friendly')
    assert.ok(still.length<70000,name+' still should stay lightweight')
  }
})

test('all fictional coach photos appear across the live catalog, hero and session',()=>{
  const catalog=source('components/my-coach-catalog.module.css')
  const hero=source('components/my-coach-mira-landing.module.css')
  const session=source('components/my-coach-live-dialogue.module.css')
  for(const id of names){
    for(const css of [catalog,hero,session]){
      assert.ok(css.includes(id+'-living.webp'),id+' motion missing')
      assert.ok(css.includes(id+'-still.webp'),id+' reduced-motion fallback missing')
    }
  }
  assert.match(catalog,/\.cardPortrait\[data-persona\]/)
  assert.match(hero,/\.railPortrait\[data-persona=/)
  assert.match(session,/\.sessionPortrait\[data-persona=/)
  for(const css of [catalog,hero,session])
    assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
})

test('selected main chat photo is persona-specific and preserves voice state and private avatar',()=>{
  const dialog=source('components/my-coach-live-dialogue.jsx')
  const avatar=source('components/app/coaching-avatar.jsx')
  const style=source('components/app/coaching-avatar.module.css')
  assert.match(dialog,/personaId=\{personaId\} displayName=\{name\}/)
  assert.match(avatar,/COACH_PERSONAS\.some\(p=>p\.id===personaId\)/)
  assert.match(avatar,/<picture className=\{styles\.livingPortrait\}>/)
  assert.match(avatar,/unoptimized loading="eager"/)
  assert.match(avatar,/prefers-reduced-motion: reduce/)
  assert.match(avatar,/data-photo-persona=\{photoId\|\|undefined\}/)
  assert.match(style,/data-phase='speaking'/)
  assert.match(style,/data-phase='thinking'/)
  assert.match(style,/@media\(prefers-reduced-motion:reduce\)/)
})


test('eight fictional AI coaches have truly separate six-frame photos across public cards and heroes',()=>{
 const animatedHashes=new Set(),stillHashes=new Set()
 for(const id of names){
  const animated=readFileSync(new URL(mediaDir+id+'-living.webp',import.meta.url))
  const still=readFileSync(new URL(mediaDir+id+'-still.webp',import.meta.url))
  animatedHashes.add(createHash('sha256').update(animated).digest('hex'))
  stillHashes.add(createHash('sha256').update(still).digest('hex'))
  assert.ok((animated.toString('ascii').match(/ANMF/g)||[]).length>=5,id+' must contain six real frames')
 }
 assert.equal(animatedHashes.size,names.length,'A coach must not share another coach animation')
 assert.equal(stillHashes.size,names.length,'A coach must not share another coach still image')
 const hero=source('components/my-coach-mira-landing.module.css')
 for(const id of ['mira','max','sofia','alex']){
  for(const selector of ['heroPortrait','railPortrait']){
   assert.ok(hero.includes('.'+selector+'[data-persona='+id+']{'),'hero and rail must have specific coach overrides')
  }
  const animated="background-image:url('/images/holistic-house/my-coach-motion/"+id+"-living.webp')!important;"
  const still="background-image:url('/images/holistic-house/my-coach-motion/"+id+"-still.webp')!important"
  assert.ok(hero.includes(animated),'new first-screen animated coach face must match catalog: '+id)
  assert.ok(hero.includes(still),'reduced-motion fallback must match catalog: '+id)
 }
})
