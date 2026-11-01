import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {understandVideoChatReply as understand} from "../lib/mandala/video-chat-understanding.mjs";
import {
 initialVideoChatTree,chooseVideoChatTreeOption,
 recognizeVideoChatTreeOption,recognizeVideoChatPhraseStyle,
 nextVideoChatTreeStep,videoChatTreeOptions,changeVideoChatPhraseFilter,
} from "../lib/mandala/video-chat-tree.mjs";

const sample=(goal="",locale="ru")=>({
 ...initialVideoChatTree(goal,locale),goal,
 mood:null,aspect:null,duration:null,music:null,phrases:null,
});

const examples=[
 ["Для Инстаграма, секунд на двадцать","category","settings_only",{aspect:"portrait",duration:20}],
 ["Для тиктока, 20 секунд","review","edit",{aspect:"portrait",duration:20}],
 ["Хочу спокойный вертикальный ролик о любви на 30 секунд","category","goal",{aspect:"portrait",mood:"slow",duration:30}],
 ["Пусть будет про любовь, но без музыки","review","goal",{music:"none"}],
 ["Нет, лучше про уверенность, вертикально","review","goal",{aspect:"portrait"}],
 ["Без надписей, только музыка","review","edit",{phrases:false,music:"harmony"}],
 ["Не вертикальный, а горизонтальный","review","edit",{aspect:"landscape"}],
 ["Полминуты","duration","edit",{duration:30}],
 ["Четверть минуты","duration","edit",{duration:15}],
 ["Sin música, horizontal, 20 segundos","review","edit",{music:"none",aspect:"landscape",duration:20}],
 ["Without captions or music, landscape 15 seconds","review","edit",{phrases:false,music:"none",aspect:"landscape",duration:15}],
 ["романтическая музыка","music","edit",{music:"love"}],
 ["медитативная музыка","music","edit",{music:"meditation"}],
 ["Фразы не надо, музыку оставь","review","edit",{phrases:false,music:"harmony"}],
 ["добавь горы","review","append_goal",{}],
 ["хочу озвучку голосом","review","audio",{}],
 ["Сделай видео","category","clarify",{}],
 ["Без фраз","phrase","edit",{phrases:false}],
];
for(const [value,stage,kind,fields] of examples){
 test("NLU "+stage+": "+value,()=>{
   const result=understand(value,stage);
   assert.equal(result.kind,kind);
   for(const [key,v] of Object.entries(fields))assert.equal(result.filters[key],v);
 });
}
test("safety: contradictory and unsupported options never silently override selections",()=>{
 assert.equal(understand("9:16 или 16:9","review").reason,"ambiguous");
 assert.equal(understand("20 минут","duration").reason,"unsupported_duration");
 assert.equal(understand("45 секунд","review").reason,"unsupported_duration");
 assert.equal(understand("20-30 секунд","duration").reason,"ambiguous");
 assert.equal(understand("15 или 30 секунд","review").reason,"ambiguous");
 assert.equal(understand("нет","review").kind,"clarify");
});
test("explicit confirmation and rendering stay in separate stages",()=>{
 assert.equal(understand("да","review").kind,"confirm");
 assert.equal(understand("да","ready").kind,"clarify");
 assert.equal(understand("создавай","review").reason,"approval_needed");
 assert.equal(understand("сделай видео","review").reason,"approval_needed");
 assert.equal(understand("сделай видео","scenario").reason,"incomplete_path");
 assert.equal(understand("создавай","ready").kind,"create");
 assert.equal(understand("покажи результат","done").kind,"open");
 assert.notEqual(understand("да, но без музыки","review").kind,"confirm");
});
test("navigation, repeat, auto and refusal follow conversation state",()=>{
 assert.equal(understand("назад","scenario").targetStep,"topic");
 assert.equal(understand("вернись к фразам","review").targetStep,"phrase");
 assert.equal(understand("другая идея","review").targetStep,"idea");
 assert.equal(understand("сменить тему","review").targetStep,"topic");
 assert.equal(understand("выбери сам","idea").kind,"auto");
 assert.equal(understand("пропусти","phrase").kind,"skip");
 assert.equal(understand("другой монтаж","review").kind,"clarify");
 assert.equal(understand("повтори вопрос","scenario").kind,"repeat");
 assert.equal(understand("покороче","review").direction,-1);
 assert.equal(understand("подлиннее","review").direction,1);
});
test("site tree can accept ordinals, local labels and unambiguous paraphrases",()=>{
 let d=sample();
 d=recognizeVideoChatTreeOption(d,"category","любовь","ru");
 assert.equal(d.categoryId,"love");
 d=recognizeVideoChatTreeOption(d,"topic","Доверие","ru");
 assert.equal(d.topicId,"love-trust");
 d=recognizeVideoChatTreeOption(d,"scenario","выбери второй сценарий","ru");
 assert.equal(d.scenarioId,"love-trust-s2");
 d=recognizeVideoChatTreeOption(d,"idea","третья идея","ru");
 assert.equal(d.ideaId,"love-trust-s2-i3");
 const texts=videoChatTreeOptions(d,"phrase","ru");
 assert.equal(texts.length,3);
 d=recognizeVideoChatTreeOption(d,"phrase","первую фразу","ru");
 assert.equal(d.phraseId,texts[0].id);
 assert.equal(d.phraseText,texts[0].label);
 const previous=d;
 const changed=recognizeVideoChatTreeOption(d,"scenario","мягкую опору","ru");
 assert.equal(changed.scenarioId,"love-trust-s2");
 assert.equal(changed.ideaId,null);
 assert.equal(changed.phraseId,null);
 assert.equal(previous.phraseId,texts[0].id);
});
test("options are bounded: cross-category IDs, undecidable phrases and hallucinated options never pass",()=>{
 let d=chooseVideoChatTreeOption(sample(),"category","love");
 d=chooseVideoChatTreeOption(d,"topic","love-trust");
 assert.equal(recognizeVideoChatTreeOption(d,"scenario","body-release-s2"),null);
 assert.equal(recognizeVideoChatTreeOption(d,"scenario","fifth scenario"),null);
 assert.equal(recognizeVideoChatTreeOption(d,"scenario","something completely different"),null);
 const scenario=chooseVideoChatTreeOption(d,"scenario","love-trust-s1");
 assert.equal(recognizeVideoChatTreeOption(scenario,"idea","first")?.ideaId,"love-trust-s1-i1");
});
test("phrase tone, addressee and length remain independent of video duration or soundtrack",()=>{
 assert.deepEqual(recognizeVideoChatPhraseStyle("фразы уверенно, на ты, покороче","review"),
   {tone:"confident",speaker:"support",length:"short"});
 assert.equal(recognizeVideoChatPhraseStyle("нежная музыка","review"),null);
 assert.equal(recognizeVideoChatPhraseStyle("мягкая музыка","phrase"),null);
 assert.deepEqual(recognizeVideoChatPhraseStyle("вдохновляющие фразы","review"),
   {tone:"inspiring"});
 const d=sample("Доверие");
 const result=changeVideoChatPhraseFilter({...d,phraseId:"old",phraseText:"old",phrases:true},"tone","gentle");
 assert.equal(result.phraseId,null);
 assert.equal(result.phraseText,null);
 assert.equal(result.duration,d.duration);
 assert.equal(result.music,d.music);
});
test("existing real film pipeline, tree, data and content limits are preserved",()=>{
 const chat=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
 assert.match(chat,/understandVideoChatReply\(value,step\)/);
 assert.match(chat,/recognizeVideoChatTreeOption\(draft,step,value,locale\)/);
 assert.match(chat,/nextVideoChatTreeStep\(next\)/);
 assert.match(chat,/changeVideoChatPhraseFilter\(next,key,val\)/);
 assert.match(chat,/onConfirm\(\{scenario:executable\}\)/);
 assert.match(chat,/onCreate\(\)/);
 assert.match(chat,/data-video-chat-tree-choice/);
 assert.match(chat,/data-chat-concept-unbound/);
 assert.match(chat,/captionTexts:captions/);
 assert.match(chat,/onInvalidate\(\)/);
 assert.doesNotMatch(chat,/hasVideoChatFilter/);
 assert.equal(nextVideoChatTreeStep(sample()),"category");
});
