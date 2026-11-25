/**
 * Localhost-only gateway: Ollama NEVER listens on public interface.
 * Deploy behind TLS reverse proxy or named tunnel, with server-only bearer.
 * No prompt text in logs. Never put token in frontend or Git.
 */
import {createServer} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {fileURLToPath} from "node:url";
const TOKEN=/^[a-zA-Z0-9_-]{32,256}$/;
const MODEL=/^[a-z0-9][a-z0-9_.:/-]{1,100}$/i;
function authorized(header,token){
 if(typeof header!=="string"||!header.startsWith("Bearer ")||header.length>350)return false;
 const a=Buffer.from(header.slice(7)),b=Buffer.from(token);
 return a.length===b.length&&timingSafeEqual(a,b);
}
const send=(res,status,data)=>{
 res.writeHead(status,{"Content-Type":"application/json; charset=utf-8",
   "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
 res.end(JSON.stringify(data));
};
export function createOwnedAgentGateway({token,model,fetcher=fetch}={}){
 if(!TOKEN.test(token||"")||!MODEL.test(model||""))
   throw Error("GATEWAY_CONFIG_MISSING");
 let running=0;
 return createServer(async(req,res)=>{
  if(req.method!=="POST"||req.url!=="/api/chat"){
   send(res,404,{error:"NOT_FOUND"});return;
  }
  if(!authorized(req.headers.authorization,token)){
   send(res,401,{error:"UNAUTHORIZED"});return;
  }
  if(!/^application\/json(?:;|$)/i.test(req.headers["content-type"]||"")){
   send(res,415,{error:"JSON_REQUIRED"});return;
  }
  if(running>=2){send(res,429,{error:"BUSY"});return;}
  running++;
  try{
   let size=0;const chunks=[];
   for await(const chunk of req){
    size+=chunk.length;
    if(size>16000)throw Error("OVERSIZED");
    chunks.push(chunk);
   }
   let body;
   try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}
   catch{send(res,400,{error:"INVALID_JSON"});return;}
   const messages=body?.messages;
   if(body?.stream!==false||!Array.isArray(messages)||
      messages.length<2||messages.length>10||
      messages[0]?.role!=="system"||messages.at(-1)?.role!=="user"||
      messages.some(x=>!x||!["system","assistant","user"].includes(x.role)||
        typeof x.content!=="string"||x.content.length>7000)){
      send(res,400,{error:"INVALID_PROMPT"});return;
   }
   const clean=messages.map(x=>({role:x.role,content:x.content}));
   const upstream=await fetcher("http://127.0.0.1:11434/api/chat",{
    method:"POST",redirect:"error",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    signal:AbortSignal.timeout(18000),
    body:JSON.stringify({model,messages:clean,stream:false,think:false,
      options:{temperature:0.45,num_predict:240}}),
   });
   if(!upstream?.ok){send(res,503,{error:"MODEL_UNAVAILABLE"});return;}
   const data=await upstream.json();
   if(typeof data?.message?.content!=="string"||
      data.message.content.length>2200){
    send(res,502,{error:"INVALID_OUTPUT"});return;
   }
   send(res,200,{message:{content:data.message.content}});
  }catch{send(res,503,{error:"MODEL_UNAVAILABLE"});}
  finally{running--;}
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const server=createOwnedAgentGateway({
  token:process.env.HH_AGENT_GATEWAY_TOKEN,
  model:process.env.HH_AGENT_OLLAMA_MODEL,
 });
 server.listen(8787,"127.0.0.1",()=>{
  process.stdout.write("HH private AI gateway listening on loopback\n");
 });
}
