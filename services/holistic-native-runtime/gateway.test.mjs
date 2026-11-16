import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  gatewayConfig,authorized,validateChatBody,validateEmbedBody,
  relayNativeRequest,makeLimiter,createNativeGateway,
} from './gateway.mjs';

const token='a-tested-first-party-runtime-token-over-32-characters';
const config=gatewayConfig({HH_NATIVE_RUNTIME_TOKEN:token});
const okBody={model:'qwen3.5:0.8b',messages:[{role:'system',content:'Be concise.'},
  {role:'user',content:'Привет!'}],stream:false,think:false,
  options:{temperature:0.9,num_predict:240}};
const mockFetch=async (url,options)=>({ok:true,
  text:async()=>url.endsWith('/api/chat')
    ?JSON.stringify({message:{role:'assistant',content:'Здравствуйте! Чем могу помочь?'}})
    :JSON.stringify({embeddings:[[0.1,0.2,...Array(30).fill(0)]]})});

test('private token required and constant-time comparison has no anonymous bypass',()=>{
  assert.equal(authorized('Bearer '+token,token),true);
  for(const x of [undefined,'',token,'Basic '+token,'Bearer wrong','Bearer '+token+'x'])
    assert.equal(authorized(x,token),false);
  assert.throws(()=>gatewayConfig({HH_NATIVE_RUNTIME_TOKEN:'short'}),/TOKEN_REQUIRED/);
  assert.throws(()=>gatewayConfig({HH_NATIVE_RUNTIME_TOKEN:token,HH_NATIVE_CHAT_MODEL:'../../secret'}),/INVALID_NATIVE_MODEL_NAME/);
});

test('trusted generation payload disables tools, streaming and unsafe options',()=>{
  const x=validateChatBody(okBody,config);
  assert.equal(x.model,'qwen3.5:0.8b');
  assert.equal(x.stream,false);assert.equal(x.think,false);
  assert.equal(x.options.num_predict,48);
  assert.equal(x.options.num_ctx,3072);
  assert.deepEqual(x.messages,okBody.messages);
  assert.equal(validateChatBody({...okBody,model:'other'},config),null);
  assert.equal(validateChatBody({...okBody,tools:[]},config),null);
  assert.equal(validateChatBody({...okBody,stream:true},config),null);
  assert.equal(validateChatBody({...okBody,messages:[{role:'tool',content:'fake'}]},config),null);
  assert.equal(validateChatBody({...okBody,messages:[{role:'user',content:'Hi',tool_calls:[]}]},config),null);
});

test('chat and embedding are fixed loopback destinations; no user-selected external URLs',async()=>{
  const urls=[];
  const f=async(url,options)=>{urls.push({url,options});return mockFetch(url,options);};
  const chat=await relayNativeRequest({method:'POST',path:'/api/chat',
    authorization:'Bearer '+token,body:okBody},{config,fetcher:f});
  assert.equal(chat.status,200);
  assert.equal(chat.payload.message.content,'Здравствуйте! Чем могу помочь?');
  const embed=await relayNativeRequest({method:'POST',path:'/api/embed',
    authorization:'Bearer '+token,
    body:{model:'qwen3-embedding:0.6b',input:'query: hello'}},{config,fetcher:f});
  assert.equal(embed.status,200);
  assert.equal(embed.payload.embeddings[0].length,32);
  assert.deepEqual(urls.map(x=>x.url),['http://127.0.0.1:11434/api/chat','http://127.0.0.1:11434/api/embed']);
  assert.ok(urls.every(x=>!x.options.headers.Authorization));
  assert.ok(urls.every(x=>x.options.redirect==='error'));
  assert.equal(validateEmbedBody({model:'qwen3-embedding:0.6b',input:'query: hi'},config).input,'query: hi');
  assert.equal(validateEmbedBody({model:'x',input:'query: hi'},config),null);
});

test('no token, unknown path, rate overflow, provider outage and malformed response fail closed',async()=>{
  const request={method:'POST',path:'/api/chat',authorization:'Bearer '+token,body:okBody};
  assert.equal((await relayNativeRequest({...request,authorization:''},{config,fetcher:mockFetch})).status,401);
  assert.equal((await relayNativeRequest({...request,path:'http://attacker.example/api/chat'},
    {config,fetcher:mockFetch})).status,404);
  const limiter=makeLimiter(1,()=>100);
  assert.equal((await relayNativeRequest(request,{config,fetcher:mockFetch,limiter})).status,200);
  assert.equal((await relayNativeRequest(request,{config,fetcher:mockFetch,limiter})).status,429);
  assert.equal((await relayNativeRequest(request,{config,fetcher:async()=>{throw Error('fail');}})).status,503);
  assert.equal((await relayNativeRequest(request,{config,fetcher:async()=>({ok:true,text:async()=>'{broken'})})).status,503);
  assert.equal((await relayNativeRequest(request,{config,fetcher:async()=>({ok:true,text:async()=>'{\"message\":{\"content\":17}}'})})).status,502);
});

test('E5 localhost-only alternative is optional and does not require external API',async()=>{
  const e5=gatewayConfig({HH_NATIVE_RUNTIME_TOKEN:token,HH_NATIVE_EMBED_BACKEND:'e5'});
  const urls=[];
  const result=await relayNativeRequest({method:'POST',path:'/api/embed',
    authorization:'Bearer '+token,body:{model:'multilingual-e5-small',input:'query: hello'}},
    {config:e5,fetcher:async (url,options)=>{urls.push(url);return mockFetch(url,options);}});
  assert.equal(result.status,200);
  assert.deepEqual(urls,['http://127.0.0.1:8788/embed']);
});

test('actual localhost HTTP gateway denies untrusted requests and can serve injected local inference',async()=>{
  const server=createNativeGateway({config,fetcher:mockFetch});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const url='http://127.0.0.1:'+server.address().port+'/api/chat';
    const denied=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(okBody)});
    assert.equal(denied.status,401);
    const allowed=await fetch(url,{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(okBody)});
    assert.equal(allowed.status,200);
    assert.equal((await allowed.json()).message.content,'Здравствуйте! Чем могу помочь?');
  }finally{await new Promise(r=>server.close(r));}
});
