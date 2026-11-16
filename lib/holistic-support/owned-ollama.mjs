/**
 * Dedicated Ollama adapter for own hardware. Never choose URL from user input.
 * Server operator supplies endpoint, model and bearer token from env.
 * Does not expose a public API by itself. No third-party AI provider is called.
 */
const safeModel = /^[a-z0-9][a-z0-9_.:/-]{0,100}$/i;
export function validatedOllamaConfig({endpoint,model,production=true}={}) {
  if(typeof endpoint!=="string"||typeof model!=="string"||!safeModel.test(model))return null;
  let url;try{url=new URL(endpoint);}catch{return null;}
  if(url.pathname!=="/api/chat"||url.search||url.hash||url.username||url.password)return null;
  const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(url.protocol!=="https:"&&!(production===false&&local&&url.protocol==="http:"))return null;
  return {endpoint:url.toString(),model};
}
export async function generateOwnedOllama(request,{
  endpoint,model,bearerToken,production=true,fetcher=fetch,signal,
}={}) {
  const config=validatedOllamaConfig({endpoint,model,production});
  if(!config||typeof bearerToken!=="string"||bearerToken.length<20)
    throw Error("OWNED_MODEL_UNAVAILABLE");
  const messages=Array.isArray(request?.messages)?request.messages:[];
  if(!messages.length||messages.length>10||messages.some(x=>
    !["system","user","assistant"].includes(x?.role)||
    typeof x.content!=="string"||x.content.length>7000))
    throw Error("INVALID_MODEL_PROMPT");
  const response=await fetcher(config.endpoint,{
    method:"POST",redirect:"error",cache:"no-store",signal,
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+bearerToken},
    body:JSON.stringify({model:config.model,messages,stream:false,think:false,
      options:{temperature:0.45,num_predict:240}}),
  });
  if(!response?.ok)throw Error("OWNED_MODEL_UNAVAILABLE");
  const result=await response.json();
  return typeof result?.message?.content==="string"?result.message.content:"";
}
