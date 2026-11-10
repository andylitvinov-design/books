import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {performance} from "node:perf_hooks";
import {interpretDialogueCoherence,DIALOGUE_COHERENCE_VERSION} from "../lib/holistic-support/dialogue-coherence.mjs";
import {ruleConversationReply} from "../lib/holistic-support/rule-conversation.mjs";
import {resolveConversationFocus} from "../lib/holistic-support/conversation-context.mjs";
import {understandVideoChatReply,extractVideoChatCorrection} from "../lib/mandala/video-chat-understanding.mjs";
import {advanceMessengerVideo,initialMessengerVideoDraft,messengerVideoChoices} from "../lib/mandala/video-chat-messenger-flow.mjs";
import {chooseVideoChatTreeOption} from "../lib/mandala/video-chat-tree.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const gold=JSON.parse(read("tests/fixtures/dialogue-coherence-gold-v1.json"));
const total=gold.legacyRule.length+gold.legacyVideo.length+gold.coherence.length+gold.video.length;
const allPhrases=[...gold.legacyRule.map(x=>x[0]),...gold.legacyVideo.map(x=>x[0]),
  ...gold.coherence.map(x=>x.message),...gold.video.map(x=>x.message)];

test("issue #3139: 200+ independent multilingual conversational gold examples",()=>{
  assert.equal(DIALOGUE_COHERENCE_VERSION,"hi-dialogue-coherence-v1");
  assert.ok(total>=200,"at least 200 examples across stages");
  assert.ok(new Set(allPhrases).size>=200,"not just duplicated input labels");
  assert.ok(gold.coherence.length>=80&&gold.video.length>=90);
});

test("explicit negation and correction never silently reuse the first mentioned medium",()=>{
  for(const {message,act,medium} of gold.coherence){
    const r=interpretDialogueCoherence({message});
    assert.equal(r.act,act,message+": act");
    assert.equal(r.medium,medium,message+": medium");
    assert.ok(["none","current","recent_user"].includes(r.source));
    assert.equal(r.requiresClarification,r.act==="ambiguous"||r.act==="reject",
      message+": clarification intent");
  }
});

test("multi-turn history: only a recent user's positive choice counts",()=>{
  const mixed=[{role:"user",text:"Хочу видео или медитацию"}];
  for(const text of ["да","yes","si"])
    assert.equal(interpretDialogueCoherence({message:text,history:mixed}).act,"ambiguous",text);
  assert.equal(interpretDialogueCoherence({message:"да",history:[{role:"assistant",text:"Хочу видео или медитацию"}]}).act,"none");
  assert.equal(interpretDialogueCoherence({message:"да",history:[
    {role:"user",text:"Хочу видео"},{role:"user",text:"Нет"}]}).act,"none");
  const explicit=interpretDialogueCoherence({message:"Не хочу видео, хочу медитацию",history:[{role:"user",text:"Хочу видео"}]});
  assert.equal(explicit.act,"switch");
  assert.equal(explicit.medium,"meditation");
  assert.equal(interpretDialogueCoherence({message:"видео или медитация"}).requiresClarification,true);
});

test("editing corrections: last explicit alternative wins, but contradictions clarify",()=>{
  for(const {message,stage,kind,filters,reason,direction} of gold.video){
    const r=understandVideoChatReply(message,stage);
    assert.equal(r.kind,kind,message+": action");
    if(reason)assert.equal(r.reason,reason,message+": clarification");
    if(direction)assert.equal(r.direction,direction,message+": relative duration");
    for(const [field,value] of Object.entries(filters||{}))
      assert.equal(r.filters?.[field],value,message+": "+field);
    if(kind==="clarify")assert.deepEqual(r.filters,{},message+": cannot patch state");
  }
  assert.equal(extractVideoChatCorrection("20 секунд, точнее 30 секунд").text,"30 секунд");
  assert.equal(extractVideoChatCorrection("9:16 или 16:9").corrected,false);
});

