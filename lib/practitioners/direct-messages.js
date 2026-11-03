import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction as dbTransaction} from '../app/database.js'
import {seal,openSealed} from '../app/crypto.js'
import {privateStorageClient,sniffPrivateMedia,privateMediaHeaderMatches} from '../clients/session-delivery-storage.js'
import {DIRECT_MEDIA_BUCKET,DIRECT_MEDIA_PROXY_MAX_BYTES,directMediaSpec,directMessageText,directAudioTitle} from './direct-message-policy.mjs'
import {messengerCursor,parseMessengerCursor} from '../crm/messenger-pagination.js'

const bad=(code,status=400)=>{throw new AppError(code,status)}
const statuses=['approved','submitted','changes_requested']
const context=(accountId,id)=>({accountId,recordId:id,field:'practice.direct.message'})
function validText(text,allowEmpty=false){
  try{return directMessageText(text,{allowEmpty})}
  catch{bad('INVALID_MESSAGE')}
}
async function thread(db,actor,threadId,{lock=false}={}){
  requireUUID(threadId)
  const row=(await db.query(`select t.*,p.slug,p.trusted_auth_user_id,p.active,p.status,
    p.public_profile->>'displayName' practitioner_name,t.sender_display_name sender_name
    from app.practitioner_direct_threads t
    join app.practitioners p on p.id=t.recipient_practitioner_id
    where t.id=$1 ${lock?'for update of t':''}`,[threadId])).rows[0]
  if(!row)bad('NOT_FOUND',404)
  const isRecipient=actor.id===row.trusted_auth_user_id && row.active && statuses.includes(row.status)
  if(actor.id!==row.sender_account_id&&!isRecipient)bad('NOT_FOUND',404)
  return {...row,isRecipient,peerName:isRecipient?row.sender_name:(row.practitioner_name||row.slug)}
}
function mediaView(row,actorId){
  if(!row?.asset_id)return null
  return {id:row.asset_id,kind:row.kind,mime:row.mime,
    canPublish:row.kind==='audio'&&row.allow_public_reuse===true&&row.status==='ready',
    published:!!row.published_at,title:row.published_title||'',locale:row.published_locale||'en',
    uploadedByMe:row.uploader_account_id===actorId}
}
function storage(config){return privateStorageClient(config).storage.from(DIRECT_MEDIA_BUCKET)}
async function secureStorage(config){
  const api=privateStorageClient(config).storage
  const {data,error}=await api.getBucket(DIRECT_MEDIA_BUCKET)
  if(error||!data||data.public!==false)bad('MEDIA_STORAGE_UNAVAILABLE',503)
  return api.from(DIRECT_MEDIA_BUCKET)
}
async function signedUrl(config,path,seconds=60){
  const {data,error}=await storage(config).createSignedUrl(path,seconds)
  if(error||!data?.signedUrl)bad('MEDIA_STORAGE_UNAVAILABLE',503)
  const uri=new URL(data.signedUrl)
  if(uri.origin!==config.supabaseUrl||uri.protocol!=='https:')bad('MEDIA_STORAGE_UNAVAILABLE',503)
  return uri.href
}

