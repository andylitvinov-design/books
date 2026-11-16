import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed, operationHash } from '../app/crypto.js'
import { CRM_TEMPLATES, validateCampaignDraft, validateTelegramCampaignSender } from './campaigns.js'
import { channelTransportReady, telegramPublicDiagnosticReady, validateMessageText } from './messenger-policy.js'
import { telegramMarketingActive } from './telegram-marketing.mjs'

// Reuse existing encrypted CRM messages and owner RLS. No second subscriber database,
// provider credentials, scheduler, AI content generation or paid Telegram broadcasts.
const JOIN = [
  'from app.crm_msg_threads t',
  'join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id',
  'join app.crm_contacts c on c.id=t.contact_id and c.owner_id=t.owner_id',
  'join app_private.crm_tg_diagnostic_sessions s on s.business_hash=a.external_hash and s.user_hash=t.user_hash',
].join(' ')
const ELIGIBLE = [
  "a.channel='telegram'", 'a.enabled=true', 't.suppressed=false', 'c.suppressed=false',
  "c.lifecycle<>'archived'", "s.stage<>'stopped'", 's.consent_at is not null',
  's.marketing_opt_in_at is not null',
  '(s.marketing_opt_out_at is null or s.marketing_opt_in_at>s.marketing_opt_out_at)',
].join(' and ')
const msgContext=(owner,id)=>({accountId:owner,recordId:id,field:'crm.msgbody'})
const identityContext=(owner,accountId)=>({accountId:owner,recordId:accountId,field:'crm.msgidentity'})
const LOCALES=['en','ru','es']
const MAX_MARKETING_PER_DAY=30

