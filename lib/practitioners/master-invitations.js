import 'server-only'
import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {openSealed,seal} from '../app/crypto.js'
import {masterInviteToken,masterInviteName,masterInviteLocale,MASTER_INVITE_TTL_DAYS} from './master-invite-contract.mjs'

const invalid=(code,status=400)=>{throw new AppError(code,status)}
const digest=token=>createHash('sha256').update(token).digest('hex')
const secretContext=row=>({accountId:row.owner_account_id,recordId:row.id,field:'practice.master.invite'})
function view(row,config,origin){
  const accepted=Boolean(row.accepted_at)
  const valid=!row.revoked_at&&new Date(row.expires_at)>new Date()&&!accepted
  const token=valid&&row.token_ciphertext?openSealed(row.token_ciphertext,secretContext(row),config)?.token:null
  return {
    id:row.id,name:row.display_name,slug:row.slug,
    threadId:row.thread_id,status:row.revoked_at?'revoked':accepted?'linked':valid?'pending':'expired',
    expiresAt:row.expires_at,createdAt:row.created_at,
    // Only the owner sees this secret, and only until first redemption.
    inviteUrl:token?origin+'/'+(row.locale||'en')+'/masters/invite/'+token:null,
  }
}
export function createMasterInvitationRepository(config){
  return {
    async list(actor,origin){
      return transaction(config,actor,async db=>{
        const rows=(await db.query("select mi.*,p.slug,p.public_profile->>'displayName' display_name from app_private.master_invitations mi join app.practitioners p on p.id=mi.practitioner_id where mi.owner_account_id=$1 order by mi.created_at desc limit 100",[actor.id])).rows
        return {invitations:rows.map(r=>view(r,config,origin))}
      },{moderator:true})
    },
    async create(actor,input,origin){
      let name,locale
      try{name=masterInviteName(input.name);locale=masterInviteLocale(input.locale)}
      catch{invalid('INVALID_MASTER_INPUT',400)}
      requireUUID(input.operationId)
      return transaction(config,actor,async db=>{
        // Serialize owner writes to reject same-name duplicate drafts under race.
        const owner=(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active' for update",[actor.id])).rows[0]
        if(!owner)invalid('ACCOUNT_REQUIRED',403)
        const previous=(await db.query("select mi.*,p.slug,p.public_profile->>'displayName' display_name from app_private.master_invitations mi join app.practitioners p on p.id=mi.practitioner_id where mi.owner_account_id=$1 and mi.operation_id=$2",[actor.id,input.operationId])).rows[0]
        if(previous)return {invitation:view(previous,config,origin),duplicate:true}
        const collision=(await db.query("select 1 from app_private.master_invitations mi join app.practitioners p on p.id=mi.practitioner_id where mi.owner_account_id=$1 and mi.revoked_at is null and mi.accepted_at is null and lower(trim(p.public_profile->>'displayName'))=lower($2) limit 1",[actor.id,name])).rowCount
        if(collision)invalid('MASTER_ALREADY_INVITED',409)
        const id=randomUUID(),practitionerId=randomUUID(),threadId=randomUUID()
        const token=randomBytes(32).toString('base64url')
        const profile={displayName:name,languages:[locale],formats:['online'],areas:['personal_development']}
        const slug='invited-'+practitionerId.slice(0,8)
        // An unclaimed master remains a private draft, not a clinical client.
        await db.query("insert into app.practitioners (id,trusted_auth_user_id,public_profile,draft_profile,slug,status,is_partner,active) values($1,null,$2::jsonb,$2::jsonb,$3,'draft',false,true)",[practitionerId,JSON.stringify(profile),slug])
        const row=(await db.query("insert into app_private.master_invitations (id,owner_account_id,practitioner_id,thread_id,operation_id,locale,token_hash,token_ciphertext,expires_at) values($1,$2,$3,$4,$5,$6,$7,$8,now()+($9::integer*interval '1 day')) returning *",[id,actor.id,practitionerId,threadId,input.operationId,locale,digest(token),seal({token}, {accountId:actor.id,recordId:id,field:'practice.master.invite'},config),MASTER_INVITE_TTL_DAYS])).rows[0]
        await db.query("insert into app.practitioner_direct_threads (id,sender_account_id,recipient_practitioner_id,sender_display_name) values($1,$2,$3,$4)",[threadId,actor.id,practitionerId,(actor.displayName||'Holistic House').trim().slice(0,120)])
        return {invitation:view({...row,slug,display_name:name},config,origin),duplicate:false}
      },{moderator:true})
    },
    async renew(actor,invitationId,origin){
      requireUUID(invitationId)
      return transaction(config,actor,async db=>{
        const row=(await db.query("select mi.*,p.slug,p.public_profile->>'displayName' display_name from app_private.master_invitations mi join app.practitioners p on p.id=mi.practitioner_id where mi.owner_account_id=$1 and mi.id=$2 for update of mi",[actor.id,invitationId])).rows[0]
        if(!row||row.revoked_at||row.accepted_at)invalid('INVITATION_UNAVAILABLE',404)
        const token=randomBytes(32).toString('base64url')
        const updated=(await db.query("update app_private.master_invitations set token_hash=$2,token_ciphertext=$3,expires_at=now()+($4::integer*interval '1 day'),updated_at=now() where id=$1 returning *",[invitationId,digest(token),seal({token},secretContext(row),config),MASTER_INVITE_TTL_DAYS])).rows[0]
        return {invitation:view({...updated,slug:row.slug,display_name:row.display_name},config,origin)}
      },{moderator:true})
    },
    async preview(token){
      if(!masterInviteToken(token))invalid('INVITATION_UNAVAILABLE',404)
      return transaction(config,null,async db=>{
        const row=(await db.query("select mi.expires_at,mi.revoked_at,mi.accepted_at,p.public_profile->>'displayName' display_name from app_private.master_invitations mi join app.practitioners p on p.id=mi.practitioner_id where mi.token_hash=$1 limit 1",[digest(token)])).rows[0]
        if(!row||row.revoked_at||row.accepted_at||new Date(row.expires_at)<=new Date())invalid('INVITATION_UNAVAILABLE',404)
        return {name:row.display_name||'Holistic House',expiresAt:row.expires_at}
      },{server:true,moderator:true})
    },
    async claim(actor,token){
      if(!masterInviteToken(token))invalid('INVITATION_UNAVAILABLE',404)
      if(!actor.googleVerified)invalid('GOOGLE_SIGN_IN_REQUIRED',403)
      return transaction(config,actor,async db=>{
        const account=(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows[0]
        if(!account)invalid('ACCOUNT_REQUIRED',403)
        const row=(await db.query("select * from app_private.master_invitations where token_hash=$1 for update",[digest(token)])).rows[0]
        if(!row||row.revoked_at||row.accepted_at||new Date(row.expires_at)<=new Date())invalid('INVITATION_UNAVAILABLE',404)
        if(row.owner_account_id===actor.id)invalid('CANNOT_INVITE_SELF',409)
        const own=(await db.query("select id from app.practitioners where trusted_auth_user_id=$1",[actor.id])).rows[0]
        if(own)invalid('EXISTING_PRACTITIONER_REVIEW_REQUIRED',409)
        const linked=await db.query("update app.practitioners set trusted_auth_user_id=$2,updated_at=now(),revision=revision+1 where id=$1 and trusted_auth_user_id is null and status='draft' returning slug",[row.practitioner_id,actor.id])
        if(!linked.rowCount)invalid('INVITATION_UNAVAILABLE',409)
        await db.query("update app_private.master_invitations set accepted_by_account_id=$2,accepted_at=now(),token_ciphertext=null,updated_at=now() where id=$1",[row.id,actor.id])
        return {linked:true,slug:linked.rows[0].slug,threadId:row.thread_id}
      },{moderator:true})
    },
  }
}