test("canonical tree resolves corrected ordinal exactly like the corresponding button",()=>{
  let draft=initialMessengerVideoDraft();
  const category=advanceMessengerVideo(draft,"category","love-relationships","ru");
  assert.equal(category.valid,true);
  const subId=messengerVideoChoices(category.draft,"subcategory","ru")[0]?.id;
  const sub=advanceMessengerVideo(category.draft,"subcategory",subId,"ru");
  assert.equal(sub.valid,true);
  const topicId=messengerVideoChoices(sub.draft,"mytube-topic","ru")[0]?.id;
  const specific=advanceMessengerVideo(sub.draft,"mytube-topic",topicId,"ru");
  assert.equal(specific.valid,true);
  // Old licensed storyboard remains one validated supporting renderer.
  const topic=advanceMessengerVideo(specific.draft,"topic","love-trust","ru");
  assert.equal(topic.valid,true);
  assert.equal(topic.draft.mytubeCategoryId,"love-relationships");
  assert.equal(topic.draft.mytubeSubcategoryId,subId);
  assert.equal(topic.draft.mytubeTopicId,topicId);
  const button=chooseVideoChatTreeOption(topic.draft,"scenario","3","ru");
  assert.ok(button?.scenarioId);
  const text=advanceMessengerVideo(topic.draft,"scenario","второй сценарий, точнее третий","ru");
  assert.equal(text.valid,true);
  assert.equal(text.draft.scenarioId,button.scenarioId);
  assert.equal(text.draft.ideaId,null);
  assert.equal(text.draft.phraseId,null);
  assert.deepEqual(text.draft.music,topic.draft.music,"unrelated music remains untouched");
  assert.deepEqual(text.draft.duration,topic.draft.duration,"unrelated duration remains untouched");
  const ambiguous=advanceMessengerVideo(topic.draft,"scenario","второй или третий сценарий","ru");
  assert.equal(ambiguous.valid,false);
  assert.deepEqual(ambiguous.draft,topic.draft);
  const denied=advanceMessengerVideo(topic.draft,"scenario","не второй сценарий","ru");
  assert.equal(denied.valid,false);
});

test("corrected topics override history and stale explicit filters without guessing",()=>{
  for(const [message,locale,goal] of [
    ["Нет, не про любовь, а про работу","ru","money"],
    ["Не про работу, а про отношения","ru","relationships"],
    ["Not about love but about work","en","money"],
    ["No sobre amor sino sobre trabajo","es","money"],
    ["Не про стресс, а про смысл","ru","meaning"],
  ]){
    const r=resolveConversationFocus({message,locale,selectedGoal:"relationships",
      history:[{role:"user",text:"Хочу про отношения"}]});
    assert.equal(r.goal,goal,message);
    assert.equal(r.source,"current");
  }
  for(const message of ["Не про работу","Нет, не это","No, that's not it"])
    assert.equal(resolveConversationFocus({message,locale:"ru",history:[
      {role:"user",text:"Хочу про работу"}]}).goal,null,message);
});

test("editorial RU/EN/ES response reflects corrections and refuses ambiguous choices",()=>{
  for(const [message,id,locale="ru"] of [
    ["Не хочу видео, хочу медитацию","meditation_start"],
    ["Нет, не медитацию, а видео","video_start"],
    ["Не хочу видео","coherent_reject_video"],
    ["Не хочу медитацию","coherent_reject_meditation"],
    ["Видео или медитация","coherent_ambiguous"],
    ["Not video but meditation","meditation_start","en"],
    ["No quiero video sino meditacion","meditation_start","es"],
  ]){
    const r=ruleConversationReply({message,locale});
    assert.equal(r?.id,id,message);
    assert.ok(r.reply.length>=20&&r.reply.length<500);
    assert.equal(r.source,"reviewed-rules");
  }
});

