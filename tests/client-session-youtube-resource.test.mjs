import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseSessionYouTubeUrl} from '../lib/clients/youtube-resource.js'
import {normalizeClientPlan,normalizeDraft,clientPayload,guestSessionProjection,emptySessionDraft} from '../lib/clients/delivery-model.js'

const id='AbCdEfGhIj0'
const canonical='https://www.youtube.com/watch?v='+id

test('practitioner can paste regular, short, mobile, Shorts and nocookie YouTube links',()=>{
  for(const link of [
    'https://www.youtube.com/watch?v='+id,
    'https://youtube.com/watch?v='+id+'&t=42s&list=PL123',
    'https://m.youtube.com/watch?v='+id,
    'https://youtu.be/'+id+'?si=someTracking',
    'https://youtube.com/shorts/'+id+'?feature=share',
    'https://www.youtube.com/live/'+id,
    'https://www.youtube-nocookie.com/embed/'+id,
  ]){
    assert.deepEqual(parseSessionYouTubeUrl(link),{id,url:canonical},link)
  }
})

test('reject arbitrary iframes, protocols, credentials, ports and malformed video IDs',()=>{
  for(const link of [
    'https://youtube.com.evil.example/watch?v='+id,
    'https://youtu.be.evil.example/'+id,
    'https://evil.example/embed/'+id,
    'https://youtube.com/playlist?list=PL123',
    'https://youtube.com/watch?v=invalid',
    'https://youtube.com/watch?v='+id+'%2F..',
    'https://youtube.com:8443/watch?v='+id,
    'https://user:pass@youtube.com/watch?v='+id,
    'http://youtu.be/'+id,
    '//youtu.be/'+id,
    'javascript:alert(1)',
    'https://www.youtube-nocookie.com/watch?v='+id,
    '',
  ])assert.equal(parseSessionYouTubeUrl(link),null,link)
})

test('publish stores canonical YouTube educational URL without raw tracking params',()=>{
  const resource={kind:'youtube',title:'General breathing lesson',description:'Approved teaching',
    url:'https://youtu.be/'+id+'?si=long-tracking-token'}
  const normalized=normalizeClientPlan({resources:[resource]})
  assert.deepEqual(normalized.resources,[{
    kind:'youtube',title:resource.title,description:resource.description,url:canonical,
  }])
  const draft=normalizeDraft({...emptySessionDraft(),plan:{resources:[resource]}})
  const published=clientPayload(draft)
  const guest=guestSessionProjection({...published,id:'s',occurredOn:'2026-10-15'})
  assert.equal(guest.plan.resources[0].kind,'youtube')
  assert.equal(guest.plan.resources[0].url,canonical)
})

test('existing generic materials, report text and real private media remain compatible',()=>{
  const older=normalizeClientPlan({resources:[{title:'Homework',description:'',
    url:'https://example.com/handout'}]})
  assert.deepEqual(older.resources,[{title:'Homework',description:'',
    url:'https://example.com/handout'}])
  const draft=normalizeDraft({...emptySessionDraft({title:'Consultation'}),summary:'Signed original',plan:{
    focus:'Next step',resources:[{kind:'youtube',title:'Public teaching',url:canonical,description:''}],
  }})
  assert.equal(draft.summary,'Signed original')
  assert.equal(draft.media.length,0)
  assert.equal(draft.plan.focus,'Next step')
  assert.equal(draft.plan.resources[0].kind,'youtube')
})

test('reject invalid or overly numerous YouTube attachments before draft or publication',()=>{
  for(const bad of [
    {kind:'youtube',title:'',url:canonical},
    {kind:'youtube',title:'x',url:'https://example.com/'+id},
    {kind:'youtube',title:'x',url:'https://youtu.be/invalid'},
    {kind:'video',title:'x',url:canonical},
    {kind:'youtube',title:'x',url:canonical,privateData:'client-identifying'},
  ])assert.throws(()=>normalizeClientPlan({resources:[bad]}))
  assert.throws(()=>normalizeClientPlan({resources:Array.from({length:9},(_,i)=>({
    kind:'youtube',title:'Public '+i,url:canonical,
  }))}))
})

