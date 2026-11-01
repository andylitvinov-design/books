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
  if(step==="category")return {...draft,categoryId:target.id,
    topicId:null,scenarioId:null,ideaId:null,phraseId:null,phraseText:null};
  if(step==="topic")return {...draft,topicId:target.id,
    scenarioId:null,ideaId:null,phraseId:null,phraseText:null};
  if(step==="scenario")return {...draft,scenarioId:target.id,
    ideaId:null,phraseId:null,phraseText:null};
  if(step==="idea")return {...draft,ideaId:target.id,phraseId:null,phraseText:null};
  if(step==="phrase")return {...draft,phraseId:target.id,
    phraseText:normalizeStageCaption(target.label),phrases:true};
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
    phraseText:draft.phrases===false?null:normalizeStageCaption(first.text),
    phrases:draft.phrases??true};
}
