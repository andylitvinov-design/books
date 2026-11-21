import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import films from '../data/video-catalog/standard-motion-films-v1.json' with {type:'json'};
import sources from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import {getPublishedStandardMotionMaster} from '../lib/mandala/openmotion-preset-guide.mjs';

test('the first public standard film is six real licensed videos and has the pinned MP4 bytes',async()=>{
  const film=films.films.find(item=>item.id==='anti-stress-30s');
  const master=getPublishedStandardMotionMaster('anti-stress-30s','en');
  assert.ok(master);
  assert.equal(master.personalized,false);
  assert.equal(master.physicalIphoneAcceptance,'pending');
  assert.equal(film.clips.length,6);
  assert.equal(film.captions.en.length,6);
  const scenes=film.clips.map(id=>sources.scenes.find(scene=>scene.id===id));
  assert.ok(scenes.every(scene=>scene?.status==='approved'&&scene.media==='licensed_mp4'&&
    scene.video.endsWith('.mp4')&&scene.allowedAspects.includes('portrait')&&
    scene.rightsReference?.kind==='existing_approved_first_party_master'));
  assert.equal(new Set(scenes.flatMap(scene=>scene.originMasterKeys)).size,6);
  const bytes=await readFile(new URL('../public'+master.path,import.meta.url));
  assert.equal(bytes.length,2013279);
  assert.equal(bytes.length,master.bytes);
  assert.equal(bytes.toString('ascii',4,8),'ftyp');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),master.sha256);
  assert.equal(master.durationMs,30016);
});

test('no unverified locale or changed/unknown preset receives another film',()=>{
  for(const locale of ['ru','es','xx'])
    assert.equal(getPublishedStandardMotionMaster('anti-stress-30s',locale),null);
  for(const preset of ['unknown','gentle-rest','imported-motion'])
    assert.equal(getPublishedStandardMotionMaster(preset,'en'),null);
});
