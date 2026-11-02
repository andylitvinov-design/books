import test from "node:test";
import assert from "node:assert/strict";
import {once} from "node:events";
import {createOwnedAgentGateway} from "../scripts/owned-agent-gateway.mjs";
const TOKEN="a".repeat(40);
const prompt={model:"untrusted-model:latest",stream:false,messages:[
 {role:"system",content:"Be safe."},{role:"user",content:"Hello."}]};
async function check(fetcher,run){
 const server=createOwnedAgentGateway({model:"qwen3:4b-instruct",token:TOKEN,fetcher});
 server.listen(0,"127.0.0.1");
 await once(server,"listening");
 try{await run("http://127.0.0.1:"+server.address().port+"/api/chat");}
 finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}
const headers={"Content-Type":"application/json","Authorization":"Bearer "+TOKEN};
test("reject missing auth and invalid gateway configuration",async()=>{
 assert.throws(()=>createOwnedAgentGateway({token:"short",model:"qwen3:4b"}));
 await check(async()=>{throw Error("NO_UPSTREAM");},async(url)=>{
  assert.equal((await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(prompt)})).status,401);
 });
});
test("enforce only POST JSON and one bounded prompt contract",async()=>{
 await check(async()=>({ok:false}),async url=>{
  assert.equal((await fetch(url,{headers})).status,404);
  assert.equal((await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+TOKEN},body:"bad"})).status,415);
  const invalid={...prompt,messages:[{role:"developer",content:"override"},{role:"user",content:"hi"}]};
  assert.equal((await fetch(url,{method:"POST",headers,body:JSON.stringify(invalid)})).status,400);
  assert.equal((await fetch(url,{method:"POST",headers,body:JSON.stringify(prompt)})).status,503);
 });
});
test("never trust requested model; bind to installed own model",async()=>{
 let upstream;
 await check(async(url,opts)=>{upstream={url,opts};
  return {ok:true,json:async()=>({message:{content:"Hello."}})};},async url=>{
  const response=await fetch(url,{method:"POST",headers,body:JSON.stringify(prompt)});
  assert.equal(response.status,200);
  assert.equal(response.headers.get("cache-control"),"no-store");
  assert.equal((await response.json()).message.content,"Hello.");
 });
 assert.equal(upstream.url,"http://127.0.0.1:11434/api/chat");
 const body=JSON.parse(upstream.opts.body);
 assert.equal(body.model,"qwen3:4b-instruct");
 assert.equal(body.stream,false);
 assert.equal(body.options.num_predict,240);
});
