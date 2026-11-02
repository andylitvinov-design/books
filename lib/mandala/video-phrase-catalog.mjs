/**
 * Offline-first catalog for video affirmations.
 * Single source: canonical 5 × 6 × 4 story taxonomy + 30 curated, localized action
 * sets. All filter combinations are deterministic, ready before any network call.
 * No prompt, PII, diagnosis, voice billing or implied MP4 production.
 */
import actions from "../../data/video-catalog/video-phrase-actions-v1.json" with {type:"json"};
import templates from "../../data/video-catalog/video-phrase-templates-v1.json" with {type:"json"};
import {
  VIDEO_GOAL_TOPICS, VIDEO_GOAL_SCENARIOS, VIDEO_GOAL_CATEGORIES,
  resolveVideoGoalTopic,
} from "./video-goal-taxonomy.mjs";

export const VIDEO_PHRASE_CATALOG_VERSION="hh-video-phrases-v1";
export const VIDEO_PHRASE_LOCALES=Object.freeze(["ru","en","es"]);
export const VIDEO_PHRASE_TONES=Object.freeze(["gentle","confident","grounded","inspiring"]);
export const VIDEO_PHRASE_SPEAKERS=Object.freeze(["self","support"]);
export const VIDEO_PHRASE_LENGTHS=Object.freeze(["short","extended"]);
export const VIDEO_PHRASE_VARIANTS=3;

const TOPICS=new Map(VIDEO_GOAL_TOPICS.map(topic=>[topic.id,topic]));
const SCENARIOS=new Map(VIDEO_GOAL_SCENARIOS.map(scenario=>[scenario.id,scenario]));
const CATEGORIES=new Set(VIDEO_GOAL_CATEGORIES.map(category=>category.id));
const valid=(key,options)=>typeof key==="string"&&options.includes(key);
const act=(topicId,locale,ideaIndex)=>actions.topics[topicId]?.[locale]?.[ideaIndex];
const sentence=(prefix,action,tag="")=>`${prefix} ${action}${tag}.`.replace(/\s+/g," ").trim();
const safeIndex=(id,scenarioId)=>{
  const prefix=`${scenarioId}-i`;
  if(typeof id!=="string"||!id.startsWith(prefix))return -1;
  const suffix=id.slice(prefix.length);
  if(!/^[1-4]$/.test(suffix))return -1;
  return Number(suffix)-1;
};

export function getVideoPhraseContext({
  categoryId=null,topicId=null,scenarioId=null,
}={}){
  const scenario=SCENARIOS.get(scenarioId);
  if(!scenario||topicId&&scenario.topicId!==topicId||
    categoryId&&scenario.categoryId!==categoryId)return null;
  const topic=TOPICS.get(scenario.topicId);
  return {
    categoryId:scenario.categoryId,topicId:scenario.topicId,
    scenarioId:scenario.id,arc:scenario.arc,
    legacyTheme:topic.legacyVideoTheme,
    visualMotifs:[...scenario.visualMotifs],
  };
}

export function listVideoPhraseIdeas(scenarioId,locale="ru"){
  if(!valid(locale,VIDEO_PHRASE_LOCALES))return [];
  const context=getVideoPhraseContext({scenarioId});
  if(!context)return [];
  const phrases=actions.topics[context.topicId]?.[locale];
  if(!Array.isArray(phrases)||phrases.length!==4)return [];
  return phrases.map((action,index)=>({
    id:`${scenarioId}-i${index+1}`,
    scenarioId,topicId:context.topicId,
    title:sentence(templates.ideaPrefix[locale],action,
      templates.sceneTags?.[locale]?.[context.arc]?.self||""),
    visualMotifId:context.visualMotifs[index],
    order:index+1,
  }));
}

/**
 * Returns real stored-copy candidates; the same selection keys are materialized
 * into the Supabase read-only library for remote lookup/editorial updates.
 * Invalid IDs, cross-category selections or unknown filter values fail closed.
 */
