import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {
  readGrowthStudioProviderReadiness, GROWTH_CONNECTION_STATES,
} from '../lib/growth-studio/provider-readiness.mjs'
import {GROWTH_PUBLICATION_NETWORKS} from '../lib/growth-studio/channel-capabilities.mjs'
import {RUSSIAN_CHANNEL_ID} from '../lib/youtube/upload-history-model.mjs'

const fakeToken='123456789:'+'A'.repeat(40)
const fakeEnglish={
  id:'UC'+'E'.repeat(22),name:'Test English video channel',handle:'@test_english',
}
const fakeOauth='123456789012-abcDEFghij.apps.googleusercontent.com'
const emptyYoutube={
  oauthConfig:async()=>null,
  channels:async()=>({ru:{id:RUSSIAN_CHANNEL_ID},en:null}),
}
const pairedYoutube={
  oauthConfig:async()=>fakeOauth,
  channels:async()=>({ru:{id:RUSSIAN_CHANNEL_ID},en:fakeEnglish}),
}

test('every Growth Studio channel has one truthful local status; none defaults to verified',async()=>{
  const result=await readGrowthStudioProviderReadiness({
    environment:{},youtubeStore:emptyYoutube,
  })
  assert.deepEqual(Object.keys(result.channels).sort(),[...GROWTH_PUBLICATION_NETWORKS].sort())
  assert.equal(result.channels.telegram.state,'not_connected')
  assert.equal(result.channels.telegram.channelConfigured,false)
  assert.equal(result.channels.youtube.state,'not_connected')
  assert.equal(result.channels.youtube.uploaderStoreReadable,true)
  assert.equal(result.channels.youtube.oauthClientConfigured,false)
  assert.equal(result.channels.youtube.englishChannelPaired,false)
  assert.equal(result.channels.eventbrite.state,'external_tool')
  assert.equal(result.channels.meetup.state,'manual_only')
  for(const channel of GROWTH_PUBLICATION_NETWORKS){
    assert.ok(GROWTH_CONNECTION_STATES.includes(result.channels[channel].state))
    assert.notEqual(result.channels[channel].state,'verified')
    assert.notEqual(result.channels[channel].state,'published')
  }
})

test('Telegram config is unverified even with a valid bot and a public channel',async()=>{
  const env={
    HH_GROWTH_TELEGRAM_ENABLED:'true',
    HH_GROWTH_TELEGRAM_BOT_TOKEN:fakeToken,
    HH_GROWTH_TELEGRAM_CHAT_ID:'@holistic_public_channel',
    HH_PRACTICE_TG_BOT_TOKEN:'should-never-read-client-private-bot',
  }
  const result=await readGrowthStudioProviderReadiness({
    environment:env,youtubeStore:emptyYoutube,
  })
  assert.equal(result.channels.telegram.state,'configured_unverified')
  assert.equal(result.channels.telegram.channelConfigured,true)
  assert.ok(!JSON.stringify(result).includes(fakeToken),'no bot token may leave the server')
  assert.ok(!JSON.stringify(result).includes('@holistic_public_channel'),'do not return exact channel unnecessarily')
  assert.ok(!JSON.stringify(result).includes('should-never-read'),'client bot is never reused')
  const disabled=await readGrowthStudioProviderReadiness({
    environment:{...env,HH_GROWTH_TELEGRAM_ENABLED:'false'},youtubeStore:emptyYoutube,
  })
  assert.equal(disabled.channels.telegram.state,'not_connected')
  const incomplete=await readGrowthStudioProviderReadiness({
    environment:{HH_PRACTICE_TG_BOT_TOKEN:fakeToken},youtubeStore:emptyYoutube,
  })
  assert.equal(incomplete.channels.telegram.state,'not_connected')
})

