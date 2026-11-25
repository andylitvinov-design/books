import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMeaningEnergyPhrases,getMeaningEnergyLevels,listMeaningEnergyPhrases,
  MEANING_AXIS_ENERGY_PHRASES_COUNTS} from '../lib/mandala/meaning-axis-energy-phrases.mjs';

// Additive corpus: canonical taxonomy and prior films are deliberately not edited.

test('all 512 short-scenario keys have 3×5 new copy options and EN/RU/ES localization',()=>{
 const result=auditMeaningEnergyPhrases();
 assert.equal(result.ok,true,result.errors.slice(0,12).join('\n'));
 assert.deepEqual(result.counts,{scenarios:512,topics:64,axes:8,levels:3,
  phraseIds:7680,localized:{ru:7680,en:7680,es:7680}});
 assert.equal(MEANING_AXIS_ENERGY_PHRASES_COUNTS.totalNewLocalizedPhrases,23040);
});

test('tier options require explicit selection; no readiness or health state is inferred',()=>{
 const id='stress-relief__anchor__short-film-v1';
 assert.deepEqual(listMeaningEnergyPhrases(id),[]);
 assert.deepEqual(listMeaningEnergyPhrases(id,{tier:'guessed'}),[]);
 assert.deepEqual(listMeaningEnergyPhrases('unavailable',{tier:'low'}),[]);
 assert.equal(getMeaningEnergyLevels('ru').length,3);
 for(const level of ['low','medium','high']){
  const opts=listMeaningEnergyPhrases(id,{tier:level,locale:'ru'});
  assert.equal(opts.length,5);
  assert.ok(opts.every((x,i)=>x.rank===i+1 && x.tier===level &&
   x.requiresUserApproval===true && x.canRender===false && x.captionText.length<=36));
 }
});

test('preserve the existing canonical 256 storyboards and live topical IDs',()=>{
 assert.equal(MEANING_AXIS_ENERGY_PHRASES_COUNTS.legacyCanonicalStoryboardsPreserved,256);
 assert.equal(MEANING_AXIS_ENERGY_PHRASES_COUNTS.shortStoryboardsPreserved,512);
 assert.equal(MEANING_AXIS_ENERGY_PHRASES_COUNTS.canonicalTopics,64);
});