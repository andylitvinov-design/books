import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initialMessengerVideoDraft,messengerVideoChoices,advanceMessengerVideo,
 encodeMessengerVideoHandoff,decodeMessengerVideoHandoff}
 from "../lib/mandala/video-chat-messenger-flow.mjs";
const src=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("content entry is localized and preserves the stable starter hook",()=>{
 const chat=src("components/holistic-agent-chat.tsx");
 for(const value of ["Создать контент","Create content","Crear contenido",
 "Видео · аудио · медитации · послания","Video · audio · meditations · messages",
 "Vídeo · audio · meditaciones · mensajes"])assert.ok(chat.includes(value),value);
 assert.equal(chat.split('data-hh-ai-start="video"').length-1,1);
 assert.ok(chat.includes('data-hh-ai-start="video" disabled={busy} onClick={startContent}'));
 for(const key of ["video","audio","meditation","message"])
   assert.ok(chat.includes("contentKinds"),key);
});
test("text / original-audio choices reuse existing real flows",()=>{
 const chat=src("components/holistic-agent-chat.tsx");
 const voice=src("components/app/messenger-audio-video.tsx");
 for(const text of ['data-hh-content-kind={kind}','data-hh-content-source={source}',
 'data-hh-content-step={contentStep}','setContentStep("brief")',
 'setContentVoice(true)','setContentBrief(text)',
 'encodeMessengerVideoHandoff(videoDraft,locale,contentBrief)',
 'maxLength={contentStep==="brief"?160:2000}'])
   assert.ok(chat.includes(text),text);
 // The current protected Messenger checks content safety and support switches
 // before answering the video request; do not assume the superseded one-liner.
 assert.ok(chat.includes('if(!requiresProtectedReply(text,locale)&&!supportSwitch){'));
 assert.ok(chat.includes('judgmentClickLock.current=false;answerVideo(text);return;'));
 assert.match(chat,/MessengerAudioVideo locale=\{locale\}/);
 assert.ok(voice.includes('open={autoOpen}'));
 assert.ok(voice.includes('await stageMessengerAudio('));
 assert.ok(!voice.includes('checked={rights}'),"no duplicate rights checkbox in mobile audio card");
 const studio=src("components/mandala-free-video-studio.tsx");
 // The one Messenger CTA hands the local file to Studio. Only an explicit
 // separate Studio action may send audio to the consented external STT provider.
 assert.ok(voice.includes('data-hh-audio-video-continue'));
 assert.ok(voice.includes('#video-audio'));
 assert.ok(!voice.includes('requestConsentedTimedTranscript('));
 assert.ok(!voice.includes('data-hh-audio-video-manual'));
 assert.ok(studio.includes('requestConsentedTimedTranscript('));
 assert.ok(studio.includes('data-video-audio-stt-consent'));
 assert.ok(studio.includes('data-video-audio-transcribe'));
 assert.ok(chat.includes('По вашему отдельному разрешению речь будет расшифрована'));
});
test("validated Studio handoff accepts bounded brief without skipping canonical selection",()=>{
 for(const locale of ["ru","en","es"]){
   let draft=initialMessengerVideoDraft(),step="category";
   for(let i=0;i<18&&step!=="review";i++){
     const choices=messengerVideoChoices(draft,step,locale);
     assert.ok(choices.length>0,locale+" "+step);
     const next=advanceMessengerVideo(draft,step,choices[0].id,locale);
     assert.equal(next.valid,true,locale+" "+step);
     ({draft,step}=next);
   }
   assert.equal(step,"review",locale);
   const brief=locale==="ru"?"Мой путь к спокойствию":locale==="es"?"Mi camino a la calma":"My path to calm";
   const packet=encodeMessengerVideoHandoff(draft,locale,brief);
   assert.ok(packet,locale);
   assert.equal(decodeMessengerVideoHandoff(packet,locale)?.goal,brief);
   assert.equal(decodeMessengerVideoHandoff(packet,locale)?.mytubeTopicId,draft.mytubeTopicId);
   assert.equal(decodeMessengerVideoHandoff(packet,locale==="ru"?"en":"ru"),null);
   const forged=JSON.parse(packet);forged.brief=54;
   assert.equal(decodeMessengerVideoHandoff(JSON.stringify(forged),locale),null);
   forged.brief="a".repeat(161);
   assert.equal(decodeMessengerVideoHandoff(JSON.stringify(forged),locale),null);
   assert.equal(encodeMessengerVideoHandoff(draft,locale,"\u0000unsafe"),null);
 }
});
