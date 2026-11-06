#!/usr/bin/env node
/** Read-only official FWS video B-roll source inventory; no video downloads, no licenses inferred. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const COLLECTIONS=Object.freeze([
 ['birds','/NCTC-american-bird-b-rolls'],
 ['wildlife','/NCTC-wildlife-b-rolls'],
 ['monarch','/NCTC-monarch-butterfly-b-rolls'],
 ['fisheries','/NCTC-fisheries-b-rolls'],
 ['landscapes-people','/NCTC-people-and-places-b-rolls'],
 ['underwater','/NCTC-underwater-b-rolls']
]);
function entity(s){return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;|&#39;/g,"'")
 .replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();}
export function extractLinks(html,page,category){
 if(typeof html!=='string'||html.length<150)return [];
 const out=[],seen=new Set();const regex=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(regex)){
  let url;try{url=new URL(entity(m[1]),page)}catch{continue}
  if(url.protocol!=='https:'|| !['fws.rev.vbrick.com','www.fws.gov'].includes(url.hostname))continue;
  if(url.hostname==='www.fws.gov'&&!/^\/(media|library\/media)\//.test(url.pathname))continue;
  if(url.username||url.password)continue;
  const title=entity(m[2]);if(title.length<3||title.length>180||seen.has(url.toString()))continue;
  seen.add(url.toString());out.push({category,title,officialSourcePage:page,videoPage:url.toString(),
    provider:'USFWS_NCTC',videoFileDownloaded:false,estimatedClipCount:0,
    rawMediaRightsCheckRequired:true,thirdPartyMusicMayBeLicensed:true,
    noRawVideoPublication:true,cloudflareR2Uploaded:false,generatorEligible:false});
 }return out;
}
async function main(){
 const dir=resolve('artifacts/fws-wave9');mkdirSync(dir,{recursive:true});
 const sources=[],errors=[];
 for(const [category,path] of COLLECTIONS){
  const url='https://www.fws.gov'+path;
  try{const r=await fetch(url,{signal:AbortSignal.timeout(13000),redirect:'error'});
   if(!r.ok)throw Error('HTTP_'+r.status);const html=await r.text();if(html.length>4000000)throw Error('FWS_HTML_TOO_LARGE');
   const rows=extractLinks(html,url,category);sources.push(...rows);console.log('USFWS_SOURCE_INDEX',category,rows.length);
  }catch(e){errors.push({category,error:String(e.message||e).slice(0,110)});console.log('USFWS_INDEX_HOLD',category,String(e.message||e).slice(0,120));}
 }
 const report={schemaVersion:'hh-fws-wave9-research-v1',source:'USFWS National Conservation Training Center B-Roll',
 rightsGuide:'https://www.fws.gov/library/collections/b-roll-videos',checkedAt:new Date().toISOString(),
 categories:COLLECTIONS.length,videoPagesFound:sources.length,physicalMp4:0,
 cloudflareR2Uploaded:0,generatorEligible:0,errors,sources};
 writeFileSync(resolve(dir,'official-source-pages.json'),JSON.stringify(report,null,2)+'\n');
 console.log('FWS_RESEARCH_ONLY',sources.length,'video source links; 0 MP4');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(String(e));process.exitCode=1});
