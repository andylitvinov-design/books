/**
 * Compact Holistic Messenger entry into the ONE existing Video Director.
 * Canonical category/topic/story/idea/phrase options and validation come
 * from video-chat-tree; render/approval remain in MandalaVideoDirectorChat.
 * Nothing here calls a provider, saves a health prompt or starts a video.
 */
import {
  VIDEO_CHAT_TREE_STEPS, initialVideoChatTree, nextVideoChatTreeStep,
  videoChatTreeOptions, chooseVideoChatTreeOption, recognizeVideoChatTreeOption,
  resolveVideoChatTreeRequest, autocompleteVideoChatTree, changeVideoChatPhraseFilter,
} from "./video-chat-tree.mjs";
import {parseVideoChatStepChoice,suggestVideoChatDefaults} from "./video-chat-intent.mjs";
import {understandVideoChatReply,extractVideoChatCorrection} from "./video-chat-understanding.mjs";
import {getVideoGoalTopic} from "./video-goal-taxonomy.mjs";
import {
  listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic,
} from "./mytube-content-taxonomy.mjs";
// Public 4-goal category IDs are mapped only to the existing validated Director
// source category. The single Studio still controls scenes and final export.
const CATEGORY_TO_DIRECTOR=Object.freeze({
  "goals-money":"business",
  "love-relationships":"love",
  "energy-confidence":"energy",
  "stress-anxiety":"stress",
});

