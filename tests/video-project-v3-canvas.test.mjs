import assert from 'node:assert/strict';
import test from 'node:test';
import {createPresetMotionProjectV3} from '../lib/mandala/openmotion-preset-guide.mjs';
import {compileVideoProjectV3} from '../lib/mandala/video-project-v3.mjs';

const {project,approvedAssets}=createPresetMotionProjectV3('focused-action','en');
const plan=compileVideoProjectV3(project,{approvedAssets});
const source={image:{},width:720,height:1280};
const context=()=>{
  const calls=[];
  const ctx={canvas:{width:360,height:640},globalAlpha:1,calls};
  for (const method of ['save','restore','fillRect','translate','rotate','scale','drawImage','strokeText','fillText']) {
    ctx[method]=(...args)=>calls.push([method,ctx.globalAlpha,...args]);
  }
  return ctx;
};

test('two decoded inputs contribute equally at crossfade midpoint', async ()=>{
  const {paintVideoProjectV3Frame}=await import('../lib/mandala/video-project-v3-canvas.mjs');
  const ctx=context();
  const requested=[];
  assert.equal(paintVideoProjectV3Frame(ctx,plan,4750,(id,ms)=>{
    requested.push([id,ms]);
    return source;
  }),true);
  assert.deepEqual(requested,[['clear-morning',4750],['solar-surge',250]]);
  assert.deepEqual(ctx.calls.filter(call=>call[0]==='drawImage').map(call=>call[1]),[1,0.5]);
});

test('draws active titles and refuses a frame if any required source is unavailable', async ()=>{
  const {paintVideoProjectV3Frame}=await import('../lib/mandala/video-project-v3-canvas.mjs');
  const ctx=context();
  assert.equal(paintVideoProjectV3Frame(ctx,plan,1000,()=>source),true);
  assert.equal(ctx.calls.find(call=>call[0]==='fillText')[2],'Focused action');
  const unavailable=context();
  assert.equal(paintVideoProjectV3Frame(unavailable,plan,4750,id=>id==='clear-morning'?source:null),false);
  assert.deepEqual(unavailable.calls,[]);
});
