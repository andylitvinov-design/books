import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  configuredVideoUploadStore,signPrivateVideoRequest,createVideoUploadUrl,createVideoReadUrl
} from '../lib/clients/private-video-object-store.js'
const env={
  HH_CLIENT_VIDEO_EXTERNAL_ENABLED:'true',HH_CLIENT_VIDEO_BACKEND:'r2',
  HH_CLIENT_VIDEO_R2_ACCOUNT_ID:'abcdef0123456789abcdef0123456789',
  HH_CLIENT_VIDEO_BUCKET:'hh-private-video-test',
  HH_CLIENT_VIDEO_ACCESS_KEY_ID:'synthetic-access-id',
  HH_CLIENT_VIDEO_SECRET_ACCESS_KEY:'synthetic-never-real-secret',
}
const key='12345678-1234-4234-8234-123456789abc/12345678-1234-4234-8234-123456789abd.mp4'
test('external video is disabled by default and credentials are never needed for Supabase assets',()=>{
  assert.equal(configuredVideoUploadStore({}),null)
  assert.equal(configuredVideoUploadStore({...env,HH_CLIENT_VIDEO_EXTERNAL_ENABLED:'false'}),null)
  assert.equal(configuredVideoUploadStore(env).provider,'r2')
})
test('only exact approved private R2 or Canada S3 endpoint may be signed',()=>{
  const url=new URL(createVideoUploadUrl('r2',key,env))
  assert.equal(url.hostname,env.HH_CLIENT_VIDEO_R2_ACCOUNT_ID+'.r2.cloudflarestorage.com')
  assert.equal(url.pathname,'/hh-private-video-test/'+key)
  assert.equal(url.searchParams.get('X-Amz-Expires'),'900')
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'),'content-type;host')
  assert.ok(url.searchParams.get('X-Amz-Signature')?.length===64)
  assert.equal(url.href.includes(env.HH_CLIENT_VIDEO_SECRET_ACCESS_KEY),false)
  const ca={...env,HH_CLIENT_VIDEO_BACKEND:'s3_ca'}
  assert.equal(new URL(signPrivateVideoRequest('s3_ca',key,{env:ca})).hostname,'s3.ca-central-1.amazonaws.com')
  assert.throws(()=>signPrivateVideoRequest('r2',key,{env:ca}))
})
test('SigV4 signs method, key, content type and TTL; rejects unsafe paths',()=>{
  const at=new Date('2026-10-15T22:01:00Z')
  const put=signPrivateVideoRequest('r2',key,{method:'PUT',mime:'video/mp4',expires:180,at,env})
  const get=signPrivateVideoRequest('r2',key,{method:'GET',expires:180,at,env})
  const head=signPrivateVideoRequest('r2',key,{method:'HEAD',expires:180,at,env})
  assert.notEqual(put,get);assert.notEqual(get,head)
  assert.equal(new URL(put).searchParams.get('X-Amz-Date'),'20261015T220100Z')
  assert.equal(new URL(get).searchParams.get('X-Amz-SignedHeaders'),'host')
  assert.throws(()=>signPrivateVideoRequest('r2','../../private.mp4',{env}))
  assert.throws(()=>signPrivateVideoRequest('r2',key,{expires:3601,env}))
  assert.throws(()=>signPrivateVideoRequest('r2',key,{method:'PUT',mime:'application/pdf',env}))
})
test('existing session readers always use server-authorized streaming; not R2 bearer URLs',()=>{
  for(const route of [
    '../app/api/client-session-viewer/[selector]/media/[assetId]/route.js',
    '../app/api/client/[selector]/sessions/[sessionId]/media/[assetId]/route.js',
    '../app/api/app/saved-sessions/[id]/media/[assetId]/route.js'
  ]) {
    const text=readFileSync(new URL(route,import.meta.url),'utf8')
    assert.match(text,/privateMediaStream/)
    assert.doesNotMatch(text,/createVideoReadUrl/)
  }
})
