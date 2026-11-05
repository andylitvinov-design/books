/**
 * Privacy-first intent coding. Classifies client wishes locally into APPROVED
 * Psychologist Mind categories, never forwards raw text to free LLMs.
 * Ambiguity does not imply a diagnosis or a confident psychological conclusion.
 */
export const MEDITATION_INTENT_CODES_VERSION="meditation-intent-codes-v1";
const FOCI=["stress","relationships","self_worth","meaning"];
const GOALS={
 stress:["settle","support","clarity"],
 relationships:["boundaries","relationships","support"],
 self_worth:["confidence","support","clarity"],
 meaning:["meaning","goals","clarity"],
};
const DEFAULT={stress:"settle",relationships:"boundaries",
 self_worth:"confidence",meaning:"meaning"};
const RULES={
 ru:{
  focus:{
   stress:/стресс|тревог|напряж|расслаб|перегруз|устал|спеш|спокой/iu,
   relationships:/отношен|границ|партн|отверг|критик|ссор|общени/iu,
   self_worth:/самооцен|самокрит|стыд|неувер|достоинств|уверенн/iu,
   meaning:/смысл|ценност|предназнач|направлен|приоритет|цель/iu,
  },
  goal:{
   settle:/спокой|снизить напряж|устойчив|равновес/iu,
   support:/опор|поддерж|безопасн/iu,
   clarity:/ясност|поня|разобрать|разобраться/iu,
   boundaries:/границ|сказать нет|отказат/iu,
   relationships:/контакт|общени|близост|довер/iu,
   confidence:/уверенн|самопринят|добрее к себе/iu,
   meaning:/смысл|ценност/iu,
   goals:/шаг|двига|продвига|действова/iu,
  },
 },
 en:{
  focus:{
   stress:/stress|anxie|tense|tension|overwhelm|tired|rushing|relax|calm/iu,
   relationships:/relationship|partner|rejection|critic|boundar|conflict|connect/iu,
   self_worth:/self.worth|esteem|shame|self.critic|insecure|confidence/iu,
   meaning:/meaning|values|purpose|direction|priorit|life goal/iu,
  },
  goal:{
   settle:/calm|steady|ease|settle/iu,
   support:/support|safe|resource/iu,
   clarity:/clarity|clear|understand/iu,
   boundaries:/boundar|say no|limit/iu,
   relationships:/connect|trust|closeness|communicat/iu,
   confidence:/confiden|self.kind|self.accept/iu,
   meaning:/values|meaning|purpose/iu,
   goals:/step|progress|move forward|act/iu,
  },
 },
 es:{
  focus:{
   stress:/estr[eé]s|ansiedad|tensi[oó]n|cansan|calma|agotam|prisa/iu,
   relationships:/relaci[oó]n|pareja|rechazo|cr[ií]tic|l[ií]mite|conflicto/iu,
   self_worth:/autoestima|verg[uü]enza|autocr[ií]tic|insegur|confianza/iu,
   meaning:/sentido|valores|prop[oó]sito|direcci[oó]n|prioridad/iu,
  },
  goal:{
   settle:/calma|tranquil|equilibrio/iu,
   support:/apoyo|seguridad|recursos/iu,
   clarity:/claridad|comprender|entender/iu,
   boundaries:/l[ií]mite|decir no/iu,
   relationships:/conexi[oó]n|comunicaci[oó]n|confianza mutua/iu,
   confidence:/confianza en m[ií]|aceptarme|amabilidad conmigo/iu,
   meaning:/sentido|valores|prop[oó]sito/iu,
   goals:/paso|avanzar|progreso|actuar/iu,
  },
 },
};
const uniqueMatch=(patterns,phrase)=>{
 if(typeof phrase!=="string"||!phrase.trim())return null;
 const hits=Object.entries(patterns).filter(([,re])=>re.test(phrase)).map(([id])=>id);
 return hits.length===1?hits[0]:null;
};
export function resolveMeditationClientIntent(request={}) {
 if(!request || typeof request!=="object" || Array.isArray(request) ||
    !Object.hasOwn(RULES,request.locale))
   throw Error("WRITER_INTENT_INVALID");
 const explicitFocus=FOCI.includes(request.focus)?request.focus:null;
 if(request.focus!=="auto"&&!explicitFocus)
   throw Error("WRITER_INTENT_INVALID");
 const explicitGoal=request.intentionCode&&request.intentionCode!=="auto"?
   request.intentionCode:null;
 // The full text is used ONLY here, on Holistic House's trusted server.
 const goalText=typeof request.desiredExperience==="string"?
   request.desiredExperience.slice(0,180):"";
 const frame=typeof request.problemFrame==="string"?
   request.problemFrame.slice(0,350):"";
 const goalGuess=uniqueMatch(RULES[request.locale].goal,goalText);
 let focus=explicitFocus;
 let origin=explicitFocus?"explicit_focus":"general_default";
 if(!focus){
   const hit=uniqueMatch(RULES[request.locale].focus,[frame,goalText].join(" "));
   if(hit){focus=hit;origin="code_from_private_wishes";}
   else if(goalGuess){
     const valid=FOCI.filter(f=>GOALS[f].includes(goalGuess));
     if(valid.length===1){focus=valid[0];origin="code_from_private_wishes";}
   }
 }
 if(!focus)focus="stress";
 let goal=explicitGoal;
 if(!goal){
   goal=goalGuess&&GOALS[focus].includes(goalGuess)?goalGuess:DEFAULT[focus];
 }
 if(!GOALS[focus].includes(goal))throw Error("WRITER_INTENT_GOAL_CONFLICT");
 const result={...request,focus,intentionCode:goal};
 return Object.freeze({
   request:result,decision:Object.freeze({focusCode:focus,goalCode:goal,
     origin,personallyIdentifyingDataShared:false}),
 });
}
