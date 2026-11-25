import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const library=read('lib/clients/material-library.js')
const storage=read('lib/clients/session-delivery-storage.js')
const ready=library.slice(library.indexOf('export async function getReadyMaterial('),library.indexOf('export async function streamReadyMaterial(')).replace('export ','')
const stream=storage.slice(storage.indexOf('export async function privateMediaObjectStream('),storage.indexOf('// Private catalog')).replace('export ','')
const ID='d7a9c2de-667e-43c2-9e16-134bbf000001'
const row={id:ID,kind:'video',mime:'video/mp4',bytes:'1024',storage_provider:'r2',object_key:'synthetic.mp4'}
class AppError extends Error{}
async function load(value){
 const transaction=async(config,actor,callback,options)=>{
  assert.equal(actor,null);assert.deepEqual(options,{server:true})
  return callback({query:async(sql,params)=>{assert.match(sql,/where id=\$1 and status='ready'/);assert.deepEqual(params,[ID]);return {rows:[value]}}})
 }
 return new Function('transaction','validUuid','invalid',ready+'\nreturn getReadyMaterial')(transaction,id=>id===ID,()=>{throw new AppError('MATERIAL_UNAVAILABLE')})({},ID)
}
async function run(method,range,headers,status=200){
 const asset=await load(row)
 const fetch=async(url,options)=>{
  assert.equal(url.href,'https://storage.example.invalid/object');assert.equal(options.method,method)
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store')
  return new Response(method==='HEAD'?null:new Uint8Array(status===206?128:1024),{status,headers})
 }
 const fn=new Function('AppError','createVideoReadUrl','videoObjectOrigin','fetch',stream+'\nreturn privateMediaObjectStream')(AppError,()=> 'https://storage.example.invalid/object',()=> 'https://storage.example.invalid',fetch)
 return fn({},asset,new Request('https://site.example.invalid/media',{method,headers:range?{range}:{}}))
}
test('PostgreSQL bigint string becomes exact numeric length without modifying source row',async()=>{
 assert.equal((await load(row)).bytes,1024);assert.equal(row.bytes,'1024')
 assert.equal((await load({...row,bytes:1024})).bytes,1024)
 for(const bytes of [null,undefined,'','0',0,-1,'-1','1.5',1.5,' 1024','1e3','01',true,{},'200000001',200000001,'9007199254740993',Infinity,NaN])
  await assert.rejects(load({...row,bytes}),/MATERIAL_UNAVAILABLE/)
 assert.equal((await load({...row,bytes:'200000000'})).bytes,200000000)
})
test('actual private stream accepts normalized GET HEAD and exact 206 range',async()=>{
 for(const method of ['GET','HEAD']){const response=await run(method,null,{'content-length':'1024'});assert.equal(response.status,200);assert.equal(response.headers.get('content-length'),'1024')}
 const response=await run('GET','bytes=0-127',{'content-length':'128','content-range':'bytes 0-127/1024'},206)
 assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 0-127/1024')
})
test('normalization does not weaken exact upstream length or range total rejection',async()=>{
 for(const method of ['GET','HEAD'])await assert.rejects(run(method,null,{'content-length':'1023'}),/MEDIA_STORAGE_UNAVAILABLE/)
 await assert.rejects(run('GET','bytes=0-127',{'content-length':'128','content-range':'bytes 0-127/1023'},206),/MEDIA_STORAGE_UNAVAILABLE/)
 await assert.rejects(run('GET','bytes=0-127',{'content-length':'127','content-range':'bytes 0-127/1024'},206),/MEDIA_STORAGE_UNAVAILABLE/)
})
