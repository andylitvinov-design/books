import 'server-only'
import {transaction} from '../app/database.js'
import {seal,openSealed} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {inspectMistralStudioKey} from './council-free-models.mjs'

// The only stored model secret is the owner's Mistral Studio key. We reuse
// HH_APP_ENCRYPTION_KEY, authenticated AES-GCM and field-specific AAD;
// plaintext never enters public Supabase APIs, rendered HTML or logs.
const MISTRAL_CONTEXT={
  accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,
  field:'owner_council_mistral_api_key',
}
const PRIVATE_TABLE='app_private.owner_ai_provider_settings'
const MISTRAL_KEY=/^[\x21-\x7e]{24,512}$/

async function savedRow(config){
  return transaction(config,null,async db=>(await db.query(
    'select gemini_free_confirmed_at,mistral_free_confirmed_at,'+
    'mistral_key_ciphertext from '+PRIVATE_TABLE+' where practitioner_id=$1',
    [PRACTITIONER_ID]
  )).rows[0]||null,{server:true})
}

export async function ownerAiProviderReadiness(config,env=process.env,fetcher=fetch){
  const row=await savedRow(config)
  const mistralFreeConfirmed=env.HH_COUNCIL_MISTRAL_FREE_MODE_CONFIRMED==='true'||
    Boolean(row?.mistral_free_confirmed_at)
  let studioProbe={status:'not_checked'}
  // This is called only AFTER owner authentication on the protected admin
  // page. One read-only models GET, no generation/billing/secret in HTML.
  if(mistralFreeConfirmed){
    try{
      let key=env.HH_COUNCIL_MISTRAL_API_KEY||''
      if(!key&&row?.mistral_key_ciphertext){
        const payload=openSealed(row.mistral_key_ciphertext,MISTRAL_CONTEXT,config)
        if(typeof payload?.apiKey==='string'&&MISTRAL_KEY.test(payload.apiKey))
          key=payload.apiKey
      }
      if(key)studioProbe=await inspectMistralStudioKey(key,fetcher)
    }catch{studioProbe={status:'unavailable'}}
  }
  return {
    geminiKeyPresent:Boolean(env.HH_COUNCIL_GEMINI_API_KEY),
    geminiFreeConfirmed:env.HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED==='true'||
      Boolean(row?.gemini_free_confirmed_at),
    mistralStudioKeyPresent:Boolean(env.HH_COUNCIL_MISTRAL_API_KEY||
      row?.mistral_key_ciphertext),
    mistralFreeConfirmed,
    mistralStudioProbeStatus:studioProbe.status,
    mistralStudioProbeModel:studioProbe.status==='ready'?studioProbe.model:null,
    mistralOpenRouterKeyPresent:Boolean(env.HH_COUNCIL_OPENROUTER_API_KEY),
  }
}

export async function resolvedOwnerAiEnvironment(config,env=process.env){
  const row=await savedRow(config)
  let mistralKey=env.HH_COUNCIL_MISTRAL_API_KEY||''
  if(!mistralKey&&row?.mistral_key_ciphertext&&row?.mistral_free_confirmed_at){
    const value=openSealed(row.mistral_key_ciphertext,MISTRAL_CONTEXT,config)
    if(typeof value?.apiKey!=='string'||!MISTRAL_KEY.test(value.apiKey))
      throw Error('OWNER_MISTRAL_KEY_UNAVAILABLE')
    mistralKey=value.apiKey
  }
  return {
    ...env,
    HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED:
      env.HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED==='true'||
        Boolean(row?.gemini_free_confirmed_at)?'true':'false',
    HH_COUNCIL_MISTRAL_API_KEY:mistralKey,
    HH_COUNCIL_MISTRAL_FREE_MODE_CONFIRMED:
      env.HH_COUNCIL_MISTRAL_FREE_MODE_CONFIRMED==='true'||
        Boolean(row?.mistral_free_confirmed_at)?'true':'false',
  }
}

// Only an owner-authenticated Server Action may call the write methods.
// A key alone never enables model inference or switches on paid billing.
export async function confirmOwnerGeminiFreeTier(config,env=process.env){
  if(!env.HH_COUNCIL_GEMINI_API_KEY)return {status:'gemini_key_missing'}
  await transaction(config,null,async db=>{
    await db.query(
      'insert into '+PRIVATE_TABLE+
      '(practitioner_id,gemini_free_confirmed_at) values($1,now()) '+
      'on conflict (practitioner_id) do update set '+
      'gemini_free_confirmed_at=now(),updated_at=now()',
      [PRACTITIONER_ID]
    )
  },{server:true})
  return {status:'gemini_confirmed'}
}
export async function saveOwnerMistralFreeKey(config,apiKey){
  if(typeof apiKey!=='string'||!MISTRAL_KEY.test(apiKey))
    return {status:'mistral_invalid_key'}
  // No provider account plan can be inferred from the key. The caller must
  // require the owner's explicit confirmation before invoking this method.
  const ciphertext=seal({apiKey},MISTRAL_CONTEXT,config)
  await transaction(config,null,async db=>{
    await db.query(
      'insert into '+PRIVATE_TABLE+
      '(practitioner_id,mistral_key_ciphertext,mistral_free_confirmed_at) '+
      'values($1,$2,now()) on conflict (practitioner_id) do update set '+
      'mistral_key_ciphertext=excluded.mistral_key_ciphertext,'+
      'mistral_free_confirmed_at=now(),updated_at=now()',
      [PRACTITIONER_ID,ciphertext]
    )
  },{server:true})
  return {status:'mistral_saved'}
}
export async function disableOwnerFreeModel(config,model){
  if(model!=='gemini'&&model!=='mistral')return {status:'invalid_model'}
  await transaction(config,null,async db=>{
    if(model==='gemini'){
      await db.query('update '+PRIVATE_TABLE+
        ' set gemini_free_confirmed_at=null,updated_at=now() '+
        'where practitioner_id=$1',[PRACTITIONER_ID])
    }else{
      await db.query('update '+PRIVATE_TABLE+
        ' set mistral_free_confirmed_at=null,mistral_key_ciphertext=null,'+
        'updated_at=now() where practitioner_id=$1',[PRACTITIONER_ID])
    }
  },{server:true})
  return {status:model+'_disabled'}
}