test('YouTube iframe is click-only and restricted to privacy-enhanced origin',()=>{
  const player=readFileSync(new URL('../components/session-youtube-player.jsx',import.meta.url),'utf8')
  assert.match(player,/const \[started,setStarted\]=useState\(false\)/)
  assert.match(player,/started\?/)
  assert.match(player,/onClick=\{\(\)=>setStarted\(true\)\}/)
  assert.match(player,/https:\/\/www\.youtube-nocookie\.com\/embed\//)
  assert.match(player,/referrerPolicy="origin"/)
  assert.match(player,/allowFullScreen/)
  assert.doesNotMatch(player,/i\.ytimg\.com|autoplay=1|youtube\.com\/iframe_api/)
})

test('the same report embeds videos in the guest, cabinet, saved and owner session page',()=>{
  const view=readFileSync(new URL('../components/client-session-page.jsx',import.meta.url),'utf8')
  const editor=readFileSync(new URL('../components/admin-session-studio.jsx',import.meta.url),'utf8')
  assert.match(view,/youtubeResources\.map/)
  assert.match(view,/SessionYouTubePlayer/)
  assert.match(view,/hasFullReport&&<section id="session-report"/)
  assert.match(view,/linkedResources\.map/)
  assert.match(editor,/Add YouTube video/)
  assert.match(editor,/kind:'youtube'/)
  assert.match(editor,/parseSessionYouTubeUrl/)
})

test('session-only CSP permits nocookie embed without widening other private pages',()=>{
  const source=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8')
  assert.match(source,/const sessionEducationEmbed =/)
  assert.match(source,/sessionEducationEmbed \? "frame-src https:\/\/www\.youtube-nocookie\.com"/)
  assert.match(source,/practitionerDraftPreview \? "frame-src blob:" : "frame-src 'none'"/)
  const start=source.indexOf('  const sessionEducationEmbed =')
  const end=source.indexOf('  // Only the practitioner consultation editor',start)
  assert.ok(start>=0&&end>start)
  const allowed=source.slice(start,end)
  assert.equal((allowed.match(/\.test\(pathname\)/g)||[]).length,5)
  assert.equal(allowed.includes('api/admin'),false)
  assert.equal(allowed.includes('youtube-upload'),false)
})

test('quick-add from existing client document uses scoped, revision-checked draft update',()=>{
  const recorder=readFileSync(new URL('../components/session-audio-recorder.jsx',import.meta.url),'utf8')
  const quick=readFileSync(new URL('../components/session-youtube-quick-add.jsx',import.meta.url),'utf8')
  const studio=readFileSync(new URL('../components/admin-session-studio.jsx',import.meta.url),'utf8')
  assert.match(recorder,/SessionYouTubeQuickAdd/)
  assert.match(recorder,/showYouTubeQuickAdd=true/)
  assert.match(studio,/showYouTubeQuickAdd=\{false\}/)
  assert.match(quick,/await ensureSession\(\)/)
  assert.match(quick,/expectedRevision:session\.draftRevision,draft/)
  assert.match(quick,/parseSessionYouTubeUrl\(url\)/)
  assert.match(quick,/resources\.length>=8/)
  assert.match(quick,/SESSION_CHANGED/)
  assert.doesNotMatch(quick,/action:'publish'|youtube\.com\/upload|uploadToSignedUrl/)
})

test('Edit consultation shows the YouTube link control immediately below the mobile upload button',()=>{
  const edit=readFileSync(new URL('../app/admin/consultations/[id]/edit/page.js',import.meta.url),'utf8')
  const recorder=readFileSync(new URL('../components/session-audio-recorder.jsx',import.meta.url),'utf8')
  const quick=readFileSync(new URL('../components/session-youtube-quick-add.jsx',import.meta.url),'utf8')
  assert.ok(edit.includes('<SessionAudioRecorder clientId={consultation.clientId} documentId={consultation.id}'))
  const choose=recorder.indexOf("ru?'Загрузить из телефона'")
  const add=recorder.indexOf('showYouTubeQuickAdd&&<SessionYouTubeQuickAdd',choose)
  const photos=recorder.indexOf('<SessionPhotoUploader',add)
  assert.ok(choose>=0&&add>choose&&photos>add,'YouTube action must be visible above photos')
  const hint=recorder.indexOf("className={styles.photoHint}",add)
  assert.ok(hint>add,'YouTube action belongs above the long MP4 storage explanation')
  assert.match(quick,/Добавить YouTube-видео по ссылке/)
  assert.match(quick,/Сохранить видео в черновик/)
  assert.doesNotMatch(quick,/HH_CLIENT_VIDEO_EXTERNAL_ENABLED|videoStatus/)
})

test('all client videos lead the page before the complete signed HTML report',()=>{
  const view=readFileSync(new URL('../components/client-session-page.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/client-session.module.css',import.meta.url),'utf8')
  const header=view.indexOf('className={styles.clientHeader}')
  const topVideo=view.indexOf('id="session-video"')
  const hero=view.indexOf('className={styles.sessionHero}')
  const fullReport=view.indexOf('id="session-report"')
  const audio=view.indexOf('id="session-message"')
  const photos=view.indexOf('id="session-photos"')
  const pdf=view.indexOf('session-download')
  assert.ok(header>=0&&topVideo>header&&topVideo<hero&&topVideo<fullReport)
  assert.ok(topVideo<audio&&topVideo<photos&&topVideo<pdf)
  assert.match(view,/videoMedia=media\.filter\(item=>item\.kind==='video'\)/)
  assert.match(view,/personalAudio=media\.filter\(item=>item\.kind==='audio'/)
  assert.equal((view.match(/videoMedia\.map\(/g)||[]).length,1)
  assert.equal((view.match(/youtubeResources\.map\(/g)||[]).length,1)
  assert.equal((view.match(/personalAudio\.map\(/g)||[]).length,1)
  assert.doesNotMatch(view,/id="session-youtube"|id="session-guide"|guideMedia\.map|personalMedia\.map/)
  assert.match(css,/\.cabinetSessionPage \.videoFirstSection/)
})

test('session video ordering shares client/guest/Google saved/owner render contract',()=>{
  const view=readFileSync(new URL('../components/client-session-page.jsx',import.meta.url),'utf8')
  assert.match(view,/session=\{session\} selector=\{selector\} mode=\{mode\} locale=\{locale\} savedId=\{savedId\}/)
  assert.match(view,/session\.report&&<section/)
  assert.match(view,/hasFullReport&&<section id="session-report"/)
  assert.match(view,/youtubeResources\.length>0&&<div className=\{styles\.youtubeLessonList\}/)
  assert.match(view,/supplementary=media\.filter\(item=>item\.kind!=='image'&&item\.kind!=='video'/)
  assert.match(view,/hasHomeopathyRecommendation&&sharedGuideReady/)
})

test('owner selects which YouTube lessons go at report end; older links stay above report',()=>{
  const top={kind:'youtube',title:'Existing lesson',url:canonical,description:''}
  const bottom={...top,title:'Materials lesson',placement:'materials'}
  const normalized=normalizeClientPlan({resources:[top,bottom]})
  assert.equal(normalized.resources[0].placement,undefined)
  assert.equal(normalized.resources[1].placement,'materials')
  assert.throws(()=>normalizeClientPlan({resources:[{...top,placement:'private'}]}))
  assert.throws(()=>normalizeClientPlan({resources:[{title:'Other link',url:'https://example.com',placement:'materials'}]}))
})

test('private videos explicitly hidden by the practitioner cannot enter published or guest payloads',()=>{
  const assetId='31af1bc5-2342-4858-8a5e-09c3ffaf0033'
  const draft=normalizeDraft({...emptySessionDraft(),media:[
    {assetId,scope:'client',title:'Private source video',transcript:'',role:'hidden'},
  ]})
  assert.equal(draft.media[0].role,'hidden')
  assert.equal(clientPayload(draft).media.length,0)
  assert.equal(guestSessionProjection({...draft,id:'s',occurredOn:'2026-10-15',media:[{...draft.media[0],kind:'video'}]}).media.length,0)
  assert.equal(clientPayload(normalizeDraft({...draft,media:[{...draft.media[0],role:'additional'}]})).media.length,1)
})

test('final Materials section contains only chosen videos and sits after shared guide',()=>{
  const view=readFileSync(new URL('../components/client-session-page.jsx',import.meta.url),'utf8')
  assert.match(view,/materialsVideos=media\.filter/)
  assert.match(view,/materialsYoutubeResources=/
  assert.match(view,/topYoutubeResources=/
  assert.match(view,/id="session-resources"/)
  assert.match(view,/id="session-materials-title"/)
  assert.ok(view.indexOf('id="session-resources"')>view.indexOf('id="session-granules-guide"'))
  assert.ok(view.indexOf('id="session-resources"')<view.indexOf('<footer className={styles.clientFooter}>'))
  assert.match(view,/materialsYoutubeResources\.map/)
  assert.match(view,/materialsVideos\.map/)
})
