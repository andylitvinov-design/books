/**
 * Private, optional Google Sheets read-only bridge. Runs SERVER SIDE only.
 * Requires owner-provisioned service account with access to the private Sheet.
 * No credentials, cached records, or private Google URLs are committed to Git.
 */
import { sign } from "node:crypto";
import { prepareKnowledgeRecord } from "./registry.mjs";
const TOKEN_ENDPOINT="https://oauth2.googleapis.com/token";
const SHEETS_ENDPOINT="https://sheets.googleapis.com/v4/spreadsheets/";
const SCOPE="https://www.googleapis.com/auth/spreadsheets.readonly";
const RANGES=[
  "'Источники'!A5:I200", "'Решения'!A5:K200",
  "'План'!A5:K200", "'Палитра'!A5:G200",
];
const trim=(x,n=500)=>typeof x==="string"?x.trim().slice(0,n):"";
const b64=obj=>Buffer.from(JSON.stringify(obj)).toString("base64url");
const dated=s=>/^20\d\d-\d\d-\d\d$/.test(s)?s:"";
const rowRecord=(category, cells)=>{
  const x=Array.isArray(cells)?cells:[];
  if(category==="source") return prepareKnowledgeRecord({
    category,id:trim(x[0],60),title:trim(x[2],200),summary:trim(x[6],600),
    status:trim(x[4],90),date:dated(x[5]),sourceUrl:x[7],tags:x[1]
  });
  if(category==="decision") return prepareKnowledgeRecord({
    category,id:trim(x[0],60),title:trim(x[2],220),summary:trim(x[10],600),
    status:trim(x[3],90)+" / "+trim(x[4],90),priority:trim(x[5],3),
    date:dated(x[6]),sourceId:trim(x[7],60),sourceUrl:x[8],tags:trim(x[1])+" "+trim(x[9])
  });
  if(category==="plan") return prepareKnowledgeRecord({
    category,id:trim(x[0],60),title:trim(x[2],220),summary:trim(x[6],600),
    status:trim(x[5],90),priority:trim(x[3],3),sourceId:trim(x[7],60),
    sourceUrl:x[8],tags:trim(x[1])+" "+trim(x[4])
  });
  if(category==="palette") return prepareKnowledgeRecord({
    category,id:"PAL-"+String(x[0]||"").replace(/[^a-z0-9]/gi,"").slice(0,32),
    title:trim(x[0])+" · "+trim(x[2]),summary:trim(x[1])+" / "+trim(x[5]),
    tags:trim(x[3])+" "+trim(x[4]),sourceId:"DES-001"
  });
  return null;
};
export function parseKnowledgeSheetRanges(valueRanges) {
  if(!Array.isArray(valueRanges)||valueRanges.length!==4) return [];
  return valueRanges.flatMap((range,i)=>{
    const category=["source","decision","plan","palette"][i];
    return (Array.isArray(range?.values)?range.values:[]).slice(0,196)
      .map(cells=>rowRecord(category,cells)).filter(Boolean);
  }).slice(0,700);
}
export function knowledgeConfig(env=process.env) {
  const sheetId=env.HH_KNOWLEDGE_SHEET_ID||"";
  const email=env.HH_KNOWLEDGE_GOOGLE_CLIENT_EMAIL||"";
  const key=(env.HH_KNOWLEDGE_GOOGLE_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  if(!sheetId&&!email&&!key) return null;
  if(!/^[A-Za-z0-9_-]{20,128}$/.test(sheetId)||
     !/^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+\.gserviceaccount\.com$/.test(email)||
     !key.startsWith("-----BEGIN PRIVATE KEY-----")) return null;
  return {sheetId,email,key};
}
async function googleFetch(fetcher,url,options={}) {
  const response=await fetcher(url,{...options,signal:AbortSignal.timeout(5000),
    redirect:"error",cache:"no-store"});
  if(!response?.ok) throw new Error("PROJECT_KNOWLEDGE_PROVIDER_UNAVAILABLE");
  return response.json();
}
export async function loadPrivateKnowledge({env=process.env,fetcher=fetch,clock=Date.now}={}) {
  const config=knowledgeConfig(env);
  if(!config) return {mode:"not_configured",records:[],fetchedAt:null};
  try{
    const now=Math.floor(clock()/1000);
    const header=b64({alg:"RS256",typ:"JWT"});
    const claims=b64({iss:config.email,scope:SCOPE,aud:TOKEN_ENDPOINT,iat:now,exp:now+3000});
    const signed=header+"."+claims;
    const jwt=signed+"."+sign("RSA-SHA256",Buffer.from(signed),config.key).toString("base64url");
    const auth=await googleFetch(fetcher,TOKEN_ENDPOINT,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
    if(typeof auth.access_token!=="string"||auth.access_token.length<16||auth.access_token.length>5000)
      throw new Error("PROJECT_KNOWLEDGE_PROVIDER_UNAVAILABLE");
    const params=new URLSearchParams({majorDimension:"ROWS"});
    for(const range of RANGES) params.append("ranges",range);
    const data=await googleFetch(fetcher,SHEETS_ENDPOINT+encodeURIComponent(config.sheetId)+
      "/values:batchGet?"+params.toString(),{headers:{authorization:"Bearer "+auth.access_token}});
    if(!Array.isArray(data.valueRanges)||data.valueRanges.length!==4)
      throw new Error("PROJECT_KNOWLEDGE_PROVIDER_UNAVAILABLE");
    return {mode:"drive_readonly",records:parseKnowledgeSheetRanges(data.valueRanges),
      fetchedAt:new Date(clock()).toISOString()};
  }catch{
    // Fail closed; never log provider payloads, bearer tokens or private sheet IDs.
    return {mode:"unavailable",records:[],fetchedAt:null};
  }
}
let cache=null, loading=null;
export async function getProjectKnowledgeSnapshot() {
  if(cache && cache.validUntil>Date.now())return cache.data;
  if(loading)return loading;
  loading=loadPrivateKnowledge().then(data=>{
    cache={data,validUntil:Date.now()+(data.mode==="drive_readonly"?120000:15000)};
    return data;
  }).finally(()=>{loading=null;});
  return loading;
}
