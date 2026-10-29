import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

// Execute the actual isolated cut state machine with capability mocks. Do not
// import the server-only service or its DB/provider/media dependencies.
const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8')
const begin=service.indexOf('async function cutVideo(')
const end=service.indexOf('\nasync function reservePublish(',begin)
assert.ok(begin>=0&&end>begin,'exact cut state-machine boundary exists')
const rendererImport="const {default:ffmpegPath}=await import('ffmpeg-static')"
const body=service.slice(begin,end)
assert.equal(body.split(rendererImport).length,2,'only renderer loader is substituted')
const executableBody=body.replace(rendererImport,'const ffmpegPath="synthetic-renderer"')
const job='b6e8526e-c251-4dd5-a9ca-2886c430f912'
const cut='cbdfae70-641d-4ffd-8a7f-9ccc35a3d1ea'
const original='telegram-slides/'+job+'.mp4'
const next='telegram-slides/'+job+'-cut-'+cut+'.mp4'
const prior='telegram-slides/'+job+'-cut-8365ca1b-4d0a-4db0-a178-9fda35ab494e.mp4'

async function scenario(options={}){
 const files=new Set([original,...(options.prior?[prior]:[])])
 const removed=[],queries=[],messages=[],previews=[]
 let row={job_id:job,state:'trimming',storage_path:options.prior?prior:original}
 let candidateWriteAttempts=0
 const storage={
   async download(path){assert.equal(path,original);return {data:{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer}}},
   async upload(path,_bytes,settings){
     assert.equal(path,next);assert.equal(settings.upsert,false)
     files.add(path)
     if(options.uploadReject)throw Error('storage acknowledgement lost')
     return {error:options.uploadError?Error('storage collision or uncertain write'):null}
   },
   async remove(paths){removed.push(...paths);if(options.removeReject)throw Error('remove failed');for(const path of paths)files.delete(path);return {error:null}}
 }
 const db={async query(sql,args){
   queries.push(sql)
   assert.equal(args[0],'synthetic-owner')
   assert.equal(args[1],job)
   if(sql.includes('storage_path=$3')){
     candidateWriteAttempts++
     if(options.concurrentChange){row={job_id:'other-job',state:'preview',storage_path:'other-path'};return {rowCount:0}}
     if(!options.rejectBeforeCommit)row={job_id:job,state:'preview',storage_path:args[2]}
     if(options.commitError||options.rejectBeforeCommit)throw Error('database acknowledgement lost')
     return {rowCount:1}
   }
   if(sql.startsWith('select storage_path')){
     if(options.readback==='reject')throw Error('readback unavailable')
     if(options.readback==='null')return {rows:[]}
     if(options.readback==='incomplete')return {rows:[{}]}
     if(options.readback==='different')return {rows:[{storage_path:prior}]}
     return {rows:[row]}
   }
   if(sql.includes("set state='preview',error_code=")){
     if(options.recoveryReject)throw Error('recovery unavailable')
     if(row.job_id===job&&row.state==='trimming')row.state='preview'
     return {rowCount:row.job_id===job?1:0}
   }
   throw Error('unexpected query')
 }}
 const context=vm.createContext({Buffer,Blob,Error,
   randomUUID:()=>cut,PRACTITIONER_ID:'synthetic-owner',
   storageClient:async()=>storage,dbVideo:async(_config,fn)=>fn(db),
   resolveOwnerVideoFfmpegPath:async()=> 'synthetic-renderer',
   trimOwnerTelegramVideo:async(bytes,args)=>{assert.equal(bytes.length,4);assert.equal(args.startSeconds,75);return Buffer.from('mock MP4 only')},
   fail:code=>{throw Error(code)},
   sendOwnerPreview:async(...args)=>{previews.push(args);if(options.deliveryReject)throw Error('delivery unavailable')},
   markPreviewDelivery:async()=>{},
   ownerMessage:async(_owner,text)=>{messages.push(text)}
 })
 const execute=vm.runInContext('('+executableBody+')',context)
 await execute({}, {jobId:job,start:75,originalPath:original,originalBytes:4,oldPath:options.prior?prior:original}, {}, ()=>{throw Error('no network capability')})
 return {files,removed,queries,messages,previews,row,candidateWriteAttempts}
}

for(const readback of ['current','reject','null','incomplete','different']){
 test('accepted cut plus lost DB acknowledgement preserves candidate: '+readback,async()=>{
   const result=await scenario({commitError:true,readback,recoveryReject:true})
   assert.equal(result.row.storage_path,next)
   assert.ok(result.files.has(next));assert.ok(result.files.has(original))
   assert.deepEqual(result.removed,[])
   assert.equal(result.previews.length,0)
   assert.equal(result.candidateWriteAttempts,1)
   assert.equal(result.messages.length,1)
   assert.match(result.messages[0],/Не удалось подтвердить результат обрезки/)
   assert.match(result.messages[0],/черновик мог обновиться/)
   assert.match(result.messages[0],/просмотри актуальный черновик перед повторной обрезкой/)
   assert.doesNotMatch(result.messages[0],/не изменилось|ничего не удалено|не было удалено/)
 })
}
test('uncommitted candidate is conservatively retained, not assumed orphaned',async()=>{
 const result=await scenario({rejectBeforeCommit:true,readback:'different'})
 assert.equal(result.row.storage_path,original)
 assert.ok(result.files.has(next));assert.deepEqual(result.removed,[])
})
test('concurrent job replacement cannot authorize deletion',async()=>{
 const result=await scenario({concurrentChange:true,readback:'null'})
 assert.equal(result.row.job_id,'other-job');assert.ok(result.files.has(next))
 assert.deepEqual(result.removed,[])
})
for(const option of ['uploadError','uploadReject']){
 test('ambiguous storage write/collision preserves object: '+option,async()=>{
   const result=await scenario({[option]:true,readback:'null'})
   assert.equal(result.candidateWriteAttempts,0)
   assert.ok(result.files.has(next));assert.deepEqual(result.removed,[])
 })
}
test('confirmed replacement retains current cut and cleans only known superseded same-job cut',async()=>{
 const result=await scenario({prior:true})
 assert.equal(result.row.storage_path,next);assert.ok(result.files.has(next))
 assert.ok(result.files.has(original));assert.ok(!result.files.has(prior))
 assert.deepEqual(result.removed,[prior]);assert.equal(result.previews.length,1)
})
test('superseded-cut cleanup failure never deletes accepted current cut',async()=>{
 const result=await scenario({prior:true,removeReject:true})
 assert.ok(result.files.has(next));assert.ok(result.files.has(original))
 assert.ok(result.files.has(prior));assert.deepEqual(result.removed,[prior])
})
test('preview delivery failure preserves accepted cut for retry',async()=>{
 const result=await scenario({deliveryReject:true})
 assert.ok(result.files.has(next));assert.equal(result.row.storage_path,next)
 assert.deepEqual(result.removed,[])
})
