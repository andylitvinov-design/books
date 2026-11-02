import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseSessionYouTubeUrl} from '../lib/clients/youtube-resource.js'
import {reportReusableVideoCandidates} from '../lib/clients/report-video-candidates.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const one='00000000-1111-4111-8111-000000000001',two='00000000-1111-4111-8111-000000000002'
const youtube='https://youtu.be/AbCdEfGhIj0'
const other='https://youtube.com/watch?v=QwErTyUiOp1'

test('an empty client session still has the import tools, before the library picker',()=>{
  const report=read('components/report-video-materials-editor.jsx')
  const session=read('components/admin-session-studio.jsx')
  const importer=read('components/session-save-footer-video.jsx')
  for(const view of [report,session]){
    assert.match(view,/SessionSaveFooterVideo/)
    assert.match(view,/clientId=\{clientId\}/)
    assert.match(view,/session=\{session\}/)
    assert.ok(view.indexOf('<SessionSaveFooterVideo')<view.indexOf('<SessionMaterialPicker'))
  }
  assert.match(importer,/return <section className=\{styles\.ownerMediaImport\}/)
  assert.match(importer,/type="file"/)
  assert.match(importer,/type="url"/)
  assert.match(importer,/action:'intent'/)
  assert.match(importer,/action:'youtube'/)
  assert.match(importer,/reuse-session-video/)
  assert.match(importer,/approved\(\)/)
  assert.doesNotMatch(importer,/kind:'client'/)
  assert.doesNotMatch(importer,/publish-library|action:'publish'/)
  const picker=read('components/session-material-picker.jsx')
  assert.match(picker,/hh-materials-changed/)
})

test('legacy URL-only videos and top/footer YouTube clips can be recovered and deduplicated',()=>{
  const session={draft:{plan:{resources:[
    {title:'Top lesson',kind:'youtube',url:youtube},
    {title:'Old bottom link',url:other,description:'Legacy link'},
  ]}},published:{plan:{resources:[
    {title:'Duplicated lesson',kind:'youtube',placement:'materials',url:'https://youtube.com/watch?v=AbCdEfGhIj0&t=50'},
  ]}}}
  const matches=reportReusableVideoCandidates(session)
  assert.equal(matches.links.length,2)
  assert.equal(matches.links[0].url,parseSessionYouTubeUrl(youtube).url)
  assert.equal(matches.links[1].url,parseSessionYouTubeUrl(other).url)
  assert.equal(matches.videos.length,0)
  assert.deepEqual(reportReusableVideoCandidates(null),{links:[],videos:[]})
  assert.deepEqual(reportReusableVideoCandidates({draft:{plan:{resources:null}}}),{links:[],videos:[]})
})

test('private session videos are eligible only when ready and explicitly supplementary',()=>{
  const asset=(id,kind='video',status='ready',scope='client')=>({
    id,kind,mime:'video/mp4',status,scope,
  })
  const item=(assetId,role='additional',scope='client')=>({assetId,role,scope,title:'Synthetic lesson'})
  const s={
    assets:[asset(one),asset(two)],
    draft:{media:[item(one),item(two,'personal'),item('hidden','hidden'),item('unready')]},
    published:{media:[item(one,'meditation')]},
  }
  const result=reportReusableVideoCandidates(s)
  assert.deepEqual(result.videos,[{id:one,kind:'session',title:'Synthetic lesson'}])
  assert.deepEqual(reportReusableVideoCandidates({
    assets:[asset(one,'video','pending'),asset(two,'image')],
    draft:{media:[item(one),item(two)]},
  }).videos,[])
  assert.deepEqual(reportReusableVideoCandidates({
    assets:[asset(one,'video','ready','practitioner')],
    draft:{media:[item(one)]},
  }).videos,[])
})

test('session media promotion checks exact owner and ready file, with no client metadata copied',()=>{
  const route=read('app/api/admin/materials/route.js')
  const library=read('lib/clients/material-library.js')
  assert.match(route,/ownerMaterialRequest/)
  assert.match(route,/getOwnerSession\(config,store,data\.clientId,data\.sessionId\)/)
  assert.match(route,/approvedForReuse!==true/)
  assert.match(route,/\['additional','meditation'\]/)
  assert.match(route,/asset\?\.kind!=='video'/)
  assert.match(route,/asset\.status!=='ready'/)
  assert.match(library,/legacy_client_id=\$3/)
  assert.match(library,/session_id=\$2/)
  assert.match(library,/scope='client' and asset_kind='video'/)
  assert.match(library,/status='ready'/)
  assert.match(library,/pg_advisory_xact_lock/)
  assert.match(library,/insert into app_private\.practitioner_materials/)
  assert.doesNotMatch(library,/insert into app_private\.practitioner_materials\([^\n]*legacy_client_id/)
})

test('existing YouTube catalog creation remains idempotent and independent of publication',()=>{
  const library=read('lib/clients/material-library.js')
  assert.match(library,/where kind='youtube' and status='ready' and url=\$1/)
  assert.match(library,/if\(existing\)return/)
  const source=read('components/session-save-footer-video.jsx')
  assert.match(source,/window\.confirm/)
  assert.match(source,/window\.prompt/)
  assert.match(source,/hh-materials-changed/)
  assert.doesNotMatch(source,/session\.published\s*=/)
})

test('unsafe non-YouTube links are never accepted as reusable source links',()=>{
  for(const url of [
    'https://drive.google.com/file/d/abc/view',
    'https://private.example/clients/recording.mp4',
    'https://youtu.be.evil.example/AbCdEfGhIj0',
  ])assert.deepEqual(reportReusableVideoCandidates({
    draft:{plan:{resources:[{url,title:'private'}]}},
  }),{links:[],videos:[]})
})
