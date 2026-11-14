/**
 * Business Story photo fallback: real licensed photographic references from individual
 * Pexels source pages. Not AI graphics and NOT filmed MP4s.
 * A source-page check is not proof that a remote JPEG has decoded: Create
 * verifies the actual image pixels before painting any Canvas/export frame.
 * People are generic illustrative stock subjects, never the user's employer.
 */
export const STORY_PHOTO_LIBRARY_VERSION="hh-story-business-photos-v1";
const RAW=[
  [
    "office-work-notes",
    6446309,
    "businessman-making-notes",
    "Focused desk work",
    "Работа с заметками",
    "Trabajo con notas",
    "work,notes,desk,laptop,focus,documents",
    0
  ],
  [
    "office-work-report",
    7255717,
    "man-looking-at-the-laptop-screen-while-writing",
    "Preparing a report",
    "Подготовка отчёта",
    "Preparando un informe",
    "work,report,notes,desk,laptop,documents",
    0
  ],
  [
    "office-employee-focus",
    7163383,
    "portrait-shot-of-an-employee-using-a-laptop",
    "Focused employee",
    "Сотрудник за работой",
    "Profesional trabajando",
    "work,office,desk,laptop,focus,career",
    0
  ],
  [
    "office-woman-desk",
    12911760,
    "businesswoman-working-at-desk",
    "Professional at work",
    "Работа в офисе",
    "Trabajo en oficina",
    "work,office,laptop,notes,focus",
    0
  ],
  [
    "office-project-notes",
    7567597,
    "a-woman-writing-while-working-on-a-laptop",
    "Documenting progress",
    "Документирование работы",
    "Documentando avances",
    "work,documents,report,notes,desk,laptop",
    1
  ],
  [
    "office-task-closeup",
    12899015,
    "close-up-of-a-person-working-on-a-laptop",
    "Work details",
    "Детали работы",
    "Detalles del trabajo",
    "work,desk,laptop,notes,documents,focus",
    1
  ],
  [
    "office-document-review",
    12903284,
    "businesswomen-looking-at-documents-in-the-office",
    "Reviewing evidence",
    "Разбор документов",
    "Revisión de documentos",
    "work,documents,report,analysis,collaboration,meeting",
    1
  ],
  [
    "office-work-discussion",
    12902896,
    "women-at-office-working-with-documents",
    "Discussing documents",
    "Обсуждение документов",
    "Debatiendo documentos",
    "documents,collaboration,meeting,work,report",
    1
  ],
  [
    "office-document-talk",
    12903014,
    "women-talking-at-office",
    "Professional conversation",
    "Рабочий разговор",
    "Conversación profesional",
    "meeting,discussion,negotiation,documents,work",
    3
  ],
  [
    "office-document-present",
    12902907,
    "office-workers-standing-and-looking-at-documents",
    "Showing project results",
    "Представление результатов",
    "Presentando resultados",
    "documents,presentation,report,meeting,recognition",
    2
  ],
  [
    "office-laptop-document",
    7731358,
    "unrecognizable-coworkers-using-netbook-and-writing-information-on-papers",
    "Evidence and figures",
    "Документы и цифры",
    "Documentos y cifras",
    "documents,report,numbers,laptop,work",
    1
  ],
  [
    "office-contract-review",
    8730365,
    "a-woman-looking-the-contracts",
    "Reviewing a contract",
    "Изучение договора",
    "Revisión de contrato",
    "documents,contract,negotiation,pay,work",
    3
  ],
  [
    "office-team-plan",
    8117473,
    "a-group-of-people-having-a-meeting-in-the-office",
    "Team planning",
    "Планирование в команде",
    "Planificación en equipo",
    "meeting,team,collaboration,documents,presentation",
    2
  ],
  [
    "office-team-discussion",
    8134161,
    "team-meeting",
    "Team meeting",
    "Встреча с командой",
    "Reunión de equipo",
    "meeting,team,negotiation,discussion,collaboration",
    2
  ],
  [
    "office-team-charts",
    7710147,
    "a-group-of-people-having-a-meeting-in-the-office",
    "Results presentation",
    "Презентация результатов",
    "Presentación de resultados",
    "meeting,presentation,numbers,report,team",
    2
  ],
  [
    "office-team-conference",
    7691722,
    "a-group-of-people-having-a-meeting",
    "Strategy meeting",
    "Стратегическая встреча",
    "Reunión estratégica",
    "meeting,team,presentation,discussion,career",
    2
  ],
  [
    "office-team-presentation",
    8171200,
    "colleagues-having-a-meeting-in-the-office",
    "Presenting achievements",
    "Презентация достижений",
    "Presentando logros",
    "meeting,presentation,recognition,team,growth",
    2
  ],
  [
    "office-presentation-screen",
    29284262,
    "office-team-meeting-with-presentation-setup",
    "Project presentation",
    "Презентация проекта",
    "Presentación de proyecto",
    "meeting,presentation,team,results,growth",
    2
  ],
  [
    "office-modern-presentation",
    34221175,
    "business-meeting-presentation-in-modern-office",
    "Explaining project value",
    "Обсуждение ценности проекта",
    "Explicando el valor del proyecto",
    "meeting,presentation,team,recognition,growth",
    2
  ],
  [
    "office-team-laptop",
    7888760,
    "people-in-a-business-meeting",
    "Teamwork around results",
    "Команда обсуждает результаты",
    "Equipo revisando resultados",
    "meeting,team,work,laptop,results,collaboration",
    2
  ],
  [
    "office-contract-negotiation",
    7875999,
    "a-woman-talking-to-men-holding-contracts",
    "Discussing terms",
    "Обсуждение условий",
    "Debatiendo condiciones",
    "negotiation,pay,contract,meeting,discussion",
    3
  ],
  [
    "office-executive-conversation",
    3757946,
    "confident-businesswoman-sharing-information-from-documents-in-workplace",
    "Confident business request",
    "Уверенный рабочий запрос",
    "Solicitud profesional segura",
    "negotiation,discussion,pay,documents,presentation",
    3
  ],
  [
    "office-request-documents",
    7223009,
    "a-woman-talking-while-holding-a-document",
    "Making a clear request",
    "Чёткий запрос",
    "Petición clara",
    "negotiation,pay,documents,discussion,meeting",
    3
  ],
  [
    "office-handover",
    8424579,
    "woman-passing-a-document-to-her-colleague",
    "Handing over a proposal",
    "Передача предложения",
    "Presentando una propuesta",
    "negotiation,contract,documents,meeting,pay",
    3
  ],
  [
    "office-manager-documents",
    12902916,
    "office-workers-standing-and-discussing-while-looking-at-a-document",
    "Negotiating next steps",
    "Обсуждение следующих шагов",
    "Negociando los próximos pasos",
    "negotiation,meeting,documents,growth,career",
    3
  ]
];
export const STORY_BUSINESS_PHOTOS=Object.freeze(RAW.map(([slug,photoId,page,en,ru,es,tags,stage])=>Object.freeze({
 id:"story-photo-"+slug,
 media:"licensed_photo",
 visualOrigin:"real_camera_photo",
 src:"/api/video/story-photo/story-photo-"+slug,
 upstreamSrc:"https://images.pexels.com/photos/"+photoId+"/pexels-photo-"+photoId+".jpeg?auto=compress&cs=tinysrgb&w=1200",
 sourcePage:"https://www.pexels.com/photo/"+page+"-"+photoId+"/",
 licenseUrl:"https://www.pexels.com/license/",
 creatorLicense:"pexels_free",
 attribution:"Pexels photo #"+photoId,
 labels:Object.freeze({en,ru,es}),
 tags:Object.freeze(tags.split(",")),
 stage,
 durationSeconds:5,
 approval:"source_page_reviewed_actual_image_decode_required"
})));
export const STORY_PHOTO_BY_ID=new Map(STORY_BUSINESS_PHOTOS.map(photo=>[photo.id,photo]));
const TERMS=Object.freeze([
 ["work",/work|job|office|employee|работ|труд|сотруд|офис|trabaj|empleo/iu],
 ["documents",/document|evidence|report|folder|proof|paper|документ|отчет|отчёт|папк|доказ|informe|documento|prueba/iu],
 ["recognition",/recognition|recognized|value|appreciat|achievement|признан|ценност|оценен|оценён|достижен|reconoc|logro/iu],
 ["meeting",/meeting|team|present|colleag|совещан|встреч|команд|презентац|коллег|reuni|equipo|presentaci/iu],
 ["negotiation",/negotiat|request|ask|discuss|contract|переговор|запрос|попрос|обсужден|обсужд|договор|negoci|solicitud/iu],
 ["pay",/salary|pay(?:ment)?|raise|compensat|income|оплат|зарплат|оклад|повышен|вознагражд|salario|sueldo|pago/iu],
 ["growth",/growth|develop|career|progress|развит|рост|карьер|прогресс|desarroll|crecimiento/iu],
 ["numbers",/figures|result|metric|data|number|budget|финанс|результат|цифр|показател|presupuesto|datos/iu],
]);
const STAGE_HINTS=Object.freeze([
 ["work","focus"],["documents","numbers"],["presentation","meeting","recognition"],
 ["negotiation","pay","contract"]
]);
function photoMatchesAvoid(photo,avoid){
 const restrictions=Array.isArray(avoid)?avoid.join(" "):String(avoid||"");
 // All current curated business photos show real people; do not guess
 // that a lone worker is anonymous when the owner excludes human subjects.
 if(/(?:no people|without people|without persons|без людей|sin personas|sin gente|^people$)/iu.test(restrictions))
  return false;
 return true;
}
export function isTrustedStoryPhoto(photo){
 const record=STORY_PHOTO_BY_ID.get(photo?.id);
 return Boolean(record&&photo===record&&photo.media==="licensed_photo"&&
   photo.approval==="source_page_reviewed_actual_image_decode_required"&&
   photo.src==="/api/video/story-photo/"+photo.id&&
   photo.upstreamSrc.startsWith("https://images.pexels.com/photos/")&&
   photo.sourcePage.startsWith("https://www.pexels.com/photo/")&&
   photo.licenseUrl==="https://www.pexels.com/license/");
}
/** Stable subject-first, not "growth" -> flowers. The same photo cannot be used twice. */
export function chooseBusinessStoryPhoto({description="",stage=0,shotIndex=0,usedIds=[],avoid=[]}={}){
 const brief=String(description||"");
 const terms=TERMS.filter(([,pattern])=>pattern.test(brief)).map(([name])=>name);
 const hints=STAGE_HINTS[Math.max(0,Math.min(3,stage))];
 const used=new Set(usedIds);
 const ranked=STORY_BUSINESS_PHOTOS.filter(photo=>!used.has(photo.id)&&photoMatchesAvoid(photo,avoid))
  .map(photo=>({photo,score:
    (photo.stage===stage?22:0)+
    terms.filter(term=>photo.tags.includes(term)).length*16+
    hints.filter(term=>photo.tags.includes(term)).length*8+
    (photo.tags.includes(shotIndex===0?"work":shotIndex===5?"negotiation":"documents")?3:0)}))
  .sort((a,b)=>b.score-a.score||a.photo.id.localeCompare(b.photo.id));
 return ranked[0]?.photo||null;
}
