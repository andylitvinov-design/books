#!/usr/bin/env node
/** Strict read-only intake audit: zero downloads, paid calls, DB or vault writes. */
import research from '../data/video-catalog/pexels-video-research-20261119.json' with {type:'json'};
import {auditResearchedVideoCandidates} from '../lib/video-library/researched-video-candidates.mjs';
const result=auditResearchedVideoCandidates(research);
const summary={schemaVersion:research.schemaVersion,
 sourcePages:result.sourcePageCount,portrait:result.portraitSourcePages,
 landscape:result.landscapeSourcePages,categories:result.byCategory,
 ...Object.fromEntries(['physicallyVerifiedNewMp4','independentlyReviewedPerPlotBeats','generatorEligibleFromThisManifest'].map(key=>[key,result[key]])),
 publication:'HOLD — page URLs are editorial leads; rights, physical footage and story-level relevance need approval',
};
process.stdout.write(JSON.stringify(summary,null,2)+'\n');
