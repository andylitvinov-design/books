import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Messenger recommendations keep three horizontal image cards compact and all options accessible',()=>{
  const chat=read('components/holistic-agent-chat.tsx');
  const css=read('components/holistic-agent-chat.module.css');
  assert.match(chat,/data-hh-verified-options/);
  assert.match(chat,/data-hh-recommendation-card/);
  assert.match(chat,/availableSuggestions\.slice\(0,3\)\.map\(renderRecommendation\)/);
  assert.match(chat,/availableSuggestions\.slice\(3\)\.map\(renderRecommendation\)/);
  assert.match(chat,/recommendationPortrait\(x\)/);
  for(const image of ['reiki-practitioner-sunrise.webp','ideas-pine-sharp.avif','tantra-reiki-yin-yang-cover.svg'])
    assert.ok(chat.includes(image),image);
  assert.match(css,/\.thread \.offer\{[\s\S]*?grid-template-columns:70px minmax\(0,1fr\)/);
  assert.match(css,/@media\(max-width:760px\) and \(max-height:740px\)/);
  assert.match(css,/\.offerPortrait\{width:54px;height:54px/);
});

test('Messenger scrolls to the last question instead of pushing it offscreen',()=>{
  const chat=read('components/holistic-agent-chat.tsx');
  assert.match(chat,/data-hh-chat-turn=\{m\.role\}/);
  assert.match(chat,/querySelectorAll<HTMLElement>\('\[data-hh-chat-turn="user"\]'\)/);
  assert.match(chat,/programmaticScrollTop\.current=target/);
  assert.match(chat,/thread\.scrollTop=target/);
  assert.match(chat,/thread\.scrollTop=thread\.scrollHeight/);
  assert.match(chat,/if\(automatic\)return/);
});

test('Verified links and in-session rejection/tried controls are retained in three languages',()=>{
  const chat=read('components/holistic-agent-chat.tsx');
  assert.match(chat,/href=\{x\.href\} rel="noreferrer"/);
  assert.match(chat,/setDismissedIds\(ids=>/);
  assert.match(chat,/setCompletedIds\(ids=>/);
  assert.match(chat,/data-chat-skin=\{messengerView\?"messenger":undefined\}/);
  for(const localized of ['Другие варианты','Más opciones','More options','Не предлагать снова',"Don't suggest again",'Я попробовал','I tried it'])
    assert.ok(chat.includes(localized),localized);
  assert.match(chat,/\{t\.localFeedback\}/);
});