export const MESSENGER_VIDEO_HANDOFF_KEY="hh-video-messenger-director-v1";
export const MESSENGER_VIDEO_STEPS=Object.freeze([
  "category","subcategory","mytube-topic",...VIDEO_CHAT_TREE_STEPS.filter(step=>step!=="category"),
  "mood","aspect","duration","music","phrases","review"
]);
const filters=["mood","aspect","duration","music","phrases"];
const allowed={
  mood:["slow","dynamic"],aspect:["portrait","landscape","square"],
  duration:[10,15,20,30,60],music:["love","meditation","harmony","none"],
  phrases:[true,false],
};
const copy={
  ru:{
    category:"Выберите цель вашего видео.",
    subcategory:"Какое направление вам ближе?","mytube-topic":"Выберите конкретную тему.",
    topic:"Какой дополнительный акцент подходит для сценария?",scenario:"Какой сценарий вам ближе?",
    idea:"Какую главную идею передать?",phrase:"Какие слова поддержки показать? Можно выбрать фразу или обойтись без надписей.",
    mood:"Какая атмосфера нужна?",aspect:"Какой формат видео выбрать?",
    duration:"Какой длины будет ролик?",music:"Какую музыку добавить?",
    phrases:"Добавить фразы на экран?",
    review:"Сценарий собран. Проверьте реальные кадры в видеостудии перед созданием видео.",
    unknown:"Не могу уверенно выбрать за вас. Нажмите вариант ниже или уточните словами.",
    toStudio:"Продолжить к созданию видео",back:"Назад",auto:"Выбери сам",
    skip:"Пропустить",noPhrases:"Без фраз",edit:"Изменить",
    moodNames:["Мягкая","Динамичная"],aspectNames:["Вертикально 9:16","Горизонтально 16:9","Квадрат 1:1"],
    musicNames:["Нежная","Медитативная","Гармония","Без музыки"],
    phraseNames:["Да, добавить","Нет"],tone:"Тон",speaker:"Обращение",length:"Длина",
    tones:["Бережно","Уверенно","Спокойно","Вдохновляюще"],
    speakers:["От себя · Я","К тебе · Ты"],lengths:["Коротко","Развёрнуто"],
    editNames:{mood:"Атмосфера",aspect:"Формат",duration:"Длительность",music:"Музыка",phrases:"Фразы"},
  },
  en:{
    category:"Choose your video goal.",
    subcategory:"Which area matters most?","mytube-topic":"Choose your specific topic.",
    topic:"Which supporting angle fits your story?",scenario:"Which story feels right?",
    idea:"What central idea should it express?",phrase:"Choose supportive words for the video, or skip captions.",
    mood:"What mood would you like?",aspect:"Which video format do you need?",
    duration:"How long should the video be?",music:"What soundtrack fits?",
    phrases:"Show supportive captions?",
    review:"Your brief is ready. Review footage in Video Studio before creating your video.",
    unknown:"I'm not sure which option fits. Tap one below or clarify in your own words.",
    toStudio:"Continue to create video",back:"Back",auto:"Choose for me",
    skip:"Skip",noPhrases:"No captions",edit:"Change",
    moodNames:["Gentle","Dynamic"],aspectNames:["Vertical 9:16","Landscape 16:9","Square 1:1"],
    musicNames:["Warm melody","Meditative","Harmony","Silent"],
    phraseNames:["Yes, add them","No"],tone:"Tone",speaker:"Address",length:"Length",
    tones:["Gentle","Confident","Grounded","Inspiring"],
    speakers:["First person · I","Support · You"],lengths:["Short","Extended"],
    editNames:{mood:"Mood",aspect:"Format",duration:"Duration",music:"Music",phrases:"Captions"},
  },
  es:{
    category:"Elige el objetivo de tu vídeo.",
    subcategory:"¿Qué área te importa más?","mytube-topic":"Elige un tema específico.",
    topic:"¿Qué matiz de apoyo quieres añadir?",scenario:"¿Qué historia prefieres?",
    idea:"¿Qué idea principal quieres transmitir?",phrase:"Elige palabras de apoyo o continúa sin frases.",
    mood:"¿Qué ambiente buscas?",aspect:"¿Qué formato necesitas?",
    duration:"¿Cuánto debe durar?",music:"¿Qué música prefieres?",
    phrases:"¿Añadir frases en pantalla?",
    review:"Tu propuesta está lista. Revisa las escenas reales en Video Studio antes de crear el vídeo.",
    unknown:"No puedo identificar la opción con certeza. Elige una o aclara tu respuesta.",
    toStudio:"Continuar para crear el vídeo",back:"Atrás",auto:"Elige por mí",
    skip:"Omitir",noPhrases:"Sin frases",edit:"Cambiar",
    moodNames:["Suave","Dinámico"],aspectNames:["Vertical 9:16","Horizontal 16:9","Cuadrado 1:1"],
    musicNames:["Melodía suave","Meditativa","Armonía","Sin música"],
    phraseNames:["Sí, añadir","No"],tone:"Tono",speaker:"Tratamiento",length:"Longitud",
    tones:["Suave","Segura","Serena","Inspiradora"],
    speakers:["Desde mí · Yo","Apoyo · Tú"],lengths:["Corta","Larga"],
    editNames:{mood:"Ambiente",aspect:"Formato",duration:"Duración",music:"Música",phrases:"Frases"},
  },
};
export function messengerVideoCopy(locale="en"){return copy[locale]||copy.en;}
export function initialMessengerVideoDraft(){
  return {...initialVideoChatTree(""),goal:"",mood:null,aspect:null,
    duration:null,music:null,phrases:null,
    mytubeCategoryId:null,mytubeSubcategoryId:null,mytubeTopicId:null};
}
export function messengerVideoQuestion(step,locale="en"){
  return messengerVideoCopy(locale)[step]||messengerVideoCopy(locale).category;
}
export function messengerVideoChoices(draft,step,locale="en"){
  if(step==="category")return listMyTubeCategories(locale).map(row=>({id:row.id,label:row.label}));
  if(step==="subcategory")return listMyTubeSubcategories(draft.mytubeCategoryId,locale)
    .map(row=>({id:row.id,label:row.label}));
  if(step==="mytube-topic")return listMyTubeTopics(draft.mytubeCategoryId,draft.mytubeSubcategoryId,locale)
    .map(row=>({id:row.id,label:row.label}));
  if(VIDEO_CHAT_TREE_STEPS.includes(step))return videoChatTreeOptions(draft,step,locale);
  const t=messengerVideoCopy(locale);
  const rows=step==="mood"?allowed.mood.map((id,i)=>({id,label:t.moodNames[i]})):
    step==="aspect"?allowed.aspect.map((id,i)=>({id,label:t.aspectNames[i]})):
    step==="duration"?allowed.duration.map(id=>({id:String(id),label:id+" s"})):
    step==="music"?allowed.music.map((id,i)=>({id,label:t.musicNames[i]})):
    step==="phrases"?allowed.phrases.map((id,i)=>({id:String(id),label:t.phraseNames[i]})):[];
  return rows;
}
const validFilter=(key,value)=>allowed[key]?.includes(value)??false;
const finish=draft=>{
  if(!draft.mytubeCategoryId)return "category";
  if(!draft.mytubeSubcategoryId)return "subcategory";
  if(!draft.mytubeTopicId)return "mytube-topic";
  return nextVideoChatTreeStep(draft);
};
const canonicalChoice=(draft,step,value,locale)=>{
  const rows=messengerVideoChoices(draft,step,locale);
  const lower=value.toLocaleLowerCase();
  return rows.find((row,index)=>row.id===value||
    row.label.toLocaleLowerCase()===lower||String(index+1)===value)||null;
};
const success=(draft,step)=>({draft,step,valid:true});
const failure=(draft,step)=>({draft,step,valid:false});
export function advanceMessengerVideo(draft,step,answer,locale="en"){
  if(!MESSENGER_VIDEO_STEPS.includes(step))return failure(draft,"category");
  const value=String(answer??"").trim().slice(0,800);
  if(!value)return failure(draft,step);
  // The canonical MyTube 4×4×4 path is the visitor's primary intent.
  // Legacy category/topic are only the EXISTING licensed-story/phrase backend;
  // never misrepresent them as the visitor's original MyTube selection.
  if(step==="category"){
    const chosen=canonicalChoice(draft,step,value,locale);
    if(chosen){
      const selected=chooseVideoChatTreeOption(draft,"category",CATEGORY_TO_DIRECTOR[chosen.id],locale);
      if(!selected)return failure(draft,step);
      const next={...selected,mytubeCategoryId:chosen.id,
        mytubeSubcategoryId:null,mytubeTopicId:null};
      return success(next,finish(next));
    }
    return failure(draft,step);
  }
  if(step==="subcategory"||step==="mytube-topic"){
    if(/^(?:назад|back|atrás|atras)$/iu.test(value))
      return success(draft,step==="subcategory"?"category":"subcategory");
    const auto=/^(?:выбери сам|choose for me|elige por mí|elige por mi)$/iu.test(value);
    const chosen=canonicalChoice(draft,step,value,locale)||
      (auto?messengerVideoChoices(draft,step,locale)[0]:null);
    if(!chosen)return failure(draft,step);
    const next=step==="subcategory"?
      {...draft,mytubeSubcategoryId:chosen.id,mytubeTopicId:null,
        topicId:null,scenarioId:null,ideaId:null,phraseId:null,phraseText:null}:
      {...draft,mytubeTopicId:chosen.id,goal:chosen.label,
        topicId:null,scenarioId:null,ideaId:null,phraseId:null,phraseText:null};
    return success(next,finish(next));
  }
  // Canonical button IDs contain words like "gentle" and "short". Never
  // reparse them as mood or aspect; the explicit selection is the only edit.
  // Recognized free-text option names follow the same single-choice path.
  if(VIDEO_CHAT_TREE_STEPS.includes(step)){
    // Only the final explicit corrected option can be selected. The existing
    // parent-validated taxonomy still owns IDs, approval and rendering.
    const correction=extractVideoChatCorrection(value);
    const optionText=correction.corrected?correction.text:value;
    const selected=chooseVideoChatTreeOption(draft,step,optionText,locale)||
      recognizeVideoChatTreeOption(draft,step,optionText,locale)||
      resolveVideoChatTreeRequest(draft,optionText,step,locale);
    if(selected){const next=step==="topic"&&draft.mytubeTopicId?
      {...selected,goal:draft.goal}:selected;
      return success(next,finish(next));}
  }
  const parsed=understandVideoChatReply(value,step);
  const previous={subcategory:"category","mytube-topic":"subcategory",
    topic:"mytube-topic",scenario:"topic",idea:"scenario",phrase:"idea",
    mood:"phrase",aspect:"mood",duration:"aspect",music:"duration",
    phrases:"music",review:"phrases"};
  if(/^(?:back|назад|atrás|atras)$/iu.test(value))
    return success(draft,previous[step]||"category");
  if(parsed.kind==="reset")return success(initialMessengerVideoDraft(),"category");
  if(parsed.kind==="navigate"){
    const target=parsed.targetStep;
    if(MESSENGER_VIDEO_STEPS.includes(target)&&
      (target==="category"||draft.mytubeCategoryId)&&
      (target!=="subcategory"||draft.mytubeCategoryId)&&
      (target!=="mytube-topic"||draft.mytubeSubcategoryId)&&
      (target!=="topic"||draft.mytubeTopicId)&&
      (target!=="scenario"||draft.topicId)&&
      (target!=="idea"||draft.scenarioId)&&
      (target!=="phrase"||draft.ideaId))return success(draft,target);
    return failure(draft,step);
  }
  if(parsed.kind==="auto"||parsed.kind==="suggest"||parsed.kind==="skip"&&step!=="phrase"){
    if(step==="subcategory"||step==="mytube-topic"){
      const option=messengerVideoChoices(draft,step,locale)[0];
      return option?advanceMessengerVideo(draft,step,option.id,locale):failure(draft,step);
    }
    if(!draft.mytubeTopicId||!draft.categoryId)return failure(draft,step);
    const path=autocompleteVideoChatTree(draft,"energy",locale);
    if(!path)return failure(draft,step);
    const withDefaults=suggestVideoChatDefaults({...path,phrases:path.phraseId?true:path.phrases});
    return success(withDefaults,finish(withDefaults));
  }
  if(parsed.kind==="skip"&&step==="phrase"||
    step==="phrase"&&/^(?:без фраз|без надписей|no captions|no phrases|without captions|sin frases)$/iu.test(value)){
    const next={...draft,phraseId:null,phraseText:null,phrases:false};
    return success(next,finish(next));
  }
  if(step==="review"){
    // A message in Messenger can edit a draft but never approve scenes or render.
    if(parsed.kind!=="edit"&&parsed.kind!=="settings_only"&&parsed.kind!=="relative_duration")
      return failure(draft,step);
  }
  let next=draft,changed=false;
  if(filters.includes(step)){
    const button=messengerVideoChoices(draft,step,locale).find(row=>
      row.id===value||row.label.toLocaleLowerCase()===value.toLocaleLowerCase());
    const selected=button?step==="duration"?Number(button.id):
      step==="phrases"?button.id==="true":button.id:
      parseVideoChatStepChoice(step,value);
    if(validFilter(step,selected)){
      next={...next,[step]:selected};
      if(step==="phrases"&&selected===false)
        next={...next,phraseId:null,phraseText:null};
      changed=true;
    }
  }
  if(parsed.kind==="edit"||parsed.kind==="settings_only"){
    for(const key of filters){
      if(Object.hasOwn(parsed.filters||{},key)&&validFilter(key,parsed.filters[key])){
        next={...next,[key]:parsed.filters[key]};
        if(key==="phrases"&&parsed.filters[key]===false)
          next={...next,phraseId:null,phraseText:null};
        changed=true;
      }
    }
  }
  if(!changed)return failure(draft,step);
  return success(next,finish(next));
}
export function changeMessengerVideoPhraseStyle(draft,key,value){
  return changeVideoChatPhraseFilter(draft,key,value);
}
export function encodeMessengerVideoHandoff(draft,locale="en",brief=""){
  if(!["ru","en","es"].includes(locale)||finish(draft)!=="review")return null;
  const userBrief=typeof brief==="string"?brief.replace(/\s+/gu," ").trim():"";
  if(userBrief.length>160||/[\u0000-\u001f\u007f]/u.test(userBrief))return null;
  const values={v:1,locale,...(userBrief?{brief:userBrief}:{}),
    mytubeCategoryId:draft.mytubeCategoryId,
    mytubeSubcategoryId:draft.mytubeSubcategoryId,
    mytubeTopicId:draft.mytubeTopicId,
    categoryId:draft.categoryId,topicId:draft.topicId,
    scenarioId:draft.scenarioId,ideaId:draft.ideaId,phraseId:draft.phraseId,
    tone:draft.tone,speaker:draft.speaker,length:draft.length,
    mood:draft.mood,aspect:draft.aspect,duration:draft.duration,
    music:draft.music,phrases:draft.phrases};
  return decodeMessengerVideoHandoff(JSON.stringify(values),locale)?JSON.stringify(values):null;
}
export function decodeMessengerVideoHandoff(raw,locale="en"){
  if(typeof raw!=="string"||raw.length>1400)return null;
  let data;
  try{data=JSON.parse(raw);}catch{return null;}
  if(!data||data.v!==1||data.locale!==locale||!["ru","en","es"].includes(locale))return null;
  if(data.brief!==undefined&&(typeof data.brief!=="string"||
    data.brief!==data.brief.trim()||!data.brief||data.brief.length>160||
    /[\u0000-\u001f\u007f]/u.test(data.brief)))return null;
  let draft=initialMessengerVideoDraft();
  for(const step of ["category","topic","scenario","idea"]){
    const option=chooseVideoChatTreeOption(draft,step,data[step+"Id"],locale);
    if(!option)return null;
    draft=option;
  }
  if(data.phrases!==false){
    const changed=changeVideoChatPhraseFilter(draft,"tone",data.tone);
    if(!changed)return null;
    const speaker=changeVideoChatPhraseFilter(changed,"speaker",data.speaker);
    if(!speaker)return null;
    const length=changeVideoChatPhraseFilter(speaker,"length",data.length);
    if(!length)return null;
    const phrase=chooseVideoChatTreeOption(length,"phrase",data.phraseId,locale);
    if(!phrase)return null;
    draft=phrase;
  }else if(data.phraseId!==null)return null;
  for(const key of filters){
    if(!validFilter(key,data[key]))return null;
    draft={...draft,[key]:data[key]};
  }
  // A packet with canonical IDs is accepted only if every parent matches.
  const canon=data.mytubeCategoryId!==undefined||
    data.mytubeSubcategoryId!==undefined||data.mytubeTopicId!==undefined;
  let canonicalTopic=null;
  if(canon){
    const match=getMyTubeTopic(data.mytubeTopicId);
    if(!match||match.category.id!==data.mytubeCategoryId||
      match.subcategory.id!==data.mytubeSubcategoryId||
      CATEGORY_TO_DIRECTOR[match.category.id]!==draft.categoryId)return null;
    canonicalTopic=match.topic;
    draft={...draft,mytubeCategoryId:match.category.id,
      mytubeSubcategoryId:match.subcategory.id,
      mytubeTopicId:match.topic.id};
  }
  if((canon?finish(draft):nextVideoChatTreeStep(draft))!=="review")return null;
  const legacyTopic=getVideoGoalTopic(draft.topicId,locale);
  const goal=canonicalTopic?.label?.[locale]||legacyTopic?.desiredOutcome;
  if(!goal)return null;
  // Localized canonical MyTube topic is forwarded as the safe Studio goal.
  return {...draft,goal:data.brief||goal};
}
