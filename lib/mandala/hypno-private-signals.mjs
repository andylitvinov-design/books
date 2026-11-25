/**
 * Private client wishes -> strictly non-identifying intent codes.
 * Runs in the browser, NEVER sends raw text to a free LLM. Conservative:
 * ambiguous or unrecognised text preserves the client's explicit selection.
 */
const issues={
  ru:{
    energy:[/напряж|тревог|стресс/iu,/устал|истощ|нет сил/iu,/спеш|тороп|опозда|срочн/iu],
    money:[/цен[ауеы]|ценност.*труд|стоимост|назват.*цен/iu,/неопредел|нестабил|бюджет/iu,/сомнен|неуверен|самокрит/iu],
    relationships:[/отверг|отказ|критик|не принима/iu,/границ|сказать нет|отказат/iu,/разговор|конфликт|ссор|спор/iu],
    goals:[/не знаю куда|нет цели|неясн|направлен/iu,/откладыв|прокраст|не нача/iu,/ошиб|перфекц|страх провал/iu],
    life:[/перемен|изменен/iu,/неопредел|неизвестн/iu,/радост|пустот|скук/iu],
    health:[/перегруз|переутом|выгоран/iu,/устал|нет сил|истощ/iu,/напряж|зажат|скован/iu],
  },
  en:{
    energy:[/tension|anxious|stress/iu,/fatig|tired|exhaust/iu,/rush|hurr|late|deadline/iu],
    money:[/price|pric|my fee|worth my work/iu,/uncertain|budget|unstable/iu,/self.doubt|doubt myself|insecure/iu],
    relationships:[/reject|disapprov|criticis/iu,/boundar|say no|limits/iu,/conversation|conflict|argument/iu],
    goals:[/unclear|no direction|where to go/iu,/procrastinat|postpon|put off/iu,/mistake|perfection|fail/iu],
    life:[/change|transition/iu,/uncertain|unknown/iu,/joyless|bored|no joy/iu],
    health:[/overload|burnout|overwork/iu,/fatig|tired|exhaust/iu,/tension|tight|stiff/iu],
  },
  es:{
    energy:[/tensi[oó]n|ansiedad|estr[eé]s/iu,/cansan|fatiga|agotam/iu,/prisa|apuro|retras/iu],
    money:[/precio|cobrar|valor de mi trabajo/iu,/incertidumbre|presupuesto|inestab/iu,/duda|insegur/iu],
    relationships:[/rechazo|cr[ií]tica|desaprob/iu,/l[ií]mites|decir no/iu,/conversaci[oó]n|conflicto|discusi[oó]n/iu],
    goals:[/sin rumbo|sin direcci[oó]n|confus/iu,/posponer|procrastin/iu,/error|equivoc|fracaso/iu],
    life:[/cambio|transici[oó]n/iu,/incertidumbre|desconocid/iu,/sin alegr[ií]a|aburrim/iu],
    health:[/sobrecarga|agotam/iu,/cansan|fatiga|sin energ[ií]a/iu,/tensi[oó]n|rigidez|apretad/iu],
  },
};
const goals={
  ru:{
    rhythm:/ритм|темп|замед|спокой/iu,recovery:/отдых|восстанов|сон|расслаб/iu,
    strength:/сил|энерг|бодр/iu,value:/цен[аоуе]|свой труд|стоимост/iu,
    planning:/план|бюджет|финанс/iu,stability:/стабил|над[её]жн|уверен.*деньг/iu,
    connection:/близост|контакт|отношени|довер/iu,boundaries:/границ|отказ|сказать нет/iu,
    dialogue:/разговор|общени|диалог|говорить/iu,clarity:/ясност|поня|направлен/iu,
    progress:/шаг|двига|продвиг|начин/iu,meaning:/смысл|ценност|предназначен/iu,
  },
  en:{
    rhythm:/rhythm|pace|slow|calm/iu,recovery:/rest|recover|sleep|relax/iu,
    strength:/energy|strength|vital/iu,value:/value|worth|fair pay|price/iu,
    planning:/plan|budget|finance/iu,stability:/stable|stability|secure/iu,
    connection:/connect|closeness|relationship|trust/iu,boundaries:/boundar|limit|say no/iu,
    dialogue:/talk|speak|conversation|dialogue/iu,clarity:/clear|direction|understand/iu,
    progress:/step|progress|start|move forward/iu,meaning:/meaning|value|purpose/iu,
  },
  es:{
    rhythm:/ritmo|despacio|calma/iu,recovery:/descanso|recuper|dormir|relajar/iu,
    strength:/fuerza|energ[ií]a/iu,value:/valor|precio|cobrar/iu,
    planning:/plan|presupuesto|finanzas/iu,stability:/estabil|seguridad/iu,
    connection:/conexi[oó]n|cercan[ií]a|relaci[oó]n|confianza/iu,
    boundaries:/l[ií]mite|decir no/iu,dialogue:/conversar|hablar|di[aá]logo/iu,
    clarity:/claridad|direcci[oó]n|comprender/iu,progress:/paso|progreso|avanzar/iu,
    meaning:/sentido|valores|prop[oó]sito/iu,
  },
};
const themeGoals={
  energy:["rhythm","recovery","strength"],
  money:["value","planning","stability"],
  relationships:["connection","boundaries","dialogue"],
  goals:["clarity","progress","meaning"],
  life:["meaning","rhythm","connection"],
  health:["recovery","rhythm","strength"],
};
const distinctMatch=(patterns,text)=>{
  if(typeof text!=="string" || text.length>400 || !text.trim())return null;
  const hits=patterns.map((pattern,i)=>pattern.test(text)?i:-1).filter(i=>i!==-1);
  return hits.length===1?hits[0]:null;
};
export function resolvePrivateHypnoCodes({
  locale,theme,problemNote="",goalNote="",problemIndex,goalId,
}={}){
  const issueList=issues[locale]?.[theme];
  const choice=themeGoals[theme];
  const goalList=goals[locale];
  if(!issueList||!choice||!goalList||!Number.isInteger(problemIndex)||
      problemIndex<0||problemIndex>=issueList.length||!choice.includes(goalId))
    throw Error("HYPNO_PRIVATE_CODES_INVALID");
  const issueMatch=distinctMatch(issueList,problemNote);
  const goalMatch=distinctMatch(choice.map(x=>goalList[x]),goalNote);
  return Object.freeze({
    problemIndex:issueMatch??problemIndex,
    goalId:goalMatch===null?goalId:choice[goalMatch],
    privateDescriptionInterpreted:issueMatch!==null||goalMatch!==null,
    rawTextShared:false,
  });
}
