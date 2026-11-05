#!/usr/bin/env node
/** Correct actual Wave4 official-video false rejections, only inside ephemeral QA job. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const parserFile=resolve(root,'lib/video-vault/dareful-public-discovery.mjs');
let parser=readFileSync(parserFile,'utf8');
const start=parser.indexOf('  const media=[...decoded.matchAll(');
const finish=parser.indexOf('  const heading=',start);
if(start<0||finish<start||!parser.includes('mediaUrl:`https://stream.mux.com/${streamIds[0]}.m3u8`'))
  throw Error('wave4_source_version_unrecognized');
const improved=String.raw`  // Related thumbnails may embed OTHER Mux playback URLs on the same page.
  // Select exactly the official Download Video anchor rather than requiring
  // every Mux reference in the page source to refer to one playback ID.
  const media=[...decoded.matchAll(/https:\/\/stream\.mux\.com\/([A-Za-z0-9]+)\.m3u8\b/g)];
  const streamIds=[...new Set(media.map(x=>x[1]))];
  const downloadAnchors=[...decoded.matchAll(/<a\b[^>]*\bhref\s*=\s*(['"])(https:\/\/stream\.mux\.com\/([A-Za-z0-9]+)\.m3u8)\1[^>]*>([\s\S]*?)<\/a>/gi)];
  const directIds=[...new Set(downloadAnchors.filter(m=>/download\s*(?:video|footage|mp4)\b/i.test(m[4].replace(/<[^>]*>/g,' ').replace(/\s+/g,' '))).map(m=>m[3]))];
  const chosen=directIds.length===1?directIds[0]:
    directIds.length===0&&streamIds.length===1?streamIds[0]:null;
  if(!chosen)return null;
`;
parser=parser.slice(0,start)+improved+parser.slice(finish);
parser=parser.replace('mediaUrl:`https://stream.mux.com/${streamIds[0]}.m3u8`',
  'mediaUrl:`https://stream.mux.com/${chosen}.m3u8`');
writeFileSync(parserFile,parser);
const discoveryFile=resolve(root,'scripts/dareful-wave4-discover.mjs');
let discovery=readFileSync(discoveryFile,'utf8');
const needle='const pages=[...candidates].sort();';
if(!discovery.includes(needle))throw Error('wave4_discovery_version_unrecognized');
const replace=String.raw`const seeds=JSON.parse(readFileSync(join(repo,'hh-dareful-wave4-seeds-verified-20261105.json'),'utf8'));
if(seeds.schemaVersion!=='hh-dareful-wave4-manually-verified-research-v1'||seeds.count!==6||
   !Array.isArray(seeds.sources)||seeds.sources.length!==6)throw Error('invalid_seed_manifest');
const seedPages=seeds.sources.map(s=>safeDarefulPage(s.sourcePage));
if(seedPages.some(p=>!p||excluded.has(p))||new Set(seedPages).size!==6)throw Error('duplicate_seed_manifest');
const physicalFirstWaveIds=[
  'free-4k-holiday-video-cozy-fire-in-a-fireplace',
  'free-4k-stock-video-clip-of-a-sunset-over-malibu-california',
  'free-4k-stock-video-clip-of-hot-air-balloons-stock-footage',
  'free-4k-stock-video-clip-of-the-new-york-stock-exchange-stock-footage',
  'free-4k-stock-video-of-golden-fireworks-stock-footage',
  'free-4k-time-lapse-astro-stock-video-perseid-meteor-shower',
  'free-4k-time-lapse-stock-video-ominous-clouds-and-smog-in-asia',
  'free-4k-uhd-stock-video-acadia-national-park-lighthouse',
  'free-out-of-focus-police-lights-4k-stock-video',
  'free-white-house-in-winter-blizzard-4k-stock-video',
  'full-moon-night',
  'ocean-coast-aerial',
  'people-beach-ocean',
  'sunset-surfer-sport'
];
for(const id of physicalFirstWaveIds)excluded.add(SITE+id+'/');
const pages=[...seedPages,...[...candidates].sort().filter(p=>!excluded.has(p)&&!seedPages.includes(p))];`;
discovery=discovery.replace(needle,replace);
writeFileSync(discoveryFile,discovery);
const {parseLicensedPage}=await import(pathToFileURL(parserFile).href+'?verified_fix=20261105');
const page='https://dareful.com/boat-harbor-aerial/';
const html='<h1>Boat Harbor Aerial</h1><a href="https://creativecommons.org/licenses/by/4.0/">CC</a>'+ 
  '<a class="primary" href="https://stream.mux.com/PRIM123.m3u8">Download Video</a>'+ 
  '<a href="https://stream.mux.com/OTHER456.m3u8">Similar video</a> Duration —00:34';
if(parseLicensedPage(html,page)?.mediaUrl!=='https://stream.mux.com/PRIM123.m3u8')
  throw Error('primary_download_anchor_not_found');
if(parseLicensedPage(html.replace('Similar video','Download Video'),page)!==null)
  throw Error('multiple_primary_downloads_not_rejected');
console.log('WAVE4_VERIFIED_REPAIR_PASS: primary film versus 2 related Mux media IDs; 6 first-party seeds prioritized');
