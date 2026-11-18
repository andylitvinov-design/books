import {buildPersonalMeditationScript,isMeditationSafetyResponse} from "./personal-meditation-script.mjs";

// Two first-party, immediately available short scripts. No API calls, AI claim,
// personal-data storage, video render, charge or voice-provider request.
const themes={
 en:{
  energy:["Calm & Inner Balance","Renewal & New Energy","You can make room for rest and a little new energy."],
  money:["Calm & Clear Thinking","One Steady Step","You may approach work and resources one manageable step at a time."],
  relationships:["Gentle Boundaries","Warmth & Connection","You can allow both connection and a comfortable personal boundary."],
  goals:["Clarity & Inner Balance","A Fresh Start","One freely chosen small step can support your direction."],
  life:["Quiet Meaning","Room for Renewal","A small familiar moment may connect you with what matters."],
  health:["Rest & Self-Support","Gentle Renewal","You may choose comfort, rest and appropriate support without pressure."]
 },
 ru:{
  energy:["Спокойствие и опора","Обновление и новые силы","Можно дать себе немного отдыха и пространства для новых сил."],
  money:["Спокойствие и ясность","Один уверенный шаг","К вопросам работы и ресурсов можно подойти небольшими шагами."],
  relationships:["Бережные границы","Тепло и контакт","В отношениях возможны и близость, и удобная вам дистанция."],
  goals:["Ясность и опора","Новое начало","К выбранной цели можно двигаться одним посильным шагом."],
  life:["Тихий смысл","Пространство обновления","Даже обычный момент может напомнить о том, что вам ценно."],
  health:["Отдых и забота о себе","Бережное обновление","Можно выбирать отдых, комфорт и подходящую поддержку без давления."]
 },
 es:{
  energy:["Calma y equilibrio","Renovar la energía","Puedes dejar espacio para el descanso y un poco de energía renovada."],
  money:["Calma y claridad","Un paso estable","Puedes acercarte al trabajo y los recursos paso a paso."],
  relationships:["Límites amables","Calidez y conexión","Puedes permitir cercanía y mantener una distancia cómoda."],
  goals:["Claridad interior","Un nuevo comienzo","Un pequeño paso voluntario puede acompañar tus metas."],
  life:["Sentido sereno","Espacio para renovar","Un momento cotidiano puede recordar lo que valoras."],
  health:["Descanso y apoyo","Renovación amable","Puedes elegir descanso, comodidad y ayuda adecuada sin exigencias."]
 }
};
const phrases={
 en:{
  aOpen:["Get comfortable. Notice the support beneath you. Breathe gently.",
   "Notice where you are supported. Let a soft breath come and go.",
   "Settle at your own pace. Feel the ground or chair supporting you."],
  bOpen:["Look around a peaceful place, real or imagined. Keep your own pace.",
   "Imagine morning light in a spacious, welcoming place. Breathe easily.",
   "Notice the space around you. Picture an unhurried new morning."],
  aMiddle:"Imagine warm daylight around this intention. Nothing needs solving right now.",
  bMiddle:"Imagine a path with one easy next step. You can choose when to begin.",
  aEnd:"Feel one support you already have. Look around when ready, carrying a little steadiness with you.",
  bEnd:"Allow a little freshness without forcing it. Return to the room and take only what helps."
 },
 ru:{
  aOpen:["Устройтесь удобно. Почувствуйте опору под телом. Сделайте мягкий вдох.",
   "Заметьте опору под собой. Пусть дыхание остаётся спокойным.",
   "Остановитесь на мгновение. Почувствуйте поддержку кресла или пола."],
  bOpen:["Представьте просторное спокойное место. Вы сами выбираете свой темп.",
   "Представьте мягкий утренний свет. Можно дышать свободно.",
   "Заметьте пространство вокруг. Пусть перед вами откроется новое утро."],
  aMiddle:"Представьте тёплый свет вокруг этого намерения. Сейчас не нужно ничего решать.",
  bMiddle:"Представьте тропинку с одним посильным шагом. Только вы решаете, когда его сделать.",
  aEnd:"Заметьте то, что уже поддерживает вас. Вернитесь вниманием в комнату, сохраняя немного спокойствия.",
  bEnd:"Позвольте себе немного свежести без усилий. Оглянитесь вокруг и возьмите с собой лишь полезное."
 },
 es:{
  aOpen:["Ponte cómodo. Nota el apoyo bajo tu cuerpo. Respira suavemente.",
   "Observa dónde te sientes apoyado. Deja que la respiración fluya.",
   "Busca tu propio ritmo. Siente el suelo o la silla que te sostiene."],
  bOpen:["Imagina un lugar espacioso y tranquilo. Tú eliges el ritmo.",
   "Imagina la luz amable de una mañana nueva. Respira sin esfuerzo.",
   "Observa el espacio a tu alrededor. Visualiza un nuevo amanecer."],
  aMiddle:"Imagina una luz cálida alrededor de esa intención. Nada necesita resolverse ahora.",
  bMiddle:"Imagina un camino con un paso pequeño. Tú eliges cuándo empezar.",
  aEnd:"Reconoce un apoyo que ya existe. Mira alrededor cuando quieras y conserva un poco de calma.",
  bEnd:"Permite algo de energía fresca sin exigencias. Vuelve a observar la habitación y conserva solo lo útil."
 }
};
function clip(value,max=65){
 return typeof value==="string"?value.normalize("NFKC")
  .replace(/[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/g," ")
  .replace(/\s+/g," ").trim().slice(0,max):"";
}
export function buildShortMeditationChoices(input={}){
 const locale=["ru","en","es"].includes(input.locale)?input.locale:"en";
 const theme=Object.hasOwn(themes[locale],input.theme)?input.theme:"energy";
 // Reuse the reviewed first-party safety gate on every relevant private field.
 const checked=buildPersonalMeditationScript({...input,locale,length:3});
 if(isMeditationSafetyResponse(checked,locale)){
  return {safe:false,warning:checked,items:[],durationSeconds:30};
 }
 const titles=themes[locale][theme];
 const words=phrases[locale];
 const cycle=Number.isSafeInteger(input.cycle)&&input.cycle>=0?input.cycle:0;
 const opening=cycle%3;
 const rawGoal=clip(input.focus?.goal||input.wish||"",54);
 const briefGoal=rawGoal&&rawGoal.split(/\s+/u).length<=6?rawGoal:"";
 const focus=briefGoal?(
  locale==="ru"?"Ваше намерение: «"+briefGoal+"».":locale==="es"
   ?"Tu intención: «"+briefGoal+"».":"Your intention: “"+briefGoal+"”."
 ):titles[2];
 const items=[
  {id:"a",title:titles[0],text:[words.aOpen[opening],focus,words.aMiddle,words.aEnd].join("\n\n")},
  {id:"b",title:titles[1],text:[words.bOpen[opening],focus,words.bMiddle,words.bEnd].join("\n\n")}
 ];
 return {safe:true,warning:"",items,durationSeconds:30};
}
