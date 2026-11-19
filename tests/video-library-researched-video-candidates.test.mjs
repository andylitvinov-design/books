import test from 'node:test';
import assert from 'node:assert/strict';
import research from '../data/video-catalog/pexels-video-research-20261119.json' with {type:'json'};
import {auditResearchedVideoCandidates,researchVideoLinksForOwner} from '../lib/video-library/researched-video-candidates.mjs';

test('104 unique research pages with native-aspect claims in four categories',()=>{
 const result=auditResearchedVideoCandidates(research);
 assert.equal(result.sourcePageCount,104);
 assert.equal(result.portraitSourcePages,52);
 assert.equal(result.landscapeSourcePages,52);
 assert.deepEqual(result.byCategory,{
  'goals-money':{portrait:12,landscape:12},
  'love-relationships':{portrait:12,landscape:12},
  'energy-confidence':{portrait:15,landscape:15},
  'stress-anxiety':{portrait:13,landscape:13},
 });
 assert.equal(result.physicallyVerifiedNewMp4,0);
 assert.equal(result.generatorEligibleFromThisManifest,0);
});
test('research suggestions are human-review leads, not renderable MP4 clips',()=>{
 const list=researchVideoLinksForOwner(research,{
  categoryId:'love-relationships',orientation:'portrait',queryTags:['couple','talking'],limit:5});
 assert.equal(list.length,5);
 assert.equal(list.every(x=>x.readyForMontage===false&&x.sourcePage.startsWith('https://www.pexels.com/video/')),true);
 assert.equal(list[0].semanticTagOverlap>=list[4].semanticTagOverlap,true);
 assert.equal(researchVideoLinksForOwner(research,{categoryId:'stress-anxiety',orientation:'square'}).length,0);
});
test('reject duplicates, unsafe URLs and false video availability',()=>{
 const duplicate=structuredClone(research);
 duplicate.sourcePages.push({...duplicate.sourcePages[0]});
 assert.throws(()=>auditResearchedVideoCandidates(duplicate),/INVALID_RESEARCH_VIDEO_SOURCE/);
 const injected=structuredClone(research);injected.sourcePages[0].video='https://cdn.pexels.com/a.mp4';
 assert.throws(()=>auditResearchedVideoCandidates(injected),/INVALID_RESEARCH_VIDEO_SOURCE/);
 const approved=structuredClone(research);approved.sourcePages[0].generatorEligible=true;
 assert.throws(()=>auditResearchedVideoCandidates(approved),/INVALID_RESEARCH_VIDEO_SOURCE/);
});
