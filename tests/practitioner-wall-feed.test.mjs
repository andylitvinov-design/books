import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateArticleDraft} from '../lib/practitioners/article-contracts.js'
import {normalizeWallExternalUrl,normalizeWallMedia,wallPostDraft} from '../lib/practitioners/wall-contracts.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('short text or media-only wall posts reuse protected author moderation',()=>{
 const short=validateArticleDraft({locale:'en',kind:'post',title:'A small update',excerpt:'A small update',body:'Hi friends',media:[]},{complete:true})
 assert.equal(short.kind,'post')
 assert.equal(short.body,'Hi friends')
 const video=validateArticleDraft({locale:'ru',kind:'post',title:'Видео',excerpt:'Видео',body:'',media:[{source:'external',type:'video',url:'https://youtu.be/dQw4w9WgXcQ'}]},{complete:true})
 assert.equal(video.media[0].url,'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 assert.throws(()=>validateArticleDraft({kind:'post',body:'',title:'',media:[]},{complete:true}),{code:'INCOMPLETE_ARTICLE'})
 assert.throws(()=>validateArticleDraft({locale:'en',kind:'article',title:'One',excerpt:'Two',body:'short'},{complete:true}),{code:'INCOMPLETE_ARTICLE'})
})

test('public image, audio, video URLs only; reject local, private and unsigned UUID file claims',()=>{
 const accept=[
  [{source:'external',type:'video',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  [{source:'external',type:'audio',url:'https://cdn.example.org/meditation.mp3'},'https://cdn.example.org/meditation.mp3'],
  [{source:'external',type:'image',url:'https://cdn.example.org/photo.webp'},'https://cdn.example.org/photo.webp'],
 ]
 for(const [source,expected] of accept)assert.equal(normalizeWallMedia([source])[0].url,expected)
 for(const bad of [
  {source:'upload',type:'image',assetId:'e7554230-f856-4d71-ab68-cc9940076273'},
  {source:'external',type:'image',url:'http://example.org/public.jpg'},
  {source:'external',type:'image',url:'https://localhost/private.png'},
  {source:'external',type:'audio',url:'https://127.0.0.1/audio.mp3'},
  {source:'external',type:'image',url:'https://example.org/report.pdf'},
  {source:'external',type:'video',url:'https://evil.example.com/file.txt'},
  {source:'external',type:'image',url:'https://abc:pass@example.org/image.jpg'},
 ])assert.throws(()=>normalizeWallMedia([bad]),{code:'INVALID_WALL_MEDIA'})
 assert.throws(()=>normalizeWallMedia(Array(5).fill(accept[0][0])),{code:'INVALID_WALL_MEDIA'})
 assert.match(normalizeWallExternalUrl('https://cdn.example.org/voice.ogg','audio'),/voice\.ogg/)
 assert.equal(wallPostDraft({body:'Hello\nWorld'}).title,'Hello')
})

test('feed only consumes existing published snapshots, public course catalog, and consented audio',()=>{
 const page=read('app/[locale]/masters/[slug]/page.tsx')
 const repo=read('lib/practitioners/article-repository.js')
 const course=read('lib/practitioners/course-repository.js')
 const wall=read('components/practitioner-public-feed.tsx')
 assert.match(page,/publicByPractitioner\(practitioner\.slug\)/)
 assert.match(page,/createPractitionerCourseRepository\(config\)\.catalog\(\)/)
 assert.match(page,/createDirectMessages\(config\)\.publicAudios\(practitioner\.slug\)/)
 assert.match(page,/<PractitionerPublicFeed/)
 assert.match(repo,/a\.published<>'\{\}'::jsonb/)
 assert.match(course,/c\.status='published'/)
 assert.match(repo,/coalesce\(a\.published->>'kind','article'\)='article'/)
 assert.match(wall,/aria-pressed=\{active===key\}/)
 assert.match(wall,/preload="none"/)
 assert.match(wall,/referrerPolicy="no-referrer"/)
 assert.doesNotMatch(wall,/dangerouslySetInnerHTML/)
})

test('compact composer preserves drafts, uses existing authenticated API and manual review; no silent public publication',()=>{
 const jsx=read('components/app/practitioner-wall-composer.jsx')
 const articles=read('components/app/practitioner-articles.jsx')
 const api=read('app/api/app/[...path]/route.js')
 const publicPage=read('app/[locale]/masters/[slug]/page.tsx')
 assert.match(jsx,/'\/api\/app\/practice\/articles'/)
 assert.match(jsx,/action:'submit'/)
 assert.match(jsx,/source:'external'/)
 assert.match(jsx,/kind:'post'/)
 assert.match(jsx,/submitted\?t\.submitted/)
 assert.match(read('components/practitioner-articles-moderation.jsx'),/Review every linked asset/)
 assert.match(articles,/<PractitionerWallComposer/)
 assert.match(api,/articleRepo\.save\(actor/)
 assert.match(api,/articleRepo\.submit\(actor/)
 assert.match(publicPage,/href="#practitioner-feed"/)
})
