import mytubePhotoSnapshot from "../../data/video-catalog/mytube-story-photo-snapshot-v1.json" with {type:"json"};
import firstLightPhotoManifest from "../../data/video-catalog/first-light-story-photos-v1.json" with {type:"json"};
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
 provider:"pexels",
 categories:["business"],
 autoUseEligible:true,
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

const WIKIMEDIA_RAW = [
 ["relationship-adult-couple-hands","Adult_couple_holding_hands.jpg","Adult couple holding hands","Взрослая пара держится за руки","Pareja adulta tomada de la mano","relationship,couple,hands,closeness,trust,support,connection,walking","love,stress","Alice Donovan Rouse","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Adult_couple_holding_hands.jpg",0],
 ["relationship-couple-city-walk","Couple_holding_hands_while_walking_along_a_city_sidewalk.jpg","Couple walking together in the city","Пара гуляет вместе по городу","Pareja paseando por la ciudad","relationship,couple,walking,flowers,trust,closeness,together,city","love,stress,energy","Shixart1985","CC-BY-2.0","https://creativecommons.org/licenses/by/2.0/","https://commons.wikimedia.org/wiki/File:Couple_holding_hands_while_walking_along_a_city_sidewalk.jpg",1],
 ["relationship-friends-lawn","Friends_talk_on_a_blanket_on_the_lawn.jpg","Friends talking together outdoors","Друзья беседуют на природе","Amigos conversando al aire libre","friendship,conversation,belonging,support,connection,listening,together,safety","love,stress,energy","waketechcc","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Friends_talk_on_a_blanket_on_the_lawn.jpg",2],
 ["relationship-couple-autumn-path","Couple_walks_together_along_a_tree-lined_park_path_during_autumn.jpg","Couple walking along a park path","Пара гуляет по парковой дорожке","Pareja caminando por un sendero del parque","relationship,couple,walking,path,flowers,together,trust,nature","love,energy,stress","Shixart1985","CC-BY-2.0","https://creativecommons.org/licenses/by/2.0/","https://commons.wikimedia.org/wiki/File:Couple_walks_together_along_a_tree-lined_park_path_during_autumn.jpg",3],
 ["relationship-old-couple-walk","Old_couple_walking.jpg","Older couple walking together","Пожилая пара гуляет вместе","Pareja mayor caminando junta","relationship,companionship,walking,connection,care,trust,life","love,stress,energy,body","Anish Anilkumar","CC-BY-4.0","https://creativecommons.org/licenses/by/4.0/","https://commons.wikimedia.org/wiki/File:Old_couple_walking.jpg",3],
 ["relationship-chilling-lovers","Chilling_lovers._(Unsplash).jpg","Couple walking hand in hand","Пара идёт, держась за руки","Pareja caminando de la mano","relationship,couple,hands,closeness,trust,connection,walking,city","love,stress","Sweet Ice Cream Photography","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Chilling_lovers._(Unsplash).jpg",1],
 ["recovery-woman-reading-cozy-room","Woman_reading_a_book_while_sitting_on_a_couch_in_a_cozy_living_room.jpg","Quiet reading in a cozy living room","Тихое чтение в уютной гостиной","Lectura tranquila en una sala acogedora","rest,reading,home,quiet,comfort,recovery,window,sunlight,safety","stress,body","Shixart1985","CC-BY-2.0","https://creativecommons.org/licenses/by/2.0/","https://commons.wikimedia.org/wiki/File:Woman_reading_a_book_while_sitting_on_a_couch_in_a_cozy_living_room.jpg",0],
 ["recovery-older-woman-reading","Older_woman_reading_a_book_while_lying_on_a_couch_near_a_window_during_the_day.jpg","Resting with a book beside a window","Отдых с книгой у окна","Descanso con un libro junto a la ventana","rest,reading,home,quiet,comfort,recovery,window,safety,self-care","stress,body","Shixart1985","CC-BY-2.0","https://creativecommons.org/licenses/by/2.0/","https://commons.wikimedia.org/wiki/File:Older_woman_reading_a_book_while_lying_on_a_couch_near_a_window_during_the_day.jpg",1],
 ["energy-healthy-lifestyle-stretch","Maintaining_a_healthy_lifestyle.jpg","Gentle stretching and healthy movement","Мягкая растяжка и движение","Estiramiento suave y movimiento saludable","stretching,movement,exercise,vitality,body-care,energy,health,fresh-start","energy,body","Keyidin28","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Maintaining_a_healthy_lifestyle.jpg",0],
 ["energy-park-triceps-stretch","Girl_stretching_triceps_in_a_park.jpg","Outdoor shoulder stretch","Растяжка плеч на природе","Estiramiento de hombros al aire libre","stretching,movement,exercise,park,vitality,body-care,energy,confidence","energy,body","Tyler Read","CC-BY-2.0","https://creativecommons.org/licenses/by/2.0/","https://commons.wikimedia.org/wiki/File:Girl_stretching_triceps_in_a_park.jpg",1],
 ["energy-park-leg-stretch","Woman_stretches_outdoors_in_a_park_during_a_sunny_day_while_preparing_for_exercise.jpg","Preparing for exercise in a sunny park","Подготовка к занятиям в солнечном парке","Preparación para hacer ejercicio en un parque soleado","stretching,movement,exercise,park,sunlight,vitality,energy,confidence","energy,body,stress","Shixart1985","CC-BY-2.0","https://creativecommons.org/licenses/by/2.0/","https://commons.wikimedia.org/wiki/File:Woman_stretches_outdoors_in_a_park_during_a_sunny_day_while_preparing_for_exercise.jpg",2],
 ["relationship-couple-wall-unsplash","Couple_holding_hands_by_a_wall_(Unsplash).jpg","Couple holding hands by a wall","Пара держится за руки у стены","Pareja tomada de la mano junto a una pared","relationship,couple,hands,closeness,trust,connection,smile,together","love","Tanja Heffner","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Couple_holding_hands_by_a_wall_(Unsplash).jpg",0],
 ["relationship-couple-pool","A_woman_and_a_man_facing_a_swimming_pool_holding_hands.jpg","Couple holding hands by a swimming pool","Пара держится за руки у бассейна","Pareja tomada de la mano junto a una piscina","relationship,couple,hands,connection,together,closeness,trust,shared-moment","love","Hotholiday","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:A_woman_and_a_man_facing_a_swimming_pool_holding_hands.jpg",1],
 ["relationship-couple-freestocks","Couple_holding_hands_(28619046534).jpg","Couple holding hands","Пара держится за руки","Pareja tomada de la mano","relationship,couple,hands,connection,together,closeness,trust,companionship","love","freestocks.org","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Couple_holding_hands_(28619046534).jpg",2],
 ["nature-sunrise-through-trees","Sunrise_through_trees.jpg","Sunrise through trees","Рассвет сквозь деревья","Amanecer entre los árboles","sunrise,sun,forest,trees,morning,light,energy,hope,nature,quiet","stress,energy,body","Hyie01","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Sunrise_through_trees.jpg",0],
 ["nature-forest-sun","Forest-sun.jpg","Sunlight in a forest","Солнце в лесу","Sol en el bosque","forest,sun,trees,light,calm,grounding,stability,nature,green","stress,energy,body","TGCGG","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Forest-sun.jpg",1],
 ["nature-wild-forest","Landscape_of_a_wild_forest.jpg","Wild forest landscape","Пейзаж дикого леса","Paisaje de bosque silvestre","forest,trees,open,light,renewal,nature,quiet,green,grounding","stress,energy,body","SpessiG","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Landscape_of_a_wild_forest.jpg",2],
 ["nature-sunrise-forest-pd","Sunrise_in_forest.jpg","Sunrise in a forest","Восход солнца в лесу","Amanecer en el bosque","sunrise,forest,light,morning,hope,renewal,nature,warmth","stress,energy,body","C. E. Price","Public-Domain","https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_subject_matter","https://commons.wikimedia.org/wiki/File:Sunrise_in_forest.jpg",3],
 ["nature-sun-forest","Sun_in_forest.jpg","Sun above a forest","Солнце над лесом","Sol sobre el bosque","sun,forest,sky,blue,light,freedom,vitality,nature,open","stress,energy,body","Raviarts","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Sun_in_forest.jpg",3],
 ["nature-flower-macro","Flower_photo_normal.jpg","Flower macro photograph","Цветок крупным планом","Flor en primer plano","flower,macro,tenderness,care,growth,nature,softness,beauty","love,stress,energy,body","LorelMan","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Flower_photo_normal.jpg",1],
 ["nature-flower-garden","Flower_in_a_garden.jpg","Flower in a garden","Цветок в саду","Flor en un jardín","flower,garden,tenderness,care,growth,freshness,renewal,nature,softness","love,stress,energy,body","Miragracious","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Flower_in_a_garden.jpg",2],
 ["nature-ocean-sunrise","Sunrise_Over_the_Ocean.jpg","Sunrise over the ocean","Рассвет над океаном","Amanecer sobre el océano","ocean,sea,sunrise,sun,water,horizon,calm,warmth,space,nature","stress,energy,body","Hommie09","CC0-1.0","https://creativecommons.org/publicdomain/zero/1.0/","https://commons.wikimedia.org/wiki/File:Sunrise_Over_the_Ocean.jpg",3]
];
export const STORY_WIKIMEDIA_PHOTOS=Object.freeze(WIKIMEDIA_RAW.map(row=>{
 const [slug,file,en,ru,es,tags,categories,author,licenseId,licenseUrl,source,stage]=row;
 return Object.freeze({
  id:"story-photo-"+slug,provider:"wikimedia",media:"licensed_photo",
  visualOrigin:"real_camera_photo",
  src:"/api/video/story-photo/story-photo-"+slug,
  upstreamSrc:"https://commons.wikimedia.org/wiki/Special:Redirect/file/"+file+"?width=1200",
  sourcePage:source,licenseUrl,licenseId,creatorLicense:licenseId,
  attribution:author+" / Wikimedia Commons — "+licenseId,
  labels:Object.freeze({en,ru,es}),tags:Object.freeze(tags.split(",")),
  categories:Object.freeze(categories.split(",")),stage,durationSeconds:5,
  approval:"source_page_reviewed_actual_image_decode_required",
  autoUseEligible:licenseId==="CC0-1.0"||licenseId==="Public-Domain"
 });
}));
/**
 * Published, read-only mirror of Supabase's 256 canonical MyTube story/photo bindings.
 * External source and JPEG headers were verified at curation time; the SAME-ORIGIN
 * Story proxy and the browser's image.decode()/naturalWidth gate must still pass
 * for every actual montage frame. These are not new MP4s or generic auto-fillers.
 */
