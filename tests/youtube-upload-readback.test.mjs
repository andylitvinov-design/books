import test from 'node:test'
import assert from 'node:assert/strict'
import {readUploadedDetails,readUploadedVisibility} from '../lib/youtube/browser-upload.js'
import {readFileSync} from 'node:fs'
import {completeYoutubeUpload,hasUnarchivedCompletedUpload,retainUploadEntry,uploadNeedsRecovery} from '../lib/youtube/upload-completion.mjs'

const ID='Y4K4piEwwA8'
const CHANNEL='UCjWq6NHZTQkUr3bC3WbXXcw'

test('YouTube video readback returns exact video ID, owner channel and actual privacy', async () => {
  const original = globalThis.fetch
  let requested = ''
  globalThis.fetch = async (url,options) => {
    requested = url
    assert.equal(options.headers.Authorization,'Bearer test-token')
    return {ok:true,json:async () => ({items:[{id:ID, snippet:{channelId:CHANNEL}, status:{privacyStatus:'unlisted'}}]})}
  }
  try {
    const result = await readUploadedDetails(ID,'test-token')
    assert.deepEqual(result,{privacyStatus:'unlisted',channelId:CHANNEL})
    assert.match(requested,/part=snippet,status/)
    assert.equal(await readUploadedVisibility(ID,'test-token'),'unlisted')
  } finally {globalThis.fetch=original}
})

test('readback exposes wrong-channel placement and actual Private status without masking them', async () => {
  const original=globalThis.fetch
  globalThis.fetch=async () => ({ok:true,json:async () => ({items:[{id:ID,
    snippet:{channelId:'UCaaaaaaaaaaaaaaaaaaaaaa'},status:{privacyStatus:'private'}}]})})
  try {
    const result=await readUploadedDetails(ID,'token')
    assert.equal(result.privacyStatus,'private')
    assert.notEqual(result.channelId,CHANNEL)
  } finally {globalThis.fetch=original}
})

test('missing video, malformed channel, network errors and failed API response fail as unknown', async () => {
  const original=globalThis.fetch
  try {
    globalThis.fetch=async () => ({ok:true,json:async () => ({items:[]})})
    assert.equal(await readUploadedDetails(ID,'token'),null)
    globalThis.fetch=async () => ({ok:true,json:async () => ({items:[{id:ID,
      snippet:{channelId:'bad'}, status:{privacyStatus:'unknown'}}]})})
    assert.deepEqual(await readUploadedDetails(ID,'token'),{privacyStatus:null,channelId:null})
    globalThis.fetch=async () => {throw new Error('network')}
    assert.equal(await readUploadedDetails(ID,'token'),null)
    globalThis.fetch=async () => ({ok:false})
    assert.equal(await readUploadedVisibility(ID,'token'),null)
  } finally {globalThis.fetch=original}
})

for (const [label,details,error] of [
  ['unavailable readback',null,'readback_unverified'],
  ['missing channel',{channelId:null,privacyStatus:'unlisted'},'readback_unverified'],
  ['unknown privacy',{channelId:CHANNEL,privacyStatus:null},'readback_unverified'],
  ['wrong channel',{channelId:'UCaaaaaaaaaaaaaaaaaaaaaa',privacyStatus:'unlisted'},'wrong_channel'],
  ['Private',{channelId:CHANNEL,privacyStatus:'private'},'unexpected_visibility'],
  ['Public',{channelId:CHANNEL,privacyStatus:'public'},'unexpected_visibility'],
]) {
  test(label+' keeps the existing video ID, stops completion, and never archives an unverified result', async () => {
    const entry={id:'one',state:'sending',saved:false}
    let saves=0
    await assert.rejects(completeYoutubeUpload({
      videoId:ID,channelId:CHANNEL,
      readDetails:async () => {
        assert.equal(entry.videoId,ID)
        assert.equal(entry.state,'verifying')
        return details
      },
      update:partial => Object.assign(entry,partial),
      save:async () => {saves++;return true},
    }),new RegExp(error))
    assert.equal(entry.videoId,ID)
    assert.equal(entry.state,'failed')
    assert.equal(entry.verificationError,error)
    assert.equal(saves,0)
    assert.equal(uploadNeedsRecovery(entry),true)
    assert.equal(retainUploadEntry(entry),true)
  })
}

test('verified channel and Unlisted are archived with the actual readback identity', async () => {
  const entry={id:'one',state:'sending',saved:false}
  const details={channelId:CHANNEL,privacyStatus:'unlisted'}
  await completeYoutubeUpload({videoId:ID,channelId:CHANNEL,readDetails:async () => details,
    update:partial => Object.assign(entry,partial),
    save:async actual => {assert.equal(actual,details);entry.saved=true;return true},
  })
  assert.equal(entry.state,'done')
  assert.equal(uploadNeedsRecovery(entry),false)
  assert.equal(retainUploadEntry(entry),false)
})

