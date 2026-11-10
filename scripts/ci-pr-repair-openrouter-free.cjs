'use strict';
// Read-only, single-request free OpenRouter proposer. No GitHub token or source
// write capability is ever passed to this adapter. The caller independently
// validates and applies the returned patch inside an unprivileged worktree.
const BASE='https://openrouter.ai/api/v1';
const CHAT_ENDPOINT='/api/v1/chat/completions';
const CHAT_CATALOG=BASE+'/models?endpoints='+encodeURIComponent(CHAT_ENDPOINT);
// Ordered CANDIDATES, not proven winners. Live catalog + zero-price validation wins.
const DEFAULT_MODEL='cohere/north-mini-code:free';
const MODEL_PROFILES=Object.freeze({
  repair:Object.freeze(['cohere/north-mini-code:free','recursive/flint-v1.0:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free','xingchen-agi/xing4.0-29b-a4b:free']),
  feature:Object.freeze(['cohere/north-mini-code:free','nvidia/nemotron-3-ultra-550b-a55b:free',
    'recursive/flint-v1.0:free','google/gemma-4-31b-it:free']),
  architecture:Object.freeze(['nvidia/nemotron-3-ultra-550b-a55b:free',
    'xingchen-agi/xing4.0-29b-a4b:free','cohere/north-mini-code:free']),
  review:Object.freeze(['nvidia/nemotron-3-ultra-550b-a55b:free',
    'dots-studio/dots-3-note-preview:free','xingchen-agi/xing4.0-29b-a4b:free']),
  visual:Object.freeze(['nvidia/nemotron-3.5-super-vl:free',
    'cohere/north-mini-code:free','google/gemma-4-31b-it:free'])
});
const MAX_REPLY=40000;
function selectedModel(value=DEFAULT_MODEL){
  if(typeof value!=='string'||!/^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9][\w.-]*:free$/.test(value))
    throw Error('FREE_AI_OPENROUTER_MODEL_NOT_EXPLICIT_FREE');
  return value;
}
function verifyZeroPrice(catalog,model){
  const id=selectedModel(model);
  if(!Array.isArray(catalog?.data))throw Error('FREE_AI_OPENROUTER_CATALOG_INVALID');
  const rows=catalog.data.filter(row=>row?.id===id);
  if(rows.length!==1)throw Error('FREE_AI_OPENROUTER_MODEL_NOT_IN_CATALOG');
  const entry=rows[0],pricing=entry.pricing;
  if(!pricing||typeof pricing!=='object'||Array.isArray(pricing)||
    !Object.hasOwn(pricing,'prompt')||!Object.hasOwn(pricing,'completion'))
    throw Error('FREE_AI_OPENROUTER_PRICE_UNKNOWN');
  // Optional request, cache, image, reasoning or other billed units must
  // also have an explicitly zero price. Unknown prices fail closed.
  const fields=Object.entries(pricing);
  for(const [,value] of fields){
    if(!((typeof value==='number'||typeof value==='string')&&
      String(value).trim()!==''&&Number.isFinite(Number(value))))
      throw Error('FREE_AI_OPENROUTER_PRICE_UNKNOWN');
    if(Number(value)!==0)throw Error('FREE_AI_OPENROUTER_PRICE_NOT_ZERO');
  }
  // The models catalog may omit the optional endpoints field. The API's
  // documented endpoints filter supplies the route guarantee in that case.
  if((entry.endpoints!==undefined&&
      (!Array.isArray(entry.endpoints)||!entry.endpoints.includes(CHAT_ENDPOINT)))||
    !entry.architecture?.input_modalities?.includes('text')||
    !entry.architecture?.output_modalities?.includes('text'))
    throw Error('FREE_AI_OPENROUTER_NOT_TEXT_CHAT');
  return {model:id,zeroCost:true};
}
/** Resolve before sending ANY inference; availability fallback is catalog-only.
 * No second model/API call after provider rejection, quota error, or bad patch.
 * Explicit pinned model never silently changes into another model.
 */
