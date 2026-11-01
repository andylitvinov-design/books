/**
 * Deterministic questions and transitions for the single Video Studio messenger.
 * The source of truth is the same category/topic/scenario/idea/phrase registry
 * used in the phrase workspace. No AI, database writes or novel-media claims.
 */
import {
  listVideoGoalCategories, listVideoGoalTopics, listVideoGoalScenarios,
  getVideoGoalTopic, resolveVideoGoalTopic,
} from "./video-goal-taxonomy.mjs";
import {
  listVideoPhraseIdeas, listPreparedVideoPhrases, suggestVideoPhrasePath,
  VIDEO_PHRASE_TONES, VIDEO_PHRASE_SPEAKERS, VIDEO_PHRASE_LENGTHS,
} from "./video-phrase-catalog.mjs";
import {normalizeStageCaption} from "./stage-caption-track.mjs";

export const VIDEO_CHAT_TREE_STEPS=Object.freeze([
  "category","topic","scenario","idea","phrase",
]);
const FILTER_STEPS=["mood","aspect","duration","music","phrases"];
const normalize=s=>String(s||"").normalize("NFKC").toLocaleLowerCase()
  .replace(/ё/g,"е").replace(/\s+/gu," ").trim();
const emptyPath=()=>({categoryId:null,topicId:null,scenarioId:null,ideaId:null,
  phraseId:null,phraseText:null,tone:"gentle",speaker:"self",length:"short"});

export function initialVideoChatTree(goal="",locale="ru"){
  const resolved=resolveVideoGoalTopic({request:goal,locale});
  const path=emptyPath();
  if(resolved.status==="matched"){
    path.categoryId=resolved.categoryId;
    path.topicId=resolved.topicId;
  }
  return path;
}
export function nextVideoChatTreeStep(draft){
  if(!draft.categoryId)return "category";
  if(!draft.topicId)return "topic";
  if(!draft.scenarioId)return "scenario";
  if(!draft.ideaId)return "idea";
  if(draft.phrases!==false&&!draft.phraseId)return "phrase";
  for(const key of FILTER_STEPS)if(draft[key]===null||draft[key]===undefined)return key;
  return "review";
}
export function videoChatTreeOptions(draft,step,locale="ru"){
  const rows=step==="category"?listVideoGoalCategories(locale):
    step==="topic"?listVideoGoalTopics(draft.categoryId,locale):
    step==="scenario"?listVideoGoalScenarios(draft.topicId,locale):
    step==="idea"?listVideoPhraseIdeas(draft.scenarioId,locale):
    step==="phrase"?listPreparedVideoPhrases({
      categoryId:draft.categoryId,topicId:draft.topicId,
      scenarioId:draft.scenarioId,ideaId:draft.ideaId,locale,
      tone:draft.tone,speaker:draft.speaker,length:draft.length,
    }):[];
  return rows.map(row=>({id:row.id,label:row.text||row.title}));
}
/** Validate the option against its direct parent. No cross-category guesses. */
export function chooseVideoChatTreeOption(draft,step,value,locale="ru"){
  if(!VIDEO_CHAT_TREE_STEPS.includes(step))return null;
  const options=videoChatTreeOptions(draft,step,locale);
  const target=options.find((item,index)=>item.id===value||
    normalize(item.label)===normalize(value)||String(index+1)===String(value).trim());
  if(!target)return null;
  if(step==="category"){
    const previousAutoGoal=getVideoGoalTopic(draft.topicId,locale)?.desiredOutcome;
    return {...draft,goal:previousAutoGoal&&draft.goal===previousAutoGoal?"":draft.goal,
      categoryId:target.id,topicId:null,scenarioId:null,ideaId:null,phraseId:null,phraseText:null};
  }
  if(step==="topic"){
    const previousAutoGoal=getVideoGoalTopic(draft.topicId,locale)?.desiredOutcome;
    return {...draft,goal:previousAutoGoal&&draft.goal===previousAutoGoal?"":draft.goal,
      topicId:target.id,scenarioId:null,ideaId:null,phraseId:null,phraseText:null};
  }
  if(step==="scenario")return {...draft,scenarioId:target.id,
    ideaId:null,phraseId:null,phraseText:null};
  if(step==="idea")return {...draft,ideaId:target.id,phraseId:null,phraseText:null};
  if(step==="phrase")return {...draft,phraseId:target.id,
    phraseText:target.label,phrases:true};
  return null;
}
/** A free-text goal may suggest a topic, but never overrides a chosen category. */
export function resolveVideoChatTreeRequest(draft,request,step,locale="ru"){
  if(!["category","topic"].includes(step)||typeof request!=="string"||
    request.trim().length<3)return null;
  const resolved=resolveVideoGoalTopic({
    request,locale,categoryId:step==="topic"?draft.categoryId:null,
  });
  if(resolved.status!=="matched")return null;
  return {...draft,goal:request.trim().slice(0,800),
    categoryId:resolved.categoryId,topicId:resolved.topicId,
    scenarioId:null,ideaId:null,phraseId:null,phraseText:null};
}
/** Tone and grammar filters re-query three prepared phrases without an AI call. */
export function changeVideoChatPhraseFilter(draft,filter,value){
  const valid=filter==="tone"?VIDEO_PHRASE_TONES:
    filter==="speaker"?VIDEO_PHRASE_SPEAKERS:
    filter==="length"?VIDEO_PHRASE_LENGTHS:null;
  if(!valid?.includes(value))return null;
  return {...draft,[filter]:value,phraseId:null,phraseText:null,phrases:null};
}
/** A text-box phrase is explicit user copy, not a catalog fallback. */
export function chooseCustomVideoChatPhrase(draft,value){
  if(typeof value!=="string"||value.length>96||/[<>]/u.test(value))return null;
  const text=normalizeStageCaption(value);
  if(text.length<3||text.length>96)return null;
  return {...draft,phraseId:"custom",phraseText:text,phrases:true};
}
/** One-tap route: follow selected category/topic, complete only missing nodes. */
export function autocompleteVideoChatTree(draft,legacyTheme="energy",locale="ru"){
  // Unknown free text (e.g. "food") must not silently become a random
  // health or energy goal. Let the person choose the area explicitly.
  const matched=resolveVideoGoalTopic({request:draft.goal||"",locale});
  if(!draft.categoryId&&matched.status!=="matched")return null;
  const suggested=suggestVideoPhrasePath({request:draft.goal||"",legacyTheme,locale});
  const categoryId=draft.categoryId||suggested?.categoryId;
  if(!categoryId)return null;
  const topicId=draft.topicId||
    (suggested?.categoryId===categoryId?suggested.topicId:
      listVideoGoalTopics(categoryId,locale)[0]?.id);
  const scenarioId=draft.scenarioId||listVideoGoalScenarios(topicId,locale)[0]?.id;
  const ideaId=draft.ideaId||listVideoPhraseIdeas(scenarioId,locale)[0]?.id;
  if(!topicId||!scenarioId||!ideaId)return null;
  const first=listPreparedVideoPhrases({categoryId,topicId,scenarioId,ideaId,
    locale,tone:draft.tone,speaker:draft.speaker,length:draft.length})[0];
  if(!first)return null;
  const topic=getVideoGoalTopic(topicId,locale);
  return {...draft,goal:draft.goal?.trim()||topic.desiredOutcome,
    categoryId,topicId,scenarioId,ideaId,
    phraseId:draft.phrases===false?null:first.id,
    phraseText:draft.phrases===false?null:first.text,
    phrases:draft.phrases??true};
}

