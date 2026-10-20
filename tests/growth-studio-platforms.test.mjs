import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CHANNEL_CAPABILITIES,GROWTH_PUBLICATION_NETWORKS,reviewGrowthPublication,publicationStatusLabel}
 from '../lib/growth-studio/channel-capabilities.mjs'
import {GROWTH_CHANNELS,normalizePostFields} from '../lib/growth-studio/model.mjs'

const publicCopy={
 brand:'holistic_house',channel:'telegram',locale:'en',title:'Free study',caption:'A public educational introduction.',
 sourceUrl:'https://holistichouse.vercel.app/en/academy',scheduledAt:'',campaign:'study_202610',
 mediaUrl:'',mediaAlt:'',status:'approved',
}
test('all 13 Publer-type networks and independent event workflows have a truthful capability entry',()=>{
 const publer=['facebook','instagram','twitter','linkedin','pinterest','google_business',
  'youtube','wordpress','tiktok','telegram','mastodon','threads','bluesky']
 for(const provider of publer){
   assert.equal(GROWTH_CHANNELS.includes(provider),true,provider)
   assert.ok(CHANNEL_CAPABILITIES[provider],provider)
   assert.equal(CHANNEL_CAPABILITIES[provider].supportsDirectPosting,false)
 }
 assert.equal(new Set(GROWTH_PUBLICATION_NETWORKS).size,GROWTH_PUBLICATION_NETWORKS.length)
 assert.ok(GROWTH_PUBLICATION_NETWORKS.includes('eventbrite'))
 assert.ok(GROWTH_PUBLICATION_NETWORKS.includes('meetup'))
})
test('saved content is a draft, not a false publisher connection',()=>{
 for(const provider of GROWTH_PUBLICATION_NETWORKS){
   const review=reviewGrowthPublication({...publicCopy,channel:provider})
   assert.equal(review.connected,false,provider)
   assert.equal(review.canPublishNow,false,provider)
   assert.equal(review.draftSupported,true,provider)
 }
 assert.equal(reviewGrowthPublication({...publicCopy,channel:'mystery'}).state,'unsupported')
})
test('supported media and post length are enforced per network without creating a provider job',()=>{
 const inst=reviewGrowthPublication({...publicCopy,channel:'instagram'})
 assert.ok(inst.issues.includes('media_required'))
 const you=reviewGrowthPublication({...publicCopy,channel:'youtube',mediaUrl:'/images/banner.jpg'})
 assert.ok(you.issues.includes('video_required'))
 const pin=reviewGrowthPublication({...publicCopy,channel:'pinterest',mediaUrl:'/images/banner.jpg'})
 assert.ok(pin.issues.includes('pinterest_board_not_configured'))
 const business=reviewGrowthPublication({...publicCopy,channel:'google_business'})
 assert.ok(business.issues.includes('business_location_not_configured'))
 const meetup=reviewGrowthPublication({...publicCopy,channel:'meetup'})
 assert.ok(meetup.issues.includes('event_details_required'))
 const bluesky=reviewGrowthPublication({...publicCopy,channel:'bluesky',sourceUrl:'',caption:'X'.repeat(301)})
 assert.ok(bluesky.issues.includes('text_too_long'))
 const threads=reviewGrowthPublication({...publicCopy,channel:'threads',sourceUrl:'',caption:'X'.repeat(501)})
 assert.ok(threads.issues.includes('text_too_long'))
})
test('Telegram requires exact HH brand, supported media and verified rights after explicit owner check',()=>{
 const notConfigured=reviewGrowthPublication(publicCopy)
 assert.ok(notConfigured.issues.includes('telegram_not_configured'))
 const configured=reviewGrowthPublication(publicCopy,{telegramConfigured:true})
 assert.ok(configured.issues.includes('telegram_channel_not_verified'))
 const verified=reviewGrowthPublication(publicCopy,{telegramConfigured:true,telegramChannelVerified:true})
 assert.equal(verified.canPublishNow,true)
 assert.equal(verified.state,'eligible_after_confirm')
 const wrongBrand=reviewGrowthPublication({...publicCopy,brand:'toronto_tantra'}, {telegramConfigured:true,telegramChannelVerified:true})
 assert.ok(wrongBrand.issues.includes('telegram_brand_not_configured'))
 assert.equal(wrongBrand.canPublishNow,false)
 const webp=reviewGrowthPublication({...publicCopy,mediaUrl:'/images/banner.webp',mediaAlt:'Poster'},{telegramConfigured:true,telegramChannelVerified:true})
 assert.ok(webp.issues.includes('telegram_media_unsupported'))
 const text=reviewGrowthPublication({...publicCopy,caption:'a'.repeat(2000),mediaUrl:'/images/poster.jpg',mediaAlt:'Poster'},{telegramConfigured:true,telegramChannelVerified:true})
 assert.ok(text.issues.includes('text_too_long'))
})
test('status labels explicitly separate manual plan from provider receipt',()=>{
 assert.match(publicationStatusLabel('planned_manual'),/not scheduled externally/)
 assert.match(publicationStatusLabel('published'),/Provider confirmed/)
 assert.match(publicationStatusLabel('delivery_unknown'),/manual verification/)
 assert.match(publicationStatusLabel('approved','ru'),/не отправлено/)
})
test('not connected account does not sneak into already verified channel permissions',()=>{
 const store=readFileSync(new URL('../components/growth-studio-connections.jsx',import.meta.url),'utf8')
 const actions=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
 assert.match(store,/checkGrowthTelegramPublisherAction/)
 assert.match(actions,/requireAdminRequest\(\)/)
 assert.match(actions,/verifyTelegramPostingPermissions\(\)/)
 assert.doesNotMatch(store,/BOT_TOKEN|API_KEY|password/i.test('') ? /INERT_TEST/ : /process\.env/)
 const model=normalizePostFields({...publicCopy,status:undefined})
 assert.equal(model.brand,'holistic_house')
})
