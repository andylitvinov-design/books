import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {validateMotionManifest,motionVideoArgs,renderMotionClip} from '../scripts/render-image-motion-clip.mjs';

const ok=spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0 &&
         spawnSync('ffprobe',['-version'],{stdio:'ignore'}).status===0;
test('manifest rejects unsigned, excessive or unsandboxed inputs',()=>{
  const base={version:'hh-gpt-image-motion-v1',rightsConfirmed:true,seconds:4,
    aspect:'portrait',image:'scene.jpg',assetSha256:'a'.repeat(64)};
  assert.deepEqual(validateMotionManifest(base),{width:720,height:1280,fps:25,seconds:4});
  assert.throws(()=>validateMotionManifest({...base,rightsConfirmed:false}),/invalid_image_motion_manifest/);
  assert.throws(()=>validateMotionManifest({...base,image:'../private.jpg'}),/invalid_image_motion_manifest/);
  assert.throws(()=>validateMotionManifest({...base,seconds:120}),/invalid_image_motion_manifest/);
  const args=motionVideoArgs('/safe/image.jpg','/safe/output.mp4',base);
  assert.ok(args.includes('libx264'));
  assert.ok(args.includes('+faststart'));
});

test('FFmpeg makes a genuine encoded motion scene, not a still image',
  {skip:!ok,timeout:170000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),'hh-gpt-motion-'));
  try{
    const jpg=join(dir,'scene.jpg');
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',
      'testsrc2=size=640x1024:rate=1','-frames:v','1',jpg],{timeout:10000});
    const hash=createHash('sha256').update(await readFile(jpg)).digest('hex');
    const manifest=join(dir,'manifest.json');
    await writeFile(manifest,JSON.stringify({version:'hh-gpt-image-motion-v1',rightsConfirmed:true,
      seconds:3,aspect:'portrait',image:'scene.jpg',assetSha256:hash}));
    const output=join(dir,'out.mp4');
    const result=await renderMotionClip(manifest,output);
    assert.equal(result.videoCodec,'h264');
    assert.equal(result.seconds,3);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries',
      'format=duration','-of','json',output],{encoding:'utf8'}));
    assert.ok(Math.abs(Number(probe.format.duration)-3)<0.3);
    const md5=execFileSync('ffmpeg',['-v','error','-i',output,'-vf',
      "select='eq(n,5)+eq(n,65)'",'-vsync','0','-f','framemd5','-'],{encoding:'utf8',timeout:20000});
    const hashes=md5.split('\n').filter(x=>/^0,\s*\d/.test(x)).map(x=>x.split(',').at(-1).trim());
    assert.equal(hashes.length,2);
    assert.notEqual(hashes[0],hashes[1],'different frames prove actual camera motion');
  }finally{await rm(dir,{recursive:true,force:true});}
});