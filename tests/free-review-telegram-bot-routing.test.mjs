import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {telegramExpressReviewHandoff,whatsappExpressReviewHandoff} from '../lib/crm/express-review-channel-handoff.mjs';

test('Free situation review starts one existing Telegram V3 bot, not unanswered personal Business chat',()=>{
  for(const locale of ['ru','en','es']){
    assert.equal(telegramExpressReviewHandoff(locale),'https://t.me/holistichouse_bot?start=hhreview_'+locale);
    assert.match(whatsappExpressReviewHandoff(locale)||'',/^https:\/\//);
  }
  assert.equal(telegramExpressReviewHandoff('fr'),null);
  assert.equal(telegramExpressReviewHandoff(undefined),null);
});

test('RU/EN/ES landing is truthful about Telegram bot, consent and CRM handoff',()=>{
  const source=readFileSync(new URL('../components/telegram-diagnostic-entry.tsx',import.meta.url),'utf8');
  assert.match(source,/data-telegram-route="ali-free-diagnostic-v3"/);
  assert.doesNotMatch(source,/data-telegram-route="human-business"/);
  assert.doesNotMatch(source,/Telegram opens my personal chat|Telegram abre mi chat personal|В Telegram откроется мой личный чат/);
  assert.match(source,/Your summary reaches Andrey only after your approval/);
  assert.match(source,/Резюме попадёт Андрею только после вашего согласия/);
  assert.match(source,/el resumen llegará al profesional solo si lo apruebas/);
});