/**
 * Bounded conversational selection: only choices under the current parent.
 * The visitor may say "the second story" or paraphrase a displayed title.
 */
const ORDINALS=[
  /^(?:1|1-й|1-я|перв\p{L}*|first|one|primer\p{L}*|uno|una)$/iu,
  /^(?:2|2-й|2-я|втор\p{L}*|second|two|segund\p{L}*|dos)$/iu,
  /^(?:3|3-й|3-я|трет\p{L}*|треть\p{L}*|third|three|tercer\p{L}*|tres)$/iu,
  /^(?:4|4-й|4-я|четверт\p{L}*|fourth|four|cuart\p{L}*|cuatro)$/iu,
  /^(?:5|5-й|5-я|пят\p{L}*|fifth|five|quint\p{L}*|cinco)$/iu,
  /^(?:6|6-й|6-я|шест\p{L}*|sixth|six|sext\p{L}*|seis)$/iu,
];
const words=s=>normalize(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^\p{L}\p{N}]+/gu," ").split(" ").filter(w=>w.length>2);
const root=w=>/^[а-яё]+$/iu.test(w)&&w.length>=5?
  w.replace(/(?:ыми|ими|ого|ому|ему|ую|ая|яя|ое|ее|ой|ий|ый|ей|ам|ем|ах|ом|у|ю|а|я|ы|и|е|о)$/iu,""):
  w.length>=7?w.slice(0,-2):w.length>=5?w.slice(0,-1):w;
