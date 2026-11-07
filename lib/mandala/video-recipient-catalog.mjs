/**
 * Audience-specific Video Studio catalogue.
 * This is editorial copy, not new footage, a media URL, or an AI/provider request.
 * Text stays inside the existing in-browser video editor until the visitor acts.
 */
const LOCALES=new Set(["ru","en","es"]);
const language=locale=>LOCALES.has(locale)?locale:"ru";
const tr=(labels,locale)=>labels[language(locale)]||labels.ru;
const CATALOG=[
  {
    id:"gift",theme:"relationships",sourceCategoryId:"love-relationships",
    label:{ru:"Подарок",en:"Gift",es:"Regalo"},
    description:{ru:"Личное видео с тёплыми словами",en:"A personal film with warm words",es:"Un vídeo personal con palabras cálidas"},
    occasions:[
      {id:"love",label:{ru:"С любовью",en:"With love",es:"Con amor"}},
      {id:"gratitude",label:{ru:"Благодарность",en:"Thank you",es:"Agradecimiento"}},
      {id:"friendship",label:{ru:"Для друга",en:"For a friend",es:"Para un amigo"}},
      {id:"support",label:{ru:"Слова поддержки",en:"Words of support",es:"Palabras de apoyo"}},
    ],
    captions:{
      ru:["Для тебя","От всего сердца","Пусть этот момент согревает","С теплом и любовью"],
      en:["Just for you","From the heart","May this moment bring warmth","With love and care"],
      es:["Solo para ti","De todo corazón","Que este momento te llene de calidez","Con cariño y amor"],
    },
  },
  {
    id:"greeting",theme:"energy",sourceCategoryId:"energy-confidence",
    label:{ru:"Поздравление",en:"Greeting",es:"Felicitación"},
    description:{ru:"Поздравить с важным событием",en:"Celebrate a special occasion",es:"Celebrar una ocasión especial"},
    occasions:[
      {id:"birthday",label:{ru:"День рождения",en:"Birthday",es:"Cumpleaños"}},
      {id:"anniversary",label:{ru:"Годовщина",en:"Anniversary",es:"Aniversario"}},
      {id:"holiday",label:{ru:"Праздник",en:"Holiday",es:"Fiesta"}},
      {id:"achievement",label:{ru:"С достижением",en:"Achievement",es:"Logro"}},
    ],
    captions:{
      ru:["Поздравляю!","Этот день — особенный","Пусть впереди будет много хорошего","С наилучшими пожеланиями"],
      en:["Congratulations!","Today is a special day","Wishing you wonderful things ahead","With my best wishes"],
      es:["¡Felicidades!","Hoy es un día especial","Que vengan muchas cosas buenas","Con mis mejores deseos"],
    },
  },
  {
    id:"presentation",theme:"money",sourceCategoryId:"goals-money",
    label:{ru:"Видеопрезентация",en:"Video presentation",es:"Videopresentación"},
    description:{ru:"Представить себя, проект или услугу",en:"Present yourself, a project or service",es:"Presentarte, un proyecto o servicio"},
    occasions:[
      {id:"about",label:{ru:"О себе",en:"About me",es:"Sobre mí"}},
      {id:"project",label:{ru:"Мой проект",en:"My project",es:"Mi proyecto"}},
      {id:"service",label:{ru:"Моя услуга",en:"My service",es:"Mi servicio"}},
      {id:"business",label:{ru:"Мой бизнес",en:"My business",es:"Mi negocio"}},
    ],
    captions:{
      ru:["Представляю","Главная идея","Что важно знать","Давайте познакомимся ближе"],
      en:["Introducing","The main idea","What matters most","Let's connect"],
      es:["Te presento","La idea principal","Lo más importante","Conectemos"],
    },
  },
];
export const RECIPIENT_VIDEO_KIND_IDS=Object.freeze(CATALOG.map(kind=>kind.id));

export function getRecipientVideoKind(kindId){
  return CATALOG.find(kind=>kind.id===kindId)||null;
}
export function listRecipientVideoKinds(locale="ru"){
  return CATALOG.map(kind=>({
    id:kind.id,theme:kind.theme,sourceCategoryId:kind.sourceCategoryId,
    label:tr(kind.label,locale),description:tr(kind.description,locale),
  }));
}
export function listRecipientVideoOccasions(kindId,locale="ru"){
  const kind=getRecipientVideoKind(kindId);
  return kind?kind.occasions.map(item=>({id:item.id,label:tr(item.label,locale)})):[];
}
export function buildRecipientVideoBrief({kindId="",occasionId="",wish="",locale="ru"}={}){
  const kind=getRecipientVideoKind(kindId);
  const occasion=kind?.occasions.find(item=>item.id===occasionId);
  const parts=[
    kind?tr(kind.label,locale):"",
    occasion?tr(occasion.label,locale):"",
    typeof wish==="string"?wish.trim():"",
  ].filter(Boolean);
  return parts.join(" · ").slice(0,800);
}
export function classifyRecipientVideoWish(text){
  const words=String(text||"").toLowerCase();
  let kindId=null;
  if(/презентац|представить|презент|presentation|presentaci[oó]n|videopresent|pitch|proyecto|portfolio|портфоли|услуг|business|negocio|propuesta/i.test(words))
    kindId="presentation";
  else if(/подар|сюрприз|gift|present for|regalo|sorpresa/i.test(words))
    kindId="gift";
  else if(/поздрав|рождени|праздник|годовщин|congrat|birthday|happy birthday|greeting|felicita|cumplea|aniversari|fiesta/i.test(words))
    kindId="greeting";
  if(!kindId)return null;
  let occasionId="";
  if(kindId==="gift"){
    if(/спасиб|благодар|thanks|thank you|gracia|agradec/i.test(words))occasionId="gratitude";
    else if(/друг|подруг|friend|amig/i.test(words))occasionId="friendship";
    else if(/поддерж|support|apoyo/i.test(words))occasionId="support";
    else if(/люб|love|amor/i.test(words))occasionId="love";
  } else if(kindId==="greeting"){
    if(/рождени|birthday|cumplea/i.test(words))occasionId="birthday";
    else if(/годовщин|annivers|aniversari/i.test(words))occasionId="anniversary";
    else if(/достижен|achievement|logro|успех|success/i.test(words))occasionId="achievement";
    else if(/праздник|holiday|fiesta|navidad|christmas/i.test(words))occasionId="holiday";
  } else if(kindId==="presentation"){
    if(/проект|project|proyecto/i.test(words))occasionId="project";
    else if(/услуг|service|servicio/i.test(words))occasionId="service";
    else if(/бизнес|компан|business|company|negocio|empresa/i.test(words))occasionId="business";
    else if(/себе|self|myself|sobre m[ií]/i.test(words))occasionId="about";
  }
  return {kindId,occasionId,confidence:"keyword"};
}
export function buildRecipientVideoCaptions({kindId="",occasionId="",wish="",locale="ru"}={}){
  const kind=getRecipientVideoKind(kindId);
  if(!kind)return ["","","",""];
  const occasion=kind.occasions.find(item=>item.id===occasionId);
  const seeds=kind.captions[language(locale)];
  const cleanWish=typeof wish==="string"?wish.replace(/\s+/g," ").trim():"";
  return [occasion?tr(occasion.label,locale):seeds[0],cleanWish||seeds[1],seeds[2],seeds[3]];
}
