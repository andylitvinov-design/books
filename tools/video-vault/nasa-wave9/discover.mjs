#!/usr/bin/env node
/** One-shot metadata-only NASA Image/Video Library selection. No client/media writes. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const QUERIES = Object.freeze([
  'Earth from ISS','Earth timelapse ISS','aurora from space','Earth at night ISS',
  'sunrise from space station','clouds over Earth orbit','ocean from ISS',
  'moon surface footage','Earth observation station','hurricane Earth from space'
]);
export const NASA_LIBRARY='https://images-api.nasa.gov';
const NASA_ID=/^[a-z0-9][a-z0-9_\-]{2,119}$/i;
const NASA_CENTERS=/^(JSC|KSC|GSFC|MSFC|JPL|ARC|HQ|LaRC|GRC|AFRC|SSC|WFF|NASA)$/i;
const DONT_USE=/\b(animation|animated|simulation|simulated|rendering|illustration|graphic|music video|documentary|podcast|interview|conference|press release|briefing|webcast|live stream|commercial|sponsored|trailer|lecture|tutorial|subtitles|slideshow|recreation|composite|modeling)\b/i;
const TOPIC=/\b(earth|space|iss|aurora|astronaut|moon|lunar|sunrise|sunset|horizon|orbit|clouds|ocean|planet|lightning|storm|night|spacecraft|station|cosmos|stars|timelapse)\b/i;
export const safeNasaId=id=>typeof id==='string'&&NASA_ID.test(id);
export function candidate(item){
 const d=item?.data?.[0];
 if(!d||d.media_type!=='video'||!safeNasaId(d.nasa_id)||!NASA_CENTERS.test(String(d.center||'')))return null;
 const title=String(d.title||'').trim().slice(0,200);
 const description=String(d.description||'').slice(0,1400);
 if(title.length<6||DONT_USE.test(title)||!TOPIC.test(title+' '+description))return null;
 if(/\b(copyright|©|all rights reserved|courtesy of (?!nasa)|licensed footage|stock footage)\b/i.test(description))return null;
 if(/\banimation\b/i.test(description.slice(0,220)))return null;
 return {nasaId:d.nasa_id,title,description:description.slice(0,400),center:d.center,
   archiveItemPage:`https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`,
   assetApi:`${NASA_LIBRARY}/asset/${encodeURIComponent(d.nasa_id)}`,
   provider:'nasa_images',mediaType:'video',sourceFootageCameraVerified:false,
   editorialApproval:false,individualRightsReviewRequired:true,
   govtEndorsementProhibited:true,commercialPromotionalUseNotGranted:true,
   thirdPartyCopyrightScreenRequired:true,subjectReleaseNotVerified:true,
   logoFreeNotVerified:true,cloudflareR2UploadVerified:false,generatorEligible:false,
   tagSuggestions:QUERIES.filter(q=>title.toLowerCase().includes(q.slice(0,4).toLowerCase())).slice(0,2)};
}
export function dedupe(items){
 const seen=new Set(),out=[];
 for(const i of items){const c=candidate(i);if(c&&!seen.has(c.nasaId)){seen.add(c.nasaId);out.push(c)}}
 return out;
}
async function getJson(url,{timeout=15000, maxBytes=2500000}={}){
 const parsed=new URL(url);
 if(parsed.origin!==NASA_LIBRARY)throw Error('NASA_SOURCE_HOST_REQUIRED');
 const resp=await fetch(url,{signal:AbortSignal.timeout(timeout),redirect:'error',headers:{accept:'application/json'}});
 if(!resp.ok)throw Error('NASA_HTTP_'+resp.status);
 const body=await resp.text();if(body.length>maxBytes)throw Error('NASA_JSON_TOO_LARGE');
 return JSON.parse(body);
}
async function main(){
 const root=process.cwd();const out=resolve(root,'artifacts/nasa-wave9');mkdirSync(out,{recursive:true});
 const errors=[],data=[];
 for(const q of QUERIES){
  const url=new URL(`${NASA_LIBRARY}/search`);url.searchParams.set('q',q);url.searchParams.set('media_type','video');url.searchParams.set('page_size','35');
  try{const json=await getJson(url.toString());const items=json?.collection?.items||[];
   if(!Array.isArray(items))throw Error('NASA_INVALID_ITEMS');data.push(...items.slice(0,35));
   console.log('NASA_QUERY',q,'items',items.length);
  }catch(e){errors.push({query:q,error:String(e.message||e).slice(0,100)});console.log('NASA_DISCOVERY_FAIL',q,String(e.message||e).slice(0,100));}
 }
 const candidates=dedupe(data).slice(0,40);
 const result={schemaVersion:'hh-nasa-wave9-v1',checkedAt:new Date().toISOString(),
  source:'NASA Image and Video Library API (read-only metadata)',
  usagePolicy:'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  queries:QUERIES.length,screenCap:40,listedItems:data.length,
  candidates,errors,rightsPublication:'HOLD_MANUAL',originalCameraCountVerified:0,
  downloadedMp4Count:0,cloudflareR2Uploaded:0,generatorEligible:0,
  sourceQueryNoNewServices:true};
 writeFileSync(resolve(out,'candidates.json'),JSON.stringify(result,null,2)+'\n');
 console.log('NASA_WAVE9_DISCOVERY',JSON.stringify({queries:QUERIES.length,candidates:candidates.length,errors:errors.length}));
 if(!candidates.length)process.exitCode=1;
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)main().catch(e=>{console.error('NASA_WAVE9_FATAL',String(e));process.exitCode=1});
