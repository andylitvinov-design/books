/**
 * Holistic Native AI private cloud inference gateway.
 * Listens ONLY on 127.0.0.1; Caddy publishes TLS. Ollama MUST remain loopback-only.
 * No external inference API, account state, transcript persistence or tool calls.
 */
import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';

const LOCAL_OLLAMA='http://127.0.0.1:11434';
const MODEL=/^[a-z0-9][a-z0-9._:/-]{0,100}$/i;
const ROLES=new Set(['system','user','assistant']);
const BODY_LIMIT=24000;
const CHAT_OUT_LIMIT=180000;
const EMBED_OUT_LIMIT=900000;
const MAX_PER_MINUTE=24;
const MAX_IN_FLIGHT=2;
const deny=(status,error)=>({status,payload:{error}});
const validObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
const boundedInt=(n,low,high,fallback)=>Number.isInteger(n)?Math.max(low,Math.min(high,n)):fallback;

export function gatewayConfig(env=process.env){
  const token=env.HH_NATIVE_RUNTIME_TOKEN;
  if(typeof token!=='string'||token.length<32||token.length>256)
    throw Error('HH_NATIVE_RUNTIME_TOKEN_REQUIRED');
  const chatModel=env.HH_NATIVE_CHAT_MODEL||'qwen3.5:0.8b';
  const embedModel=env.HH_NATIVE_EMBED_MODEL||'qwen3-embedding:0.6b';
  if(!MODEL.test(chatModel)||!MODEL.test(embedModel))throw Error('INVALID_NATIVE_MODEL_NAME');
  const embedBackend=env.HH_NATIVE_EMBED_BACKEND||'ollama';
  if(!['ollama','e5'].includes(embedBackend))throw Error('INVALID_NATIVE_EMBED_BACKEND');
  return {token,chatModel,embedModel,embedBackend,
    port:boundedInt(Number(env.HH_NATIVE_GATEWAY_PORT||8787),1024,65535,8787),
    maxTokens:boundedInt(Number(env.HH_NATIVE_MAX_TOKENS||48),16,96,48)};
}

export function authorized(header,secret){
  if(typeof header!=='string'||!header.startsWith('Bearer '))return false;
  const candidate=Buffer.from(header.slice(7),'utf8');
  const expected=Buffer.from(secret,'utf8');
  return candidate.length===expected.length&&timingSafeEqual(candidate,expected);
}

export function validateChatBody(body,config){
  if(!validObject(body)||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>10||
     body.messages.some(m=>!validObject(m)||!ROLES.has(m.role)||typeof m.content!=='string'||
       !m.content.trim()||m.content.length>7000||Object.keys(m).some(k=>!['role','content'].includes(k))))
    return null;
  if(body.model!==config.chatModel||body.stream===true||body.tools!==undefined||body.format!==undefined)
    return null;
  return {model:config.chatModel,messages:body.messages.map(({role,content})=>({role,content})),
    stream:false,think:false,keep_alive:'10m',
    options:{temperature:0.45,num_predict:Math.min(config.maxTokens,
      boundedInt(body.options?.num_predict,16,96,config.maxTokens)),num_ctx:3072}};
}

export function validateEmbedBody(body,config){
  if(!validObject(body)||typeof body.input!=='string'||!body.input.trim()||
    body.input.length>1200||body.model!==(config.embedBackend==='e5'?'multilingual-e5-small':config.embedModel))
    return null;
  return config.embedBackend==='e5'
    ? {input:body.input}
    : {model:config.embedModel,input:body.input,keep_alive:'10m',truncate:true};
}

export async function relayNativeRequest({method,path,authorization,body},
    {config,fetcher=fetch,limiter=null}={}){
  if(!config)return deny(503,'NATIVE_RUNTIME_NOT_CONFIGURED');
  if(!authorized(authorization,config.token))return deny(401,'UNAUTHORIZED');
  if(method!=='POST')return deny(405,'METHOD_NOT_ALLOWED');
  if(!['/api/chat','/api/embed'].includes(path))return deny(404,'NOT_FOUND');
  const chat=path==='/api/chat';
  const payload=chat?validateChatBody(body,config):validateEmbedBody(body,config);
  if(!payload)return deny(400,'INVALID_NATIVE_REQUEST');
  if(limiter&&!limiter.take())return deny(429,'CAPACITY_LIMIT');
  const target=chat?LOCAL_OLLAMA+'/api/chat':
    config.embedBackend==='e5'?'http://127.0.0.1:8788/embed':LOCAL_OLLAMA+'/api/embed';
  try{
    const res=await fetcher(target,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(chat?14500:4500)});
    if(!res?.ok)return deny(503,'NATIVE_INFERENCE_UNAVAILABLE');
    const txt=await res.text();
    if(txt.length>(chat?CHAT_OUT_LIMIT:EMBED_OUT_LIMIT))return deny(502,'NATIVE_INFERENCE_INVALID');
    const result=JSON.parse(txt);
    if(chat){
      if(typeof result?.message?.content!=='string'||result.message.content.length>7000)
        return deny(502,'NATIVE_INFERENCE_INVALID');
      return {status:200,payload:{message:{role:'assistant',content:result.message.content},done:true}};
    }
    if(!Array.isArray(result?.embeddings)||result.embeddings.length!==1||
      !Array.isArray(result.embeddings[0])||result.embeddings[0].length<32||
      result.embeddings[0].length>4096||result.embeddings[0].some(n=>typeof n!=='number'||!Number.isFinite(n)))
      return deny(502,'NATIVE_EMBED_INVALID');
    return {status:200,payload:{model:body.model,embeddings:result.embeddings}};
  }catch{return deny(503,'NATIVE_INFERENCE_UNAVAILABLE');}
  finally{limiter?.release?.();}
}

export function makeLimiter(limit=MAX_PER_MINUTE,now=()=>Date.now()){
  let start=now(),calls=0,inFlight=0;
  return {take(){const time=now();if(time-start>=60000){start=time;calls=0;}
    if(calls>=limit||inFlight>=MAX_IN_FLIGHT)return false;calls++;inFlight++;return true;},
    release(){inFlight=Math.max(0,inFlight-1);}};
}

export function createNativeGateway({config=gatewayConfig(),fetcher=fetch}={}){
  const limiter=makeLimiter();
  return createServer(async(req,res)=>{
    // Neither URI nor request bodies are logged, retained, or accepted as credentials.
    const chunks=[];let total=0;
    try{
      for await(const part of req){total+=part.length;
        if(total>BODY_LIMIT){res.writeHead(413);res.end();return;}
        chunks.push(part);}
      let parsed=null;try{parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{parsed=null;}
      const result=await relayNativeRequest({method:req.method,path:req.url,
        authorization:req.headers.authorization,body:parsed},{config,fetcher,limiter});
      res.writeHead(result.status,{'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify(result.payload));
    }catch{res.writeHead(500,{'Cache-Control':'no-store'});res.end();}
  });
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  const config=gatewayConfig();
  createNativeGateway({config}).listen(config.port,'127.0.0.1',()=>{
    console.log('Holistic Native AI private gateway listening on localhost:'+config.port);
  });
}
