import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {expectedGalleryVideos,assertGallerySnapshot,galleryTopics,gallerySelector,verifyCurrentGallery} from '../scripts/helpers/holistic-gallery-verifier.mjs'
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const manifest = JSON.parse(read('data/academy/psimaster-media.generated.json'))
function evaluate(path,mocks={}) {
 const module={exports:{}}
 runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,
 {module,exports:module.exports,require:id=>{assert.ok(Object.hasOwn(mocks,id));return mocks[id]}})
 return module.exports
}
const english=evaluate('data/academy/english-guided-meditations.ts')
const model=evaluate('data/academy/holistic-support-meditations.ts',{'./english-guided-meditations':english,'./psimaster-media.generated.json':manifest})
function snapshot(videos,topic='all',selectedId=null) {
 const visible=videos.filter(v=>topic==='all'||v.topics.includes(topic));const active=visible.find(v=>v.id===selectedId)??visible[0]
 return {audio:0,iframes:0,topics:galleryTopics,activeTopics:[topic],recordingIds:visible.length>1?visible.map(v=>v.id):[],activeIds:visible.length>1?[active.id]:[],
 title:active.title,href:'https://www.youtube.com/watch?v='+active.id,poster:'https://i.ytimg.com/vi/'+active.id+'/hqdefault.jpg',posters:1,
 documentWidth:320,galleryWidth:300,targets:Array.from({length:6+(visible.length>1?visible.length:0)},()=>({width:100,height:44,x:10}))}
}
for(const locale of ['en','ru','es']) test('independent source-backed gallery oracle '+locale,()=>{
 const actual=JSON.parse(JSON.stringify(model.freeMeditationVideos(locale))).map(({id,title,topics})=>({id,title,topics}))
 const expected=expectedGalleryVideos(locale,manifest);assert.deepEqual(actual,expected)
 for(const topic of galleryTopics)assertGallerySnapshot(snapshot(expected,topic),expected,topic,null,320,locale)
})
test('actual page/gallery retain the selectors used by the UI-only verifier',()=>{
 const page=read('app/[locale]/holistic-support/page.tsx'),gallery=read('components/holistic-meditation-gallery.tsx'),player=read('components/academy-video-player.tsx')
 assert.match(page,/id="meditation-practices"/);assert.match(page,/<HolisticMeditationGallery locale=\{locale\} videos=\{freeMeditationVideos\(locale\)\}/)
 for(const pattern of [/data-holistic-meditation-gallery/,/data-meditation-topic=\{topic\}/,/data-meditation-video-id=\{video\.id\}/,/aria-pressed=\{activeTopic === topic\}/,/aria-pressed=\{activeVideo\.id === video\.id\}/,/<h3 aria-live="polite">\{activeVideo.title\}/,/setActiveTopic\(topic\); setSelectedId\(null\)/])assert.match(gallery,pattern)
 for(const name of ['academy-video-poster','academy-video-direct-link'])assert.ok(player.includes(name))
 assert.doesNotMatch(page,/data-holistic-meditation-screen|id="meditation-audio"|<audio/)
 const script=read('scripts/verify-holistic-master-browser.mjs')
 assert.match(script,/await verifyCurrentGallery\(page, locale, width, label\)/)
 assert.doesNotMatch(script,/audioStage|videoStage|gentle-waves-96s|audio \/ video equal/)
 for(const gate of ['fence.assertNoSideEffects','assertHolisticContextHandoff','assert.deepEqual(errors, []'])assert.ok(script.includes(gate))
})
const mutations={
 'missing source':s=>s.recordingIds.pop(),'wrong locale source':s=>s.recordingIds[0]='HqfixazXqRY','wrong selected title':s=>s.title='wrong',
 'wrong origin':s=>s.href=s.href.replace('www.youtube.com','evil.invalid'),'malformed source query':s=>s.href+='&other=1',
 'wrong poster identity':s=>s.poster=s.poster.replace('/hqdefault.jpg','/mqdefault.jpg'),'unexpected player':s=>s.iframes=1,
 'audio restored':s=>s.audio=1,'duplicate filter':s=>s.topics=[...s.topics,'all'],'lost selection':s=>s.activeIds=[],
 'narrow button':s=>s.targets[0].width=43,'short button':s=>s.targets[0].height=43,'offscreen button':s=>s.targets[0].x=-2,
 'overflow':s=>s.documentWidth=323,'missing poster':s=>s.posters=0,'missing button gate':s=>s.targets.pop(),
}
for(const [name,mutate]of Object.entries(mutations))test('reject '+name,()=>{
 const videos=expectedGalleryVideos('ru',manifest),s=snapshot(videos);mutate(s)
 assert.throws(()=>assertGallerySnapshot(s,videos,'all',null,320,name))
})
test('selection and reset remain exact, stale selected source fails',()=>{
 const videos=expectedGalleryVideos('ru',manifest),last=videos.at(-1).id
 assertGallerySnapshot(snapshot(videos,'all',last),videos,'all',last,320,'selection')
 assert.throws(()=>assertGallerySnapshot(snapshot(videos,'all',last),videos,'all',null,320,'reset'))
})
// Execute production helper's selector/action flow against an in-memory DOM
// contract. This is not native-browser, visual, media or fullscreen acceptance.
for(const locale of ['en','ru','es'])test('executable selector flow without Play '+locale,async()=>{
 let topic='all',selected=null;const videos=expectedGalleryVideos(locale,manifest),events=[]
 const gallery={count:async()=>1,scrollIntoViewIfNeeded:async()=>{},evaluate:async callback=>{
  const s=snapshot(videos,topic,selected)
  const attr=(name,value)=>({getAttribute:k=>{assert.equal(k,name);return value}})
  const map={
   '[data-meditation-topic]':s.topics.map(v=>attr('data-meditation-topic',v)),
   '[data-meditation-topic][aria-pressed="true"]':s.activeTopics.map(v=>attr('data-meditation-topic',v)),
   '[data-meditation-video-id]':s.recordingIds.map(v=>attr('data-meditation-video-id',v)),
   '[data-meditation-video-id][aria-pressed="true"]':s.activeIds.map(v=>attr('data-meditation-video-id',v)),
   'iframe':[],'button.academy-video-poster':[{}],
   'button[data-meditation-topic], button[data-meditation-video-id], button.academy-video-poster':s.targets.map(v=>({getBoundingClientRect:()=>v}))}
  const one={'h3[aria-live="polite"]':{textContent:s.title},'a.academy-video-direct-link':attr('href',s.href),'button.academy-video-poster img':attr('src',s.poster)}
  const node={querySelectorAll:key=>{assert.ok(Object.hasOwn(map,key),key);return map[key]},querySelector:key=>{assert.ok(Object.hasOwn(one,key),key);return one[key]},getBoundingClientRect:()=>({width:s.galleryWidth})}
  return runInNewContext('('+callback.toString()+')(node)',{node,document:{documentElement:{scrollWidth:320},querySelectorAll:key=>{assert.equal(key,'#meditation-practices audio, #meditation-audio, [data-holistic-audio-player]');return []}}})
 },locator:selector=>({tap:async()=>{
  events.push(selector)
  const filter=selector.match(/^\[data-meditation-topic="(all|business|love|energy|health)"\]$/)
  if(filter){topic=filter[1];selected=null;return}
  const recording=selector.match(/^\[data-meditation-video-id="([A-Za-z0-9_-]{11})"\]$/)
  assert.ok(recording,'Only filter/recording selection allowed, never Play');assert.ok(videos.some(v=>v.id===recording[1]));selected=recording[1]
 }})}
 const page={locator:selector=>{assert.equal(selector,gallerySelector);return gallery},setViewportSize:async size=>{assert.equal(size.width,320);assert.ok([568,844].includes(size.height));events.push(size.height)}}
 // Convert cross-realm callback result to ordinary data, as Playwright does.
 const original=gallery.evaluate;gallery.evaluate=async callback=>JSON.parse(JSON.stringify(await original(callback)))
 await verifyCurrentGallery(page,locale,320,'fixture')
 assert.deepEqual(events.slice(-2),[568,844]);assert.equal(topic,'all');assert.equal(selected,null)
 assert.equal(events.length,locale==='ru'?8:7)
})
