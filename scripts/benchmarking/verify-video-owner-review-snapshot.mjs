#!/usr/bin/env node
/** Validate the owner editor's checked-in SHA evidence against all 44 real
 * MP4s freshly probed on this exact CI commit. Refuse stale or invented data.
 */
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import catalogue from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import snapshot from '../../data/video-catalog/video-review-ci-digests-v1.json' with {type:'json'};
import {verifyOwnerVideoReviewSnapshot} from '../../lib/mandala/video-owner-review.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const report=JSON.parse(readFileSync(resolve(ROOT,
  'artifacts/benchmarking/verified-video-assets.json'),'utf8'));
const result=verifyOwnerVideoReviewSnapshot({catalog:catalogue,snapshot,probeReport:report});
process.stdout.write(JSON.stringify(result)+'\n');