test('YouTube stored public web client ID is a setup signal, not a logged-in channel',async()=>{
  const result=await readGrowthStudioProviderReadiness({
    environment:{},youtubeStore:pairedYoutube,
  })
  assert.equal(result.channels.youtube.state,'configured_unverified')
  assert.equal(result.channels.youtube.oauthClientConfigured,true)
  assert.equal(result.channels.youtube.uploaderStoreReadable,true)
  assert.equal(result.channels.youtube.englishChannelPaired,true)
  assert.equal(result.channels.telegram.state,'not_connected')
  assert.ok(!JSON.stringify(result).includes(fakeOauth),'no client ID returned to general status UI')
  assert.ok(!JSON.stringify(result).includes(fakeEnglish.id),'no channel IDs returned')
  for(const platform of ['instagram','facebook','google_business','tiktok','wordpress']){
    assert.equal(result.channels[platform].state,'manual_only',platform)
  }
})

test('YouTube Redis failure/disabled uploader fails closed, even if OAuth config is supplied',async()=>{
  const blocked={
    oauthConfig:async()=>{throw Error('network down')},
    channels:async()=>{throw Error('read failed')},
  }
  const fail=await readGrowthStudioProviderReadiness({
    environment:{HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID:fakeOauth},youtubeStore:blocked,
  })
  assert.equal(fail.channels.youtube.state,'unavailable')
  assert.equal(fail.channels.youtube.oauthClientConfigured,true)
  assert.equal(fail.channels.youtube.uploaderStoreReadable,false)
  assert.equal(fail.channels.youtube.englishChannelPaired,false)
  const none=await readGrowthStudioProviderReadiness({
    environment:{HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID:fakeOauth},youtubeStore:null,
  })
  assert.equal(none.channels.youtube.state,'unavailable')
  const explicitlyDisabled=await readGrowthStudioProviderReadiness({
    environment:{HH_YOUTUBE_PHONE_UPLOAD_ENABLED:'false'},youtubeStore:pairedYoutube,
  })
  assert.equal(explicitlyDisabled.channels.youtube.state,'not_connected')
  assert.equal(explicitlyDisabled.channels.youtube.uploaderDisabled,true)
  const badId=await readGrowthStudioProviderReadiness({
    environment:{HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID:'not-a-real-web-client'},youtubeStore:emptyYoutube,
  })
  assert.equal(badId.channels.youtube.state,'not_connected')
})

test('owner-gated read-only action returns no tokens or automatic publish path',()=>{
  const actions=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  const start=actions.indexOf('export async function checkGrowthStudioProviderReadinessAction()')
  const end=actions.indexOf('export async function checkGrowthTelegramPublisherAction()',start)
  assert.ok(start>0&&end>start)
  const body=actions.slice(start,end)
  assert.match(body,/requireAdminRequest\(\)/)
  assert.match(body,/await readGrowthStudioProviderReadiness\(\)/)
  assert.match(body,/readiness_unavailable/)
  assert.doesNotMatch(body,/sendTelegramPost|fetch\(|publishGrowthTelegramNowAction|client|user_id/)
})

test('owner-only UI shows separate local, external, and manual states without fake provider confirmations',()=>{
  const src=readFileSync(new URL('../components/growth-studio-connections.jsx',import.meta.url),'utf8')
  const page=readFileSync(new URL('../app/admin/growth-studio/page.js',import.meta.url),'utf8')
  assert.match(page,/requireAdminRequest\(\)/)
  assert.match(page,/robots:\{index:false,follow:false\}/)
  assert.match(src,/checkGrowthStudioProviderReadinessAction\(\)/)
  assert.match(src,/useEffect\(\(\)=>\{void checkProviders\(\)\},\[checkProviders\]\)/)
  assert.match(src,/providerProbeInFlight\.current/)
  assert.match(src,/t\.sitePublisherWarning/)
  assert.match(src,/isYoutube\?\(providerSnapshot\?\.youtube/)
  assert.match(src,/providerSnapshot\?\.telegram/)
  assert.match(src,/t\.siteExternal:t\.manualOnly/)
  assert.doesNotMatch(src,/PRESCRIPTIONS_ADMIN_PIN|PRESCRIPTIONS_KV_REST_API_TOKEN|HH_GROWTH_TELEGRAM_BOT_TOKEN\s*=|process\.env/)
  assert.doesNotMatch(src,/createScheduledPost|createCampaign|paidAdsEnabled\s*=\s*true/)
})
