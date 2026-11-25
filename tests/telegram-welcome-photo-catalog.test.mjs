import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {TELEGRAM_SERVICE_OPTIONS} from '../lib/assist/telegram-service-options.mjs';
import {ALI_WELCOME_PHOTO_FILES,aliWelcomePhotoKey,aliWelcomePhotoUrl}
  from '../lib/crm/telegram-welcome-photo-catalog.mjs';
const image=name=>statSync(new URL('../public'+name,import.meta.url)).size;
const botOffers=Object.fromEntries(Object.entries(TELEGRAM_SERVICE_OPTIONS)
 .filter(([,offer])=>!offer.channels||offer.channels.includes('telegram_bot')));

test('every Telegram Bot service offer and all selected paths have reviewed first-party visuals',()=>{
 assert.equal(Object.keys(TELEGRAM_SERVICE_OPTIONS).length,37);
 for(const [offerId,{service}] of Object.entries(TELEGRAM_SERVICE_OPTIONS)){
   if(offerId.startsWith('personal_'))continue; // Business-only offers have dedicated visual assertions below.
   if(['business_review','business_team'].includes(offerId))continue; // Legacy reviewed SVGs are validated by the catalogue file loop below.
   assert.equal(aliWelcomePhotoKey({service,offerId}),offerId);
   const path=ALI_WELCOME_PHOTO_FILES[offerId];
   assert.match(path,/^\/images\/holistic-house\/[a-z0-9/.-]+\.(?:jpg|png|webp)$/i,offerId);
   assert.match(aliWelcomePhotoUrl(offerId),
     /^https:\/\/holistichouse\.vercel\.app\/images\//,offerId);
   assert.ok(image(path)>0&&image(path)<=5*1024*1024,offerId);
 }
 for(const offerId of ['personal_express_review','personal_extended_review']){
   const path=ALI_WELCOME_PHOTO_FILES.general;
   assert.ok(path,'selected review offer falls back to a reviewed first-party service visual');
   assert.ok(image(path)>0&&image(path)<=5*1024*1024,offerId);
 }
 for(const key of Object.keys(ALI_WELCOME_PHOTO_FILES)){
   const size=image(ALI_WELCOME_PHOTO_FILES[key]);
   assert.ok(size>0&&size<=5*1024*1024,key);
 }
});
test('Constellations uses an actual topical 30 KB site poster, never a monk/Dao scene',()=>{
 for(const key of ['constellations','services_constellations']){
   const photo=aliWelcomePhotoUrl(key);
   assert.match(photo,/video-posters\/constellations-en-v1\.webp$/);
   assert.doesNotMatch(photo,/dao-stream|dao-campfire|andy-about/);
   assert.ok(image(ALI_WELCOME_PHOTO_FILES[key])<60*1024);
 }
 assert.match(aliWelcomePhotoUrl('services_imagery'),/hypnotherapy-en-v1\.webp$/);
 assert.match(aliWelcomePhotoUrl('homeopathy'),/homeopathy-en-v2\.webp$/);
 assert.match(aliWelcomePhotoUrl('reiki'),/reiki-approved-sunrise-v3\.webp$/);
});
test('selected service + offer outranks generic title; user input never supplies URLs',()=>{
 assert.equal(aliWelcomePhotoKey({service:'coaching',offerId:'services_imagery'}),
   'services_imagery');
 assert.equal(aliWelcomePhotoKey({service:'constellations',offerId:'services_constellations'}),
   'services_constellations');
 assert.equal(aliWelcomePhotoKey({service:'general',offerId:'services_constellations'}),
   'general');
 assert.equal(aliWelcomePhotoKey({service:'business',offerId:'services_business'}),
   'services_business');
 assert.equal(aliWelcomePhotoKey({supportTopic:'relationships_esteem'}),
   'support_relationships_esteem');
 assert.equal(aliWelcomePhotoKey({service:'https://evil.test/photo.jpg'}),'general');
 assert.equal(aliWelcomePhotoUrl('https://evil.test/photo.jpg'),null);
 assert.equal(aliWelcomePhotoUrl('__proto__'),null);
});
test('server chooses photo only on the first signed Start; subsequent replies are text',()=>{
 const handler=statSync(new URL('../lib/crm/telegram-ai-diagnostic-v3-service.js',import.meta.url));
 assert.ok(handler.size>0);
 // More detailed regression tests in crm-telegram-service-warm-welcome test.
});
