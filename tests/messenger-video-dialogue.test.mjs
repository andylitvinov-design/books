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
  for(const expected of ['category','subcategory','mytube-topic','topic','scenario','idea','phrase','mood','aspect','duration','music'])
   assert.ok(visited.includes(expected),`${locale}: missing ${expected}`);
  const packet=encodeMessengerVideoHandoff(draft,locale);
  assert.ok(packet&&packet.length<1400,`${locale}: review handoff`);
  assert.equal(JSON.parse(packet).v,1);
  assert.equal(JSON.parse(packet).render,undefined,'Messenger cannot mark MP4 ready');
  const decoded=decodeMessengerVideoHandoff(packet,locale);
  assert.ok(decoded&&decoded.categoryId===draft.categoryId&&decoded.topicId===draft.topicId);
  assert.equal(decoded.mytubeCategoryId,draft.mytubeCategoryId);
  assert.equal(decoded.mytubeSubcategoryId,draft.mytubeSubcategoryId);
  assert.equal(decoded.mytubeTopicId,draft.mytubeTopicId);
  assert.equal(decoded.goal,messengerVideoChoices(draft,'mytube-topic',locale)
    .find(item=>item.id===draft.mytubeTopicId)?.label,'canonical topic survives handoff');
  assert.equal(decoded.phrases,true);
  assert.ok(decoded.goal.length>3,'handoff retains canonical desired outcome');
  assert.equal(decodeMessengerVideoHandoff(packet,locale==='ru'?'en':'ru'),null,'cross-locale packet rejected');
  const forged=JSON.parse(packet);forged.topicId='external-or-unlicensed-topic';
  assert.equal(decodeMessengerVideoHandoff(JSON.stringify(forged),locale),null,'cross-parent forged ID rejected');
  const tamperedParent=JSON.parse(packet);
  tamperedParent.mytubeSubcategoryId='a-subcategory-from-a-different-branch';
  assert.equal(decodeMessengerVideoHandoff(JSON.stringify(tamperedParent),locale),null,
    'canonical subcategory and topic parent match required');
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
 for(const expected of ['subcategory','mytube-topic','topic']){
  assert.equal(step,expected);
  const item=messengerVideoChoices(draft,step,'en')[0];
  transition=advanceMessengerVideo(draft,step,item.label,'en');
  assert.equal(transition.valid,true);
  ({draft,step}=transition);
 }
 const selectedTopic=draft.topicId;
 const canonicalTopic=draft.mytubeTopicId;
 const changed=advanceMessengerVideo(draft,'aspect','vertical','en');
 assert.equal(changed.valid,true);
 assert.equal(changed.draft.aspect,'portrait');
 assert.equal(changed.draft.topicId,selectedTopic,'format edit must keep topic');
 assert.equal(changed.draft.mytubeTopicId,canonicalTopic,'format edit must keep exact MyTube topic');
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
 assert.ok(messenger.includes('data-hh-video-edit-details'));
 assert.ok(messenger.includes('data-hh-video-auth-retry'));
 assert.ok(messenger.includes('showVideoSignIn&&!authenticated&&authStatus==="guest"'));
 assert.ok(messenger.includes('window.sessionStorage.setItem(MESSENGER_VIDEO_HANDOFF_KEY,payload)'));
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

test('a greeting interrupts video categorization and receives a quick response',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const handler=chat.slice(chat.indexOf('  async function submit('),chat.indexOf('  const settings = ('));
 const greeting=handler.indexOf('if(compact&&isCasualGreeting(text))');
 const video=handler.indexOf('if(compact&&videoStep)');
 assert.ok(greeting>=0&&video>greeting,'greeting must run before video classification');
 assert.ok(handler.slice(greeting,video).includes('messengerStarter.ru.hello'));
 assert.ok(handler.slice(greeting,video).includes('messengerStarter.es.hello'));
 assert.ok(handler.slice(greeting,video).includes('starter.hello'));
 assert.ok(handler.slice(video).includes('answerVideo(text);return;'));
});

test('canonical 4-goal Messenger offers one CTA and live-scrolls new options without early Google login',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const css=source('components/holistic-agent-chat.module.css');
 for(const locale of ['ru','en','es']){
   const choices=messengerVideoChoices(initialMessengerVideoDraft(),'category',locale);
   assert.equal(choices.length,4);
   assert.deepEqual(choices.map(c=>c.id),['goals-money','love-relationships','energy-confidence','stress-anxiety']);
   const globalSubs=new Set();
   const globalTopics=new Set();
   for(const item of choices){
     const first=advanceMessengerVideo(initialMessengerVideoDraft(),'category',item.label,locale);
     assert.equal(first.valid,true,locale+' '+item.label);
     assert.equal(first.step,'subcategory');
     const subs=messengerVideoChoices(first.draft,first.step,locale);
     assert.equal(subs.length,4);
     for(const sub of subs){
       assert.ok(!globalSubs.has(sub.id),'no duplicate subcategory in a category');
       globalSubs.add(sub.id);
       const second=advanceMessengerVideo(first.draft,'subcategory',sub.id,locale);
       assert.equal(second.valid,true);
       assert.equal(second.step,'mytube-topic');
       const topics=messengerVideoChoices(second.draft,'mytube-topic',locale);
       assert.equal(topics.length,4);
       for(const topic of topics){
         assert.ok(!globalTopics.has(topic.id),'each topic belongs to exactly one branch');
         globalTopics.add(topic.id);
         const third=advanceMessengerVideo(second.draft,'mytube-topic',topic.label,locale);
         assert.equal(third.valid,true);
         assert.equal(third.step,'topic');
         assert.equal(third.draft.mytubeCategoryId,item.id);
         assert.equal(third.draft.mytubeSubcategoryId,sub.id);
         assert.equal(third.draft.mytubeTopicId,topic.id);
         assert.equal(third.draft.goal,topic.label);
       }
     }
   }
   assert.equal(globalSubs.size,16);
   assert.equal(globalTopics.size,64);
   const chosen=advanceMessengerVideo(initialMessengerVideoDraft(),'category',choices[0].id,locale);
   const back=advanceMessengerVideo(chosen.draft,'subcategory','назад',locale);
   assert.equal(back.valid,true);
   assert.equal(back.step,'category');
   const auto=advanceMessengerVideo(chosen.draft,'subcategory','выбери сам',locale);
   assert.equal(auto.valid,true);
   assert.equal(auto.step,'mytube-topic');
   const topicBack=advanceMessengerVideo(auto.draft,'mytube-topic','назад',locale);
   assert.equal(topicBack.valid,true);
   assert.equal(topicBack.step,'subcategory');
 }
 assert.match(chat,/isVideoCreationIntent\(text\)/);
 assert.match(chat,/videoPendingCategory/);
 assert.match(chat,/data-hh-video-canonical-topic/);
 assert.match(chat,/data-hh-personal-video-request disabled=\{busy\|\|!videoPendingCategory\}/);
 assert.match(chat,/videoStep,videoDraft,[\s\S]*showVideoSignIn/);
 assert.match(chat,/requestAnimationFrame\(revealLatest\)/);
 assert.match(css,/videoOptions button\[aria-pressed="true"\]/);
 assert.doesNotMatch(chat,/videoStep==="category"&&<a className=\{styles\.videoDiscoveryTextLink\}/);
});
