import test from 'node:test';
import assert from 'node:assert/strict';
import {matchSceneSamples} from '../scripts/benchmarking/video-scene-match.mjs';
const w=96,h=54;
function pattern(seed){const b=Buffer.alloc(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)b[y*w+x]=((x*seed+y*(seed+3)+(x*y)%37)%220)+10;return b;}
test('matches the expected source and rejects swapped or flat frames',()=>{
  const sources=[2,5,9,14].map(seed=>[pattern(seed)]);
  assert.doesNotThrow(()=>matchSceneSamples(sources.map(x=>x[0]),sources,[0,1,2,3]));
  assert.throws(()=>matchSceneSamples([sources[1][0]],sources,[0]),/scene_source_mismatch/);
  assert.throws(()=>matchSceneSamples([Buffer.alloc(w*h)],sources,[0]),/scene_source_mismatch/);
});