test('archive failure keeps the completed video in the recoverable queue', async () => {
  const entry={id:'one',state:'sending',saved:false}
  await assert.rejects(completeYoutubeUpload({videoId:ID,channelId:CHANNEL,
    readDetails:async () => ({channelId:CHANNEL,privacyStatus:'unlisted'}),
    update:partial => Object.assign(entry,partial),save:async () => false,
  }),/history_unavailable/)
  assert.equal(entry.state,'done')
  assert.equal(entry.saved,false)
  assert.equal(hasUnarchivedCompletedUpload([entry]),true)
  assert.equal(retainUploadEntry(entry),true)
})

// Exercise the real component's orchestration without React/Google/Redis or media traffic.
// These functions contain no JSX. Keeping their actual source avoids a duplicate test state machine.
const componentSource=readFileSync(new URL('../components/youtube-phone-uploader.jsx',import.meta.url),'utf8')
function sourceBetween(start,end) {
  const first=componentSource.indexOf(start)
  const last=componentSource.indexOf(end,first)
  assert.ok(first>=0 && last>first,'component orchestration function is present')
  return componentSource.slice(first,last)
}
function queueHarness({details={channelId:CHANNEL,privacyStatus:'unlisted'},archive=true,interrupt=false}={}) {
  const state={details,archive,interrupt,starts:0,chunks:0,probes:0,saves:0,error:'',history:[]}
  const entriesRef={current:[1,2].map(n => ({id:String(n),file:{name:`qa-${n}.mov`,size:10,type:'video/quicktime'},
    title:`Synthetic QA ${n}`,target:'ru',state:'waiting',saved:false,videoId:null}))}
  const update=(id,partial) => {entriesRef.current=entriesRef.current.map(item=>item.id===id?{...item,...partial}:item)}
  const context={
    completeYoutubeUpload,hasUnarchivedCompletedUpload,retainUploadEntry,uploadNeedsRecovery,
    entriesRef,update,channels:{ru:{id:CHANNEL}},target:'ru',targetRef:{current:'ru'},
    historySync:{current:{revision:0,request:0}},
    connected:{id:CHANNEL,target:'ru'},enabled:true,historyStatus:true,
    active:{current:false},abortRef:{current:null},sessions:{current:new Map()},
    authToken:{current:{value:'synthetic-test-token',expiresAt:Date.now()+3600000}},
    setBusy:()=>{},setError:value=>{state.error=value},setMessage:()=>{},
    setHistory:value=>{state.history=value},setChannels:()=>{},setHistoryStatus:()=>{},
    t:{historyError:'archive failed',more:'recovery required',errors:{session_expired:'expired'}},
    humanError:reason=>typeof reason==='string'?reason:reason.message,
    description:'',synthetic:true,madeForKids:false,uploadMetadata:()=>({}),
    beginUpload:async()=>{state.starts++;return 'synthetic-session-'+state.starts},
    probeUpload:async()=>{state.probes++;return {done:true,videoId:ID}},
    putChunk:async()=>{state.chunks++;if(state.interrupt){state.interrupt=false;throw new Error('network_interrupted')}
      return {done:true,videoId:state.starts===1?ID:'abcdefghijk'}},
    readUploadedDetails:async()=>state.details,
    saveLink:async id=>{state.saves++;update(id,{saved:state.archive});return state.archive},
    getYoutubeUploadStateAction:async()=>({ok:true,history:[],channels:{ru:{id:CHANNEL}}}),
    isVideoFile:()=>true,titleFromFilename:name=>name,
    alter:fn=>{entriesRef.current=fn(entriesRef.current)},AbortController,
  }
  const functions=sourceBetween('  function addFiles(', '  async function saveLink(')
    +sourceBetween('  async function finish(', '  const configured =')
  const methods=new Function(...Object.keys(context),functions+';return {runUploads,refreshHistory,addFiles};')(...Object.values(context))
  return {state,entriesRef,...methods}
}

