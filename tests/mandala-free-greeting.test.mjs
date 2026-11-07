import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FREE_GREETING_CATALOG,FREE_GREETING_CATEGORIES,FREE_GREETING_IDS,
  recommendGreeting,resolveGreetingCharacter,getGreetingCharacter} from '../lib/mandala/free-greeting-catalog.mjs';
import {FREE_GREETING_DURATION,freeGreetingCue,paintFreeGreeting} from '../lib/mandala/free-greeting-overlay.mjs';

test('all 30 first-party characters are unique, localized and divided into five groups',()=>{
  assert.equal(FREE_GREETING_CATALOG.length,30);
  assert.deepEqual(FREE_GREETING_CATEGORIES,['fantasy','animals','people','spiritual','festive']);
  assert.deepEqual(FREE_GREETING_CATEGORIES.map(category=>FREE_GREETING_CATALOG.filter(x=>x.category===category).length),[8,8,6,4,4]);
  assert.equal(new Set(FREE_GREETING_CATALOG.map(x=>x.id)).size,30);
  assert.equal(new Set(FREE_GREETING_IDS).size,32);
  assert.deepEqual(FREE_GREETING_IDS.slice(0,2),['none','auto']);
  for(const character of FREE_GREETING_CATALOG){
    assert.ok(character.id&&character.emoji);
    assert.ok(character.title.ru&&character.title.en&&character.title.es);
    assert.ok(character.gesture);
    assert.ok(FREE_GREETING_IDS.includes(character.id));
    assert.equal(getGreetingCharacter(character.id),character);
  }
});

test('scene recommendation uses visible final scenery before general goal',()=>{
  assert.equal(recommendGreeting('winter-snow','relationships'),'snowman');
  assert.equal(recommendGreeting('prosperity-coast','money'),'dolphin');
  assert.equal(recommendGreeting('blossom-garden','health'),'fox');
  assert.equal(recommendGreeting('mountain-air','health'),'traveler');
  assert.equal(recommendGreeting('heart-light','money'),'heart-messenger');
  assert.equal(recommendGreeting('city-lights','energy'),'host');
  assert.equal(recommendGreeting('radiant-portal','life'),'light-guide');
  assert.equal(recommendGreeting('plain','health'),'yogi');
  assert.equal(recommendGreeting('plain','money'),'wizard');
  assert.equal(recommendGreeting('plain','unknown'),'fairy');
});

test('auto resolution is deterministic and never overrides an explicit user choice',()=>{
  assert.equal(resolveGreetingCharacter('auto','sea-breeze','goals'),'dolphin');
  assert.equal(resolveGreetingCharacter('cat','sea-breeze','goals'),'cat');
  assert.equal(resolveGreetingCharacter('none','sea-breeze','goals'),'none');
  assert.equal(resolveGreetingCharacter('fake-id','sea-breeze','goals'),'none');
  assert.equal(freeGreetingCue(28.1,30,'auto','sea-breeze','goals').character,'dolphin');
});

test('no character appears before the last 3.5 seconds or for invalid input',()=>{
  assert.equal(FREE_GREETING_DURATION,3.5);
  for(const kind of FREE_GREETING_IDS){
    assert.equal(freeGreetingCue(26.499,30,kind),null);
    assert.equal(freeGreetingCue(26.5,30,kind),null);
    if(kind==='none')assert.equal(freeGreetingCue(28,30,kind),null);
    else{
      const cue=freeGreetingCue(28,30,kind,'mountain-air','goals');
      assert.ok(cue);
      assert.ok(cue.alpha>.9);
      assert.ok(Math.abs(cue.wave)<=.321);
    }
  }
  for(const seconds of [-1,NaN,Infinity,30.1])assert.equal(freeGreetingCue(seconds,30,'fairy'),null);
  assert.equal(freeGreetingCue(3,4,'fairy'),null);
  assert.equal(freeGreetingCue(28,30,'invalid'),null);
  assert.ok(freeGreetingCue(29.9,30,'fairy').alpha<1);
});

function fakeContext({tainted=false,aspect='landscape'}={}){
  const log=[];
  const grad={addColorStop:(at,color)=>log.push(['stop',at,color])};
  let color='black';
  const ctx={canvas:{width:aspect==='portrait'?720:1280,height:aspect==='portrait'?1280:720},globalAlpha:1,
    save:()=>log.push(['save']),restore:()=>log.push(['restore']),
    fill:()=>log.push(['fill',String(color)]),stroke:()=>log.push(['stroke']),
    beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},ellipse:(...p)=>log.push(['ellipse',...p.slice(0,4)]),arc:()=>{},fillRect:()=>{},
    closePath:()=>{},quadraticCurveTo:()=>{},bezierCurveTo:()=>{},
    translate:()=>{},scale:()=>{},rotate:()=>{},
    createRadialGradient:()=>grad,
    getImageData:()=>{if(tainted)throw Error('SecurityError');return {data:new Uint8ClampedArray([88,143,111,255])};},
    get fillStyle(){return color;},set fillStyle(v){color=v;},
  };
  return {ctx,log};
}

test('every one of 30 characters paints real geometry using the existing Canvas',()=>{
  const shapes=new Set();
  for(const entry of FREE_GREETING_CATALOG){
    const {ctx,log}=fakeContext();
    assert.equal(paintFreeGreeting(ctx,28.2,30,entry.id,'landscape','mountain-air','goals'),true,entry.id);
    assert.ok(log.some(x=>x[0]==='fill'),entry.id);
    assert.equal(log.filter(x=>x[0]==='save').length,log.filter(x=>x[0]==='restore').length,entry.id);
    assert.ok(log.filter(x=>x[0]==='ellipse').length>2,entry.id);
    shapes.add(JSON.stringify(log.filter(x=>x[0]==='fill'||x[0]==='ellipse').slice(8,70)));
  }
  // The entries are drawn distinctly: not the same three geometry frames relabelled.
  assert.ok(shapes.size>=25,`only ${shapes.size} visibly distinct operation signatures`);
});

test('auto, portrait, and tainted pixels fail safely without replacing the original scene',()=>{
  const {ctx,log}=fakeContext({tainted:true,aspect:'portrait'});
  assert.equal(paintFreeGreeting(ctx,28,30,'auto','portrait','sea-breeze','health'),true);
  assert.equal(paintFreeGreeting(ctx,20,30,'auto','portrait','sea-breeze','health'),false);
  assert.equal(paintFreeGreeting(ctx,28,30,'unknown','portrait','sea-breeze','health'),false);
  assert.equal(paintFreeGreeting(ctx,28,30,'none','portrait','sea-breeze','health'),false);
  assert.equal(log.filter(x=>x[0]==='save').length,log.filter(x=>x[0]==='restore').length);
});

test('greeting character sources have no paid remote dependencies',()=>{
  const mod=readFileSync(new URL('../lib/mandala/free-greeting-overlay.mjs',import.meta.url),'utf8');
  const catalog=readFileSync(new URL('../lib/mandala/free-greeting-catalog.mjs',import.meta.url),'utf8');
  for(const text of [mod,catalog]){
    assert.doesNotMatch(text,/https?:\/\//);
    assert.doesNotMatch(text,/fetch\s*\(|XMLHttpRequest|WebSocket|createObjectURL|localStorage|AI_API_KEY/);
  }
});