const scenarioSnapshot=mytubePhotoSnapshot;
const PEXELS_ID=/^pexels-([1-9][0-9]+)$/;
export const STORY_SCENARIO_PHOTOS=Object.freeze(scenarioSnapshot.photos.map(row=>{
  const number=String(row.photoId||"").match(PEXELS_ID)?.[1];
  if(!number||Number(number)!==row.providerPhotoId||
    row.upstreamSrc!==`https://images.pexels.com/photos/${number}/pexels-photo-${number}.jpeg?auto=compress&cs=tinysrgb&w=1280`||
    !/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+\/$/.test(row.sourcePage)||
    row.licenseUrl!=="https://www.pexels.com/license/"||
    !Array.isArray(row.tags)||row.tags.length===0)
    throw Error("invalid_verified_scenario_photo_snapshot");
  return Object.freeze({
    id:row.photoId,provider:"pexels",
    categories:Object.freeze([...row.categoryKeys]),
    // Used ONLY for the selected, canonical scenario; never for generic
    // fallback on an unrelated user's psychological or business request.
    autoUseEligible:false,media:"licensed_photo",visualOrigin:"real_camera_photo",
    src:"/api/video/story-photo/"+row.photoId,upstreamSrc:row.upstreamSrc,
    sourcePage:row.sourcePage,licenseUrl:row.licenseUrl,
    creatorLicense:"pexels_free",attribution:row.creator+" · Pexels #"+number,
    labels:Object.freeze({ru:row.titleRu,en:row.descriptionEn,es:row.descriptionEn}),
    tags:Object.freeze([...row.tags]),stage:0,durationSeconds:5,
    approval:"source_page_reviewed_actual_image_decode_required"
  });
}));
/** Separate from video posters: 33 verified-source Pexels photographic references
 * for the six First Light plots, served only by the existing exact-ID photo proxy.
 * Never call an external source URL supplied by a client.
 */
