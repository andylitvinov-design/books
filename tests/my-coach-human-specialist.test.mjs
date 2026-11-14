import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/[locale]/my-coach/real/[slug]/page.tsx','utf8')
const client = readFileSync('components/my-coach-human-specialist.tsx','utf8')
const css = readFileSync('components/my-coach-human-specialist.module.css','utf8')
const catalog = readFileSync('components/my-coach-catalog.jsx','utf8')
const catalogCss = readFileSync('components/my-coach-catalog.module.css','utf8')

test('My Coach real-person card links to the dedicated published human specialist view in all locales',()=>{
  assert.match(catalog,/data-my-coach-human-dialogue-link/)
  assert.match(catalog,/my-coach\/real\/andy-litvinov/)
  assert.match(catalog,/session: 'Watch videos & ask a question'/)
  assert.match(catalog,/session: 'Смотреть видео и задать вопрос'/)
  assert.match(catalog,/session: 'Ver vídeos y hacer una pregunta'/)
  assert.match(catalogCss,/\.humanSessionLink/)
  assert.match(page,/languages: Locale\[\] = \['en','ru','es'\]/)
})

test('Human specialist videos come only from public practitioner and published first-party materials',()=>{
  assert.match(page,/getPublicPractitioner\(slug,locale\)/)
  assert.match(page,/getPublishedSiteVideos\(\)/)
  assert.match(page,/video\.practitionerSlug !== slug/)
  assert.match(page,/profile\?\.videoMaterials/)
  assert.match(page,/getServiceVideoMedia\(topic,language\)/)
  assert.match(page,/parseSiteVideoSource\(input\.url\)/)
  assert.match(page,/https:\/\/www\.youtube-nocookie\.com\/embed\//)
  assert.match(page,/https:\/\/app\.heygen\.com\/embeds\//)
  assert.match(page,/storage\/v1\/object\/public\/hh-practitioner-presentations/)
  assert.match(page,/if \(!practitioner && !isOwner\) notFound\(\)/)
  assert.doesNotMatch(page,/Dr\. Elena|mock (video|profile)|lorem ipsum/i)
})

test('The hero and all selectable thumbnails are 16:9, with swipeable rail and no fake live-call buttons',()=>{
  assert.match(css,/\.mainVideo\{[^}]*aspect-ratio:16\/9/)
  assert.match(css,/\.thumbFrame\{[^}]*aspect-ratio:16\/9/)
  assert.match(css,/\.reel\{[^}]*overflow-x:auto/)
  assert.match(css,/scroll-snap-type:x mandatory/)
  assert.match(css,/@media\(max-width:460px\)/)
  assert.match(client,/aria-pressed=\{selected===index\}/)
  assert.match(client,/setSelected\(index\);setPlaying\(false\)/)
  assert.match(client,/playing && activeVideo/)
  assert.match(client,/not a live video call/)
  assert.doesNotMatch(client,/endCall|startCall|requestCamera|CameraOff/)
})

test('The question composer uses the existing verified private messaging route; never simulate a reply or a send',()=>{
  assert.match(client,/\/api\/app\/direct-messages/)
  assert.match(client,/headers:\{'content-type':'application\/json','x-hh-account-id':accountId\}/)
  assert.match(client,/action:'start',slug/)
  assert.match(client,/action:'send',threadId:id,operationId:operation\.current\.id,text/)
  assert.match(client,/result\.saved!==true/)
  assert.match(client,/safeMessages\(detail\.messages\)/)
  assert.match(client,/role="status"/)
  assert.match(client,/mode==='guest'/)
  assert.match(client,/mode==='verify'/)
  assert.match(client,/Never route another practitioner's question to Andrey/)
  assert.match(client,/The message is already saved/)
  assert.doesNotMatch(client,/exampleMessages|sampleReply|fakeChat|demoThread/)
})

test('The consultation CTA routes to an existing published service or a practitioner service listing',()=>{
  assert.match(client,/data-human-specialist-book/)
  assert.match(client,/href=\{bookingHref\}/)
  assert.match(page,/services\/imagery-therapy/)
  assert.match(page,/getPublicServiceDetailHref\(locale,slug,service\.slug\)/)
  assert.match(page,/practitioner-services/)
  assert.match(css,/\.book\{[^}]*min-height:58px/)
})
