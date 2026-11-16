import 'server-only'
import {randomBytes} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'

const HANDLE=/^[a-z][a-z0-9-]{2,29}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const SOURCES=new Set(['tests','practices','videos'])
const forbidden=new Set(['admin','api','auth','app','support','moderator','holistichouse','system'])
const bad=(code='INVALID_PAGE_REQUEST',status=400)=>{throw new AppError(code,status)}
function textField(value,max,min=0){
 if(typeof value!=='string')bad()
 const valueTrim=value.trim()
 if(valueTrim.length<min||valueTrim.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(valueTrim))bad()
 return valueTrim
}
function id(value){if(typeof value!=='string'||!UUID.test(value))bad();return value}
function only(input,allowed){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))bad()
}
async function counts(db,accountId){
 const [tests,practices,videos]=await Promise.all([
   db.query('select count(*)::int n from app.assessment_runs where account_id=$1 and completed_at is not null',[accountId]),
   db.query('select count(*)::int n from app_private.academy_course_progress where account_id=$1 and completed_at is not null',[accountId]),
   db.query("select count(*)::int n from app_private.personal_videos where account_id=$1 and status='ready'",[accountId]),
 ])
 return {tests:tests.rows[0].n,practices:practices.rows[0].n,videos:videos.rows[0].n}
}
async function limitItems(db,accountId){
 const {rows}=await db.query('select count(*)::int n from app_private.user_page_items where account_id=$1',[accountId])
 if(rows[0].n>=200)bad('PAGE_ITEM_LIMIT',413)
}
export async function getMyPage(config,actor){
 return transaction(config,actor,async db=>{
   const page=(await db.query('select account_id,handle,display_name,bio,is_published,share_tests,share_practices,share_videos,test_count,practice_count,video_count,stats_at from app_private.user_pages where account_id=$1',[actor.id])).rows[0]||null
   const items=(await db.query('select id,kind,body,title,video_id,achievement_type,achievement_value,visibility,created_at from app_private.user_page_items where account_id=$1 order by created_at desc limit 100',[actor.id])).rows
   const videos=(await db.query("select id,theme,aspect,duration_seconds,ready_at from app_private.personal_videos where account_id=$1 and status='ready' order by ready_at desc limit 20",[actor.id])).rows
   const suggested=page?null:{name:String(actor.displayName||'').trim().slice(0,80)||'Holistic House member',handle:'member-'+randomBytes(4).toString('hex')}
   return {page,items,videos,stats:await counts(db,actor.id),suggested}
 })
}
export async function changeMyPage(config,actor,input){
 only(input,['action','handle','displayName','bio','published','shareTests','sharePractices','shareVideos','body','itemId','videoId','title','visibility','achievement'])
 return transaction(config,actor,async db=>{
  const a=input.action
  if(a==='saveProfile'){
   const handle=textField(input.handle,30,3).toLowerCase()
   if(!HANDLE.test(handle)||forbidden.has(handle))bad('INVALID_PUBLIC_HANDLE',400)
   const name=textField(input.displayName,80,2)
   const bio=textField(input.bio,420)
   try{
    await db.query(`insert into app_private.user_pages(account_id,handle,display_name,bio) values($1,$2,$3,$4)
     on conflict(account_id) do update set handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,updated_at=now()`,[actor.id,handle,name,bio])
   }catch(error){if(error?.code==='23505')bad('PUBLIC_HANDLE_TAKEN',409);throw error}
  }else if(a==='setPublished'){
   if(typeof input.published!=='boolean')bad()
   const row=(await db.query('update app_private.user_pages set is_published=$2,updated_at=now() where account_id=$1 returning account_id',[actor.id,input.published])).rows[0]
   if(!row)bad('PAGE_NOT_CREATED',409)
   if(!input.published)await db.query("update app_private.user_page_items set visibility='private',updated_at=now() where account_id=$1 and visibility='public'",[actor.id])
  }else if(a==='shareStats'){
   if(['shareTests','sharePractices','shareVideos'].some(k=>typeof input[k]!=='boolean'))bad()
   const c=await counts(db,actor.id)
   const r=await db.query(`update app_private.user_pages set share_tests=$2,share_practices=$3,share_videos=$4,
      test_count=$5,practice_count=$6,video_count=$7,stats_at=now(),updated_at=now()
      where account_id=$1`,[actor.id,input.shareTests,input.sharePractices,input.shareVideos,c.tests,c.practices,c.videos])
   if(r.rowCount!==1)bad('PAGE_NOT_CREATED',409)
  }else if(a==='addPost'){
   await limitItems(db,actor.id)
   const body=textField(input.body,1200,1)
   const r=await db.query("insert into app_private.user_page_items(account_id,kind,body) values($1,'post',$2)",[actor.id,body])
   if(r.rowCount!==1)bad('PAGE_NOT_CREATED',409)
  }else if(a==='editPost'){
   const body=textField(input.body,1200,1)
   const r=await db.query("update app_private.user_page_items set body=$3,visibility='private',updated_at=now() where account_id=$1 and id=$2 and kind='post'",[actor.id,id(input.itemId),body])
   if(r.rowCount!==1)bad('PAGE_ITEM_NOT_FOUND',404)
  }else if(a==='addVideo'){
   await limitItems(db,actor.id)
   const videoId=id(input.videoId)
   const title=textField(input.title,100,1)
   const r=await db.query(`insert into app_private.user_page_items(account_id,kind,video_id,asset_key,title)
      select $1,'video',id,object_key,$3 from app_private.personal_videos
      where account_id=$1 and id=$2 and status='ready'
      on conflict do nothing`,[actor.id,videoId,title])
   if(r.rowCount!==1){
    const exists=(await db.query("select id from app_private.user_page_items where account_id=$1 and video_id=$2",[actor.id,videoId])).rows[0]
    if(!exists)bad('VIDEO_NOT_READY',409)
   }
  }else if(a==='addAchievement'){
   await limitItems(db,actor.id)
   if(!SOURCES.has(input.achievement))bad()
   const c=await counts(db,actor.id)
   const number=c[input.achievement]
   if(!number)bad('NO_COMPLETED_ACHIEVEMENT',409)
   await db.query(`insert into app_private.user_page_items(account_id,kind,achievement_type,achievement_value)
     values($1,'achievement',$2,$3)`,[actor.id,input.achievement,number])
  }else if(a==='setVisibility'){
   if(!['public','private'].includes(input.visibility))bad()
   const itemId=id(input.itemId)
   const row=(await db.query('select kind,video_id from app_private.user_page_items where account_id=$1 and id=$2',[actor.id,itemId])).rows[0]
   if(!row)bad('PAGE_ITEM_NOT_FOUND',404)
   if(input.visibility==='public'){
    const page=(await db.query('select is_published from app_private.user_pages where account_id=$1',[actor.id])).rows[0]
    if(!page?.is_published)bad('PAGE_NOT_PUBLIC',409)
    if(row.kind==='video'){
      const file=(await db.query("select id from app_private.personal_videos where account_id=$1 and id=$2 and status='ready'",[actor.id,row.video_id])).rows[0]
      if(!file)bad('VIDEO_NOT_READY',409)
    }
   }
   await db.query('update app_private.user_page_items set visibility=$3,updated_at=now() where account_id=$1 and id=$2',[actor.id,itemId,input.visibility])
  }else if(a==='deleteItem'){
   const r=await db.query('delete from app_private.user_page_items where account_id=$1 and id=$2',[actor.id,id(input.itemId)])
   if(r.rowCount!==1)bad('PAGE_ITEM_NOT_FOUND',404)
  }else bad()
  return {ok:true}
 })
}
export async function getPublicMyPage(config,handle){
 if(typeof handle!=='string'||!HANDLE.test(handle))return null
 return transaction(config,null,async db=>{
   const page=(await db.query(`select account_id,handle,display_name,bio,share_tests,share_practices,share_videos,test_count,practice_count,video_count,stats_at
       from app_private.user_pages where handle=$1 and is_published=true`,[handle])).rows[0]
   if(!page)return null
   const items=(await db.query(`select id,kind,body,title,achievement_type,achievement_value,created_at from app_private.user_page_items
       where account_id=$1 and visibility='public' order by created_at desc limit 60`,[page.account_id])).rows
   delete page.account_id
   if(!page.share_tests)page.test_count=null
   if(!page.share_practices)page.practice_count=null
   if(!page.share_videos)page.video_count=null
   return {page,items}
 },{server:true})
}
export async function getPublicMyVideoKey(config,videoId){
 if(typeof videoId!=='string'||!UUID.test(videoId))return null
 return transaction(config,null,async db=>{
   const item=(await db.query(`select asset_key from app_private.user_page_items
      where id=$1 and kind='video' and visibility='public'`,[videoId])).rows[0]
   return item?.asset_key||null
 },{server:true})
}
