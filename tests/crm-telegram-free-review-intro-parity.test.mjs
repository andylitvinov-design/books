import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliFreeDiagnosticIntro} from '../lib/assist/ali-free-diagnostic.mjs';
import {freeDiagnosticCopy} from '../lib/assist/ali-free-diagnostic-library.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Telegram free-review sender accepts exactly the canonical Ali introduction for RU/EN/ES',()=>{
  const sender=read('lib/crm/messenger-provider.js');
  const intake=read('lib/crm/telegram-ai-diagnostic-v3-service.js');

  // Incident 2026-11-19: sender compared the unmodified Ali library copy
  // with a differently branded V3 introduction and blocked /start before
  // calling Telegram with INVALID_MESSAGE. Both consumers must use the
  // same canonical function, irrespective of future editorial changes.
  assert.match(intake,/freeStart\?aliFreeDiagnosticIntro\(lang\):copy\.intro/);
  assert.match(sender,/import \{aliFreeDiagnosticIntro\} from '\.\.\/assist\/ali-free-diagnostic\.mjs'/);
  assert.match(sender,/freeWelcomePhoto&&\(!freeConsent\|\|serviceWelcome\|\|webAppUrl\|\|presentation\|\|\s*text!==aliFreeDiagnosticIntro\(lang\)/);
  assert.doesNotMatch(sender,/text!==freeDiagnosticCopy\(lang\)\.intro/);

  for(const locale of ['ru','en','es']){
    const delivered=aliFreeDiagnosticIntro(locale);
    assert.equal(typeof delivered,'string');
    assert.equal(delivered,freeDiagnosticCopy(locale).intro,locale);
    assert.match(delivered,/\bAli\b/u,locale);
    assert.doesNotMatch(delivered,/\bWave\b/u,locale);
  }
});