export const STORY_FIRST_LIGHT_PHOTOS=Object.freeze(firstLightPhotoManifest.photos.map(row=>{
  if(firstLightPhotoManifest.schemaVersion!=="hh-first-light-plot-photo-v1"||
    !Number.isSafeInteger(row.providerPhotoId)||row.providerPhotoId<1||
    row.id!=="story-photo-pexels-"+row.providerPhotoId||
    !/^https:\/\/images\.pexels\.com\/photos\/[0-9]+\/pexels-photo-[0-9]+\.jpeg\?/.test(row.upstreamSrc)||
    !row.upstreamSrc.startsWith("https://images.pexels.com/photos/"+row.providerPhotoId+"/pexels-photo-"+row.providerPhotoId+".jpeg?")||
    !/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-[0-9]+\/$/.test(row.sourcePage)||
    !row.sourcePage.endsWith("-"+row.providerPhotoId+"/")||
    row.licenseUrl!=="https://www.pexels.com/license/"||
    typeof row.creator!=="string"||row.creator.length<3||row.creator.length>120||
    !Array.isArray(row.tags)||!row.tags.length||
    !Number.isInteger(row.width)||!Number.isInteger(row.height)||
    row.width<600||row.height<600||row.width>12000||row.height>12000)
    throw Error("HH_FIRST_LIGHT_PHOTO_SOURCE_INVALID");
  return Object.freeze({
    id:row.id,provider:"pexels",categories:Object.freeze(["energy-confidence"]),
    autoUseEligible:true,media:"licensed_photo",visualOrigin:"real_camera_photo",
    src:"/api/video/story-photo/"+row.id,upstreamSrc:row.upstreamSrc,
    sourcePage:row.sourcePage,licenseUrl:row.licenseUrl,
    creatorName:row.creator,photoId:row.providerPhotoId,
    nativeAspect:row.width>=row.height?"landscape":"portrait",
    sourceWidth:row.width,sourceHeight:row.height,
    creatorLicense:"pexels_free",
    attribution:row.creator+" — Pexels #"+row.providerPhotoId,
    labels:Object.freeze({ru:row.titleRu,en:row.descriptionEn,es:row.descriptionEn}),
    tags:Object.freeze([...row.tags]),stage:0,durationSeconds:7,
    approval:"source_page_reviewed_actual_image_decode_required"
  });
}));
export const STORY_FIRST_LIGHT_PHOTO_BY_ID=new Map(STORY_FIRST_LIGHT_PHOTOS.map(photo=>[photo.id,photo]));
export const STORY_PHOTOS=Object.freeze([...STORY_BUSINESS_PHOTOS,...STORY_WIKIMEDIA_PHOTOS,...STORY_SCENARIO_PHOTOS,...STORY_FIRST_LIGHT_PHOTOS]);
export const STORY_PHOTO_BY_ID=new Map(STORY_PHOTOS.map(photo=>[photo.id,photo]));
export const MYTUBE_SCENARIO_PHOTO_COVERAGE=Object.freeze(Object.fromEntries(
  scenarioSnapshot.scenarios.map(scenario=>{
    const ids=scenario.beats.map(beat=>beat.photoId);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*-s[1-4]$/.test(scenario.scenarioId)||
       ids.length!==6||new Set(ids).size!==6||
       new Set(scenario.beats.map(beat=>beat.sceneNo)).size!==4||
       ids.some(id=>!STORY_PHOTO_BY_ID.has(id)))
      throw Error("invalid_six_photo_scenario_"+scenario.scenarioId);
    return [scenario.scenarioId,Object.freeze({
      categoryId:scenario.categoryId,topicId:scenario.topicId,
      titleRu:scenario.titleRu,
      photoIds:Object.freeze(ids),
      sceneNos:Object.freeze(scenario.beats.map(beat=>beat.sceneNo))
    })];
  })
));
export const MYTUBE_SCENARIO_PHOTO_SUMMARY=Object.freeze({
  scenarios:Object.keys(MYTUBE_SCENARIO_PHOTO_COVERAGE).length,
  photos:STORY_SCENARIO_PHOTOS.length,
  links:scenarioSnapshot.scenarios.reduce((total,scenario)=>total+scenario.beats.length,0),
  minimumUniquePhotos:6
});
export function getMyTubeScenarioPhotos(scenarioId){
  const binding=typeof scenarioId==="string"?
    MYTUBE_SCENARIO_PHOTO_COVERAGE[scenarioId]:null;
  if(!binding)return [];
  const photos=binding.photoIds.map(id=>STORY_PHOTO_BY_ID.get(id));
  return photos.length===6&&photos.every(isTrustedStoryPhoto)?photos:[];
}

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
 if(!record||photo!==record||photo.media!=="licensed_photo"||
    photo.visualOrigin!=="real_camera_photo"||
    photo.approval!=="source_page_reviewed_actual_image_decode_required"||
    photo.src!=="/api/video/story-photo/"+photo.id)return false;
 if(photo.provider==="wikimedia"){
  const source=photo.sourcePage.startsWith("https://commons.wikimedia.org/wiki/File:");
  const thumb=photo.upstreamSrc.startsWith("https://commons.wikimedia.org/wiki/Special:Redirect/file/");
  return source&&thumb&&(
   (photo.licenseId==="CC0-1.0"&&photo.licenseUrl==="https://creativecommons.org/publicdomain/zero/1.0/")||
   (photo.licenseId==="Public-Domain"&&photo.licenseUrl==="https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_subject_matter")||
   (photo.licenseId==="CC-BY-2.0"&&photo.licenseUrl==="https://creativecommons.org/licenses/by/2.0/")||
   (photo.licenseId==="CC-BY-4.0"&&photo.licenseUrl==="https://creativecommons.org/licenses/by/4.0/"));
 }
 return photo.provider==="pexels"&&
   photo.upstreamSrc.startsWith("https://images.pexels.com/photos/")&&
   photo.sourcePage.startsWith("https://www.pexels.com/photo/")&&
   photo.licenseUrl==="https://www.pexels.com/license/";
}
/**
 * Commons may redirect resized JPEGs to either its legacy upload host or its
 * dedicated thumbnail host. A fixed photo ID is never a generic image proxy:
 * inspect the terminal HTTPS origin before delivering the bytes to Canvas.
 */