test('failed readback recovers the same video ID after refresh, without a duplicate upload', async () => {
  const q=queueHarness({details:null})
  await q.runUploads()
  assert.equal(q.state.starts,1)
  assert.equal(q.state.saves,0)
  assert.equal(q.entriesRef.current[0].videoId,ID)
  assert.equal(q.entriesRef.current[0].state,'failed')
  await q.refreshHistory()
  assert.equal(q.state.error,'readback_unverified')
  q.addFiles({target:{files:[{name:'extra.mov'}],value:'selected'}})
  assert.equal(q.entriesRef.current.length,2)
  assert.equal(q.entriesRef.current[0].videoId,ID)
  q.state.details={channelId:CHANNEL,privacyStatus:'unlisted'}
  await q.runUploads()
  assert.equal(q.state.starts,2,'only the second queued file starts a new upload')
  assert.equal(q.state.chunks,2)
  assert.equal(q.state.saves,2)
  assert.ok(q.entriesRef.current.every(item=>item.saved))
})

for(const privacyStatus of ['private','public']) {
  test(privacyStatus+' readback stops the actual multi-file queue', async () => {
    const q=queueHarness({details:{channelId:CHANNEL,privacyStatus}})
    await q.runUploads()
    assert.equal(q.state.starts,1)
    assert.equal(q.state.saves,0)
    assert.equal(q.entriesRef.current[0].privacyStatus,privacyStatus)
    assert.equal(q.entriesRef.current[0].state,'failed')
    assert.equal(q.entriesRef.current[1].state,'waiting')
  })
}

test('Refresh history cannot bypass an unsaved link or discard it through file selection', async () => {
  const q=queueHarness({archive:false})
  await q.runUploads()
  assert.equal(q.state.starts,1)
  assert.equal(q.entriesRef.current[0].state,'done')
  await q.refreshHistory()
  assert.equal(q.state.error,'archive failed')
  await q.runUploads()
  q.addFiles({target:{files:[{name:'extra.mov'}],value:'selected'}})
  assert.equal(q.state.starts,1)
  assert.equal(q.entriesRef.current.length,2)
  assert.equal(q.entriesRef.current[0].videoId,ID)
  assert.equal(q.entriesRef.current[0].saved,false)
})

test('an interrupted final chunk probes the same session and never creates the first video twice', async () => {
  const q=queueHarness({interrupt:true})
  await q.runUploads()
  assert.equal(q.state.starts,1)
  assert.equal(q.entriesRef.current[0].state,'failed')
  await q.runUploads()
  assert.equal(q.state.probes,1)
  assert.equal(q.state.starts,2)
  assert.equal(q.state.saves,2)
})

function deferred() {
  let resolve
  const promise=new Promise(done=>{resolve=done})
  return {promise,resolve}
}
function historyHarness() {
  const state={history:[],error:'',requests:[]}
  const context={
    historySync:{current:{revision:0,request:0}},
    setHistory:change=>{state.history=typeof change==='function'?change(state.history):change},
    setError:value=>{state.error=value},setHistoryStatus:()=>{},setChannels:()=>{},update:()=>{},
    entriesRef:{current:[]},uploadNeedsRecovery,humanError:value=>value,t:{historyError:'archive failed'},
    getYoutubeUploadStateAction:()=>{const request=deferred();state.requests.push(request);return request.promise},
    saveYoutubeUploadHistoryAction:async input=>({ok:true,record:{...input,uploadedAt:'2026-10-16T12:00:00Z'}}),
  }
  const functions=sourceBetween('function mergeHistory(', 'export function YoutubePhoneUploader(')
    +sourceBetween('  async function saveLink(', '  async function finish(')
    +sourceBetween('  async function refreshHistory(', '  const configured =')
  const methods=new Function(...Object.keys(context),functions+';return {saveLink,refreshHistory};')(...Object.values(context))
  return {state,...methods}
}

test('an earlier refresh cannot hide a newly archived link, while a later fresh snapshot remains authoritative', async () => {
  const q=historyHarness()
  const olderRefresh=q.refreshHistory()
  await q.saveLink('one',ID,'unlisted','Synthetic QA','ru',CHANNEL)
  assert.equal(q.state.history[0].videoId,ID)
  q.state.requests[0].resolve({ok:true,history:[],channels:{}})
  await olderRefresh
  assert.equal(q.state.history[0].videoId,ID,'stale refresh must not hide the link after archive success')
  const newerRefresh=q.refreshHistory()
  q.state.requests[1].resolve({ok:true,history:[],channels:{}})
  await newerRefresh
  assert.deepEqual(q.state.history,[],'fresh server snapshots can remove old records; no permanent local merging')
})

test('out-of-order refresh responses apply only the latest requested history snapshot', async () => {
  const q=historyHarness()
  const first=q.refreshHistory()
  const second=q.refreshHistory()
  q.state.requests[1].resolve({ok:true,history:[{videoId:ID}],channels:{}})
  await second
  q.state.requests[0].resolve({ok:true,history:[],channels:{}})
  await first
  assert.equal(q.state.history[0].videoId,ID)
})
