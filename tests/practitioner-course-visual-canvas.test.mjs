import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {normalizeCourseDraft,normalizeCourseCtaUrl,assertPublishableCourse} from '../lib/practitioners/course-contracts.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const editor=read('components/app/practitioner-course-builder.jsx')
const css=read('components/app/practitioner-course-builder.module.css')
const player=read('components/public-practitioner-course-player.jsx')
const playerCss=read('components/public-practitioner-course-player.module.css')
const repo=read('lib/practitioners/course-repository.js')
const uuid=()=>randomUUID()
const draft=slide=>({title:'Grounding in five minutes',description:'',locale:'en',slides:[slide]})

test('slide visual fields round-trip through the existing JSONB draft contract',()=>{
 const cover=uuid(),id=uuid()
 const normalized=normalizeCourseDraft(draft({id,kind:'text',title:'Pause',body:'Notice your breath',question:'What feels supportive?',coverAssetId:cover,
  ctaLabel:'Read more',ctaUrl:'/en/academy/free-ai-courses'}))
 assert.deepEqual(normalized.slides[0],{id,kind:'text',title:'Pause',body:'Notice your breath',question:'What feels supportive?',coverAssetId:cover,
  ctaLabel:'Read more',ctaUrl:'/en/academy/free-ai-courses'})
 assert.equal(assertPublishableCourse(normalized),normalized)
 assert.equal(assertPublishableCourse(normalizeCourseDraft(draft({id:uuid(),kind:'text',title:'',body:'',question:'What do you need right now?'}))).slides.length,1)
})

test('legacy media slides retain type, only the optional cover changes',()=>{
 for(const kind of ['audio','video','image','embed']){
  const slide={id:uuid(),kind,title:'Welcome',body:'Start here',question:'How do you feel?',coverAssetId:uuid()}
  if(kind==='embed')slide.videoUrl='https://youtu.be/dQw4w9WgXcQ'
  if(['image','audio','video'].includes(kind))slide.assetId=uuid()
  const normalized=normalizeCourseDraft(draft(slide))
  assert.equal(normalized.slides[0].kind,kind)
  assert.equal(normalized.slides[0].coverAssetId,slide.coverAssetId)
  assert.ok(assertPublishableCourse(normalized))
 }
})

test('no insecure CTA is publishable: reject custom schemes, internal hosts, credentials and incomplete URLs',()=>{
 for(const url of ['javascript:alert(1)','http://example.org','https://localhost/private','https://127.0.0.1/a',
   'https://service.local/a','https://user:secret@example.com','//evil.example','https://[::1]/',
   'https://public.example/a b','https://example.com:8080']){
  assert.throws(()=>normalizeCourseCtaUrl(url),{code:'INVALID_COURSE_CTA'},url)
 }
 assert.equal(normalizeCourseCtaUrl(' https://t.me/AndyTherapist '),'https://t.me/AndyTherapist')
 assert.equal(normalizeCourseCtaUrl('/ru/app/practice?panel=materials'),'/ru/app/practice?panel=materials')
 assert.throws(()=>assertPublishableCourse(normalizeCourseDraft(draft({id:uuid(),kind:'text',body:'Welcome',ctaLabel:'Join'}))),{code:'COURSE_CTA_INCOMPLETE'})
 assert.throws(()=>normalizeCourseDraft(draft({id:uuid(),kind:'text',body:'Welcome',coverAssetId:'not-a-uuid'})))
})

test('covers have independent owner-ready publication checks and published-snapshot-only reads',()=>{
 assert.match(repo,/flatMap\(s=>\[s\.assetId,s\.coverAssetId\]\)/)
 assert.match(repo,/if\(slide\.coverAssetId&&!found\.has\(slide\.coverAssetId\)\)fail\('COURSE_MEDIA_NOT_READY'/)
 assert.match(repo,/found\.get\(slide\.coverAssetId\)!=='image'/)
 assert.match(repo,/c\.published->'slides' @> jsonb_build_array\(jsonb_build_object\('coverAssetId',a\.id::text\)\)/)
 assert.match(repo,/c\.status='published'/)
 assert.doesNotMatch(repo,/c\.draft->'slides' @> jsonb_build_array\(jsonb_build_object\('coverAssetId'/)
})

test('author edits a real-looking page rather than a stack of separate form fields',()=>{
 assert.match(editor,/data-course-visual-canvas/)
 assert.match(editor,/data-course-photo-placeholder/)
 assert.match(editor,/data-course-question-block/)
 assert.match(editor,/data-course-text-block/)
 assert.match(editor,/data-course-cta-block/)
 assert.match(editor,/data-course-element-toolbar/)
 assert.match(editor,/data-course-slide-thumbnails/)
 assert.match(editor,/upload\(file,false,'cover'\)/)
 assert.match(editor,/function changeMediaKind\(kind\)/)
 assert.match(editor,/function duplicateSlide\(\)/)
 assert.match(editor,/function nextSlide\(\)/)
 assert.match(editor,/defaultOpen=\{!!\(active\.ctaLabel\|\|active\.ctaUrl\)\}/)
 for(const locale of ['en','ru','es'])assert.match(editor,new RegExp('translations\\.'+locale))
 assert.match(css,/\.elementToolbar\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/)
 assert.match(css,/\.photoStage\{position:relative/)
 assert.match(css,/\.blockCopy textarea:focus-visible/)
 assert.match(css,/\.slidePicker\{display:flex/)
 assert.match(css,/overflow-x:auto/)
 assert.match(css,/@media\(max-width:355px\)/)
 assert.match(css,/min-height:44px/)
})

test('learner sees the same photo, question, instruction and optional CTA — without autoplay',()=>{
 assert.match(player,/data-course-learner-page/)
 assert.match(player,/slide\.coverAssetId\|\|\(slide\.kind==='image'\?slide\.assetId:null\)/)
 assert.match(player,/slide\.question&&<section/)
 assert.match(player,/slide\.ctaLabel&&slide\.ctaUrl&&<a/)
 assert.match(player,/rel="noopener noreferrer nofollow"/)
 assert.match(player,/slide\.kind==='audio'&&<audio/)
 assert.match(player,/slide\.kind==='video'&&<video/)
 assert.match(player,/controls preload="none"/)
 assert.doesNotMatch(player,/\bautoPlay\b/)
 assert.match(playerCss,/\.pageCanvas\{/)
 assert.match(playerCss,/\.reflection,/)
 assert.match(playerCss,/\.slideCta\{/)
})
