'use strict';
const HOUR=3600000;
function isRateLimitError(error){
 const status=Number(error?.status??error?.response?.status);
 if(status!==403&&status!==429)return false;
 const headers=error?.response?.headers??error?.headers??{};
 const get=name=>typeof headers.get==='function'?headers.get(name):headers[name]??headers[name.toLowerCase()];
 const message=(String(error?.message||'')+' '+String(error?.response?.data?.message||'')).toLowerCase();
 const remain=get('x-ratelimit-remaining');
 return message.includes('rate limit')||message.includes('rate_limit')||
   message.includes('secondary')||message.includes('abuse')||
   (remain!==null&&remain!==undefined&&Number(remain)===0);
}
function retryAt(error,now=Date.now()){
 const h=error?.response?.headers??error?.headers??{};
 const get=name=>typeof h.get==='function'?h.get(name):h[name]??h[name.toLowerCase()];
 const after=Number(get('retry-after'));
 if(Number.isFinite(after)&&after>0)return new Date(now+Math.max(60,after)*1000).toISOString();
 const reset=Number(get('x-ratelimit-reset'));
 if(Number.isFinite(reset)&&reset*1000>now)return new Date(reset*1000+10000).toISOString();
 return new Date(now+60000).toISOString();
}
/** Keep all PRs in the cheap inventory, but bound and rotate deep exact-head checks. */
function selectDeepScan(prs,now,{limit=36,fresh=12}={}){
 if(!Array.isArray(prs)||!Number.isFinite(now)||
    !Number.isSafeInteger(limit)||limit<1||limit>100||
    !Number.isSafeInteger(fresh)||fresh<0||fresh>limit)
   throw Error('Invalid bounded PR scan inputs');
 const unique=new Map();
 for(const pr of prs)
  if(Number.isSafeInteger(pr?.number)&&pr.number>0)unique.set(pr.number,pr);
 const recent=[...unique.values()].sort((a,b)=>
  ((Date.parse(b.updated_at||'')||0)-(Date.parse(a.updated_at||'')||0))||
  b.number-a.number);
 const hot=recent.slice(0,Math.min(limit,fresh));
 const rest=recent.slice(hot.length).sort((a,b)=>a.number-b.number);
 const slots=limit-hot.length;
 const start=rest.length?(Math.floor(now/HOUR)*slots)%rest.length:0;
 return [...hot,...Array.from({length:Math.min(slots,rest.length)},
  (_,i)=>rest[(start+i)%rest.length])];
}
module.exports={isRateLimitError,retryAt,selectDeepScan};
