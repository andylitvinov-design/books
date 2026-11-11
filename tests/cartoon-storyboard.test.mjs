import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCartoonStoryboard,cartoonSceneAt,validateCartoonStoryboard,CARTOON_PRESETS} from '../lib/mandala/cartoon/storyboard.mjs';
import {renderCartoonSvg} from '../lib/mandala/cartoon/fox-svg.mjs';

test('8 chronological scenes total exactly one minute in RU/EN/ES and four stories',()=>{
  for(const locale of ['ru','en','es'])for(const preset of CARTOON_PRESETS){
    const x=createCartoonStoryboard({locale,preset});
    assert.equal(x.shotCount,8);assert.equal(x.durationMs,60000);assert.equal(x.fps,24);
    assert.equal(validateCartoonStoryboard(x),true);
    assert.equal(x.scenes.reduce((v,s)=>v+s.durationMs,0),60000);
    assert.equal(cartoonSceneAt(x,59999).index,8);
    assert.ok(x.scenes.every(s=>s.narration.length>=8));
  }
});
test('input selects preset without storing raw personal request or billing',()=>{
  const x=createCartoonStoryboard({locale:'ru',wish:'для моего ребёнка история про смелость',variation:2});
  assert.equal(x.preset,'courage');assert.equal(x.aiVideoGenerated,false);
  assert.equal(x.paidProviderApproved,false);assert.equal(x.noExternalClientData,true);
  assert.doesNotMatch(JSON.stringify(x),/моего ребёнка|смелость/);
  assert.deepEqual(x,createCartoonStoryboard({locale:'ru',wish:'другая история про смелость',variation:2}));
  assert.notEqual(x.seed,createCartoonStoryboard({locale:'ru',wish:'смелость',variation:3}).seed);
});
test('rejects non approved content and unsafe storyboards',()=>{
  assert.throws(()=>createCartoonStoryboard({locale:'xx'}),/invalid_cartoon_request/);
  assert.throws(()=>createCartoonStoryboard({wish:'x'.repeat(301)}),/invalid_cartoon_request/);
  const x=createCartoonStoryboard();const bad=structuredClone(x);
  bad.scenes[0].actionId='arbitrary-LLM-code';
  assert.throws(()=>validateCartoonStoryboard(bad),/invalid_cartoon_scene/);
  const invalid=structuredClone(x);invalid.scenes[5].startMs+=100;
  assert.throws(()=>validateCartoonStoryboard(invalid),/invalid_cartoon_scene/);
  assert.throws(()=>renderCartoonSvg(x,100,{width:100,height:100}),/invalid_cartoon_dimensions/);
});
test('fox contains independently articulated layers and 3 worlds with actual changing joint transforms',()=>{
  const x=createCartoonStoryboard({locale:'en'});
  const s0=renderCartoonSvg(x,0,{width:360,height:640});
  const s1=renderCartoonSvg(x,9000,{width:360,height:640});
  const s2=renderCartoonSvg(x,9300,{width:360,height:640});
  assert.match(s0,/id="tail"/);assert.match(s0,/id="head"/);
  assert.match(s0,/id="rear-paws"/);assert.match(s0,/id="front-paws"/);
  assert.match(s0,/id="eyes"/);assert.match(s0,/id="muzzle"/);
  assert.notEqual(s1,s2,'walk cycle actually varies geometry over time');
  const joint=s=>s.match(/id="front-paws"[\s\S]*?rotate\((-?[\d.]+)\)/)?.[1];
  assert.notEqual(joint(s1),joint(s2),'limb joint position must change, not just background');
  assert.match(renderCartoonSvg(x,35000,{width:360,height:640}),/id="fox-actor"/);
  assert.doesNotMatch(s0,/<script|<foreignObject|href="http|fetch\(/i);
});
test('SVG and timeline deterministic and output HTML-safe',()=>{
  const x=createCartoonStoryboard({locale:'es',preset:'calm'});
  assert.equal(renderCartoonSvg(x,15000,{width:360,height:640}),renderCartoonSvg(x,15000,{width:360,height:640}));
  assert.notEqual(renderCartoonSvg(x,15000,{width:360,height:640}),renderCartoonSvg(x,30000,{width:360,height:640}));
});
