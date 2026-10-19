import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {validateProfile} from '../lib/practitioners/contracts.js'

const v={title:'Short introduction',description:'Overview of the practice',locale:'en',url:'https://youtu.be/DX9zJhDvIWY'}
const profile=videoMaterials=>validateProfile({displayName:'Synthetic author',languages:['en'],formats:['online'],areas:['personal_development'],videoMaterials})

test('practitioner video materials accept only embeddable public YouTube and Vimeo links',()=>{
 const valid=profile([v,{title:'Aprender',description:'',locale:'es',url:'https://vimeo.com/12345678'}]).videoMaterials
 assert.deepEqual(valid,[{...v,url:'https://www.youtube.com/watch?v=DX9zJhDvIWY'},
  {title:'Aprender',description:'',locale:'es',url:'https://vimeo.com/12345678'}])
 assert.deepEqual(profile(undefined).videoMaterials,[])
 for(const url of [
  'http://youtu.be/DX9zJhDvIWY','https://drive.google.com/file/d/something',
  'https://youtube.com.attacker.org/watch?v=DX9zJhDvIWY',
  'https://www.youtube.com/watch?v=unknown','javascript:alert(1)',
  'https://youtu.be/DX9zJhDvIWY#timestamp',
  'https://vimeo.com/12345',
 ]){
  assert.throws(()=>profile([{...v,url}]),{code:'INVALID_PRESENTATION_VIDEO'})
 }
})
test('material record validation enforces title, locale, duplicates, bounds and private-field safety',()=>{
 assert.throws(()=>profile([{...v,locale:'fr'}]),{code:'INVALID_VIDEO_MATERIAL'})
 assert.throws(()=>profile([{...v,title:''}]),{code:'INVALID_VIDEO_MATERIAL'})
 assert.throws(()=>profile([v,{...v,url:'https://www.youtube.com/watch?v=DX9zJhDvIWY'}]),{code:'DUPLICATE_VIDEO_MATERIAL'})
 assert.throws(()=>profile(Array(13).fill(v)),{code:'INVALID_LIST'})
 assert.throws(()=>profile([{...v,clientId:'private'}]),{code:'UNKNOWN_FIELD'})
})
test('iPhone YouTube share links are accepted and stripped of tracking parameters',()=>{
 const saved=profile([{title:'Как принимать препараты',description:'',locale:'ru',
  url:'https://youtu.be/24-RuhV-EV4?si=pJ-49example'}]).videoMaterials
 assert.deepEqual(saved,[{title:'Как принимать препараты',description:'',locale:'ru',
  url:'https://www.youtube.com/watch?v=24-RuhV-EV4'}])
})

test('material editor saves each action to the server before confirming success',async()=>{
 const [editor,workspace,css]=await Promise.all([
  'components/app/practice-materials.jsx',
  'components/app/practice-workspace.jsx',
  'components/app/practice-materials.module.css',
 ].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')))
 assert.match(editor,/normalizeVideoPresentation/)
 assert.match(editor,/await onSaveVideos\(next\)/)
 assert.ok(editor.indexOf('await onSaveVideos(next)')<editor.indexOf('setVideos(next)'))
 assert.match(editor,/if\(await persist\(next,t\.saved\)\)/)
 assert.match(editor,/if\(await persist\(next,t\.removed\)\)/)
 assert.match(editor,/role="alert"/)
 assert.match(editor,/role="status"/)
 assert.doesNotMatch(editor,/Add to list|Добавить в список/)
 assert.doesNotMatch(editor,/onClick=\{\(\)=>onSaveVideos\(videos\)\}/)
 assert.match(workspace,/key=\{p\?\.id\|\|'materials'\}/)
 assert.match(workspace,/videoMaterials:videos\},expectedRevision:p\.revision\}\),\{rethrow:true\}/)
 assert.match(css,/:global\(\.hh-app\) \.shell \.primary/)
})

test('videos share profile editorial review; public page uses only approved author materials',async()=>{
 const [contracts,repo,publicPage,cabinet,gallery,articlesRepo,articleEditor]=await Promise.all([
  'lib/practitioners/contracts.js','lib/practitioners/repository.js','app/[locale]/masters/[slug]/page.tsx',
  'components/app/practice-workspace.jsx','components/practitioner-video-gallery.tsx',
  'lib/practitioners/article-repository.js','components/app/practitioner-articles.jsx',
 ].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')))
 assert.match(contracts,/videoMaterials:validateVideoMaterials/)
 assert.match(repo,/public_profile=\$2/)
 assert.match(repo,/draft_profile=\$2/)
 assert.match(publicPage,/profile\.videoMaterials/)
 assert.match(publicPage,/PractitionerVideoGallery/)
 assert.match(publicPage,/publicByPractitioner\((?:p|practitioner)\.slug\)/)
 assert.match(articlesRepo,/a\.published->>'locale' in \('en','ru','es'\)/)
 assert.match(articlesRepo,/publicSql/)
 assert.match(cabinet,/onSaveVideos/)
 assert.match(cabinet,/onSubmitVideos/)
 assert.match(cabinet,/PracticeMaterials/)
 assert.match(gallery,/youtube-nocookie\.com/)
 assert.match(gallery,/onClick=\{\(\)=>setPlaying/)
 assert.doesNotMatch(gallery,/autoPlay|autoplay=1/)
 assert.match(articleEditor,/Submit for review/)
 assert.doesNotMatch(publicPage,/dangerouslySetInnerHTML/)
})