export function isAllowedStoryPhotoResponseUrl(photo,responseUrl){
 if(!isTrustedStoryPhoto(photo)||typeof responseUrl!=="string")return false;
 try{
  const url=new URL(responseUrl);
  if(url.protocol!=="https:"||url.username||url.password||url.port)return false;
  return photo.provider==="wikimedia"
   ?url.hostname==="upload.wikimedia.org"||url.hostname==="thumb.wikimedia.org"
   :url.hostname==="images.pexels.com";
 }catch{return false;}
}

const CONCEPT_TERMS=Object.freeze([
 ["relationship",/relationship|couple|partner|closeness|intimacy|trust|отношен|близост|партнер|довер|пара|любов|relaci[oó]n|pareja|confianza/iu],
 ["friendship",/friend|friendship|conversation|listening|belonging|друз|друж|бесед|разговор|поддержк|escucha|amistad|amigos/iu],
 ["support",/support|help|care|family|hands|поддерж|помощ|забот|семь|рук|familia|apoyo/iu],
 ["rest",/rest|relax|quiet|recover|safe|shelter|sleep|reading|home|отдых|покой|восстанов|безопас|сон|дом|чтени|descanso|calma|hogar/iu],
 ["movement",/movement|stretch|exercise|walk|vitality|energy|confidence|растяж|движ|упражнен|прогул|энерг|уверен|actividad|movimiento|ejercicio/iu],
 ["body-care",/body|breath|yoga|meditat|self-care|тело|дых|йог|медитац|уход|cuerpo|respiraci[oó]n|meditaci[oó]n/iu],
 ["nature",/park|nature|sunlight|morning|fresh|path|flower|парк|природ|солн|утр|свеж|цвет|naturaleza|parque|luz solar/iu]
]);
export function chooseConceptStoryPhoto({category="business",description="",stage=0,usedIds=[],avoid=[]}={}){
 const brief=String(description||"");
 const terms=CONCEPT_TERMS.filter(([,pattern])=>pattern.test(brief)).map(([name])=>name);
 const hints={love:["relationship","friendship","support"],stress:["rest","support","nature"],
  energy:["movement","nature","body-care"],body:["body-care","rest","movement"],
  business:["work","documents","meeting"]}[category]||[];
 const used=new Set(usedIds);
 const restrictions=Array.isArray(avoid)?avoid.join(" "):String(avoid||"");
 const noPeople=/(?:no people|without people|without persons|без людей|sin personas|sin gente|^people$)/iu.test(restrictions);
 const candidates=STORY_PHOTOS.filter(photo=>photo.categories?.includes(category)&&!used.has(photo.id)&&photo.autoUseEligible===true&&
  isTrustedStoryPhoto(photo)&&(!noPeople||!photo.tags.some(tag=>
   ["couple","friendship","people","person","woman","man","hands","relationship"].includes(tag))));
 return candidates.map(photo=>{
  const tagSet=new Set(photo.tags),matched=terms.filter(term=>tagSet.has(term));
  const hinted=hints.filter(term=>tagSet.has(term));
  return {photo,score:(photo.stage===Math.min(3,Math.max(0,stage))?16:0)+matched.length*14+hinted.length*7};
 }).sort((a,b)=>b.score-a.score||a.photo.id.localeCompare(b.photo.id))[0]?.photo||null;
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
