import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
const service=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
const ID='550e8400-e29b-41d4-a716-446655440000'
test('only combined items are exposed; every authenticated material read excludes staging',()=>{
  assert.match(service,/combine_batch_id=coalesce\(\$5,combine_batch_id\)/)
  assert.match(service,/combine_batch_id is null/)
  assert.ok((service.match(/combine_batch_id is null/g)||[]).length>=6)
  assert.match(service,/await deleteTemporaryAudioParts\(config,batch\.batchId,storage\)/)
})
test('inactive or expired batch cleanup never touches a live collecting batch',async()=>{
  const found=service.match(/async function cleanupInactiveAudioBatch\([\s\S]*?\n}\n\s*async function telegramAudioBytes/)
  assert.ok(found)
  let state=null,purges=0
  const cleanup=new Function('ownerTransaction','PRACTITIONER_ID','deleteTemporaryAudioParts',
    found[0].replace(/\n\s*async function telegramAudioBytes$/,'')+'\nreturn cleanupInactiveAudioBatch')(
    async(_config,fn)=>fn({query:async()=>({rows:state?[state]:[]})}),'owner',
    async()=>{purges++})
  const storage={}
  const later=new Date(Date.now()+120000).toISOString()
  state={batch_id:ID,status:'collecting',expires_at:later}
  assert.equal(await cleanup({},ID,storage),false)
  state.status='building'
  assert.equal(await cleanup({},ID,storage),false)
  assert.equal(purges,0,'no removal during active work')
  state.status='cancelled'
  assert.equal(await cleanup({},ID,storage),true)
  state={batch_id:ID,status:'collecting',expires_at:'2020-01-01T00:00:00Z'}
  assert.equal(await cleanup({},ID,storage),true)
  state={batch_id:'old-replaced-id',status:'collecting',expires_at:later}
  assert.equal(await cleanup({},ID,storage),true)
  assert.equal(purges,3)
})
test('part deletion uses batch scoped and in-flight safe guards',async()=>{
  const found=service.match(/async function deleteTemporaryAudioParts\([\s\S]*?\n}\n\/\/ Replaced\/cancelled/)
  assert.ok(found)
  let rows=[],removed=[],sql=[]
  const cleanup=new Function('ownerTransaction','PRACTITIONER_ID','failure',
    found[0].replace(/\n\/\/ Replaced\/cancelled$/,'')+'\nreturn deleteTemporaryAudioParts')(
    async(_cfg,fn)=>fn({query:async(q,args)=>{
      sql.push([q,args])
      return /select id,storage_path/.test(q)?{rows}:{rowCount:1}
    }}),
    'owner',code=>{throw Error(code)})
  const storage={remove:async paths=>{removed.push(paths);return {error:null}}}
  await cleanup({},ID,storage)
  assert.equal(removed.length,0)
  assert.equal(sql.length,1)
  sql=[];rows=[{id:ID,storage_path:'telegram-inbox/'+ID+'.ogg'}]
  await cleanup({},ID,storage)
  assert.deepEqual(removed,[['telegram-inbox/'+ID+'.ogg']])
  assert.match(sql[0][0],/status<>'processing'/)
  assert.match(sql[1][0],/^update app_private\.telegram_owner_audio/)
  assert.match(sql[1][0],/status='failed',storage_path=null,completed_at=null,combine_batch_id=null/)
  assert.match(sql[1][0],/OWNER_AUDIO_TEMP_CLEANED/)
  assert.doesNotMatch(sql[1][0],/delete from app_private/)
  assert.match(sql[1][0],/id=any\(\$3::uuid\[\]\)/)
  assert.deepEqual(sql[1][1][2],[ID])
})
test('finish waits for ALL older staged uploads, including ready-before-append',()=>{
  assert.match(service,/not exists \(select 1 from jsonb_array_elements\(\$4::jsonb\)/)
  assert.match(service,/part->>'id'=a\.id::text/)
  assert.match(service,/JSON\.stringify\(items\)/)
  assert.match(service,/obsoleteBatchId:previous\?\.status==='building'\?null:previous\?\.batch_id\|\|null/)
  assert.match(service,/if\(state\.obsoleteBatchId\)/)
  assert.match(service,/if\(combine\.state==='inactive'\)/)
  assert.match(service,/await deleteTemporaryAudioParts\(config,row\.batch_id,storage\)/)
})

test('late Telegram retries after final /done cannot create individual materials',async()=>{
  const source=service.match(/async function claimAudio\([\s\S]*?\n}\nasync function markAudio/)
  assert.ok(source,'read the actual owner-only audio claim implementation')
  let queries=0
  const claim=new Function('ownerTransaction','PRACTITIONER_ID',
    source[0].replace(/\nasync function markAudio$/,'')+'\nreturn claimAudio')(
    async(_cfg,fn)=>fn({query:async()=>{
      queries++
      if(queries>1)throw Error('LATE_PART_MUST_NOT_REACH_UPLOAD')
      return {rows:[{status:'ready',started_update_id:100,last_command_update_id:200}]}
    }}),'owner'
  )
  assert.deepEqual(await claim({}, {updateId:151}),{claimed:false,reason:'batch_finished'})
  assert.equal(queries,1,'no part row is inserted or reimported')
  assert.match(service,/if\(ignoredFinished\)return \{claimed:false,reason:'batch_finished'\}/)
})