export function telegramCampaignCopy(templateId,locale,sender){
  const version=CRM_TEMPLATES[templateId]?.[locale]
  if(!version||!LOCALES.includes(locale))throw new AppError('INVALID_CAMPAIGN',400)
  let identity
  try {identity=validateTelegramCampaignSender(sender)}
  catch {throw new AppError('SENDER_IDENTIFICATION_REQUIRED',403)}
  const copy={
    en:['Sender: ','Mailing address: ','Contact: ','News opt-out: /unsubnews. Stop all contact: /stop.'],
    ru:['Отправитель: ','Почтовый адрес: ','Контакты: ','Отписаться от новостей: /unsubnews. Прекратить все сообщения: /stop.'],
    es:['Remitente: ','Dirección postal: ','Contacto: ','Dejar de recibir novedades: /unsubnews. Detener todo contacto: /stop.'],
  }[locale]
  return validateMessageText([version.body,'',
    copy[0]+identity.name,copy[1]+identity.postalAddress,
    copy[2]+'https://holistichouse.vercel.app/'+locale+'/contact',copy[3],
  ].join(String.fromCharCode(10)))
}
function isFreeTelegramReady(){
  return telegramPublicDiagnosticReady()&&channelTransportReady('telegram')
}
export function createCrmMessengerCampaignStore(db,actor,config){
  async function draftById(id){
    requireUUID(id)
    const record=(await db.query(
      'select id,definition,status from app.crm_campaign_drafts where id=$1 and owner_id=$2',
      [id,actor.id])).rows[0]
    if(!record||record.status!=='draft')throw new AppError('NOT_FOUND',404)
    const {templateId,locale,channel,segment,sender}=record.definition||{}
    try{validateCampaignDraft({templateId,locale,channel,segment,sender})}
    catch{throw new AppError('INVALID_CAMPAIGN',400)}
    if(channel!=='telegram'||segment!=='all_opted_in')throw new AppError('INVALID_CAMPAIGN_CHANNEL',403)
    return {id,templateId,locale,body:telegramCampaignCopy(templateId,locale,sender)}
  }
  async function subscriberCounts(){
    const rows=(await db.query(
      'select c.locale,count(*)::int as total '+JOIN+
      ' where t.owner_id=$1 and '+ELIGIBLE+' group by c.locale',
      [actor.id])).rows
    return Object.fromEntries(LOCALES.map(locale=>[
      locale,Number(rows.find(r=>r.locale===locale)?.total||0),
    ]))
  }
  async function stats(id){
    const campaign=await draftById(id)
    const counts=(await db.query(
      'select status,count(*)::int as total from app.crm_msg_items where campaign_id=$1 and owner_id=$2 group by status',
      [id,actor.id])).rows
    const delivery=Object.fromEntries(counts.map(row=>[row.status,Number(row.total)]))
    const subscribers=(await db.query(
      'select count(*)::int as total '+JOIN+
      ' where t.owner_id=$1 and c.locale=$2 and '+ELIGIBLE,
      [actor.id,campaign.locale])).rows[0]?.total||0
    const remaining=(await db.query(
      'select count(*)::int as total '+JOIN+
      ' where t.owner_id=$1 and c.locale=$2 and '+ELIGIBLE+
      ' and not exists (select 1 from app.crm_msg_items m where m.owner_id=t.owner_id and m.thread_id=t.id and m.campaign_id=$3)',
      [actor.id,campaign.locale,id])).rows[0]?.total||0
    return {...campaign,subscribers:Number(subscribers),remaining:Number(remaining),
      delivery,providerReady:isFreeTelegramReady(),batchLimit:3,dailyLimit:MAX_MARKETING_PER_DAY}
  }
  return {
    async listTelegramCampaigns(){
      const rows=(await db.query(
        "select id,definition,created_at from app.crm_campaign_drafts where owner_id=$1 and definition->>'channel'='telegram' order by created_at desc,id desc limit 20",
        [actor.id])).rows
      return {campaigns:rows.filter(row=>row.definition?.segment==='all_opted_in').map(row=>({
        id:row.id,templateId:row.definition.templateId,locale:row.definition.locale,
        createdAt:row.created_at,
      })),subscriberCounts:await subscriberCounts(),
        providerReady:isFreeTelegramReady(),otherChannelsDisabledReason:'PAID_OR_PROVIDER_APPROVAL_REQUIRED'}
    },
    telegramCampaignStats:stats,
    async reserveNextTelegramCampaign(id){
      const campaign=await draftById(id)
      if(!isFreeTelegramReady())throw new AppError('CHANNEL_NOT_CONNECTED',503)
      // Serialize the owner's daily quota across concurrent tabs and campaigns.
      await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
        [actor.id+':crm-tg-newsletter-daily'])
      const daily=Number((await db.query(
        "select count(*)::int as total from app.crm_msg_items where owner_id=$1 and campaign_id is not null and created_at>now()-interval '24 hours'",
        [actor.id])).rows[0]?.total||0)
      if(daily>=MAX_MARKETING_PER_DAY)throw new AppError('CAMPAIGN_DAILY_LIMIT',429)
      const rows=(await db.query(
        'select t.id as thread_id,t.account_id,t.user_ciphertext '+JOIN+
        ' where t.owner_id=$1 and c.locale=$2 and '+ELIGIBLE+
        ' and not exists (select 1 from app.crm_msg_items m where m.owner_id=t.owner_id and m.thread_id=t.id and m.campaign_id=$3)'+
        ' order by t.id limit 1 for update of t skip locked',
        [actor.id,campaign.locale,id])).rows
      const target=rows[0]
      if(!target)return null
      const identity=openSealed(target.user_ciphertext,
        identityContext(actor.id,target.account_id),config)
      if(!/^[0-9]{1,25}$/.test(String(identity?.externalId||'')))
        throw new AppError('MESSAGE_IDENTITY_UNAVAILABLE',503)
      const messageId=randomUUID()
      const hash=operationHash({scope:'crm-tg-campaign-delivery-v1',ownerId:actor.id,
        campaignId:id,threadId:target.thread_id},config)
      const inserted=(await db.query(
        "insert into app.crm_msg_items(id,owner_id,thread_id,direction,status,body_ciphertext,request_hash,campaign_id) "+
        "values($1,$2,$3,'out','queued',$4,$5,$6) on conflict do nothing returning id",
        [messageId,actor.id,target.thread_id,
          seal({text:campaign.body},msgContext(actor.id,messageId),config),hash,id])).rows[0]
      if(!inserted)return null
      await db.query(
        'update app.crm_msg_threads set last_message_at=now() where id=$1 and owner_id=$2',
        [target.thread_id,actor.id])
      return {id:messageId,channel:'telegram'}
    },
    async checkTelegramCampaignDispatch(id){
      requireUUID(id)
      const row=(await db.query(
        'select m.id,m.status,m.body_ciphertext,m.campaign_id,t.account_id,t.user_ciphertext,'+
        't.suppressed,c.suppressed as contact_suppressed,c.lifecycle,a.channel,a.enabled,'+
        's.stage,s.consent_at,s.marketing_opt_in_at,s.marketing_opt_out_at '+
        'from app.crm_msg_items m join app.crm_msg_threads t on t.id=m.thread_id and t.owner_id=m.owner_id '+
        'join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id '+
        'join app.crm_contacts c on c.id=t.contact_id and c.owner_id=t.owner_id '+
        'left join app_private.crm_tg_diagnostic_sessions s on s.business_hash=a.external_hash and s.user_hash=t.user_hash '+
        "where m.id=$1 and m.owner_id=$2 and m.direction='out' and m.campaign_id is not null",
        [id,actor.id])).rows[0]
      const allowed=row?.status==='queued'&&row.channel==='telegram'&&row.enabled===true&&
        row.suppressed===false&&row.contact_suppressed===false&&row.lifecycle!=='archived'&&
        telegramMarketingActive(row)&&isFreeTelegramReady()
      if(!allowed)return {allowed:false,reason:'MARKETING_CONSENT_OR_CHANNEL_CHANGED'}
      const identity=openSealed(row.user_ciphertext,identityContext(actor.id,row.account_id),config)
      const text=openSealed(row.body_ciphertext,msgContext(actor.id,id),config)?.text
      if(!/^[0-9]{1,25}$/.test(String(identity?.externalId||''))||typeof text!=='string')
        return {allowed:false,reason:'MESSAGE_IDENTITY_UNAVAILABLE'}
      return {allowed:true,to:String(identity.externalId),text,channel:'telegram'}
    },
  }
}