function chooseVerifiedFreeModel(catalog,{model='auto',role='repair'}={}){
  if(!Object.hasOwn(MODEL_PROFILES,role))
    throw Error('FREE_AI_OPENROUTER_ROLE_UNKNOWN');
  if(model!=='auto'){
    const selected=selectedModel(model);
    return {...verifyZeroPrice(catalog,selected),role,selection:'pinned'};
  }
  if(!Array.isArray(catalog?.data))throw Error('FREE_AI_OPENROUTER_CATALOG_INVALID');
  for(const candidate of MODEL_PROFILES[role]){
    try{return {...verifyZeroPrice(catalog,candidate),role,selection:'ranked_catalog'};}
    catch(error){
      if(!/^FREE_AI_OPENROUTER_(?:MODEL_NOT_IN_CATALOG|PRICE_UNKNOWN|PRICE_NOT_ZERO|NOT_TEXT_CHAT)$/.test(String(error?.message||'')))
        throw error;
    }
  }
  throw Error('FREE_AI_OPENROUTER_NO_VERIFIED_FREE_MODEL');
}
async function getJson(fetchImpl,url,options,timeoutMs){
  let response;
  try{response=await fetchImpl(url,{...options,signal:AbortSignal.timeout(timeoutMs)});}
  catch{throw Error('FREE_AI_OPENROUTER_NETWORK_UNAVAILABLE');}
  if(response?.status===429)throw Error('FREE_AI_FREE_TIER_QUOTA_EXHAUSTED');
  if(!response?.ok)throw Error('FREE_AI_OPENROUTER_REQUEST_REJECTED');
  let body;
  try{
    const raw=await response.text();
    if(raw.length>8*1024*1024)throw Error('oversized');
    body=JSON.parse(raw);
  }catch{throw Error('FREE_AI_OPENROUTER_RESPONSE_INVALID');}
  return body;
}
function responseShape(completion){
  const choice=Array.isArray(completion?.choices)?completion.choices[0]:null;
  const message=choice?.message;
  return {
    top_level_keys:completion&&typeof completion==='object'&&!Array.isArray(completion)
      ?Object.keys(completion).sort().slice(0,24):[],
    choices_type:Array.isArray(completion?.choices)?'array':typeof completion?.choices,
    choices_count:Array.isArray(completion?.choices)?completion.choices.length:null,
    first_choice_keys:choice&&typeof choice==='object'?Object.keys(choice).sort().slice(0,16):[],
    finish_reason:typeof choice?.finish_reason==='string'?choice.finish_reason:null,
    message_type:message===null?'null':typeof message,
    message_keys:message&&typeof message==='object'&&!Array.isArray(message)
      ?Object.keys(message).sort().slice(0,20):[],
    content_type:Array.isArray(message?.content)?'array':message?.content===null?'null':typeof message?.content,
    usage_keys:completion?.usage&&typeof completion.usage==='object'
      ?Object.keys(completion.usage).sort().slice(0,16):[]
  };
}
function extractAssistantText(content){
  let text;
  if(typeof content==='string'){
    text=content;
  }else if(content&&typeof content==='object'&&!Array.isArray(content)&&
    (content.type==='text'||content.type==='output_text'||content.type===undefined)&&
    typeof content.text==='string'){
    text=content.text;
  }else if(Array.isArray(content)){
    const parts=[];
    for(const part of content){
      if(!part||typeof part!=='object'||Array.isArray(part))
        throw Error('FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID');
      if((part.type==='text'||part.type==='output_text'||part.type===undefined)&&
         typeof part.text==='string'){
        parts.push(part.text);
        continue;
      }
      // Refusals, images, tool payloads and unknown blocks are not source patches.
      throw Error(part.type==='refusal'
        ?'FREE_AI_OPENROUTER_MODEL_REFUSED'
        :'FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID');
    }
    text=parts.join('\n');
  }else{
    throw Error('FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID');
  }
  if(!text.trim())throw Error('FREE_AI_OPENROUTER_PATCH_RESPONSE_EMPTY');
  if(Buffer.byteLength(text,'utf8')>MAX_REPLY)
    throw Error('FREE_AI_OPENROUTER_PATCH_RESPONSE_TOO_LARGE');
  return text;
}
async function requestFreePatch({prompt,key,model='auto',role='repair',
  fetchImpl=global.fetch,onVerifiedModel=undefined}={}){
  if(model!=='auto')selectedModel(model); // reject malformed manual overrides before any API call
  if(typeof key!=='string'||!key.trim())
    throw Error('FREE_AI_OPENROUTER_KEY_NOT_CONFIGURED');
  if(typeof fetchImpl!=='function')throw Error('FREE_AI_OPENROUTER_NETWORK_UNAVAILABLE');
  if(typeof prompt!=='string'||!prompt||prompt.length>92000)
    throw Error('FREE_AI_OPENROUTER_PROMPT_UNSAFE');
  const catalog=await getJson(fetchImpl,CHAT_CATALOG,
    {method:'GET',headers:{Accept:'application/json'}},10000);
  const selection=chooseVerifiedFreeModel(catalog,{model,role});
  const selected=selection.model;
  if(typeof onVerifiedModel==='function')onVerifiedModel(selection);
  // Exactly ONE inference attempt: one pre-verified :free model, zero price cap,
  // zero cross-model fallback, no tools, no file operations, no paid retries.
  const completion=await getJson(fetchImpl,BASE+'/chat/completions',{
    method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',
      Accept:'application/json'},
    body:JSON.stringify({model:selected,messages:[{role:'user',content:prompt}],
      max_tokens:5500,stream:false,usage:{include:true},
      provider:{allow_fallbacks:false,max_price:{prompt:0,completion:0},
        data_collection:'deny'}})
  },170000);
  // Provider error envelopes are diagnostic outcomes, never patch candidates.
  // Check before model/billing fields because error bodies may omit both.
  if(completion?.error)throw Error('FREE_AI_OPENROUTER_PROVIDER_ERROR');
  if(completion?.model!==selected)throw Error('FREE_AI_OPENROUTER_MODEL_MISMATCH');
  const cost=completion?.usage?.cost;
  if(typeof cost!=='number'||!Number.isFinite(cost))
    throw Error('FREE_AI_OPENROUTER_BILLING_UNVERIFIED');
  if(cost!==0||completion?.usage?.is_byok===true||
     Object.values(completion?.usage?.cost_details||{}).some(value=>
       value!==null&&value!==undefined&&(!Number.isFinite(Number(value))||Number(value)!==0)))
    throw Error('FREE_AI_OPENROUTER_BILLING_NONZERO');
  if(!Array.isArray(completion?.choices)||completion.choices.length!==1||
     !completion.choices[0]?.message|| (completion.choices[0].message.role!==undefined&&completion.choices[0].message.role!=='assistant'))
    throw Error('FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID '+JSON.stringify(responseShape(completion)));
  const choice=completion.choices[0];
  if(choice.finish_reason==='length')
    throw Error('FREE_AI_OPENROUTER_PATCH_RESPONSE_TRUNCATED');
  if(choice.finish_reason==='content_filter'||choice.message.refusal)
    throw Error('FREE_AI_OPENROUTER_MODEL_REFUSED');
  if(['tool_calls','function_call','error'].includes(choice.finish_reason)||
     choice.message.tool_calls?.length||choice.message.function_call)
    throw Error('FREE_AI_OPENROUTER_TOOL_CALL_NOT_ALLOWED');
  return extractAssistantText(choice.message.content);
}
module.exports={BASE,CHAT_ENDPOINT,CHAT_CATALOG,DEFAULT_MODEL,MODEL_PROFILES,
  selectedModel,verifyZeroPrice,chooseVerifiedFreeModel,responseShape,extractAssistantText,requestFreePatch};
