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

export const MESSENGER_VIDEO_HANDOFF_KEY="hh-video-messenger-director-v1";
export const MESSENGER_VIDEO_STEPS=Object.freeze([
  ...VIDEO_CHAT_TREE_STEPS,"mood","aspect","duration","music","phrases","review"
]);
const filters=["mood","aspect","duration","music","phrases"];
const allowed={
  mood:["slow","dynamic"],aspect:["portrait","landscape","square"],
  duration:[10,15,20,30,60],music:["love","meditation","harmony","none"],
  phrases:[true,false],
};
const copy={
  ru:{
    category:"О чём будет ваше видео? Выберите цель или напишите своими словами.",
    topic:"Какую тему хотите раскрыть?",scenario:"Какой сценарий вам ближе?",
    idea:"Какую главную идею передать?",phrase:"Какие слова поддержки показать? Можно выбрать фразу или обойтись без надписей.",
    mood:"Какая атмосфера нужна?",aspect:"Какой формат видео выбрать?",
    duration:"Какой длины будет ролик?",music:"Какую музыку добавить?",
    phrases:"Добавить фразы на экран?",
    review:"Ваши пожелания собраны. Откройте видеостудию, чтобы проверить реальные сцены, подтвердить монтаж и только затем создать видео.",
    unknown:"Не могу уверенно выбрать за вас. Нажмите вариант ниже или уточните словами.",
    toStudio:"Проверить сценарий в видеостудии",back:"Назад",auto:"Выбери сам",
    skip:"Пропустить",noPhrases:"Без фраз",edit:"Изменить",
    moodNames:["Мягкая","Динамичная"],aspectNames:["Вертикально 9:16","Горизонтально 16:9","Квадрат 1:1"],
    musicNames:["Нежная","Медитативная","Гармония","Без музыки"],
    phraseNames:["Да, добавить","Нет"],tone:"Тон",speaker:"Обращение",length:"Длина",
    tones:["Бережно","Уверенно","Спокойно","Вдохновляюще"],
    speakers:["От себя · Я","К тебе · Ты"],lengths:["Коротко","Развёрнуто"],
    editNames:{mood:"Атмосфера",aspect:"Формат",duration:"Длительность",music:"Музыка",phrases:"Фразы"},
  },
  en:{
    category:"What would you like the video to be about? Choose a goal below or type your own idea.",
    topic:"Which topic would you like to explore?",scenario:"Which story feels right?",
    idea:"What central idea should it express?",phrase:"Choose supportive words for the video, or skip captions.",
    mood:"What mood would you like?",aspect:"Which video format do you need?",
    duration:"How long should the video be?",music:"What soundtrack fits?",
    phrases:"Show supportive captions?",
    review:"Your video brief is ready. Open Video Studio to review real footage, confirm the edit and then create the video.",
    unknown:"I'm not sure which option fits. Tap one below or clarify in your own words.",
    toStudio:"Review story in Video Studio",back:"Back",auto:"Choose for me",
    skip:"Skip",noPhrases:"No captions",edit:"Change",
    moodNames:["Gentle","Dynamic"],aspectNames:["Vertical 9:16","Landscape 16:9","Square 1:1"],
    musicNames:["Warm melody","Meditative","Harmony","Silent"],
    phraseNames:["Yes, add them","No"],tone:"Tone",speaker:"Address",length:"Length",
    tones:["Gentle","Confident","Grounded","Inspiring"],
    speakers:["First person · I","Support · You"],lengths:["Short","Extended"],
    editNames:{mood:"Mood",aspect:"Format",duration:"Duration",music:"Music",phrases:"Captions"},
  },
  es:{
    category:"¿De qué quieres que trate tu vídeo? Elige un objetivo o escríbelo.",
    topic:"¿Qué tema quieres explorar?",scenario:"¿Qué historia prefieres?",
    idea:"¿Qué idea principal quieres transmitir?",phrase:"Elige palabras de apoyo o continúa sin frases.",
    mood:"¿Qué ambiente buscas?",aspect:"¿Qué formato necesitas?",
    duration:"¿Cuánto debe durar?",music:"¿Qué música prefieres?",
    phrases:"¿Añadir frases en pantalla?",
    review:"Tu propuesta está lista. Abre el estudio para revisar las escenas reales, aprobar el montaje y después crear el vídeo.",
    unknown:"No puedo identificar la opción con certeza. Elige una o aclara tu respuesta.",
    toStudio:"Revisar en el estudio de vídeo",back:"Atrás",auto:"Elige por mí",
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
    duration:null,music:null,phrases:null};
}
export function messengerVideoQuestion(step,locale="en"){
  return messengerVideoCopy(locale)[step]||messengerVideoCopy(locale).category;
}
export function messengerVideoChoices(draft,step,locale="en"){
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
const finish=draft=>nextVideoChatTreeStep(draft);
const success=(draft,step)=>({draft,step,valid:true});
const failure=(draft,step)=>({draft,step,valid:false});
export function advanceMessengerVideo(draft,step,answer,locale="en"){
  if(!MESSENGER_VIDEO_STEPS.includes(step))return failure(draft,"category");
  const value=String(answer??"").trim().slice(0,800);
  if(!value)return failure(draft,step);
  // Canonical button IDs contain words like "gentle" and "short". Never
  // reparse them as mood or aspect; the explicit selection is the only edit.
  // Recognized free-text option names follow the same single-choice path.
  if(VIDEO_CHAT_TREE_STEPS.includes(step)){
    // A correction targets only the final explicitly stated option. Option
    // IDs still must belong to the current canonical parent; ambiguous text
    // remains unchanged and never authorizes a render.
    const correction=extractVideoChatCorrection(value);
    const optionText=correction.corrected?correction.text:value;
    const selected=chooseVideoChatTreeOption(draft,step,optionText,locale)||
      recognizeVideoChatTreeOption(draft,step,optionText,locale)||
      resolveVideoChatTreeRequest(draft,optionText,step,locale);
    if(selected)return success(selected,finish(selected));
  }
  const parsed=understandVideoChatReply(value,step);
  if(parsed.kind==="reset")return success(initialMessengerVideoDraft(),"category");
  if(parsed.kind==="navigate"){
    const target=parsed.targetStep;
    if(MESSENGER_VIDEO_STEPS.includes(target)&&
      (target==="category"||draft.categoryId)&&
      (target!=="scenario"||draft.topicId)&&
      (target!=="idea"||draft.scenarioId)&&
      (target!=="phrase"||draft.ideaId))return success(draft,target);
    return failure(draft,step);
  }
  if(parsed.kind==="auto"||parsed.kind==="suggest"||parsed.kind==="skip"&&step!=="phrase"){
    if(!draft.categoryId)return failure(draft,step);
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
  if(!changed&&step==="category"&&parsed.kind==="goal"){
    const selected=resolveVideoChatTreeRequest(draft,parsed.goal||value,step,locale);
    if(selected){next=selected;changed=true;}
  }
  if(!changed)return failure(draft,step);
  return success(next,finish(next));
}
export function changeMessengerVideoPhraseStyle(draft,key,value){
  return changeVideoChatPhraseFilter(draft,key,value);
}
export function encodeMessengerVideoHandoff(draft,locale="en"){
  if(!["ru","en","es"].includes(locale)||finish(draft)!=="review")return null;
  const values={v:1,locale,categoryId:draft.categoryId,topicId:draft.topicId,
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
  if(finish(draft)!=="review")return null;
  const topic=getVideoGoalTopic(draft.topicId,locale);
  if(!topic?.desiredOutcome)return null;
  return {...draft,goal:topic.desiredOutcome};
}
