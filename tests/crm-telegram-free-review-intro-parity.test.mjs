import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliFreeDiagnosticIntro} from '../lib/assist/ali-free-diagnostic.mjs';
import {freeDiagnosticCopy} from '../lib/assist/ali-free-diagnostic-library.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Telegram free-review sender validates the exact canonical Wave introduction across languages',()=>{
  const sender=read('lib/crm/messenger-provider.js');
  const intake=read('lib/crm/telegram-ai-diagnostic-v3-service.js');

  // Regression: the V3 service sends aliFreeDiagnosticIntro(), which uses
  // "Wave" in place of the library's "Ali" copy. Comparing against the raw
  // copy blocked every first hhreview_* welcome with INVALID_MESSAGE.
  assert.match(intake,/freeStart\?aliFreeDiagnosticIntro\(lang\):copy\.intro/);
  assert.match(sender,/import \{aliFreeDiagnosticIntro\} from '\.\.\/assist\/ali-free-diagnostic\.mjs'/);
  assert.match(sender,/freeWelcomePhoto&&\(!freeConsent\|\|serviceWelcome\|\|webAppUrl\|\|presentation\|\|\s*text!==aliFreeDiagnosticIntro\(lang\)/);
  assert.doesNotMatch(sender,/text!==freeDiagnosticCopy\(lang\)\.intro/);

  for(const locale of ['ru','en','es']){
    const delivered=aliFreeDiagnosticIntro(locale);
    assert.equal(typeof delivered,'string');
    assert.ok(delivered.includes('Wave'));
    assert.notEqual(delivered,freeDiagnosticCopy(locale).intro,
      'This divergence caused the production /start silence; sender must use the transformed text');
  }
});
