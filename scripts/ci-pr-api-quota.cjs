'use strict';
// Per-run, per-credential quota protection. Never treat secondary throttling as an ACL denial.
const RATE_PATTERN=/rate[ -]?limit|secondary rate|abuse detection|too many requests/i;
function headersOf(x){return x?.response?.headers||x?.headers||{};}
function header(h,name){return h?.[name]??h?.[name.toLowerCase()]??h?.[name.toUpperCase()]??null;}
function classify(error){
 const status=Number(error?.status??error?.response?.status??0);
 const headers=headersOf(error);
 const rawRemaining=header(headers,'x-ratelimit-remaining');
 const remaining=rawRemaining===null||rawRemaining===''?NaN:Number(rawRemaining);
 const message=String(error?.message||error?.response?.data?.message||'');
 return (status===429 || ((status===403||status===429)&&
   (RATE_PATTERN.test(message)||header(headers,'retry-after')!==null||
   (Number.isFinite(remaining)&&remaining===0))))?'RATE_LIMIT':null;
}
function resetAt(error,now=Date.now()){
 const h=headersOf(error),retry=header(h,'retry-after');
 if(retry!==null){
   const seconds=Number(retry);
   if(Number.isFinite(seconds)&&seconds>=0)return now+Math.min(seconds*1000,24*3600000);
   const date=Date.parse(retry);if(Number.isFinite(date))return date;
 }
 const reset=Number(header(h,'x-ratelimit-reset'));
 if(Number.isFinite(reset)&&reset>0)return reset*1000;
 return now+60000;
}
function createQuotaGuard({maxCalls=65,minRemaining=100,onPause=()=>{},now=()=>Date.now()}={}){
 const state={requests:0,remaining:null,paused:false,reason:null,retryAt:null};
 async function limited(name,fn){
   if(state.paused||state.requests>=maxCalls){
     state.paused=true;state.reason||='LOCAL_REQUEST_BUDGET';
     throw Object.assign(new Error('HH_API_PAUSED: '+name),{quotaPaused:true});
   }
   state.requests++;
   try{
     const result=await fn();
     const raw=header(headersOf(result),'x-ratelimit-remaining');
     if(raw!==null&&raw!==''&&Number.isFinite(Number(raw))){
       state.remaining=Number(raw);
       if(state.remaining<minRemaining){
         state.paused=true;state.reason='GITHUB_RATE_RESERVE';
         onPause(state);
       }
     }
     return result;
   }catch(error){
     if(classify(error)){
       state.paused=true;state.reason='GITHUB_RATE_LIMIT';
       state.retryAt=new Date(resetAt(error,now())).toISOString();
       onPause(state);
     }
     throw error;
   }
 }
 return {state,limited};
}
module.exports={classify,resetAt,createQuotaGuard};
