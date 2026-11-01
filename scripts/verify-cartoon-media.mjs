#!/usr/bin/env node
/** Exact encoded-media acceptance for the first-party fox puppet demo. */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {createCartoonStoryboard} from '../lib/mandala/cartoon/storyboard.mjs';
import {renderCartoonSvg} from '../lib/mandala/cartoon/fox-svg.mjs';
import {renderCartoonMp4} from './render-cartoon-mp4.mjs';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
const plan=createCartoonStoryboard({preset:'friendship',locale:'en'});
async function diff(a,b){
  const x=await sharp(Buffer.from(renderCartoonSvg(plan,a,{width:360,height:640}))).raw().toBuffer();
  const y=await sharp(Buffer.from(renderCartoonSvg(plan,b,{width:360,height:640}))).raw().toBuffer();
  assert.equal(x.length,y.length);
  let count=0;for(let i=0;i<x.length;i+=4)if(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2])>25)count++;
  return count;
}
const dir=await mkdtemp(join(tmpdir(),'hh-cartoon-verify-'));
try{
  const moving=await diff(8500,8900);
  assert.ok(moving>300,`No visible animation; changed pixels=${moving}`);
  const output=join(dir,'fox-2-sec.mp4');
  const result=await renderCartoonMp4({plan,output,silentDemo:true,previewSeconds:2,width:360,height:640});
  assert.equal(result.sourceFrames,48);assert.equal(result.encodedFrames,48);assert.equal(result.videoCodec,'h264');
  assert.equal(result.fps,'24/1');assert.equal(result.duration,2);
  assert.ok(result.bytes>16000);
  const economy=await renderCartoonMp4({plan,output:join(dir,"economy.mp4"),silentDemo:true,previewSeconds:2,sourceFps:12,width:360,height:640});
  assert.equal(economy.sourceFrames,24);assert.equal(economy.encodedFrames,48);
  assert.equal(economy.fps,"24/1");
  console.log(JSON.stringify({ok:true,mode:'silent_test_fixture_only',changedPixels:moving,
    videoCodec:result.videoCodec,frames:result.encodedFrames,seconds:result.duration,bytes:result.bytes}));
}finally{await rm(dir,{recursive:true,force:true});}
