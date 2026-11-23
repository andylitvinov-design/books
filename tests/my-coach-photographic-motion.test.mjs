import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const root='../public/images/holistic-house/my-coach-motion/'

test('all fictional personas preserve unique static identity, even future personas',()=>{
 const hashes=new Set()
 for(const persona of COACH_PERSONAS){
  const bytes=readFileSync(new URL(root+persona.id+'-still.webp',import.meta.url))
  assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF')
  assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP')
  assert.ok(!bytes.includes(Buffer.from('ANIM')),persona.id)
  hashes.add(createHash('sha256').update(bytes).digest('hex'))
 }
 assert.equal(hashes.size,COACH_PERSONAS.length)
})
test('catalog, hero and live dialogue never paint the old animated WebP',()=>{
 for(const file of ['components/my-coach-catalog.module.css',
  'components/my-coach-mira-landing.module.css','components/my-coach-live-dialogue.module.css']){
  const css=source(file)
  assert.doesNotMatch(css,/-living\.webp/)
  for(const id of ['mira','max','sofia','alex','lea','noah','iris','ray'])
   assert.ok(css.includes(id+'-still.webp'),id+' static fallback missing in '+file)
 }
})
test('browser no longer deforms eyes, lips or portrait via sound waveform',()=>{
 const avatar=source('components/app/coaching-avatar.jsx')
 const css=source('components/app/coaching-avatar.module.css')
 const live=source('components/my-coach-live-dialogue.jsx')
 const session=source('components/my-coach-live-dialogue.module.css')
 assert.match(avatar,/COACH_PERSONAS\.some\(p=>p\.id===personaId\)/)
 assert.match(avatar,/<picture className=\{styles\.livingPortraitBase\}>/)
 assert.match(avatar,/src=\{'\/images\/holistic-house\/my-coach-motion\/'\+photoId\+'-still\.webp'\}/)
 assert.doesNotMatch(avatar,/livingPortraitMouth|requestAnimationFrame|portraitMouthAperture/)
 assert.doesNotMatch(live,/data-photo-waveform|--hh-portrait-mouth-scale|setPortraitLevel/)
 assert.doesNotMatch(session,/hh-hero-mouth-speaking|--hh-hero-mouth-image|mask-image:radial-gradient/)
 assert.match(css,/\.frame \.head,\.frame \.eyes,\.frame \.mouthTalk,\.frame \.halo\{animation:none!important/)
 assert.match(session,/sessionPortrait\[data-persona\]::after\{display:none!important;content:none!important/)
})