test("topic corrections route through explicit conversation intelligence and retain corrected topic",()=>{
  for(const [message,locale,topic,pattern] of [
    ["Нет, не про любовь, а про работу","ru","work_money",/работа и деньги/iu],
    ["Not about love but about work","en","work_money",/work and money/iu],
    ["No sobre amor sino sobre trabajo","es","work_money",/trabajo y el dinero/iu],
  ]){
    const r=ruleConversationReply({message,locale});
    const coherence=interpretDialogueCoherence({message});
    assert.equal(coherence.act,"correct_topic",message);
    assert.equal(r.id,"conversation_correction",message);
    assert.equal(r.source,"conversation-intelligence",message);
    assert.equal(r.understanding.act,"correction",message);
    assert.equal(r.understanding.topic,topic,message);
    assert.ok(pattern.test(r.reply),message+": reply must reflect the corrected topic");
    assert.ok(r.reply.length>=20&&r.reply.length<500,message);
  }
});

test("safe approval semantics: no corrections produce renderer, payment, access, or booking",()=>{
  for(const [input,stage] of [
    ["Да, но без музыки","review"],["Нет, не горизонтально, а вертикально","review"],
    ["Не хочу 20 секунд, лучше 30","review"],["9:16 или 16:9","review"],
    ["Не вертикально, а горизонтально","ready"],["Нет, другую историю","review"],
  ]){
    const r=understandVideoChatReply(input,stage);
    assert.ok(!["create","confirm","open"].includes(r.kind),input);
  }
  for(const path of [
    "lib/holistic-support/dialogue-coherence.mjs",
    "lib/mandala/video-chat-understanding.mjs",
    "lib/holistic-support/conversation-context.mjs"
  ]){
    const code=read(path);
    assert.doesNotMatch(code,/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|process\.env|createBooking|createPayment/);
  }
  const api=read("app/api/holistic-agent/turn/route.js");
  assert.ok(api.indexOf("requireSameOrigin(request,config)")<api.indexOf("await auth.verified()"));
  assert.ok(api.indexOf("const safety = preflight")<api.indexOf("const fastRule="));
});

test("deterministic benchmark reports stage/act counts and p95 without raw client logging",()=>{
  const times=[],counts={};
  for(const {message,act} of gold.coherence){
    const at=performance.now(),r=interpretDialogueCoherence({message});
    times.push(performance.now()-at);
    counts[r.act]=(counts[r.act]||0)+1;
    assert.equal(r.act,act);
  }
  for(const {message,stage,kind} of gold.video){
    const at=performance.now(),r=understandVideoChatReply(message,stage);
    times.push(performance.now()-at);
    counts[stage+":"+r.kind]=(counts[stage+":"+r.kind]||0)+1;
    assert.equal(r.kind,kind);
  }
  times.sort((a,b)=>a-b);
  const p95=times[Math.ceil(times.length*.95)-1];
  assert.ok(p95<150,"offline p95 should not require network/model I/O");
  assert.ok(Object.keys(counts).length>=8);
});

test("Messenger UI uses one-shot undo snapshot with the existing secure handoff",()=>{
  const ui=read("components/holistic-agent-chat.tsx");
  for(const literal of [
    "const videoUndo=useRef<",
    'if(act.kind==="undo"){',
    "videoUndo.current=null;",
    "videoUndo.current={draft:videoDraft,step:videoStep};",
    "setVideoDraft(previous.draft);",
    "setVideoStep(previous.step);",
    "stageVideoHandoff()",
    "requiresProtectedReply(text,turnLocale)"
  ])assert.ok(ui.includes(literal),literal);
  const reducer=read("lib/mandala/video-chat-messenger-flow.mjs");
  assert.ok(reducer.includes("extractVideoChatCorrection(value)"));
  assert.ok(reducer.includes("chooseVideoChatTreeOption(draft,step,optionText,locale)"));
  assert.doesNotMatch(reducer,/createVideo\(|onCreate\(|generatePaidModel/);
});
