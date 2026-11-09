import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import {
  VEO_LITE_MODEL, VeoInputError, normalizeVeoScene, quoteVeoScene,
  serviceAccountAccessToken, submitVeoScene, queryVeoScene, veoRequestForScene,
} from '../lib/veo-video.mjs';

const scene = {
  mode: 'text', prompt: 'A cinematic tracking shot of a quiet forest after the rain, delicate sunlight and naturally swaying trees.',
  duration: 6, aspectRatio: '16:9', resolution: '1080p',
  generateAudio: false, publicContentApproved: true,
};
const config = {
  projectId: 'holistic-veo-test-2026',
  outputGcsUri: 'gs://holistic-veo-test-bucket/private-outputs/',
};
const operationName = 'projects/holistic-veo-test-2026/locations/us-central1/publishers/google/models/' + VEO_LITE_MODEL + '/operations/12345678-abcd-4444-aaaa-abcd12345678';

test('silent-only output; 4/6/8 seconds, 1080p, exact supported aspect ratios', () => {
  for (const duration of [4,6,8]) {
    const result = normalizeVeoScene({ ...scene, duration });
    assert.equal(result.generateAudio, false);
    assert.equal(result.resolution, '1080p');
    assert.equal(result.duration, duration);
    assert.equal(quoteVeoScene({ ...scene, duration }).estimatedUsdCents, duration * 5);
  }
  assert.equal(quoteVeoScene({ ...scene, aspectRatio:'9:16' }).aspectRatio, '9:16');
});
test('fail closed on sound, arbitrary images, private content, lengths and versions', () => {
  for (const change of [
    { generateAudio: true }, { publicContentApproved: false }, { publicContentApproved: undefined },
    { imageUrl:'https://storage.example.com/private.jpg' }, { clientId:'client-123' },
    { duration:30 }, { duration:5 }, { resolution:'720p' }, { resolution:'4k' },
    { aspectRatio:'1:1' }, { prompt:'tiny' }, { prompt:'x'.repeat(2500) },
  ]) assert.throws(()=>normalizeVeoScene({ ...scene, ...change }), VeoInputError);
});
test('official Vertex request is fixed to Lite, public text, no audio and private GCS', () => {
  const {url,body} = veoRequestForScene(scene, config);
  assert.equal(url,
    'https://us-central1-aiplatform.googleapis.com/v1/projects/' + config.projectId +
    '/locations/us-central1/publishers/google/models/' + VEO_LITE_MODEL + ':predictLongRunning');
  assert.deepEqual(body.instances, [{prompt:scene.prompt}]);
  assert.deepEqual(body.parameters, {
    durationSeconds:6,aspectRatio:'16:9',resolution:'1080p',
    sampleCount:1,generateAudio:false,personGeneration:'allow_adult',
    storageUri:config.outputGcsUri,
  });
});
test('bad cloud project or GCS output URI cannot make a network request', async () => {
  for (const configChange of [
    {projectId:'evil/other'}, {projectId:'123'}, {outputGcsUri:'https://example.com/private/'},
    {outputGcsUri:'gs://foo/../private/'}, {outputGcsUri:'gs://foo/'},
  ]) {
    let calls = 0;
    await assert.rejects(submitVeoScene(scene, {...config,...configChange,accessToken:'some-token-long-enough',
      fetchImpl:async()=>{ calls++; throw Error('network'); }}),/not_configured/);
    assert.equal(calls,0);
  }
});
test('one approved submit calls Vertex once, returns task ID and no token', async () => {
  const calls=[];
  const result=await submitVeoScene(scene, {
    ...config, accessToken:'test-private-access-token',
    fetchImpl:async(url,options)=>{
      calls.push({url,options});
      return {ok:true,json:async()=>({name:operationName})};
    },
  });
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.headers.Authorization,'Bearer test-private-access-token');
  assert.deepEqual(JSON.parse(calls[0].options.body).parameters.generateAudio,false);
  assert.equal(result.operationName,operationName);
  assert.equal(result.estimatedUsdCents,30);
  assert.ok(!JSON.stringify(result).includes('private-access-token'));
});
test('malformed task ID or unrelated project is blocked prior to read', async()=>{
  let calls=0;
  await assert.rejects(queryVeoScene('../unsafe',{...config,accessToken:'private-access-token',fetchImpl:async()=>{calls++;}}),VeoInputError);
  await assert.rejects(queryVeoScene(operationName.replace('holistic-veo-test-2026','other-veo-project'),{...config,accessToken:'private-access-token',fetchImpl:async()=>{calls++;}}),VeoInputError);
  assert.equal(calls,0);
});
test('read-only status polls via fetchPredictOperation, validates GCS output', async()=>{
  let calls=0;
  const fetchImpl=async(url,options)=>{
    calls++;
    assert.ok(url.endsWith(VEO_LITE_MODEL+':fetchPredictOperation'));
    assert.equal(JSON.parse(options.body).operationName,operationName);
    return {ok:true,json:async()=>({name:operationName,done:true,response:{
      videos:[{mimeType:'video/mp4',gcsUri:config.outputGcsUri+'clip-1.mp4'}],
    }})};
  };
  const result=await queryVeoScene(operationName,{...config,accessToken:'test-private-access-token',fetchImpl});
  assert.equal(result.videoGcsUri,config.outputGcsUri+'clip-1.mp4');
  assert.equal(result.status,'succeeded');
  assert.equal(result.generateAudio,false);
  assert.equal(calls,1);
  await assert.rejects(queryVeoScene(operationName,{...config,accessToken:'test-private-access-token',
    fetchImpl:async()=>({ok:true,json:async()=>({done:true,response:{videos:[{mimeType:'video/mp4',gcsUri:'gs://foreign-bucket/leak.mp4'}]}})})}),
  /provider_unavailable/);
});
test('pending status and failed/filtered status never pretend ready',async()=>{
  const response = data=>async()=>({ok:true,json:async()=>data});
  const args={...config,accessToken:'test-private-access-token'};
  const p=await queryVeoScene(operationName,{...args,fetchImpl:response({name:operationName,done:false})});
  assert.equal(p.status,'processing');
  const filtered=await queryVeoScene(operationName,{...args,fetchImpl:response({name:operationName,done:true,response:{raiMediaFilteredCount:1}})});
  assert.equal(filtered.status,'failed');
});
test('service account uses a signed short-lived OAuth JWT and does not expose private key', async()=>{
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,
    privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const account=JSON.stringify({type:'service_account',client_email:'video-pilot@project-123456.iam.gserviceaccount.com',
    private_key:privateKey,token_uri:'https://oauth2.googleapis.com/token'});
  let count=0;
  const token=await serviceAccountAccessToken(account,{fetchImpl:async(url,options)=>{
    count++;
    assert.equal(url,'https://oauth2.googleapis.com/token');
    const fields=new URLSearchParams(options.body);
    assert.equal(fields.get('grant_type'),'urn:ietf:params:oauth:grant-type:jwt-bearer');
    const header=JSON.parse(Buffer.from(fields.get('assertion').split('.')[0],'base64url'));
    assert.equal(header.alg,'RS256');
    return {ok:true,json:async()=>({access_token:'fake-oauth-test-token',token_type:'Bearer'})};
  }});
  assert.equal(count,1);
  assert.equal(token,'fake-oauth-test-token');
});
