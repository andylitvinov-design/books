
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { normalizeClientPlan, normalizeDraft, clientPayload, emptySessionDraft } from '../lib/clients/delivery-model.js'
import { parseReportMaterialPlacements, stageReportMaterials } from '../lib/consultations/report-material-staging.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const [video,audio,image,outsider]=Array.from({length:4},()=>randomUUID())
const selected=[audio,video,image]
const materials=[
 {id:audio,kind:'audio',title:'Breathing practice',description:'',mime:'audio/mpeg'},
 {id:video,kind:'video',title:'Optional lesson',description:'',mime:'video/mp4'},
 {id:image,kind:'image',title:'Image',description:'',mime:'image/jpeg'},
]
test('ordered per-report video and audio placements survive a private publication projection',()=>{
 const plan=normalizeClientPlan({materialIds:selected,materials,materialPlacements:{[video]:'opening',[audio]:'closing'}})
 const published=clientPayload(normalizeDraft({...emptySessionDraft(),plan}))
 assert.deepEqual(published.plan.materialIds,selected)
 assert.deepEqual(published.plan.materials.map(x=>x.id),selected)
 assert.deepEqual(published.plan.materialPlacements,{[video]:'opening',[audio]:'closing'})
 assert.equal(published.media.length,0)
 assert.deepEqual(normalizeClientPlan().resources,[])
})
test('only selected video, audio and YouTube can be at opening or closing',()=>{
 for(const bad of [
  {[image]:'opening'}, {[video]:'side'}, {[video]:'materials'},
  {[outsider]:'closing'}, {'../../file':'opening'},
 ])assert.throws(()=>normalizeClientPlan({materialIds:selected,materials,materialPlacements:bad}),/INVALID_SESSION_MATERIALS/)
 assert.throws(()=>normalizeClientPlan({materialIds:selected,materialPlacements:[]}),/INVALID_SESSION_MATERIALS/)
 for(const raw of ['bad-json','[]',JSON.stringify({[outsider]:'opening'}),
  JSON.stringify({[video]:'top'})])
   assert.throws(()=>parseReportMaterialPlacements(raw,selected),/INVALID_SESSION_MATERIALS/)
 assert.deepEqual(parseReportMaterialPlacements('',selected),{})
 assert.deepEqual(parseReportMaterialPlacements(JSON.stringify({[video]:'opening'}),selected),{[video]:'opening'})
})
test('new consultation stages chosen tracks without publishing or losing personal media',async()=>{
 const report={id:randomUUID(),clientId:randomUUID()}
 let saved=false
 const result=await stageReportMaterials({
  config:{},store:{},report,materialIds:selected,materialPlacements:{[video]:'opening'},
 },{
  createSession:async()=>({id:randomUUID()}),
  getSession:async()=>({draftRevision:2,draft:{reportDocumentId:report.id,
   title:'Private report',summary:'Notes',media:[{assetId:randomUUID()}],
   plan:{focus:'Existing plan',resources:[]}}}),
  saveDraft:async (_c,_s,_client,_session,{expectedRevision,draft})=>{
   saved=true
   assert.equal(expectedRevision,2)
   assert.equal(draft.media.length,1)
   assert.equal(draft.plan.focus,'Existing plan')
   assert.deepEqual(draft.plan.materialIds,selected)
   assert.deepEqual(draft.plan.materialPlacements,{[video]:'opening'})
  },
 })
 assert.ok(saved)
 assert.equal(result.status,'draft')
})
test('both protected full report editors have add, reorder, remove and location controls',()=>{
 const picker=read('components/session-material-picker.jsx')
 const fresh=read('components/new-report-materials.jsx')
 const edit=read('components/report-video-materials-editor.jsx')
 const studio=read('components/admin-session-studio.jsx')
 const client=read('components/client-session-page.jsx')
 const actions=read('app/admin/consultations/actions.js')
 for(const choice of ['opening','materials','closing'])assert.ok(picker.includes('value="'+choice+'"'))
 for(const code of ['function toggle(id,enabled)','function move(index,delta)','Remove from report:'])
   assert.ok(picker.includes(code))
 assert.match(fresh,/name="materialPlacementsJson"/)
 assert.match(edit,/removePersonalTrack/)
 assert.match(edit,/materialPlacements:placements/)
 assert.match(studio,/materialPlacements:placements/)
 assert.match(actions,/parseReportMaterialPlacements/)
 assert.match(client,/id="session-opening-tracks"/)
 assert.match(client,/id="session-closing-tracks"/)
 assert.match(client,/inlineMaterials\.map/)
 assert.ok(client.indexOf('id="session-opening-tracks"')<client.indexOf('id="session-video"'))
 assert.ok(client.indexOf('id="session-closing-tracks"')<client.indexOf('<footer className={styles.clientFooter}>'))
 assert.doesNotMatch(client,/hasHomeopathyRecommendation&&sharedGuideReady/)
})
test('client preview renders approved media through private assets; changes require explicit publish',()=>{
 const editor=read('components/report-video-materials-editor.jsx')
 const viewer=read('components/client-session-page.jsx')
 const server=read('lib/clients/session-delivery-service.js')
 assert.match(editor,/expectedRevision:owner\.draftRevision/)
 assert.doesNotMatch(editor,/action:'publish'|action:"publish"/)
 assert.match(viewer,/assetBase\+encodeURIComponent\(item\.id\)/)
 assert.match(server,/selectedMaterialSnapshots\(db,draft\.plan\.materialIds\)/)
 assert.match(server,/draft\.plan=normalizeClientPlan\(draft\.plan\)/)
})
