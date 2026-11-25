import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('one owner inbox distinguishes verified Telegram Bot and Business without trusting contact-origin metadata',()=>{
 const crm=source('components/app/crm-messenger.jsx');
 const simple=source('components/app/messages-simple-inbox.jsx');
 const store=source('lib/crm/messenger-store.js');
 const business=source('lib/crm/telegram-business-inbox.js');
 assert.match(business,/transport:'telegram_business'/);
 assert.match(store,/identity\?\.transport==='telegram_business'/);
 assert.match(store,/transport:identity\?\.transport==='telegram_business'/);
 assert.doesNotMatch(store,/effectiveChannel\(channel,record\)/);
 assert.match(crm,/telegram_business:'Telegram · @holistichouse'/);
 assert.match(crm,/names\[thread\.transport\|\|thread\.channel\]/);
 assert.match(crm,/names\[selected\.transport\|\|selected\.channel\]/);
 assert.match(crm,/\(item\.transport\|\|item\.channel\)===channelFilter/);
 assert.match(simple,/channelNames\[item\.transport\|\|item\.channel\]/);
 assert.match(simple,/data-owner-telegram-leads/);
 assert.match(crm,/thread\.id===id&&\['telegram','telegram_business'\]\.includes\(thread\.transport\|\|thread\.channel\)/);
});

test('only the visible owner inbox polls; no duplicate timer or provider sends in UI presentation',()=>{
 const crm=source('components/app/crm-messenger.jsx');
 const simple=source('components/app/messages-simple-inbox.jsx');
 assert.match(crm,/document\.visibilityState!=='visible'/);
 assert.match(crm,/\},45000\)/);
 assert.doesNotMatch(crm,/setTimeout\(check,60000\)/);
 assert.doesNotMatch(simple,/sendHolisticBusinessRequestReply|telegram\.org\/bot/);
});
