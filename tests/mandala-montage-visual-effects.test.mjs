import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintHypnoLightOverlay,recommendHypnoLight,hypnoWavePhase} from '../lib/mandala/hypno-visual-overlay.mjs';
const studio=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/mandala-video-mobile.module.css',import.meta.url),'utf8');
const hypno=readFileSync(new URL('../components/mandala-hypnocorrection-mobile.tsx',import.meta.url),'utf8');
const hypnoCss=readFileSync(new URL('../components/mandala-hypnocorrection-mobile.module.css',import.meta.url),'utf8');

function fakeCanvas(){
 const actions=[];
 const ctx={canvas:{width:1920,height:1080},save(){actions.push('save')},restore(){actions.push('restore')},
  createRadialGradient(...args){actions.push(['gradient',...args]);return {addColorStop(...values){actions.push(['stop',...values])}}},
  fillRect(...args){actions.push(['fill',...args])},beginPath(){actions.push('begin')},
  ellipse(...args){actions.push(['ellipse',...args])},stroke(){actions.push('stroke')},
  moveTo(...args){actions.push(['move',...args])},lineTo(...args){actions.push(['line',...args])},
 };
 return {ctx,actions};
}

test('Each Hypno effect paints real, distinct, low-opacity Canvas pixels without network',()=>{
 const renders=new Map();
 for(const mode of ['sunlight','glow','waves']){
  const {ctx,actions}=fakeCanvas();
  paintHypnoLightOverlay(ctx,5,{enabled:true,cyclesPerMinute:6,opacity:.18,mode});
  assert.ok(actions.some(x=>Array.isArray(x)&&x[0]==='fill'),mode+' must actually paint a frame');
  assert.equal(actions.filter(x=>x==='save').length,1);
  assert.equal(actions.filter(x=>x==='restore').length,1);
  assert.ok(actions.some(x=>Array.isArray(x)&&x[0]==='gradient'));
  renders.set(mode,JSON.stringify(actions));
 }
 assert.notEqual(renders.get('sunlight'),renders.get('glow'));
 assert.notEqual(renders.get('glow'),renders.get('waves'));
 assert.notEqual(renders.get('sunlight'),renders.get('waves'));
 const {ctx,actions}=fakeCanvas();
 paintHypnoLightOverlay(ctx,5,{enabled:false,mode:'sunlight'});
 assert.equal(actions.length,0,'None does not overlay or request a render');
});

test('Preserves the existing Hypno waves and strictly avoids fast strobing',()=>{
 assert.equal(hypnoWavePhase(0,6),0);
 assert.ok(hypnoWavePhase(2.5,6)>0&&hypnoWavePhase(2.5,6)<1);
 assert.equal(recommendHypnoLight('health','calm').cyclesPerMinute,6);
 assert.equal(recommendHypnoLight('energy','').cyclesPerMinute,8);
 const {ctx,actions}=fakeCanvas();
 paintHypnoLightOverlay(ctx,4,{enabled:true,opacity:.16});
 assert.ok(actions.filter(x=>Array.isArray(x)&&x[0]==='ellipse').length>=3,
   'existing wave overlay must remain the fallback for older saved projects');
});

test('Five visible Montage tabs preserve the separate video storyboard and one shared Text engine',()=>{
 const rail=studio.slice(studio.indexOf('<nav className={videoStyles.montageQuickTools}'));
 const firstNav=rail.slice(0,rail.indexOf('</nav>'));
 assert.deepEqual([...firstNav.matchAll(/\{id:"(\w+)",Icon:/g)].map(match=>match[1]),
  ['effects','text','audio','settings','concept']);
 assert.equal((studio.match(/<MandalaVideoIdeas locale/g)||[]).length,1);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
 assert.match(studio,/onChange=\{setAffirmations\}/);
 for(const mode of ['none','sunlight','glow','waves'])
  assert.match(hypno,new RegExp('id:"'+mode+'"'));
 assert.match(hypno,/data-hypno-visual-effect=\{item.id\}/);
 assert.match(hypno,/data-hypno-effect-status/);
 assert.match(studio,/data-video-montage-aspect-switch/);
 assert.match(studio,/data-video-montage-aspect=\{item.id\}/);
 assert.match(studio,/onClick=\{\(\)=>changeVideoAspect\(item.id\)\}/);
 assert.match(studio,/data-video-montage-open-concept/);
 assert.match(studio,/data-video-montage-open-storyboard/);
 assert.match(studio,/id:"concept",Icon:Film/);
 assert.match(studio,/data-video-montage-concept/);
 assert.equal((studio.match(/<MandalaCinematicDirector /g)||[]).length,1);
 assert.match(studio,/data-video-pro-open-montage-storyboard/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(studio,/data-video-montage-open-audio/);
 assert.match(hypnoCss,/\.visualPresetGrid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.montageAspectSwitch>div\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('Live still, playing frames and export share one real effect painter',()=>{
 const calls=studio.match(/paintHypnoLightOverlay\(ctx,/g)||[];
 assert.equal(calls.length,5,'live still, animated preview and recorded export all paint the same effect');
 assert.match(studio,/\[source, effect, moneyScene, theme, otherScene, aspect, previewPlaying, previewSeekSeconds,[\s\S]*?hypnoLight/);
 assert.match(studio,/creationMode,activeMontageStyleId,currentFreeVideoPlan/);
 const presets=hypno.slice(hypno.indexOf('data-hypno-visual-effect={item.id}'),
  hypno.indexOf('{group.id==="visual"?<>'));
 assert.doesNotMatch(presets,/onCreate|postVideoCreditAction|appFetch|createQuickVideo/,
  'the Hypno effect selection is a local state update, never a paid render');
 assert.match(studio,/light=\{hypnoLight\} onLightChange=\{next=>\{setHypnoLight\(next\);setPreviewPlaying\(false\);\}\}/);
 assert.doesNotMatch(studio,/montagePanel==="visual"/,'Montage no longer has a duplicate Effects pane');
});
