import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SITE_VIDEO_SLOTS,videoKey,prepareVideoChange,isSiteVideoRecord,toPublishedSiteVideo,
} from '../lib/site-videos/model.js';
import {createMemorySiteVideoStore} from '../lib/site-videos/store.js';

const time=new Date('2026-10-29T16:00:00.000Z');
const source='https://youtu.be/s30Y42IwPcg';
const input=(slot,locale,intent,extra={})=>({
  slot,locale,intent,youtubeUrl:source,
  title:'Synthetic approved video',youtubeVisibility:'unlisted',...extra,
});
const create=(previous,value)=>prepareVideoChange(previous,value,time);

test('approved synthetic site-video draft, reviewed publication and hide retain actual revisioned records',async()=>{
  const store=createMemorySiteVideoStore();
  const key=videoKey('about-intro','en');
  const draft=create(null,input('about-intro','en','draft'));
  assert.equal(draft.revision,1);
  assert.equal(draft.published,null);
  assert.equal(isSiteVideoRecord(draft),true);
  await store.save(draft,0);
  assert.equal(toPublishedSiteVideo(await store.get(key)),undefined);
  assert.equal((await store.get(key)).draft.title,'Synthetic approved video');
  assert.throws(()=>create(draft,input('about-intro','en','publish')),err=>err.code==='approval');
  const publicVideo=create(draft,input('about-intro','en','publish',{reviewed:true}));
  assert.equal(publicVideo.revision,2);
  assert.equal(publicVideo.published?.status,'published');
  assert.equal(publicVideo.published?.visibility,'public');
  assert.equal(toPublishedSiteVideo(publicVideo)?.youtubeId,'s30Y42IwPcg');
  await store.save(publicVideo,1);
  assert.equal(toPublishedSiteVideo(await store.get(key))?.title,'Synthetic approved video');
  const hidden=create(publicVideo,input('about-intro','en','hide'));
  await store.save(hidden,2);
  assert.equal(hidden.revision,3);
  assert.equal(hidden.published,null);
  assert.equal(toPublishedSiteVideo(await store.get(key)),undefined);
  assert.equal((await store.get(key)).draft?.title,'Synthetic approved video');
});

test('server-side compare-and-swap prevents simultaneous video editors overwriting each other',async()=>{
  const store=createMemorySiteVideoStore();
  const first=create(null,input('about-intro','en','draft'));
  await store.save(first,0);
  const snapshotA=await store.get(first.key),snapshotB=await store.get(first.key);
  const one=create(snapshotA,input('about-intro','en','publish',{reviewed:true,title:'Approved A'}));
  const two=create(snapshotB,input('about-intro','en','draft',{title:'Conflicting B'}));
  await store.save(one,1);
  await assert.rejects(store.save(two,1),err=>err.code==='conflict');
  assert.equal((await store.get(first.key)).published.title,'Approved A');
  assert.equal((await store.get(first.key)).draft.title,'Approved A');
});

test('video identities preserve EN, RU and Spanish-only approved destinations, without cross-language publication',async()=>{
  assert.equal(SITE_VIDEO_SLOTS.length,16);
  const store=createMemorySiteVideoStore();
  for(const locale of ['en','ru','es']){
    for(const slot of locale==='es'?['about-intro','thank-you']:['about-intro','thank-you','services-intro']){
      const record=create(null,input(slot,locale,'publish',{reviewed:true,title:locale+' '+slot}));
      await store.save(record,0);
      assert.equal((await store.get(videoKey(slot,locale))).published.title,locale+' '+slot);
    }
  }
  assert.throws(()=>videoKey('services-intro','es'),err=>err.code==='validation');
  assert.throws(()=>create(null,input('method-hypnotherapy','es','draft')),err=>err.code==='validation');
  const en=await store.get(videoKey('about-intro','en'));
  const ru=await store.get(videoKey('about-intro','ru'));
  const es=await store.get(videoKey('about-intro','es'));
  assert.notEqual(en.key,ru.key);
  assert.notEqual(ru.key,es.key);
  assert.equal((await store.list()).length,8);
});

test('public video records reject private client, billing and uploaded media fields',async()=>{
  const allowed=create(null,input('about-intro','en','draft'));
  assert.equal(isSiteVideoRecord(allowed),true);
  for(const field of ['clientId','patientNotes','privateFileUrl','accessToken','prescriptionId','secret']){
    assert.throws(()=>create(null,input('about-intro','en','draft',{[field]:'synthetic-sensitive-marker'})),err=>err.code==='validation',field);
    assert.equal(isSiteVideoRecord({...allowed,[field]:'synthetic-sensitive-marker'}),false,field);
  }
  assert.throws(()=>create(null,input('about-intro','en','publish',{reviewed:false})),err=>err.code==='approval');
  assert.equal(toPublishedSiteVideo(allowed),undefined);
});
