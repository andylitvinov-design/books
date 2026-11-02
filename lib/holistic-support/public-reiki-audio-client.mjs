/**
 * Client read-only adapter to the EXISTING /api/reiki-intro-audio public
 * publication gate. It does not access account data or Supabase directly.
 * A course introduction is NOT a guided audio meditation or clinical treatment.
 */
const SLOT_TOPICS=Object.freeze({
  energy:["kundalini","tantra"],love:["tantra"],meaning:["yggdrasil","flight"],
  goals:["flight"],money:[],
});
const TITLE=Object.freeze({
  ru:{
    flight:"Полёт к Солнцу · вступительное аудио курса",
    tantra:"Тантра Рейки · вступительное аудио курса",
    kundalini:"Кундалини Рейки · вступительное аудио курса",
    yggdrasil:"Рейки Иггдрасиль · вступительное аудио курса",
  },
  en:{
    flight:"Sun Flight · course introduction audio",
    tantra:"Tantra Reiki · course introduction audio",
    kundalini:"Kundalini Reiki · course introduction audio",
    yggdrasil:"Reiki Yggdrasil · course introduction audio",
  },
});
export function publicReikiAudioSlots({topic,locale,maxDurationMin=null}={}) {
  if(!Object.hasOwn(SLOT_TOPICS,topic) || !Object.hasOwn(TITLE,locale) ||
     maxDurationMin!==null) return [];
  return SLOT_TOPICS[topic].slice(0,2);
}
export function verifiedPublicReikiIntro(payload,{lesson,locale}={}) {
  if(!publicReikiAudioSlots({topic:"energy",locale}).includes(lesson) &&
      !["flight","yggdrasil"].includes(lesson)) return null;
  if(!Object.hasOwn(TITLE,locale) || !Object.hasOwn(TITLE[locale],lesson))return null;
  const src=payload?.audio?.src,publishedAt=payload?.audio?.publishedAt;
  if(typeof src!=="string" || typeof publishedAt!=="string" ||
     !Number.isFinite(Date.parse(publishedAt))) return null;
  let url;
  try {url=new URL(src);}catch{return null;}
  if(url.protocol!=="https:" || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) ||
    url.port || url.username || url.password || url.search || url.hash ||
    !new RegExp("^/storage/v1/object/public/hh-reiki-course-audio/reiki-practitioner/intros/"+
      lesson+"/"+locale+"/[a-f0-9]{32}\\.(?:mp3|m4a|wav)$").test(url.pathname))return null;
  return {
    id:"audio:reiki:"+lesson+":"+locale,kind:"audio",
    audioType:"published_course_introduction",title:TITLE[locale][lesson],
    href:src,publishedAt,
  };
}
