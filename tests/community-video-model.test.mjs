import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {COMMUNITY_POLICY,communityFlags,normalizedCommunityIntent,buildCommunityMetadata,secureHashEqual,
 verifiedGoogleChannel,verifiedCommunityVideo,nextResumableOffset,validCommunitySessionUrl} from '../lib/app/community-video-model.mjs'
const channel='UC'+'a'.repeat(22)
const valid={title:'Light meditation',description:'Gentle message',authorDisplayName:'A Studio Member',
 audioLanguage:'en',visibility:'link_only',rightsConfirmed:false,privacyReviewed:false,
 publishToSharedYoutubeConfirmed:false,containsRealisticSyntheticMedia:true,madeForKidsDecision:'no'}
test('feature flags fail closed and channel validates immutable id',()=>{
 assert.deepEqual(communityFlags({}),{channelId:null,schemaReady:false,requestsEnabled:false,uploadsEnabled:false})
 assert.equal(communityFlags({HH_COMMUNITY_YOUTUBE_CHANNEL_ID:channel,HH_COMMUNITY_YOUTUBE_SCHEMA_READY:'true',HH_COMMUNITY_YOUTUBE_REQUESTS_ENABLED:'true',HH_COMMUNITY_YOUTUBE_UPLOADS_ENABLED:'true'}).uploadsEnabled,true)
 assert.equal(communityFlags({HH_COMMUNITY_YOUTUBE_CHANNEL_ID:'@shamanic_academy',HH_COMMUNITY_YOUTUBE_SCHEMA_READY:'true',HH_COMMUNITY_YOUTUBE_REQUESTS_ENABLED:'true',HH_COMMUNITY_YOUTUBE_UPLOADS_ENABLED:'true'}).uploadsEnabled,false)
})
test('immutable author attribution and explicit catalog opt-in',()=>{
 const i=normalizedCommunityIntent(valid),slug=randomUUID()
 const {snapshot,metadataHash}=buildCommunityMetadata(i,{slug})
 assert.match(snapshot.description,new RegExp('/en/creators/'+slug))
 assert.equal(snapshot.channelPrivacy,'unlisted')
 assert.equal(snapshot.consentPolicyVersion,COMMUNITY_POLICY)
 assert.ok(secureHashEqual(metadataHash,metadataHash))
 assert.equal(secureHashEqual(metadataHash,'0'.repeat(64)),false)
 const listed=normalizedCommunityIntent({...valid,visibility:'public_catalog',siteCatalogConsent:true})
 assert.equal(listed.siteCatalogConsent,true)
 assert.throws(()=>normalizedCommunityIntent({...valid,description:'a'.repeat(4201)}))
 assert.throws(()=>normalizedCommunityIntent({...valid,ownerAccountId:randomUUID()}))
})
test('wrong channel, privacy and upload states do not count as processed',()=>{
 assert.equal(verifiedGoogleChannel({items:[{id:channel,snippet:{title:'Holistic House Community',publishedAt:'2026-11-06T18:00:00Z'}}]},channel).channelId,channel)
 assert.throws(()=>verifiedGoogleChannel({items:[{id:'UC'+'b'.repeat(22)}]},channel))
 const video='abcdefghijk',base={items:[{id:video,snippet:{channelId:channel},status:{privacyStatus:'unlisted',uploadStatus:'uploaded'}}]}
 assert.equal(verifiedCommunityVideo(base,video,channel).processed,false)
 base.items[0].status.uploadStatus='processed';assert.equal(verifiedCommunityVideo(base,video,channel).processed,true)
 base.items[0].status.privacyStatus='public';assert.throws(()=>verifiedCommunityVideo(base,video,channel))
 base.items[0].status.privacyStatus='private';assert.equal(verifiedCommunityVideo(base,video,channel).removedFromPublic,true)
})
test('308 uses only verified offsets, no new upload link',()=>{
 assert.equal(nextResumableOffset(308,null,12000),0)
 assert.equal(nextResumableOffset(308,'bytes=0-4999',12000),5000)
 for(const r of ['bytes=1-4999','bytes=0-11999','garbage'])assert.throws(()=>nextResumableOffset(308,r,12000))
 assert.equal(validCommunitySessionUrl('https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abcd')!==null,true)
 for(const u of ['https://www.googleapis.com.evil.com/upload/youtube/v3/videos','http://www.googleapis.com/upload/youtube/v3/videos','https://www.googleapis.com/oauth2/token'])assert.equal(validCommunitySessionUrl(u),null)
})
