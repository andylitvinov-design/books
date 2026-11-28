import test from 'node:test'
import assert from 'node:assert/strict'
import {archiveInput,archiveMetadata,isArchiveMp4,archiveBlob,ARCHIVE_BUCKET,ARCHIVE_PATH,ARCHIVE_MAX_BYTES} from '../lib/coaching/caesar-capture-archive.mjs'
const sha='a'.repeat(64),bytes=1024,input={action:'prepare',bytes,sha256:sha}
const blob=new Blob([new Uint8Array([0,0,0,24,102,116,121,112]),new Uint8Array(bytes-8)],{type:'video/mp4'})
const intent={bucket:ARCHIVE_BUCKET,path:ARCHIVE_PATH,token:'fake',publishableKey:'fake',supabaseUrl:'https://abcdefghijklmnopqrst.supabase.co'}
const saved={saved:true,bytes,sha256:sha}
test('fixed one-file contract rejects over-limit and arbitrary path',()=>{assert.deepEqual(archiveInput(input),input);assert.throws(()=>archiveInput({...input,bytes:ARCHIVE_MAX_BYTES+1}));assert.throws(()=>archiveInput({...input,path:'another'}));assert.throws(()=>archiveInput({...input,sha256:'bad'}));assert.equal(archiveMetadata(null),null);assert.deepEqual(archiveMetadata({metadata:{size:bytes,mimetype:'video/mp4'}}),{bytes,mime:'video/mp4'});assert.throws(()=>archiveMetadata({metadata:{size:bytes,mimetype:'video/webm'}}))})
test('container check is actual MP4 header, not extension',async()=>{assert.equal(isArchiveMp4(new Uint8Array(await blob.slice(0,12).arrayBuffer())),true);assert.equal(isArchiveMp4(new Uint8Array(12)),false)})
test('save automatically prepare, upload, verify; no success before checksum',async()=>{const events=[];const r=await archiveBlob(blob,{digest:async()=>sha,request:async b=>{events.push(b.action);return b.action==='prepare'?intent:saved},upload:async()=>events.push('upload')});assert.equal(r.saved,true);assert.deepEqual(events,['prepare','upload','complete'])})
test('lost upload response verifies same bytes; no extra upload',async()=>{let n=0;const r=await archiveBlob(blob,{digest:async()=>sha,request:async b=>b.action==='prepare'?intent:saved,upload:async()=>{n++;throw Error('lost')}});assert.equal(r.saved,true);assert.equal(n,1)})
test('existing verified file does not upload; foreign hash or destination rejected',async()=>{let n=0;const opts={digest:async()=>sha,upload:async()=>n++,request:async()=>saved};await archiveBlob(blob,opts);assert.equal(n,0);await assert.rejects(archiveBlob(blob,{...opts,request:async()=>({...saved,sha256:'b'.repeat(64)})}));await assert.rejects(archiveBlob(blob,{...opts,request:async()=>({...intent,path:'other'})}));assert.equal(n,0)})
test('invalid file never requests storage',async()=>{let n=0;await assert.rejects(archiveBlob(new Blob([new Uint8Array(1024)]),{request:async()=>n++}));assert.equal(n,0)})
