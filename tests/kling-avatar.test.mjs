import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {
  KLING_AVATAR_LIMITS,detectPortrait,pcmWavDuration,normalizeKlingAvatar,
  submitKlingAvatar,queryKlingAvatar,
} from '../lib/kling-avatar.mjs';

const externalTaskId='hh_avatar_1234567890abcdef1234567890abcdef';
function makePng(w=400,h=500){
  const b=Buffer.alloc(120,0);Buffer.from([137,80,78,71,13,10,26,10]).copy(b,0);
  b.writeUInt32BE(13,8);b.write('IHDR',12,'ascii');b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;
}
function makeWav(seconds=5,sampleRate=16000){
  const size=Math.round(seconds*sampleRate)*2,b=Buffer.alloc(44+size,0);
  b.write('RIFF',0);b.writeUInt32LE(36+size,4);b.write('WAVE',8);
  b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(size,40);return b;
}
const valid=()=>({imageBytes:makePng(),imageMime:'image/png',audioBytes:makeWav(5),
  audioMime:'audio/wav',prompt:'The owner speaks calmly',externalTaskId});

test('accept original owner portrait with real bytes and a 2–5s PCM WAV',()=>{
  assert.deepEqual(detectPortrait(makePng(),'image/png'),{width:400,height:500});
  assert.equal(pcmWavDuration(makeWav(5),'audio/wav'),5);
  const normalized=normalizeKlingAvatar(valid());
  assert.equal(normalized.mode,'std');
  assert.equal(normalized.seconds,5);
  assert.equal(normalized.external_task_id,externalTaskId);
  assert.match(normalized.image,/^[A-Za-z0-9+/]+=*$/);
  assert.match(normalized.sound_file,/^[A-Za-z0-9+/]+=*$/);
  assert.equal(normalized.image.startsWith('data:'),false);
});
test('reject malformed/third-party-looking image bytes and oversize / out-of-range portraits',()=>{
  for(const [img,mime] of [[Buffer.alloc(120),'image/png'],[makePng(299,600),'image/png'],
    [makePng(400,1400),'image/png'],[makePng(),'image/webp'],[Buffer.alloc(KLING_AVATAR_LIMITS.imageBytes+1),'image/png']])
    assert.throws(()=>detectPortrait(img,mime),/validation/);
});
test('reject unsupported audio, forged RIFF, high duration, and oversized WAV without outbound calls',()=>{
  for(const wav of [Buffer.alloc(120),makeWav(1),makeWav(6),makeWav(21),Buffer.alloc(KLING_AVATAR_LIMITS.audioBytes+1)]){
    assert.throws(()=>pcmWavDuration(wav,'audio/wav'),/validation/);
  }
  assert.throws(()=>pcmWavDuration(makeWav(5),'audio/mpeg'),/validation/);
  const broken=makeWav(5);broken.writeUInt32LE(123,28);
  assert.throws(()=>pcmWavDuration(broken,'audio/wav'),/validation/);
});
test('strict external ID, prompt and server maximum reject before any provider charge',()=>{
  for(const change of [{externalTaskId:'bad'},{prompt:'x'.repeat(1201)},
    {imageBytes:Buffer.alloc(10)},{audioBytes:makeWav(6)},{audioBytes:makeWav(21)}])
    assert.throws(()=>normalizeKlingAvatar({...valid(),...change}),/validation/);
});
test('one authenticated provider POST, sound from owner only, STD mode, no secrets in result',async()=>{
  const calls=[];const key='server-private-test-key';
  const result=await submitKlingAvatar(valid(),{apiKey:key,fetchImpl:async(...args)=>{
    calls.push(args);
    return {ok:true,json:async()=>({code:0,data:{task_id:'abc123456789',task_status:'submitted'}})};
  }});
  assert.equal(calls.length,1);assert.equal(calls[0][0],'https://api-singapore.klingai.com/v1/videos/avatar/image2video');
  const opts=calls[0][1],body=JSON.parse(opts.body);
  assert.equal(opts.headers.Authorization,'Bearer '+key);
  assert.equal(body.mode,'std');assert.equal(body.external_task_id,externalTaskId);
  assert.equal(typeof body.image,'string');assert.equal(typeof body.sound_file,'string');
  assert.equal(body.duration,undefined);
  assert.deepEqual(result,{taskId:'abc123456789',externalTaskId,seconds:5,status:'submitted'});
  assert.equal(JSON.stringify(result).includes(key),false);
});
test('missing key/provider errors never retry or return sensitive detail',async()=>{
  let called=false;
  await assert.rejects(submitKlingAvatar(valid(),{apiKey:'',fetchImpl:async()=>{called=true;}}),/not_configured/);
  assert.equal(called,false);
  await assert.rejects(submitKlingAvatar(valid(),{apiKey:'server-private-test-key',
    fetchImpl:async()=>({ok:false,json:async()=>({message:'secret'})})}),/provider_unavailable/);
});
test('status only reads tasks and allows HTTPS Kling media URLs',async()=>{
  const urls=[];
  const out=await queryKlingAvatar('abc123456789',{apiKey:'server-private-test-key',fetchImpl:async(...args)=>{
    urls.push(args[0]);return {ok:true,json:async()=>({code:0,data:{task_status:'succeed',
      task_result:{videos:[{url:'https://p2-kling.klingai.com/file.mp4',duration:'5'}]}}})};
  }});
  assert.equal(urls.length,1);assert.match(urls[0],/\/v1\/videos\/avatar\/image2video\/abc123456789$/);
  assert.equal(out.videoUrl,'https://p2-kling.klingai.com/file.mp4');
  assert.equal(out.duration,5);
  await assert.rejects(queryKlingAvatar('../../etc',{apiKey:'server-private-test-key',fetchImpl:async()=>{}}),/validation/);
  const unsafe=await queryKlingAvatar('abc123456789',{apiKey:'server-private-test-key',fetchImpl:async()=>({ok:true,json:async()=>({code:0,data:{task_status:'succeed',
    task_result:{videos:[{url:'javascript:alert(1)'}]}}})})});
  assert.equal(unsafe.videoUrl,null);
});
test('admin security is server enforced; app never publishes, stores or sends client content',()=>{
  const route=readFileSync(new URL('../app/api/admin/kling-avatar/route.js',import.meta.url),'utf8');
  const page=readFileSync(new URL('../app/admin/videos/page.tsx',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../components/kling-avatar-studio.tsx',import.meta.url),'utf8');
  assert.match(route,/requireAdminRequest\(\)/);
  assert.match(route,/sameOrigin\(request\)/);
  assert.match(route,/HH_KLING_AVATAR_PAID_ENABLED==='true'/);
  assert.match(route,/HH_KLING_PAID_GENERATION_ENABLED==='true'/);
  assert.match(route,/input.get\('paidApproved'\)!=='true'/);
  assert.match(route,/input.get\('identityApproved'\)!=='true'/);
  assert.match(route,/input.get\('privacyApproved'\)!=='true'/);
  assert.ok(!route.includes('publishSiteVideo'));
  assert.ok(!route.includes('console.log'));
  assert.match(page,/<KlingAvatarStudio/);
  assert.ok(!ui.includes('process.env.KLING_API_KEY'));
  assert.match(ui,/new OfflineAudioContext/);
  assert.match(ui,/fetch\("\/api\/admin\/kling-avatar"/);
});


test('read-only Kling account handshake uses one GET and no task charges', async () => {
  const {checkKlingAccount}=await import('../lib/kling-video.mjs');
  const calls=[];
  const value=await checkKlingAccount({apiKey:'private-server-key-example',now:1793100000000,
    fetchImpl:async(...args)=>{
      calls.push(args);
      return {ok:true,json:async()=>({code:0,data:{code:0,resource_pack_subscribe_infos:[
        {status:'online',remaining_quantity:50,resource_pack_name:'test-resource'},
      ]}})};
    }});
  assert.equal(calls.length,1);
  assert.equal(calls[0][1].method,'GET');
  assert.match(calls[0][0],/^https:\/\/api-singapore\.klingai\.com\/account\/costs\?start_time=/);
  assert.equal(calls[0][1].headers.Authorization,'Bearer private-server-key-example');
  assert.equal(calls[0][1].body,undefined);
  assert.deepEqual(value,{connected:true,hasActivePackage:true,balanceDelayed:true});
  assert.ok(!JSON.stringify(value).includes('test-resource'));
});

test('read-only handshake rejects invalid auth and never leaks provider error or key', async () => {
  const {checkKlingAccount}=await import('../lib/kling-video.mjs');
  let networkCalled=false;
  await assert.rejects(checkKlingAccount({apiKey:'',fetchImpl:async()=>{networkCalled=true;}}),/not_configured/);
  assert.equal(networkCalled,false);
  await assert.rejects(checkKlingAccount({apiKey:'private-server-key-example',fetchImpl:async()=>({
    ok:true,json:async()=>({code:0,data:{code:1001,secret:'do not leak'}}),
  })}),/provider_unavailable/);
  const route=readFileSync(new URL('../app/api/admin/kling-avatar/route.js',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../components/kling-avatar-studio.tsx',import.meta.url),'utf8');
  assert.match(route,/params\.get\('mode'\)==='connection'/);
  assert.match(route,/requireAdminRequest\(\)/);
  assert.match(ui,/verifyConnection\(\)/);
  assert.ok(!ui.includes('process.env.KLING_API_KEY'));
});


test('default 5-second paid Avatar ceiling is enforced on server', () => {
  assert.equal(KLING_AVATAR_LIMITS.maxSeconds,5);
  assert.equal(KLING_AVATAR_LIMITS.minSeconds,2);
  assert.throws(() => normalizeKlingAvatar({...valid(),audioBytes:makeWav(6)}),/validation/);
  const ui=readFileSync(new URL('../components/kling-avatar-studio.tsx',import.meta.url),'utf8');
  assert.match(ui,/buffer.duration>5/);
  assert.ok(!ui.includes('up to 20 seconds'));
});

test('scenes default to 3s silent 720p and premium server flag gates more costly settings', async () => {
  const {normalizeKlingScene,klingRequestForScene}=await import('../lib/kling-video.mjs');
  const scene=normalizeKlingScene({mode:'text',prompt:'Cinematic quiet forest with natural sunlight',duration:3,
    resolution:'720p',aspectRatio:'16:9',imageUrl:'',externalTaskId:'hh_kling_1234567890abcdef1234567890abcdef'});
  const req=klingRequestForScene(scene);
  assert.equal(req.body.settings.duration,3);
  assert.equal(req.body.settings.resolution,'720p');
  assert.equal(req.body.settings.audio,'off');
  const action=readFileSync(new URL('../app/admin/videos/kling-actions.js',import.meta.url),'utf8');
  const page=readFileSync(new URL('../app/admin/videos/page.tsx',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../components/kling-scene-studio.tsx',import.meta.url),'utf8');
  assert.match(action,/HH_KLING_PREMIUM_RENDER_ENABLED/);
  assert.match(action,/budgetDuration = scene.mode === 'image' \? 5 : 3/);
  assert.match(action,/scene.duration !== budgetDuration/);
  assert.match(action,/scene.resolution !== '720p'/);
  assert.match(page,/premiumEnabled=\{process\.env\.HH_KLING_PREMIUM_RENDER_ENABLED === "true"\}/);
  assert.match(ui,/useState<3 \| 5 \| 10>\(3\)/);
  assert.match(ui,/setDuration\(next === "image" \? 5 : 3\)/);
  const img=normalizeKlingScene({mode:'image',prompt:'Warm natural landscape with gentle motion',duration:5,
    resolution:'720p',aspectRatio:'16:9',publicImageApproved:true,
    imageUrl:'https://holistichouse.vercel.app/images/holistic-house/coaching-ancient/egyptian-cover.jpg',
    externalTaskId:'hh_kling_1234567890abcdef1234567890abcdef'});
  const imageRequest=klingRequestForScene(img);
  assert.equal(imageRequest.path,'/image-to-video/kling-2.5-turbo');
  assert.deepEqual(imageRequest.body.settings,{duration:5,resolution:'720p'});
});
