/**
 * Curated 5-second first-party cinematic clips for the existing Video Studio.
 * Google Drive is the private MASTER archive, not a browser video endpoint.
 * All client frames use approved same-origin derivatives; unverified Drive
 * masters and QA samples are NEVER present in this catalog.
 */
import scenes from "../../data/video-catalog/free-stock-scenes.json" with { type:"json" };

export const GIFT_VISUAL_GROUPS=Object.freeze([
  Object.freeze({id:"sky",label:{ru:"Свет и небо",en:"Light & sky",es:"Luz y cielo"}}),
  Object.freeze({id:"forest",label:{ru:"Лес и деревья",en:"Forest & trees",es:"Bosque y árboles"}}),
  Object.freeze({id:"water",label:{ru:"Океан и вода",en:"Ocean & water",es:"Océano y agua"}}),
  Object.freeze({id:"flowers",label:{ru:"Цветы и сад",en:"Flowers & garden",es:"Flores y jardín"}}),
  Object.freeze({id:"mountain",label:{ru:"Горы и дороги",en:"Mountains & journeys",es:"Montañas y caminos"}}),
  Object.freeze({id:"winter",label:{ru:"Снег и зима",en:"Snow & winter",es:"Nieve e invierno"}}),
  Object.freeze({id:"night",label:{ru:"Звёзды и ночь",en:"Stars & night",es:"Estrellas y noche"}}),
]);
const GROUP_IDS=new Set(GIFT_VISUAL_GROUPS.map(x=>x.id));
const OCCASION_SET=new Set(["birthday","love","thanks","support","anniversary","custom"]);
const ARCHIVED_ON_DRIVE=new Set([
  "warm-clouds-sunset","fall-foliage-forest","snow-forest-winter","sun-trees-forest"
]);
const VIDEO_PREFIX="/videos/holistic-house/film-collection-v3/";
const LOCAL_MEDIA=/^\/videos\/holistic-house\/film-collection-v3\/[a-z0-9-]+[.]mp4$/;
const LOCAL_POSTER=/^\/videos\/holistic-house\/film-collection-v3\/[a-z0-9-]+[.]jpg$/;
const CREDIT="Footage: Joel Holland / Dareful · CC BY 4.0 (adapted)";
const MOODS={
 sky:["joy","hope","birthday","anniversary","sunlight"],
 forest:["calm","renewal","support","thanks","growth"],
 water:["peace","love","support","letting-go","anniversary"],
 flowers:["tenderness","birthday","love","gratitude","anniversary"],
 mountain:["freedom","goal","confidence","journey","anniversary"],
 winter:["quiet","support","renewal","winter"],
 night:["wonder","love","anniversary","night"],
};
const preferredGroup={
 birthday:"flowers",love:"water",thanks:"forest",
 support:"forest",anniversary:"sky",custom:"sky",
};
export function giftVisualGroupForScene(scene){
 const tags=new Set([...(scene.tags||[]),...scene.id.split("-")]);
 if(tags.has("winter")||tags.has("snow"))return "winter";
 if(tags.has("flower")||tags.has("flowers")||tags.has("garden")||tags.has("petal"))return "flowers";
 if(tags.has("forest")||tags.has("trees")||tags.has("leaves")||tags.has("fern"))return "forest";
 if(tags.has("hills")||tags.has("mountain")||tags.has("goals"))return "mountain";
 if(tags.has("night")||tags.has("stars"))return "night";
 if(tags.has("ocean")||tags.has("river")||tags.has("shore")||
    tags.has("water")||tags.has("lake")||tags.has("stream"))return "water";
 if(tags.has("mist")||tags.has("still"))return "water";
 if(tags.has("growth")&&/flower|petal|garden/.test(scene.id))return"flowers";
 return "sky";
}
const clientScenes=scenes.filter(s=>s&&s.status==="approved"&&
 typeof s.id==="string"&&/^[a-z0-9-]{2,70}$/.test(s.id)&&
 s.video===VIDEO_PREFIX+s.id+".mp4"&&LOCAL_MEDIA.test(s.video)&&
 s.poster===VIDEO_PREFIX+s.id+".jpg"&&LOCAL_POSTER.test(s.poster)&&
 s.codec==="h264"&&Number(s.durationSeconds)===5&&
 Number(s.width)>=160&&Number(s.height)>=160&&
 typeof s.attribution==="string"&&s.attribution.includes("CC BY 4.0")&&
 typeof s.rawRedistributionAllowed==="boolean"&&s.rawRedistributionAllowed===false
).map(scene=>Object.freeze({
 id:scene.id,
 label:Object.freeze({...scene.label}),
 group:giftVisualGroupForScene(scene),
 tags:Object.freeze([...new Set(scene.tags||[])]),
 aspect:scene.width>scene.height?"landscape":"portrait",
 video:scene.video,
 poster:scene.poster,
 durationSeconds:5,
 driveArchived:ARCHIVED_ON_DRIVE.has(scene.id),
 clientReady:true,
 rawDownloadAllowed:false,
 credit:CREDIT,
 licenseUrl:"https://creativecommons.org/licenses/by/4.0/",
}));
export const GIFT_APPROVED_SCENES=Object.freeze(clientScenes);
export function defaultGiftVisualGroup(occasion){
 return preferredGroup[OCCASION_SET.has(occasion)?occasion:"custom"];
}
function score(scene,occasion,aspect){
 const tagList=new Set([...scene.tags,scene.group,...scene.id.split("-")]);
 let points=scene.aspect===aspect?10:0;
 if(scene.driveArchived)points+=1;
 const wants=occasion==="birthday"?["flowers","sky","sun","sunlight","golden","growth"]:
  occasion==="love"?["relationships","flowers","warm","heart","ocean","sunset"]:
  occasion==="thanks"?["forest","garden","growth","sun","calm"]:
  occasion==="support"?["forest","grounding","winter","water","calm"]:
  occasion==="anniversary"?["sky","sun","sunrise","ocean","warm","flowers"]:
  ["sky","flowers","forest","sun","nature"];
 for(const tag of wants)if(tagList.has(tag))points+=4;
 return points;
}
export function listGiftApprovedScenes({group="all",occasion="custom",aspect="portrait"}={}){
 if(group!=="all"&&!GROUP_IDS.has(group))return [];
 const normalizedOccasion=OCCASION_SET.has(occasion)?occasion:"custom";
 const fmt=aspect==="landscape"?"landscape":"portrait";
 return clientScenes.filter(scene=>group==="all"||scene.group===group)
   .sort((a,b)=>score(b,normalizedOccasion,fmt)-score(a,normalizedOccasion,fmt)||
     a.id.localeCompare(b.id));
}
export function giftApprovedSceneById(id){
 return typeof id==="string"?clientScenes.find(x=>x.id===id)||null:null;
}
export const GIFT_MEDIA_LIBRARY_COUNTS=Object.freeze({
 approvedClientScenes:clientScenes.length,
 driveArchivedClientScenes:clientScenes.filter(x=>x.driveArchived).length,
 driveMasterSceneFiles:42,
 driveInternalQaVideos:3
});
