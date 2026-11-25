import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliSecretarySupportJourney} from '../lib/assist/ali-secretary-support-journeys.mjs';
import {telegramSupportSelection,telegramSupportFirstQuestion,
 telegramSupportIntro,telegramSupportNeedTitle,telegramSupportSummary}
 from '../lib/crm/telegram-support-quiz.mjs';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary}
 from '../lib/assist/ali-guided-intake.mjs';
import {aliWelcomePhotoKey,aliWelcomePhotoUrl}
 from '../lib/crm/telegram-welcome-photo-catalog.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const len=s=>(s.match(/[?？]/gu)||[]).length;

test('four Support topics × four sub-needs continue locally with their selected words',()=>{
 for(const locale of ['ru','en'])for(let topic=0;topic<4;topic++)for(let need=0;need<4;need++){
  const digits=''+topic+need+'000';
  const choice=telegramSupportSelection(digits);
  assert.ok(choice);
  const scenario=aliSecretarySupportJourney(digits,locale);
  assert.ok(scenario?.title?.includes(telegramSupportNeedTitle(locale,digits)));
  assert.equal(scenario.questions.goal,telegramSupportFirstQuestion(locale,digits));
  assert.equal(len(scenario.questions.goal),1);
  const intro=telegramSupportIntro(locale,digits);
  assert.ok(intro.length<180,intro);
  assert.doesNotMatch(intro,/OpenRouter|medical records|медицинские документы|AI.model/i);
  const key=aliWelcomePhotoKey({supportTopic:choice.topic});
  assert.ok(aliWelcomePhotoUrl(key)?.includes('/images/holistic-house/'));
  // Secretary mode does not ask for private feelings even for sensitive quiz topics.
  const goal=aliGuidedIntakeTurn({message:locale==='ru'?'да':'yes',
    locale,supportSelection:digits});
  assert.equal(goal.stage,'challenge');
  assert.equal(len(goal.reply),1);
  const when=aliGuidedIntakeTurn({message:'tomorrow afternoon',
    locale,stage:goal.stage,slots:goal.slots,supportSelection:digits});
  assert.equal(when.stage,'situation');
  const next=aliGuidedIntakeTurn({message:'online',
    locale,stage:when.stage,slots:when.slots,supportSelection:digits});
  assert.equal(next.stage,'ready');
  assert.equal(len(next.reply),0);
  const draft=aliGuidedIntakeSummary({locale,slots:next.slots,supportSelection:digits});
  assert.ok(draft.includes(scenario.title));
  assert.ok(draft.includes('tomorrow afternoon'));
  assert.ok(draft.includes('online'));
  assert.ok(telegramSupportSummary(locale,digits).length>25);
 }
});

test('deeper Coach/Conversation modes stay separate, without accidental Secretary consent',()=>{
 for(let topic=0;topic<4;topic++){
   for(let mode=1;mode<3;mode++){
    const digits=''+topic+'000'+mode;
    assert.equal(aliSecretarySupportJourney(digits,'ru'),null);
    assert.equal(aliSecretarySupportJourney(digits,'en'),null);
   }
 }
 assert.equal(aliSecretarySupportJourney('99999','en'),null);
 assert.equal(aliSecretarySupportJourney('00000','es'),null);
 const handler=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(handler,/const supportSecretaryStart=Boolean\(supportStart&&supportStart.selection.modeIndex===0\)/);
 assert.match(handler,/freeStart\|\|supportChatStart\|\|supportSecretaryStart/);
 assert.match(handler,/ctx.supportSelection&&ctx.conversationKind!=='general'/);
 assert.match(handler,/serviceCopy\|\|ctx.supportSelection/);
 assert.match(handler,/supportSelection:ctx.supportSelection\|\|null/);
 assert.match(handler,/telegramSupportSummary\(lang,ctx.supportSelection\)/);
 assert.match(handler,/if\(stop\)/);
 assert.match(handler,/stage='interview',locale=\$3,ai_consent_at=now\(\)/);
 assert.match(handler,/if\(action==='send'\)/);
});
