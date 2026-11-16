#!/usr/bin/env node
/** Read-only local search of all approved Holistic House clips (dynamic approved catalogue).
 * Run: node scripts/search-approved-video-scenes.mjs --query "солнечный лес без воды" --type licensed
 *        [--aspect portrait] [--limit 8] [--locale ru]
 * Does not download, upload, edit catalog files, or run a paid model.
 */
import licensed from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import original from '../data/video-catalog/original-motion-scenes-v1.json' with {type:'json'};
import curated from '../data/video-catalog/mytube-scene-rankings-v1.json' with {type:'json'};
import {MYTUBE_VISUAL_MOTIFS,MYTUBE_VISUAL_STYLES} from '../lib/mandala/mytube-creative-choices.mjs';
import {auditVideoSceneTags} from '../lib/mandala/video-source-tag-facets.mjs';
import {searchApprovedVideoScenes} from '../lib/mandala/video-scene-search.mjs';

const args=process.argv.slice(2);
const read=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1];};
const scenes=[...licensed.scenes,...original.scenes];
const topicsById=Object.fromEntries(curated.scenes.map(row=>[row.sceneId,row.topics]));
const opts={motifs:MYTUBE_VISUAL_MOTIFS,styles:MYTUBE_VISUAL_STYLES,topicsById};
const audit=auditVideoSceneTags(scenes,opts);
if(audit.missing.length||audit.total!==scenes.length||audit.tagged!==scenes.length)
  throw new Error(`VIDEO_TAG_SEARCH_AUDIT_MISSING:${audit.missing.length}`);
const result=searchApprovedVideoScenes({scenes,...opts,
 query:read('--query',''),locale:read('--locale','ru'),
 sourceType:read('--type','all'),
 aspect:read('--aspect',null),pace:read('--pace',null),
 limit:Number(read('--limit',24))});
console.log(JSON.stringify({coverage:{total:audit.total,tagged:audit.tagged},...result},null,2));
if(result.status==='invalid_filters'||result.status==='invalid_query')process.exitCode=1;