const stop=new Set(["хочу","давай","выбери","покажи","вариант","варианта",
  "идея","идею","тема","тему","сценарий","сценария","фраза","фразу",
  "please","choose","option","give","show","quiero","elige","opcion","escoge",
  "the","and","для","что","мне","этот","эту","второй","первый"]);
export function recognizeVideoChatTreeOption(draft,step,value,locale="ru"){
  if(!VIDEO_CHAT_TREE_STEPS.includes(step)||typeof value!=="string")return null;
  const direct=chooseVideoChatTreeOption(draft,step,value,locale);
  if(direct)return direct;
  const options=videoChatTreeOptions(draft,step,locale);
  if(!options.length)return null;
  const request=normalize(value);
  const ordinal=request.match(/^(?:выбери|хочу|возьми|давай|покажи|мне|нравится|берем|берём|choose|select|pick|show|option|the|quiero|elige|escojo|opci[oó]n|\s)*\s*(\S+)(?:\s+(?:вариант|варианта|сценарий|историю|идею|фразу|option|story|idea|phrase|opci[oó]n|historia|frase))?(?:\s+пожалуйста)?$/iu);
  if(ordinal){
    const number=ORDINALS.findIndex(rx=>rx.test(ordinal[1]));
    if(number>=0&&number<options.length)
      return chooseVideoChatTreeOption(draft,step,options[number].id,locale);
    if(/^(?:последн\p{L}*|last|[uú]ltim\p{L}*)$/iu.test(ordinal[1]))
      return chooseVideoChatTreeOption(draft,step,options.at(-1).id,locale);
  }
  const whole=options.filter(opt=>normalize(opt.label).length>=4&&
    request.includes(normalize(opt.label)));
  if(whole.length===1)return chooseVideoChatTreeOption(draft,step,whole[0].id,locale);
  if(whole.length>1)return null;
  const requested=words(request).filter(w=>!stop.has(w));
  if(requested.length<2)return null;
  const ranked=options.map((item,index)=>{
    const candidate=words(item.label).filter(w=>!stop.has(w));
    if(candidate.length<2)return {index,score:0,hits:0};
    const hits=candidate.filter(w=>requested.some(r=>root(r)===root(w))).length;
    return {index,hits,score:hits/candidate.length*.65+hits/requested.length*.35};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  if(!ranked.length||ranked[0].hits<2||ranked[0].score<.7||
    (ranked[1]&&ranked[0].score-ranked[1].score<.16))return null;
  return chooseVideoChatTreeOption(draft,step,options[ranked[0].index].id,locale);
}

/** Interpret phrasing style, independently of film pacing and soundtrack. */
export function recognizeVideoChatPhraseStyle(value,step="phrase"){
  const s=normalize(value);
  const explicit=/(?:фраз|надпис|слов|текст|поддержк|аффирмац|phrase|caption|affirmation|words on|frase|subt[ií]tul|texto)/iu.test(s);
  if(step!=="phrase"&&!explicit)return null;
  if(step==="phrase"&&!explicit&&/(?:музык|мелоди|soundtrack|music|m[uú]sica)/iu.test(s))return null;
  const style={};
  if(/(?:уверенн\p{L}*|сильн\p{L}*|confident|strong|segur\p{L}*|firme)/iu.test(s))style.tone="confident";
  else if(/(?:вдохновля\p{L}*|воодушевля\p{L}*|inspir\p{L}*|motivad\p{L}*)/iu.test(s))style.tone="inspiring";
  else if(/(?:бережн\p{L}*|мягк\p{L}*|нежн\p{L}*|gentle|soft|amable|suave)/iu.test(s))style.tone="gentle";
  else if(/(?:заземл\p{L}*|устойчив\p{L}*|спокойн\p{L}*|grounded|steady|seren\p{L}*|estable)/iu.test(s))style.tone="grounded";
  if(/(?:от мо[ег]го имени|от первого лица|фраз\p{L}*\s+с\s+я|от себя|first person|as i|en primera persona|yo misma?|^я$)/iu.test(s))style.speaker="self";
  else if(/(?:на ты|обращайся ко мне|второе лицо|к тебе|you voice|second person|dirigido a ti|en t[uú]|^ты$)/iu.test(s))style.speaker="support";
  if(/(?:коротк\p{L}*|покороче|кратк\p{L}*|short\p{L}*|brief\p{L}*|cort\p{L}*|breve)/iu.test(s))style.length="short";
  else if(/(?:подлиннее|разв[её]рнут\p{L}*|подробн\p{L}*|extended|longer|long form|larg\p{L}*|extendid\p{L}*)/iu.test(s))style.length="extended";
  return Object.keys(style).length?style:null;
}
