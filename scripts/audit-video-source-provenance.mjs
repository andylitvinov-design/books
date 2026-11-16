#!/usr/bin/env node
/** Deterministic read-only VIDEO POWER baseline. No provider or cloud requests. */
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditPublishedSourceOrigins} from '../lib/video-vault/published-provenance.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.some(x=>x!=='--json'&&x!=='--strict'))throw Error('HH_VIDEO_PROVENANCE_INVALID_OPTION');
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const report=auditPublishedSourceOrigins(
 read('data/video-catalog/scene-taxonomy.json'),
 read('data/video-catalog/original-motion-scenes-v1.json'));
if(args.includes('--strict')&&
 (report.totalPublishedCatalogRecords!==report.licensedOrHistoricalMp4CatalogRows+
   report.proceduralAnimationCatalogRows||
  Object.values(report.collections).reduce((a,b)=>a+b,0)!==
    report.licensedOrHistoricalMp4CatalogRows))
 throw Error('HH_VIDEO_PROVENANCE_BAD_TOTALS');
process.stdout.write(JSON.stringify(report,null,2)+'\n');
