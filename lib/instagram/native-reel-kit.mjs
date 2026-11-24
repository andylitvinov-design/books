// Native Instagram handoff. All video processing stays in the owner's browser.
export const TAO_INSTAGRAM_HANDLE = "tao.ideas";
export const TAO_INSTAGRAM_PROFILE = "https://www.instagram.com/tao.ideas/";
export const TAO_PUBLIC_LANDING = "https://holistichouse.vercel.app/ru/services/dao-health-profile?utm_source=instagram&utm_medium=organic_social&utm_campaign=dao_wisdom_launch";
export const REEL_MAX_FILE_BYTES = 1000000000;
export const REEL_MAX_CAPTION_CHARACTERS = 2200;
export const TAO_REEL_CAPTIONS = Object.freeze({
  ru: [
    "Ты в безопасности — или в собственной крепости?",
    "Иногда стены защищают. Иногда не позволяют сделать шаг навстречу жизни.",
    "Какую дверь ты готов открыть сегодня?",
    "Авторская притча, вдохновлённая даосской традицией.",
    "🎁 Бесплатный личный блиц-разбор — ссылка в профиле.",
    "#ДаосскаяМудрость #Усин #ПутьДао",
  ].join("\n\n"),
  en: [
    "Do your walls keep you safe — or keep you inside?",
    "Sometimes boundaries protect us. Sometimes they become the walls we fear crossing.",
    "What door could you open today?",
    "An original parable inspired by Taoist tradition.",
    "🎁 Free personal reflection — link in bio.",
    "#DaoWisdom #WuXing #Tao",
  ].join("\n\n"),
  es: [
    "¿Tus muros te protegen o te mantienen encerrado?",
    "A veces los límites nos cuidan. Otras veces nos impiden salir al encuentro de la vida.",
    "¿Qué puerta podrías abrir hoy?",
    "Parábola original inspirada en la tradición taoísta.",
    "🎁 Reflexión personal gratuita — enlace en la biografía.",
    "#SabiduriaTaoista #WuXing #Tao",
  ].join("\n\n"),
});
const MIME_TYPES = new Set(["video/mp4", "video/quicktime", "application/octet-stream"]);
export function inspectNativeReel(file, metadata) {
  if (!file || typeof file.name !== "string") return {ready:false,error:"file_required",warnings:[]};
  const extension = file.name.toLowerCase().match(/\.(mp4|mov)$/)?.[1];
  if (!extension || !Number.isFinite(file.size) || file.size <= 0 || file.size > REEL_MAX_FILE_BYTES ||
      (file.type && !MIME_TYPES.has(file.type.toLowerCase()))) {
    return {ready:false,error:"file_invalid",warnings:[]};
  }
  if (!metadata) return {ready:false,error:"metadata_pending",warnings:[]};
  const {width,height,duration} = metadata;
  if (![width,height,duration].every(x => Number.isFinite(x) && x > 0)) {
    return {ready:false,error:"metadata_invalid",warnings:[]};
  }
  if (duration < 3 || duration > 900) return {ready:false,error:"duration_invalid",warnings:[]};
  if (width >= height || Math.abs(width/height-9/16) > 0.04) {
    return {ready:false,error:"aspect_invalid",warnings:[]};
  }
  const warnings=[];
  if (duration < 15 || duration > 35) warnings.push("editorial_duration");
  if (width < 720 || height < 1280) warnings.push("low_resolution");
  return {ready:true,error:null,warnings};
}
export function normalizeNativeReelCaption(value) {
  if (typeof value !== "string" || !value.trim() || [...value].length > REEL_MAX_CAPTION_CHARACTERS ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return null;
  return value.trim();
}
export function normalizeReelReadbackLink(raw) {
  if (typeof raw !== "string" || raw.length > 300 || !raw) return null;
  try {
    const url=new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        !["instagram.com","www.instagram.com"].includes(url.hostname) ||
        !/^\/(reel|p)\/[A-Za-z0-9_-]{5,30}\/?$/.test(url.pathname)) return null;
    return "https://www.instagram.com" + (url.pathname.endsWith("/") ? url.pathname : url.pathname + "/");
  } catch {return null;}
}
