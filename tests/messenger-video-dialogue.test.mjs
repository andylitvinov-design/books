import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  MESSENGER_VIDEO_HANDOFF_KEY,initialMessengerVideoDraft,
  messengerVideoChoices,messengerVideoQuestion,advanceMessengerVideo,
  encodeMessengerVideoHandoff,decodeMessengerVideoHandoff,
  changeMessengerVideoPhraseStyle,
} from '../lib/mandala/video-chat-messenger-flow.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('EN/RU/ES Messenger uses the real validated Video Director tree and never approves a render',()=>{
 for(const locale of ['ru','en','es']){
  let draft=initialMessengerVideoDraft(),step='category';
  const visited=[];
  for(let n=0;n<16&&step!=='review';n++){
   visited.push(step);
   const choices=messengerVideoChoices(draft,step,locale);
   assert.ok(choices.length>0,`${locale} ${step} must have actual choices`);
   assert.ok(messengerVideoQuestion(step,locale).length>12);
   // The first selection is free text using exactly the visible localized label.
   const answer=n===0?choices[0].label:choices[0].id;
   const updated=advanceMessengerVideo(draft,step,answer,locale);
   assert.equal(updated.valid,true,`${locale} ${step}: ${answer}`);
   ({draft,step}=updated);
  }
  assert.equal(step,'review',locale);
  for(const expected of ['category','topic','scenario','idea','phrase','mood','aspect','duration','music'])
   assert.ok(visited.includes(expected),`${locale}: missing ${expected}`);
  const packet=encodeMessengerVideoHandoff(draft,locale);
  assert.ok(packet&&packet.length<1400,`${locale}: review handoff`);
  assert.equal(JSON.parse(packet).v,1);
  assert.equal(JSON.parse(packet).render,undefined,'Messenger cannot mark MP4 ready');
  const decoded=decodeMessengerVideoHandoff(packet,locale);
  assert.ok(decoded&&decoded.categoryId===draft.categoryId&&decoded.topicId===draft.topicId);
  assert.equal(decoded.phrases,true);
  assert.ok(decoded.goal.length>3,'handoff retains canonical desired outcome');
  assert.equal(decodeMessengerVideoHandoff(packet,locale==='ru'?'en':'ru'),null,'cross-locale packet rejected');
  const forged=JSON.parse(packet);forged.topicId='external-or-unlicensed-topic';
  assert.equal(decodeMessengerVideoHandoff(JSON.stringify(forged),locale),null,'cross-parent forged ID rejected');
  const edited=advanceMessengerVideo(draft,'review','подтверждаю',locale);
  assert.equal(edited.valid,false,'Messenger cannot approve a scenario');
  assert.equal(encodeMessengerVideoHandoff(initialMessengerVideoDraft(),locale),null,'incomplete cannot hand off');
 }
});

test('typed and tapped answers share one reducer; skip and changes preserve unrelated choices',()=>{
 let draft=initialMessengerVideoDraft();
 let step='category';
 let transition=advanceMessengerVideo(draft,step,messengerVideoChoices(draft,step,'en')[0].id,'en');
 ({draft,step}=transition);
 const topic=messengerVideoChoices(draft,step,'en')[0];
 transition=advanceMessengerVideo(draft,step,topic.label,'en');
 assert.equal(transition.valid,true);
 ({draft,step}=transition);
 const selectedTopic=draft.topicId;
 const changed=advanceMessengerVideo(draft,'aspect','vertical','en');
 assert.equal(changed.valid,true);
 assert.equal(changed.draft.aspect,'portrait');
 assert.equal(changed.draft.topicId,selectedTopic,'format edit must keep topic');
 const rejected=advanceMessengerVideo(draft,'scenario','unexpected fake video title','en');
 assert.equal(rejected.valid,false,'unsupported story is not invented');
 assert.equal(rejected.draft.topicId,selectedTopic);
 const phraseChange=changeMessengerVideoPhraseStyle(draft,'tone','inspiring');
 assert.equal(phraseChange.tone,'inspiring');
 assert.equal(phraseChange.phraseId,null,'style change clears old phrase approval');
 const invalidStyle=changeMessengerVideoPhraseStyle(draft,'speaker','system');
 assert.equal(invalidStyle,null);
 assert.equal(advanceMessengerVideo(draft,'review','создавай','en').valid,false,'no remote render command');
});

test('the real studio owns the only validated MediaRecorder; Messenger UI is compact and inline',()=>{
 const messenger=source('components/holistic-agent-chat.tsx');
 const studio=source('components/mandala-video-director-chat.tsx');
 const css=source('components/holistic-agent-chat.module.css');
 assert.ok(messenger.includes('data-hh-video-chat-options'));
 assert.ok(messenger.includes('data-hh-video-chat-choice'));
 assert.ok(messenger.includes('data-hh-video-open-studio'));
 assert.ok(messenger.includes('if(!requiresProtectedReply(text,locale)){answerVideo(text);return;}'));
 assert.ok(messenger.includes('interpretSupportUtterance(text.slice(i,i+240),locale)'));
 assert.ok(messenger.includes('classifyVideoChatQuestion(value)'));
 assert.ok(!messenger.includes('{compact&&settings}'));
 assert.ok(!messenger.includes('{compact&&<p className={styles.compactDisclosure}>'));
 assert.ok(studio.includes('decodeMessengerVideoHandoff(packet,locale)'));
 assert.ok(studio.includes('onGoalChange(incoming.goal);onInvalidate();'));
 assert.ok(studio.includes('panel.open=true'));
 assert.ok(css.includes('min-height:44px'));
 assert.equal(typeof MESSENGER_VIDEO_HANDOFF_KEY,'string');
});
