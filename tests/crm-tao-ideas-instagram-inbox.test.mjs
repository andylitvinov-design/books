import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  TAO_IDEAS_INSTAGRAM_HANDLE,normalizeTaoIdeasInstagramMessages,
  instagramIdentityMatches,instagramMessagesSubscribed,
} from '../lib/crm/instagram-tao-inbox.mjs';
import {channelTransportReady,instagramTaoInboxApproved,messengerSetupStatus,
} from '../lib/crm/messenger-policy.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const BUSINESS='17841234567890123';
const USER='43210987654321';
const event=(body={},mid='m_test_1')=>({
  sender:{id:USER},recipient:{id:BUSINESS},timestamp:1793100000000,
  message:{mid,...body},
});
const payload=(entries=[event({text:'Hello from my Instagram'})])=>({
  object:'instagram',entry:[{id:BUSINESS,messaging:entries}],
});
const production=Object.freeze({
  VERCEL_ENV:'production',HH_CRM_MSG_INSTAGRAM_ENABLED:'true',
  HH_CRM_MSG_INSTAGRAM_TOKEN:'synthetic-not-a-real-token',
  HH_CRM_MSG_INSTAGRAM_ID:BUSINESS,
  HH_CRM_MSG_INSTAGRAM_USERNAME:'tao.ideas',
  HH_CRM_MSG_META_APP_SECRET:'synthetic-not-a-real-secret',
  HH_CRM_MSG_META_VERIFY_TOKEN:'synthetic-public-verify-token',
  HH_CRM_MSG_META_API_VERSION:'v26.0',
  HH_CRM_MSG_INSTAGRAM_INBOX_APPROVED:'true',
  HH_CRM_MSG_PRODUCTION_APPROVED:'false',
});
test('@tao.ideas has a single, narrowly approved CRM source; do not expose another profile',()=>{
  assert.equal(TAO_IDEAS_INSTAGRAM_HANDLE,'tao.ideas');
  assert.equal(instagramTaoInboxApproved(production),true);
  assert.equal(channelTransportReady('instagram',production),true);
  assert.equal(channelTransportReady('messenger',production),false);
  assert.equal(channelTransportReady('whatsapp',production),false);
  assert.equal(channelTransportReady('telegram',production),false);
  assert.equal(messengerSetupStatus('instagram',production).configured,true);
  assert.equal(messengerSetupStatus('instagram',production).liveApproved,true);
  assert.equal(instagramTaoInboxApproved({...production,VERCEL_ENV:'preview'}),false);
  assert.equal(instagramTaoInboxApproved({...production,HH_CRM_MSG_INSTAGRAM_USERNAME:'other.brand'}),false);
  assert.equal(channelTransportReady('instagram',{...production,HH_CRM_MSG_INSTAGRAM_USERNAME:'other.brand'}),false);
  assert.equal(channelTransportReady('instagram',{...production,HH_CRM_MSG_INSTAGRAM_INBOX_APPROVED:'false'}),false);
  for(const k of ['HH_CRM_MSG_INSTAGRAM_TOKEN','HH_CRM_MSG_INSTAGRAM_ID','HH_CRM_MSG_META_APP_SECRET',
    'HH_CRM_MSG_META_VERIFY_TOKEN','HH_CRM_MSG_META_API_VERSION','HH_CRM_MSG_INSTAGRAM_ENABLED']){
    const broken={...production};delete broken[k];
    assert.equal(channelTransportReady('instagram',broken),false,k);
  }
});
test('Instagram identity checks are strict on numeric ID + tao.ideas handle + professional type',()=>{
  const ok={id:BUSINESS,username:'tao.ideas',account_type:'BUSINESS'};
  assert.equal(instagramIdentityMatches(ok,BUSINESS),true);
  assert.equal(instagramIdentityMatches({...ok,account_type:'MEDIA_CREATOR'},BUSINESS),true);
  assert.equal(instagramIdentityMatches({...ok,account_type:'CREATOR'},BUSINESS),true);
  for(const profile of [{...ok,username:'other.brand'},{...ok,id:'99999999'},
    {...ok,account_type:'PERSONAL'},{...ok,account_type:null},
    {...ok,username:''},null])
    assert.equal(instagramIdentityMatches(profile,BUSINESS),false);
});
test('subscription readback must explicitly include messages and not just comments',()=>{
  assert.equal(instagramMessagesSubscribed({data:[{subscribed_fields:['messages'] }]}),true);
  assert.equal(instagramMessagesSubscribed({data:[{subscribed_fields:'comments,messages'}]}),true);
  for(const state of [{data:[{subscribed_fields:['comments','mentions']}]},
    {data:[]},{data:[{}]},null,{}])
    assert.equal(instagramMessagesSubscribed(state),false);
});
test('signed Instagram DM event becomes one same-account encrypted CRM event model',()=>{
  const result=normalizeTaoIdeasInstagramMessages(payload(),BUSINESS);
  assert.equal(result.length,1);
  assert.deepEqual(result[0],{
    type:'incoming',accountId:BUSINESS,userId:USER,
    name:'Instagram DM · #4321',language:null,
    body:'Hello from my Instagram',eventId:'instagram:m_test_1',
    messageId:'instagram:m_test_1',sentAt:1793100000000,stop:false,
  });
  assert.equal(normalizeTaoIdeasInstagramMessages(payload(),BUSINESS)[0].eventId,
    result[0].eventId,'same Meta message must hash to the same CRM idempotency identity');
});
test('DM with story reply, photos, videos, voice, shared Reel and unknown type never loses the event',()=>{
  const events=[
    event({reply_to:{story:{id:'private-story-id'}},text:'Great story!'},'m_story'),
    event({attachments:[{type:'image',payload:{url:'https://untrusted.private/sensitive'}}]},'m_photo'),
    event({attachments:[{type:'video',payload:{url:'https://untrusted.private/movie'}}]},'m_video'),
    event({attachments:[{type:'audio',payload:{url:'https://untrusted.private/audio'}}]},'m_voice'),
    event({attachments:[{type:'share',payload:{url:'https://untrusted.private/reel'}}]},'m_reel'),
    event({attachments:[{type:'unrecognized_private_type',payload:{url:'https://untrusted.private/fallback'}}]},'m_unknown'),
    event({text:'Look',attachments:[{type:'image',payload:{url:'https://untrusted.private/1'}}]},'m_mixed'),
  ];
  const out=normalizeTaoIdeasInstagramMessages(payload(events),BUSINESS);
  assert.equal(out.length,7);
  assert.match(out[0].body,/Instagram story reply/);
  for(let i=1;i<=5;i++)assert.match(out[i].body,/\[Instagram attachment:/);
  assert.match(out[6].body,/Look.*image/);
  assert.equal(JSON.stringify(out).includes('untrusted.private'),false,'never leak media URLs');
  assert.equal(JSON.stringify(out).includes('private-story-id'),false);
});
test('multiple senders stay independently keyed and inbound message order is preserved',()=>{
  const second={...event({text:'from second'},'m_second'),sender:{id:'53210987654321'}};
  const out=normalizeTaoIdeasInstagramMessages(payload([event({text:'first'},'m_first'),second]),BUSINESS);
  assert.equal(out.length,2);
  assert.notEqual(out[0].userId,out[1].userId);
  assert.deepEqual(out.map(x=>x.messageId),['instagram:m_first','instagram:m_second']);
});
test('foreign Instagram account, wrong webhook object, mismatched recipient, business echoes rejected',()=>{
  const variants=[
    {object:'page',entry:payload().entry},
    payload([event({text:'unexpected'},'m_bad')]),
  ];
  variants[1].entry[0].id='987654321';
  for(const invalid of variants) assert.deepEqual(normalizeTaoIdeasInstagramMessages(invalid,BUSINESS),[]);
  const wrongRecipient={...event({text:'leak'},'m_wrong'),recipient:{id:'55555555'}};
  const ownEcho={...event({text:'owner answer'},'m_echo'),sender:{id:BUSINESS}};
  const echoed=event({text:'echo',is_echo:true},'m_echo_flag');
  const deleted=event({text:'removed',is_deleted:true},'m_deleted');
  const read={sender:{id:USER},recipient:{id:BUSINESS},timestamp:1793100000000,read:{watermark:1}};
  const reaction={sender:{id:USER},recipient:{id:BUSINESS},reaction:{emoji:'❤️'}};
  assert.deepEqual(normalizeTaoIdeasInstagramMessages(payload([wrongRecipient,ownEcho,echoed,deleted,read,reaction]),BUSINESS),[]);
  assert.deepEqual(normalizeTaoIdeasInstagramMessages(payload(),null),[]);
  assert.deepEqual(normalizeTaoIdeasInstagramMessages(null,BUSINESS),[]);
});
test('STOP is stored in existing CRM suppression, not marketing or unsolicited replies',()=>{
  for(const txt of ['STOP','Stop','стоп','parar'])
    assert.equal(normalizeTaoIdeasInstagramMessages(payload([event({text:txt})]),BUSINESS)[0].stop,true);
  assert.equal(normalizeTaoIdeasInstagramMessages(payload([event({text:'stop talking about this'})]),BUSINESS)[0].stop,false);
});
test('bounded batches, malformed IDs and empty unsupported Meta events fail closed',()=>{
  const bad=event({text:'hello'},'bad\nline');
  assert.deepEqual(normalizeTaoIdeasInstagramMessages(payload([bad]),BUSINESS),[]);
  assert.deepEqual(normalizeTaoIdeasInstagramMessages(payload([{sender:{id:'evil'} }]),BUSINESS),[]);
  assert.deepEqual(normalizeTaoIdeasInstagramMessages(payload([event({})]),BUSINESS),[]);
  assert.throws(()=>normalizeTaoIdeasInstagramMessages(payload(
    Array.from({length:31},(_,i)=>event({text:'valid'},'m_'+i))),BUSINESS),RangeError);
  assert.deepEqual(normalizeTaoIdeasInstagramMessages({object:'instagram',entry:{}},BUSINESS),[]);
});
test('production handler reuses signed HMAC and exactly one encrypted owner inbox, no silent forward to Telegram',()=>{
  const webhook=source('lib/crm/messenger-webhook.js');
  const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
  const provider=source('lib/crm/messenger-provider.js');
  const store=source('lib/crm/messenger-store.js');
  const sql=source('supabase/migrations/20261018185711_hh_crm_messenger_core_20261018.sql');
  assert.match(webhook,/x-hub-signature-256/);
  assert.match(webhook,/createHmac\('sha256',env.HH_CRM_MSG_META_APP_SECRET\)/);
  assert.match(webhook,/normalizeTaoIdeasInstagramMessages\(payload,env.HH_CRM_MSG_INSTAGRAM_ID\)/);
  assert.match(webhook,/businessHash\(provider,businessId,config\)/);
  assert.match(webhook,/ingestMessengerEventInTransaction\(db,provider,event,config,accountDigest\)/);
  assert.ok(route.indexOf('verifyMessengerWebhook(provider,raw,request.headers)') <
    route.indexOf('normalizeMessengerUpdates(provider,body)'));
  assert.match(store,/providerMessageHash/);
  assert.match(store,/async listMessengerThreads/);
  assert.match(sql,/FORCE ROW LEVEL SECURITY/);
  assert.match(sql,/app_private\.crm_msg_ingest/);
  assert.match(provider,/instagramIdentityMatches\(response,id\)/);
  assert.match(provider,/instagramMessagesSubscribed\(subs\)/);
  assert.match(provider,/me\/subscribed_apps/);
  assert.doesNotMatch(route,/sendOneMessengerMessage\(.*instagram/);
});
test('one @tao.ideas CRM Messages panel offers scoped approval, provider status and EN/RU/ES operator guide',()=>{
  const ui=source('components/app/crm-messenger.jsx');
  const policy=source('lib/crm/messenger-policy.js');
  const provider=source('lib/crm/messenger-provider.js');
  assert.match(ui,/instagram:'Instagram · @tao.ideas'/);
  assert.match(ui,/guide\.instagramSetup/);
  assert.match(ui,/HH_CRM_MSG_INSTAGRAM_INBOX_APPROVED=true/);
  assert.match(ui,/https:\/\/www\.instagram\.com\/tao\.ideas\//);
  assert.match(policy,/HH_CRM_MSG_INSTAGRAM_USERNAME/);
  assert.match(policy,/instagramTaoInboxApproved/);
  assert.match(provider,/INSTAGRAM\+'\/'\+version\+'\/me\/messages'/);
});