export function createDirectMessages(config,{transaction=dbTransaction,uploadBucket=secureStorage}={}){
  return {
    async threads(actor){
      return transaction(config,actor,async db=>{
        const rows=(await db.query(`select t.id,t.sender_account_id,t.blocked_at,t.updated_at,
          p.slug,p.trusted_auth_user_id,p.public_profile->>'displayName' practitioner_name,
          t.sender_display_name sender_name,p.status as recipient_status,p.active as recipient_active,
          (select master.slug from app.practitioners master
           where master.trusted_auth_user_id=t.sender_account_id and master.active
             and master.status='approved' and master.public_profile<>'{}'::jsonb
           order by master.slug limit 1) as sender_master_slug,
          (select count(*)::integer from app.practitioner_direct_messages m
           where m.thread_id=t.id and m.author_account_id<>$1 and m.created_at>
             coalesce((select last_seen_at from app.practitioner_direct_reads r
               where r.thread_id=t.id and r.account_id=$1),'epoch'::timestamptz)) as unread
          from app.practitioner_direct_threads t
          join app.practitioners p on p.id=t.recipient_practitioner_id
          where t.sender_account_id=$1 or (p.trusted_auth_user_id=$1 and p.active)
          order by t.updated_at desc limit 80`,[actor.id])).rows
        return {threads:rows.map(r=>({id:r.id,slug:r.slug,
          peerName:r.sender_account_id===actor.id?(r.practitioner_name||r.slug):r.sender_name,
          // The recipient's own page must never be shown as a sender's profile.
          // A sender master must be approved and linked by their verified auth ID.
          peerMasterSlug:r.sender_account_id===actor.id
            ?(r.recipient_active&&r.recipient_status==='approved'?r.slug:null)
            :r.sender_master_slug||null,
          isRecipient:r.sender_account_id!==actor.id,blocked:!!r.blocked_at,
          updatedAt:r.updated_at,unread:r.unread||0}))}
      })
    },
    async start(actor,slug){
      if(typeof slug!=='string'||!/^[a-z0-9-]{2,90}$/.test(slug))bad('INVALID_RECIPIENT')
      return transaction(config,actor,async db=>{
        const recipient=(await db.query(`select id,trusted_auth_user_id from app.practitioners
          where slug=$1 and active and trusted_auth_user_id is not null
          and public_profile<>'{}'::jsonb and status in ('approved','submitted','changes_requested')
          limit 1`,[slug])).rows[0]
        if(!recipient||recipient.trusted_auth_user_id===actor.id)bad('RECIPIENT_UNAVAILABLE',404)
        const existing=(await db.query(`select id,blocked_at from app.practitioner_direct_threads
          where sender_account_id=$1 and recipient_practitioner_id=$2`,
          [actor.id,recipient.id])).rows[0]
        if(existing)return {threadId:existing.id,blocked:!!existing.blocked_at,created:false}
        // Two public practitioners share the same conversation regardless of which one started it.
        const reverse=(await db.query(`select t.id,t.blocked_at from app.practitioner_direct_threads t
          join app.practitioners own on own.id=t.recipient_practitioner_id
          where own.trusted_auth_user_id=$1 and t.sender_account_id=$2
          limit 1`,[actor.id,recipient.trusted_auth_user_id])).rows[0]
        if(reverse)return {threadId:reverse.id,blocked:!!reverse.blocked_at,created:false}
        const count=(await db.query(`select count(*)::integer as n
          from app.practitioner_direct_threads where sender_account_id=$1
          and created_at>now()-interval '24 hours'`,[actor.id])).rows[0]?.n||0
        if(count>=10)bad('THREAD_DAILY_LIMIT',429)
        const id=randomUUID()
        const created=await db.query(`insert into app.practitioner_direct_threads
          (id,sender_account_id,recipient_practitioner_id,sender_display_name) values($1,$2,$3,$4)
          on conflict(sender_account_id,recipient_practitioner_id) do nothing returning id`,
          [id,actor.id,recipient.id,String(actor.displayName||'Member').trim().slice(0,120)||'Member'])
        if(!created.rowCount){
          const row=(await db.query(`select id,blocked_at from app.practitioner_direct_threads
            where sender_account_id=$1 and recipient_practitioner_id=$2`,
            [actor.id,recipient.id])).rows[0]
          if(!row)bad('CONFLICT',409)
          return {threadId:row.id,blocked:!!row.blocked_at,created:false}
        }
        return {threadId:id,created:true,blocked:false}
      })
    },
    async messages(actor,threadId,messagesBefore=null){
      let cursor
      try{cursor=parseMessengerCursor(messagesBefore)}catch{bad('INVALID_MESSAGE_CURSOR',400)}
      return transaction(config,actor,async db=>{
        const t=await thread(db,actor,threadId)
        const rows=(await db.query(`select m.id,m.author_account_id,m.body_ciphertext,
          m.created_at,m.created_at::text as at_cursor,a.id asset_id,a.kind,a.mime,a.status,a.allow_public_reuse,
          a.published_at,a.published_title,a.published_locale,a.uploader_account_id
          from app.practitioner_direct_messages m
          left join app.practitioner_direct_assets a on a.id=m.attachment_id
          where m.thread_id=$1 and
          ($2::timestamptz is null or (m.created_at,m.id)<($2::timestamptz,$3::uuid))
          order by m.created_at desc,m.id desc limit 51`,
          [t.id,cursor?.at||null,cursor?.id||null])).rows
        const page=rows.slice(0,50)
        const nextMessagesCursor=rows.length>50
          ?messengerCursor(page[page.length-1].at_cursor,page[page.length-1].id):null
        return {threadId:t.id,peerName:t.peerName,isRecipient:t.isRecipient,blocked:!!t.blocked_at,
          hasMore:Boolean(nextMessagesCursor),nextMessagesCursor,
          messages:page.reverse().map(r=>({
            id:r.id,mine:r.author_account_id===actor.id,createdAt:r.created_at,
            text:r.body_ciphertext?openSealed(r.body_ciphertext,context(t.sender_account_id,r.id),config)?.text||'':'',
            attachment:mediaView(r,actor.id),
          }))}
      })
    },
    async read(actor,threadId){
      return transaction(config,actor,async db=>{
        await thread(db,actor,threadId)
        const latest=(await db.query(`select max(created_at) as at
          from app.practitioner_direct_messages where thread_id=$1 and author_account_id<>$2`,
          [threadId,actor.id])).rows[0]?.at
        if(latest)await db.query(`insert into app.practitioner_direct_reads(thread_id,account_id,last_seen_at)
          values($1,$2,$3) on conflict(thread_id,account_id) do update set
          last_seen_at=greatest(app.practitioner_direct_reads.last_seen_at,excluded.last_seen_at)`,
          [threadId,actor.id,latest])
        return {seen:true}
      })
    },
    async send(actor,input){
      requireUUID(input?.threadId);requireUUID(input?.operationId)
      const text=validText(input.text||'',true),assetId=input.assetId||null
      if(assetId!==null)requireUUID(assetId)
      if(!text&&!assetId)bad('INVALID_MESSAGE')
      return transaction(config,actor,async db=>{
        const t=await thread(db,actor,input.threadId,{lock:true})
        if(t.blocked_at)bad('THREAD_BLOCKED',403)
        if(!t.active||!statuses.includes(t.status))bad('RECIPIENT_UNAVAILABLE',409)
        const old=(await db.query(`select id,author_account_id,body_ciphertext,attachment_id
          from app.practitioner_direct_messages where id=$1`,[input.operationId])).rows[0]
        if(old){
          const prior=old.body_ciphertext?
            openSealed(old.body_ciphertext,context(t.sender_account_id,old.id),config)?.text||'':''
          if(old.author_account_id!==actor.id||prior!==text||old.attachment_id!==assetId)
            bad('CONFLICT',409)
          return {saved:true,duplicate:true,id:old.id}
        }
        const recent=(await db.query(`select count(*)::integer as n
          from app.practitioner_direct_messages where thread_id=$1
          and author_account_id=$2 and created_at>now()-interval '24 hours'`,
          [t.id,actor.id])).rows[0]?.n||0
        if(recent>=40)bad('MESSAGE_DAILY_LIMIT',429)
        if(assetId){
          const a=(await db.query(`select id from app.practitioner_direct_assets
            where id=$1 and thread_id=$2 and uploader_account_id=$3 and status='ready'
            and created_at>now()-interval '7 days'`,[assetId,t.id,actor.id])).rows[0]
          if(!a)bad('ATTACHMENT_NOT_READY',409)
        }
        await db.query(`insert into app.practitioner_direct_messages
          (id,thread_id,author_account_id,body_ciphertext,attachment_id)
          values($1,$2,$3,$4,$5)`,
          [input.operationId,t.id,actor.id,text?seal({text},context(t.sender_account_id,input.operationId),config):null,assetId])
        await db.query('update app.practitioner_direct_threads set updated_at=now() where id=$1',[t.id])
        return {saved:true,duplicate:false,id:input.operationId}
      })
    },
    async intent(actor,input){
      requireUUID(input?.threadId)
      let info
      try{info=directMediaSpec(input.mime,input.bytes)}
      catch(e){bad(e.message,e.message==='MEDIA_SIZE_NOT_ALLOWED'?413:415)}
      const reuse=input.allowPublicReuse===true&&info.kind==='audio'
      const bucket=await secureStorage(config)
      return transaction(config,actor,async db=>{
        const t=await thread(db,actor,input.threadId)
        if(t.blocked_at)bad('THREAD_BLOCKED',403)
        if(!t.active||!statuses.includes(t.status))bad('RECIPIENT_UNAVAILABLE',409)
        const pending=(await db.query(`select count(*)::integer as n
          from app.practitioner_direct_assets where uploader_account_id=$1
          and status='pending' and created_at>now()-interval '2 hours'`,[actor.id])).rows[0]?.n||0
        if(pending>=3)bad('MEDIA_PENDING_LIMIT',429)
        const id=randomUUID(),objectKey=actor.id+'/'+id+'.'+info.extension
        const {data,error}=await bucket.createSignedUploadUrl(objectKey)
        if(error||!data?.token)bad('MEDIA_STORAGE_UNAVAILABLE',503)
        await db.query(`insert into app.practitioner_direct_assets
          (id,thread_id,uploader_account_id,kind,mime,expected_bytes,object_key,allow_public_reuse)
          values($1,$2,$3,$4,$5,$6,$7,$8)`,
          [id,t.id,actor.id,info.kind,input.mime,input.bytes,objectKey,reuse])
        return {assetId:id,objectKey,bucket:DIRECT_MEDIA_BUCKET,
          supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,
          token:data.token,mime:input.mime}
      })
    },
    // Same-origin private binary upload for mobile Safari. The verified actor
    // and DB intent determine object key, recipient, MIME and exact size.
    async upload(actor,assetId,{mime,body}={}){
      requireUUID(assetId)
      if(!Buffer.isBuffer(body)||body.length>DIRECT_MEDIA_PROXY_MAX_BYTES)
        bad('MEDIA_SIZE_NOT_ALLOWED',413)
      try{directMediaSpec(mime,body.length)}
      catch(e){bad(e.message,e.message==='MEDIA_SIZE_NOT_ALLOWED'?413:415)}
      if(!privateMediaHeaderMatches(body,mime))bad('MEDIA_TYPE_NOT_ALLOWED',415)
      const asset=await transaction(config,actor,async db=>{
        const row=(await db.query(`select id,thread_id,uploader_account_id,object_key,
          expected_bytes,mime,status,created_at from app.practitioner_direct_assets
          where id=$1 and uploader_account_id=$2`,[assetId,actor.id])).rows[0]
        if(!row)bad('NOT_FOUND',404)
        const t=await thread(db,actor,row.thread_id)
        if(t.blocked_at)bad('THREAD_BLOCKED',403)
        if(!t.active||!statuses.includes(t.status))bad('RECIPIENT_UNAVAILABLE',409)
        if(row.mime!==mime)bad('MEDIA_TYPE_NOT_ALLOWED',415)
        if(Number(row.expected_bytes)!==body.length)bad('MEDIA_SIZE_NOT_ALLOWED',413)
        if(!['pending','ready'].includes(row.status)||
          Date.now()-new Date(row.created_at).getTime()>2*3600000)
          bad('MEDIA_INTENT_EXPIRED',409)
        return row
      })
      if(asset.status==='ready')return {uploaded:true,already:true}
      const bucket=await uploadBucket(config)
      const {error}=await bucket.upload(asset.object_key,new Blob([body],{type:mime}),
        {contentType:mime,upsert:false,cacheControl:'0'})
      if(error){
        // Lost HTTP response after a successful write: do not upsert or
        // mint a second intent. Complete will still sniff the stored file.
        const {data, error:infoError}=await bucket.info(asset.object_key)
        const actualMime=(data?.content_type||data?.contentType||data?.mimetype||
          data?.metadata?.mimetype||'').split(';')[0].toLowerCase()
        if(!infoError&&Number(data?.size??data?.metadata?.size)===body.length&&actualMime===mime)
          return {uploaded:true,already:true}
        bad('MEDIA_STORAGE_UNAVAILABLE',503)
      }
      return {uploaded:true}
    },
    async complete(actor,assetId){
      requireUUID(assetId)
      const asset=await transaction(config,actor,async db=>{
        const a=(await db.query(`select * from app.practitioner_direct_assets
          where id=$1 and uploader_account_id=$2`,[assetId,actor.id])).rows[0]
        if(!a)bad('NOT_FOUND',404)
        await thread(db,actor,a.thread_id)
        return a
      })
      if(asset.status==='ready')return {assetId,ready:true}
      if(asset.status!=='pending'||Date.now()-new Date(asset.created_at).getTime()>2*3600000)
        bad('MEDIA_INTENT_EXPIRED',409)
      const bucket=await secureStorage(config)
      const {data,error}=await bucket.info(asset.object_key)
      const size=Number(data?.size??data?.metadata?.size)
      const mime=(data?.content_type||data?.contentType||data?.mimetype||data?.metadata?.mimetype||'').split(';')[0].toLowerCase()
      if(error||!data)bad('MEDIA_UPLOAD_NOT_FOUND',409)
      if(size!==asset.expected_bytes)bad('MEDIA_SIZE_NOT_ALLOWED',413)
      if(mime!==asset.mime)bad('MEDIA_TYPE_NOT_ALLOWED',415)
      await sniffPrivateMedia(bucket,asset.object_key,asset.mime,config.supabaseUrl)
      await transaction(config,actor,async db=>{
        await thread(db,actor,asset.thread_id)
        await db.query(`update app.practitioner_direct_assets set status='ready',ready_at=now()
          where id=$1 and uploader_account_id=$2 and status='pending'`,[assetId,actor.id])
      })
      return {assetId,ready:true}
    },
    async attachment(actor,assetId){
      requireUUID(assetId)
      const row=await transaction(config,actor,async db=>{
        const a=(await db.query(`select a.object_key,a.mime,a.status,a.thread_id
          from app.practitioner_direct_assets a
          join app.practitioner_direct_messages m on m.attachment_id=a.id
          where a.id=$1`,[assetId])).rows[0]
        if(!a||a.status!=='ready')bad('NOT_FOUND',404)
        await thread(db,actor,a.thread_id)
        return a
      })
      return {url:await signedUrl(config,row.object_key,row.mime.startsWith('video/')?180:60),mime:row.mime}
    },
    async changePublication(actor,input){
      const action=input?.action
      if(!['publish','unpublish','revoke','block','unblock'].includes(action))bad('INVALID_ACTION')
      if(action!=='block'&&action!=='unblock')requireUUID(input.assetId)
      return transaction(config,actor,async db=>{
        if(action==='block'||action==='unblock'){
          requireUUID(input.threadId)
          const t=await thread(db,actor,input.threadId,{lock:true})
          if(!t.isRecipient)bad('NOT_FOUND',404)
          await db.query(`update app.practitioner_direct_threads set blocked_at=${action==='block'?'now()':'null'}
            where id=$1`,[t.id])
          return {blocked:action==='block'}
        }
        const asset=(await db.query(`select a.*,m.id message_id from app.practitioner_direct_assets a
          left join app.practitioner_direct_messages m on m.attachment_id=a.id
          where a.id=$1 for update of a`,[input.assetId])).rows[0]
        if(!asset)bad('NOT_FOUND',404)
        const t=await thread(db,actor,asset.thread_id)
        if(action==='revoke'){
          if(asset.uploader_account_id!==actor.id)bad('NOT_FOUND',404)
          await db.query(`update app.practitioner_direct_assets set
            allow_public_reuse=false,published_at=null,published_title=null,
            published_locale=null,published_by_practitioner_id=null where id=$1`,[asset.id])
          return {published:false,revoked:true}
        }
        if(!t.isRecipient)bad('NOT_FOUND',404)
        if(action==='unpublish'){
          await db.query(`update app.practitioner_direct_assets set published_at=null,
            published_title=null,published_locale=null,published_by_practitioner_id=null where id=$1`,[asset.id])
          return {published:false}
        }
        if(!asset.message_id||asset.status!=='ready'||asset.kind!=='audio'||!asset.allow_public_reuse)
          bad('PUBLICATION_NOT_PERMITTED',403)
        if(!t.active||t.status!=='approved')bad('PRACTITIONER_REQUIRED',409)
        let title
        try{title=directAudioTitle(input.title)}catch{bad('INVALID_TITLE')}
        if(!['en','ru','es'].includes(input.locale))bad('INVALID_LOCALE')
        if(input.confirmRights!==true)bad('PUBLICATION_CONFIRMATION_REQUIRED',409)
        await db.query(`update app.practitioner_direct_assets set published_at=now(),
          published_title=$2,published_locale=$3,published_by_practitioner_id=$4 where id=$1`,
          [asset.id,title,input.locale,t.recipient_practitioner_id])
        return {published:true}
      })
    },
    async publicAudios(slug){
      if(typeof slug!=='string'||!/^[a-z0-9-]{2,90}$/.test(slug))return []
      return transaction(config,null,async db=>{
        const result=await db.query(`select a.id,a.published_title,a.published_locale
          from app.practitioner_direct_assets a
          join app.practitioners p on p.id=a.published_by_practitioner_id
          where p.slug=$1 and p.active and p.status='approved'
          and a.published_at is not null and a.status='ready'
          and a.kind='audio' and a.allow_public_reuse
          order by a.published_at desc limit 12`,[slug])
        return result.rows.map(r=>({id:r.id,title:r.published_title,locale:r.published_locale}))
      },{server:true})
    },
    async publicAudio(slug,assetId){
      requireUUID(assetId)
      const a=await transaction(config,null,async db=>(await db.query(`select a.object_key,a.mime
        from app.practitioner_direct_assets a
        join app.practitioners p on p.id=a.published_by_practitioner_id
        where a.id=$1 and p.slug=$2 and p.active and p.status='approved'
        and a.published_at is not null and a.status='ready'
        and a.kind='audio' and a.allow_public_reuse`,[assetId,slug])).rows[0],{server:true})
      if(!a)bad('NOT_FOUND',404)
      return {url:await signedUrl(config,a.object_key),mime:a.mime}
    },
  }
}
