/**
 * Exactly three recipient intents on the first Goal screen.
 * Source-bound scenes, consent and rendering are handled by existing Studio.
 */
const LANGUAGES=new Set(["ru","en","es"]);
const language=locale=>LANGUAGES.has(locale)?locale:"ru";
const tr=(labels,locale)=>labels[language(locale)]||labels.ru;
const CATALOG=[
 {
  id:"greeting-gift",theme:"relationships",sourceCategoryId:"love-relationships",
  label:{ru:"Поздравление или подарок",en:"Greeting or gift",es:"Felicitación o regalo"},
  description:{ru:"Поздравление, благодарность или подарок близкому",
    en:"A celebration, thank-you or personal gift",
    es:"Una celebración, agradecimiento o regalo personal"},
  occasions:[
   {id:"birthday",label:{ru:"День рождения",en:"Birthday",es:"Cumpleaños"}},
   {id:"anniversary",label:{ru:"Годовщина",en:"Anniversary",es:"Aniversario"}},
   {id:"holiday",label:{ru:"Праздник",en:"Holiday",es:"Fiesta"}},
   {id:"achievement",label:{ru:"Достижение",en:"Achievement",es:"Logro"}},
   {id:"gratitude",label:{ru:"Благодарность",en:"Thank you",es:"Agradecimiento"}},
   {id:"love",label:{ru:"С любовью",en:"With love",es:"Con amor"}},
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
  id:"presentation",theme:"money",sourceCategoryId:"goals-money",
  label:{ru:"Презентация",en:"Presentation",es:"Presentación"},
  description:{ru:"Представить себя, проект или услугу",
    en:"Present yourself, a project or a service",
    es:"Presentarte, un proyecto o servicio"},
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
 {
  id:"audio-content",theme:"life",sourceCategoryId:"energy-confidence",requiresAudio:true,
  label:{ru:"Контент",en:"Content",es:"Contenido"},
  description:{ru:"Видеоряд на основе аудио",en:"Visuals based on audio",es:"Vídeo a partir de audio"},
  occasions:[],
  // Never overwrite original narration with generic greeting overlays.
  captions:{ru:["","","",""],en:["","","",""],es:["","","",""]},
 },
];
const ALIASES={gift:"greeting-gift",greeting:"greeting-gift"};
export const RECIPIENT_VIDEO_KIND_IDS=Object.freeze(CATALOG.map(kind=>kind.id));
export function getRecipientVideoKind(kindId){
 const canonical=ALIASES[kindId]||kindId;
 return CATALOG.find(kind=>kind.id===canonical)||null;
}
export function listRecipientVideoKinds(locale="ru"){
 return CATALOG.map(kind=>({
  id:kind.id,theme:kind.theme,sourceCategoryId:kind.sourceCategoryId,
  requiresAudio:kind.requiresAudio===true,
  label:tr(kind.label,locale),description:tr(kind.description,locale)
 }));
}
export function listRecipientVideoOccasions(kindId,locale="ru"){
 const kind=getRecipientVideoKind(kindId);
 return kind?kind.occasions.map(item=>({id:item.id,label:tr(item.label,locale)})):[];
}
export function buildRecipientVideoBrief({kindId="",occasionId="",wish="",locale="ru"}={}){
 const kind=getRecipientVideoKind(kindId);
 const occasion=kind?.occasions.find(item=>item.id===occasionId);
 return [kind?tr(kind.label,locale):"",
   kind?.requiresAudio?tr(kind.description,locale):"",
   occasion?tr(occasion.label,locale):"",
   typeof wish==="string"?wish.trim():""
 ].filter(Boolean).join(" · ").slice(0,800);
}
export function classifyRecipientVideoWish(text){
 const words=String(text||"").toLowerCase();
 let kindId=null;
 if(/видеоряд|по аудио|аудиозапис|озвучк|voiceover|voice-over|transcri|podcast|подкаст|audio.to.video|audio visuals|vídeo con audio|audio a v[ií]deo/i.test(words))
   kindId="audio-content";
 else if(/презентац|представить|презент|presentation|presentaci[oó]n|videopresent|pitch|proyecto|portfolio|портфоли|услуг|business|negocio|propuesta/i.test(words))
   kindId="presentation";
 else if(/подар|сюрприз|gift|present for|regalo|sorpresa|поздрав|рождени|праздник|годовщин|congrat|birthday|happy birthday|greeting|felicita|cumplea|aniversari|fiesta/i.test(words))
   kindId="greeting-gift";
 if(!kindId)return null;
 let occasionId="";
 if(kindId==="greeting-gift"){
  if(/рождени|birthday|cumplea/i.test(words))occasionId="birthday";
  else if(/годовщин|annivers|aniversari/i.test(words))occasionId="anniversary";
  else if(/достижен|achievement|logro|успех|success/i.test(words))occasionId="achievement";
  else if(/праздник|holiday|fiesta|navidad|christmas/i.test(words))occasionId="holiday";
  else if(/спасиб|благодар|thanks|thank you|gracia|agradec/i.test(words))occasionId="gratitude";
  else if(/друг|подруг|friend|amig/i.test(words))occasionId="friendship";
  else if(/поддерж|support|apoyo/i.test(words))occasionId="support";
  else if(/люб|love|amor/i.test(words))occasionId="love";
 }else if(kindId==="presentation"){
  if(/проект|project|proyecto/i.test(words))occasionId="project";
  else if(/услуг|service|servicio/i.test(words))occasionId="service";
  else if(/бизнес|компан|business|company|negocio|empresa/i.test(words))occasionId="business";
  else if(/себе|self|myself|sobre m[ií]/i.test(words))occasionId="about";
 }
 return {kindId,occasionId,confidence:"keyword"};
}
export function buildRecipientVideoCaptions({kindId="",occasionId="",wish="",locale="ru"}={}){
 const kind=getRecipientVideoKind(kindId);
 if(!kind||kind.requiresAudio)return ["","","",""];
 const occasion=kind.occasions.find(item=>item.id===occasionId);
 const seeds=kind.captions[language(locale)];
 const cleanWish=typeof wish==="string"?wish.replace(/\s+/g," ").trim():"";
 return [occasion?tr(occasion.label,locale):seeds[0],cleanWish||seeds[1],seeds[2],seeds[3]];
}