export function listPreparedVideoPhrases({
  categoryId=null,topicId=null,scenarioId=null,ideaId=null,
  locale="ru",tone="gentle",speaker="self",length="short",limit=3,
}={}){
  if(!valid(locale,VIDEO_PHRASE_LOCALES)||
     !valid(tone,VIDEO_PHRASE_TONES)||
     !valid(speaker,VIDEO_PHRASE_SPEAKERS)||
     !valid(length,VIDEO_PHRASE_LENGTHS))return [];
  const context=getVideoPhraseContext({categoryId,topicId,scenarioId});
  if(!context)return [];
  const ideaIndex=safeIndex(ideaId,scenarioId);
  if(ideaIndex<0)return [];
  const action=act(context.topicId,locale,ideaIndex);
  const prefixes=templates.prefixes?.[locale]?.[tone]?.[speaker];
  const closer=templates.closings?.[locale]?.[context.arc]?.[speaker];
  const storyTag=templates.sceneTags?.[locale]?.[context.arc]?.[speaker];
  if(!action||!Array.isArray(prefixes)||prefixes.length!==3||
    !closer||!storyTag)return [];
  return prefixes.slice(0,Number.isInteger(limit)?Math.max(0,Math.min(3,limit)):3)
    .map((prefix,index)=>{
      const short=sentence(prefix,action,storyTag);
      const text=length==="extended"?`${short}\n${closer}`:short;
      return {
        id:`${scenarioId}:${ideaId}:${locale}:${tone}:${speaker}:${length}:${index+1}`,
        scenarioId,categoryId:context.categoryId,topicId:context.topicId,
        ideaId,locale,tone,speaker,length,variant:index+1,text,
        catalogVersion:VIDEO_PHRASE_CATALOG_VERSION,
      };
    });
}

/** Wrap words, never silently chop a phrase in the existing 36-char Canvas. */
export function formatVideoPhraseForOverlay(text,{maxLineLength=36,maxLines=5}={}){
  if(typeof text!=="string"||maxLineLength<16||maxLines<1)return null;
  const lines=[];
  for(const part of text.trim().split(/\r?\n/)){
    let current="";
    for(const word of part.trim().split(/\s+/).filter(Boolean)){
      if(Array.from(word).length>maxLineLength)return null;
      const next=current?`${current} ${word}`:word;
      if(Array.from(next).length>maxLineLength){
        if(current)lines.push(current);
        current=word;
      }else current=next;
    }
    if(current)lines.push(current);
  }
  if(!lines.length||lines.length>maxLines)return null;
  return lines.join("\n");
}

const themeCategory={
  health:"stress",money:"business",energy:"energy",
  relationships:"love",goals:"business",life:"energy",
};
/** Prefer an explicit, stable topic match; never infer a diagnosis. */
export function suggestVideoPhrasePath({request="",legacyTheme="health",locale="ru"}={}){
  const resolved=resolveVideoGoalTopic({request,locale});
  const categoryId=resolved.status==="matched"?resolved.categoryId:
    themeCategory[legacyTheme]||"body";
  const category=VIDEO_GOAL_CATEGORIES.find(row=>row.id===categoryId);
  if(!category)return null;
  const topicId=resolved.status==="matched"?resolved.topicId:category.topicIds[0];
  const topic=TOPICS.get(topicId);
  if(!topic||topic.categoryId!==categoryId)return null;
  const scenarioId=topic.scenarioIds[0];
  return {categoryId,topicId,scenarioId,ideaId:`${scenarioId}-i1`};
}

export function auditVideoPhraseCatalog(){
  const issues=[];
  if(VIDEO_GOAL_CATEGORIES.length!==5||VIDEO_GOAL_TOPICS.length!==30||
     VIDEO_GOAL_SCENARIOS.length!==120)issues.push("taxonomy_count_mismatch");
  if(Object.keys(actions.topics).length!==30)issues.push("actions_count_mismatch");
  let ideas=0,records=0;
  for(const scenario of VIDEO_GOAL_SCENARIOS){
    for(const locale of VIDEO_PHRASE_LOCALES){
      const entries=listVideoPhraseIdeas(scenario.id,locale);
      if(entries.length!==4)issues.push(`missing_ideas:${scenario.id}:${locale}`);
      for(const idea of entries){
        ideas++;
        for(const tone of VIDEO_PHRASE_TONES)
          for(const speaker of VIDEO_PHRASE_SPEAKERS)
            for(const length of VIDEO_PHRASE_LENGTHS){
              const phrases=listPreparedVideoPhrases({
                categoryId:scenario.categoryId,topicId:scenario.topicId,
                scenarioId:scenario.id,ideaId:idea.id,locale,tone,speaker,length,
              });
              records+=phrases.length;
              if(phrases.length!==3||
                 new Set(phrases.map(x=>x.text)).size!==3)issues.push(`bad_variants:${idea.id}:${locale}:${tone}:${speaker}:${length}`);
              for(const phrase of phrases)if(!formatVideoPhraseForOverlay(phrase.text)||
                /[<>]/.test(phrase.text)||phrase.text.length>180)
                issues.push(`unsafe_copy:${phrase.id}`);
            }
      }
    }
  }
  return {ok:!issues.length,categories:VIDEO_GOAL_CATEGORIES.length,
    topics:VIDEO_GOAL_TOPICS.length,scenarios:VIDEO_GOAL_SCENARIOS.length,
    localizedIdeas:ideas,preparedPhraseRecords:records,issues};
}
