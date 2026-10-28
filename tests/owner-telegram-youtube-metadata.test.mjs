import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ownerVideoMetadataValue,ownerVideoMetadataEditButtons,
 ownerVideoMetadataMenuButtons} from '../lib/practitioners/owner-telegram-video-metadata.mjs'
import {parseOwnerVideoUpdate} from '../lib/practitioners/owner-telegram-video-model.mjs'
import {ownerRuSnippetUpdateBody,ownerRuYoutubeMetadata,
 changeOwnerRuYoutubeMetadata} from '../lib/practitioners/owner-telegram-video-visibility.mjs'
import {VIDEO_RU_CHANNEL_ID} from '../lib/practitioners/owner-telegram-video-model.mjs'

const JOB='b6e8526e-c251-4dd5-a9ca-2886c430f912'
const VIDEO='Yt123456abc'
const TOKEN='test-access-token-is-long-enough'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
function message(text,chat={id:123456,type:'private'}){
 return {update_id:1300,message:{message_id:21,date:Date.now()/1000|0,
   chat,from:{id:123456,is_bot:false},text}}
}
function callback(data){
 return {update_id:1301,callback_query:{id:'callback-12345',data,from:{id:123456,is_bot:false},
   message:{chat:{id:123456,type:'private'},
     from:{is_bot:true,username:'Andydotbot'}}}}
}
const parsed=update=>parseOwnerVideoUpdate(update,{botUsername:'Andydotbot'})
test('owner-only Dot parses title and multiline description without accepting group messages',()=>{
 assert.equal(parsed(message('/video_title Новый заголовок'))?.metadataValue,'Новый заголовок')
 assert.deepEqual(
   Object.keys(parsed(message('/video_description Строка 1\nСтрока 2')))
     .filter(key=>key.startsWith('metadata')).map(key=>parsed(message('/video_description Строка 1\nСтрока 2'))[key]),
   ['description','Строка 1\nСтрока 2'])
 assert.equal(parsed(message('/video_description -'))?.action,'metadata_set')
 assert.equal(parsed(message('/video_title'))?.action,'metadata_help')
 assert.equal(parsed(message('/video_edit'))?.action,'metadata_menu')
 assert.equal(parsed(message('/video_title hello',{id:123456,type:'group'})),null)
 assert.equal(parsed(message('/video_title@wrongbot hello')),null)
 assert.equal(parsed(callback('hh-video:me:'+JOB))?.action,'metadata_menu')
 assert.equal(parsed(callback('hh-video:mt:'+JOB))?.metadataField,'title')
 assert.equal(parsed(callback('hh-video:md:'+JOB))?.metadataField,'description')
})
test('metadata is valid, bound to 56-bit nonce and two separate callback taps',()=>{
 assert.equal(ownerVideoMetadataValue('title','  До встречи  '),'До встречи')
 assert.equal(ownerVideoMetadataValue('description','строка\r\nдва'),'строка\nдва')
 assert.equal(ownerVideoMetadataValue('description','-'),'')
 // Invalid title is explicitly rejected.
 assert.equal(ownerVideoMetadataValue('title',''),null)
 assert.equal(ownerVideoMetadataValue('title','a'.repeat(101)),null)
 assert.equal(ownerVideoMetadataValue('description','<private>'),null)
 assert.equal(ownerVideoMetadataValue('description','🙂'.repeat(1400)),null)
 assert.equal(ownerVideoMetadataValue('description','a'.repeat(3001)),null)
 const nonce='abcdef01234567'
 const confirm=ownerVideoMetadataEditButtons(JOB,nonce)
 assert.ok(confirm.inline_keyboard.flat().every(b=>b.callback_data.length<=64))
 assert.deepEqual(
   {action:parsed(callback(confirm.inline_keyboard[0][0].callback_data))?.action,
     job:parsed(callback(confirm.inline_keyboard[0][0].callback_data))?.jobId,
     nonce:parsed(callback(confirm.inline_keyboard[0][0].callback_data))?.metadataNonce},
   {action:'metadata_apply',job:JOB,nonce})
 assert.equal(parsed(callback(confirm.inline_keyboard[1][0].callback_data))?.action,'metadata_cancel')
 assert.equal(parsed(callback('hh-video:ma:'+JOB+':bad')),null)
 assert.throws(()=>ownerVideoMetadataEditButtons(JOB,'123'),/INVALID_METADATA_CONFIRMATION/)
 const menu=ownerVideoMetadataMenuButtons(JOB)
 assert.ok(menu.inline_keyboard.flat().every(button=>button.callback_data.length<=64))
})
const record=(title='Original',description='Original detailed description')=>({
 id:VIDEO,snippet:{channelId:VIDEO_RU_CHANNEL_ID,title,description,
   categoryId:'22',tags:['reiki','development'],defaultLanguage:'ru',
   thumbnails:{default:{url:'https://example.com/a.png'}},
   publishedAt:'2026-10-28T13:00:00Z'},
 status:{privacyStatus:'unlisted',uploadStatus:'processed'}
})
test('snippet.update preserves title/description, tags, category and language without status',()=>{
 const current=record()
 const title=ownerRuSnippetUpdateBody(current,'title','New title')
 assert.deepEqual(title,{id:VIDEO,snippet:{
   title:'New title',description:'Original detailed description',categoryId:'22',
   tags:['reiki','development'],defaultLanguage:'ru'}})
 assert.equal(Object.hasOwn(title,'status'),false)
 const description=ownerRuSnippetUpdateBody(current,'description','Новое описание')
 assert.equal(description.snippet.title,'Original')
 assert.equal(description.snippet.description,'Новое описание')
 assert.deepEqual(description.snippet.tags,['reiki','development'])
 for(const malformed of [
   {...record(),snippet:{...record().snippet,categoryId:null}},
   {...record(),snippet:{...record().snippet,channelId:'UCxxxxxxxxxxxxxxxxxxxxxx'}},
   {...record(),status:{privacyStatus:'private',uploadStatus:'processed'}},
   {...record(),status:{privacyStatus:'unlisted',uploadStatus:'failed'}}
 ])assert.throws(()=>ownerRuSnippetUpdateBody(malformed,'title','ok'),/VIDEO_YOUTUBE_METADATA_NOT_ALLOWED/)
 assert.throws(()=>ownerRuSnippetUpdateBody(record(),'title','x'.repeat(101)))
})
test('already uploaded YouTube ID receives only a single snippet PUT and real readback',async()=>{
 let title='Original',description='Original detailed description'
 const operations=[]
 const fetcher=async(url,options={})=>{
   operations.push({url:String(url),method:options.method||'GET',body:options.body?JSON.parse(options.body):null})
   if(options.method==='PUT'){
     const snippet=JSON.parse(options.body).snippet
     title=snippet.title;description=snippet.description
     return Response.json({id:VIDEO,snippet})
   }
   return Response.json({items:[record(title,description)]})
 }
 const changed=await changeOwnerRuYoutubeMetadata(VIDEO,TOKEN,'description',
   'Новый текст\nВторая строка',fetcher)
 assert.deepEqual(changed,{id:VIDEO,field:'description',
   value:'Новый текст\nВторая строка',changed:true})
 assert.equal(operations.filter(o=>o.method==='PUT').length,1)
 assert.equal(operations.filter(o=>o.method==='POST').length,0)
 assert.ok(operations.find(o=>o.method==='PUT').url.endsWith('/videos?part=snippet'))
 assert.equal(operations.find(o=>o.method==='PUT').body.snippet.title,'Original')
 assert.equal(operations.find(o=>o.method==='PUT').body.snippet.categoryId,'22')
 assert.equal(operations.find(o=>o.method==='PUT').body.snippet.defaultLanguage,'ru')
 assert.equal(operations.find(o=>o.method==='PUT').body.status,undefined)
 const same=await changeOwnerRuYoutubeMetadata(VIDEO,TOKEN,'description','Новый текст\nВторая строка',fetcher)
 assert.equal(same.changed,false)
 assert.equal(operations.filter(o=>o.method==='PUT').length,1)
 const details=await ownerRuYoutubeMetadata(VIDEO,TOKEN,fetcher)
 assert.equal(details.description,'Новый текст\nВторая строка')
})
test('network ambiguity never retries the snippet metadata PUT',async()=>{
 let puts=0
 const fetcher=async(_,options={})=>{
   if(options.method==='PUT'){puts++;throw Error('simulated network timeout')}
   return Response.json({items:[record()]})
 }
 await assert.rejects(
   ()=>changeOwnerRuYoutubeMetadata(VIDEO,TOKEN,'title','New title',fetcher),
   /VIDEO_YOUTUBE_METADATA_UNCONFIRMED/)
 assert.equal(puts,1)
})
test('source code holds owner-only durable staged metadata and verifies provider ID',()=>{
 const service=read('lib/practitioners/owner-telegram-video-service.js')
 const editor=read('lib/practitioners/owner-telegram-video-metadata-service.js')
 const sql=read('supabase/migrations/20261028195000_hh_owner_dot_youtube_metadata_edits.sql')
 assert.match(sql,/force row level security/)
 assert.match(sql,/metadata_edit_nonce/)
 assert.match(sql,/youtube_title/)
 assert.match(sql,/youtube_description/)
 assert.match(service,/if\(\['metadata_menu','metadata_help','metadata_set','metadata_apply','metadata_cancel'\]/)
 assert.match(service,/ownerVideoMetadataEditButtons\(result.jobId,result.nonce\)/)
 assert.match(service,/ownerRuYoutubeVisibilityAccessToken/)
 assert.match(service,/youtubeTitle:row.youtube_title/)
 assert.match(service,/title=batch.youtubeTitle/)
 assert.match(service,/description=batch.youtubeDescription/)
 assert.match(service,/callback_data:'hh-video:me:'/)
 assert.match(editor,/metadata_edit_nonce=\$3/)
 assert.match(editor,/metadata_edit_state='applying'/)
 assert.match(editor,/metadata_edit_state='uncertain'/)
 assert.match(editor,/and job_id=\$2 and state='uploaded'/)
 assert.match(editor,/verifyUncertainOwnerDotMetadata/)
 const safeRead=editor.slice(editor.indexOf('export async function verifyUncertainOwnerDotMetadata'))
 assert.doesNotMatch(safeRead,/changeOwnerRuYoutubeMetadata|method:'PUT'|uploadUnlistedRu/)
})
