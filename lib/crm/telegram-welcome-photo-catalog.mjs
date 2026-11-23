/**
 * Holistic House · Telegram visual welcome catalogue.
 * Editor-reviewed, first-party images only; never let a Telegram message, URL,
 * client name, image upload or model output choose an external photo.
 * A per-offer image wins over its general service. Values are deployed files.
 */
import {TELEGRAM_SERVICE_OPTIONS} from '../assist/telegram-service-options.mjs';
export const ALI_WELCOME_PHOTO_CATALOG_VERSION='ali-telegram-photos-v3';
const ORIGIN='https://holistichouse.vercel.app';
const IMG='/images/holistic-house/';
const POSTER=IMG+'video-posters/';
export const ALI_WELCOME_PHOTO_FILES=Object.freeze({
  general:POSTER+'services-en-v2.webp',
  chat:POSTER+'services-en-v2.webp',
  psychologist:POSTER+'hypnotherapy-en-v1.webp',
  free_diagnostic:IMG+'andy-about.png',
  homeopathy:POSTER+'homeopathy-en-v2.webp',
  coaching:POSTER+'hypnotherapy-en-v1.webp',
  reiki:IMG+'reiki-approved-sunrise-v3.webp',
  constellations:POSTER+'constellations-en-v1.webp',
  business:POSTER+'services-en-v2.webp',
  business_strategy:POSTER+'services-en-v2.webp',
  support_stress_energy:IMG+'course-focus-mountain-boy.webp',
  support_relationships_esteem:POSTER+'constellations-en-v1.webp',
  support_money_growth:POSTER+'services-en-v2.webp',
  support_business_support:POSTER+'services-en-v2.webp',
  reiki_remote:IMG+'reiki-approved-sunrise-v3.webp',
  reiki_tantra:IMG+'reiki-approved-sunrise-v3.webp',
  reiki_yggdrasil:IMG+'reiki-practitioner-sunrise.webp',
  browse_tests:IMG+'course-start-heron.webp',
  browse_situation:IMG+'hero-olive-incense.webp',
  browse_wuxing:IMG+'tao-fu-balance.webp',
  reading_iching:IMG+'tao-fu-harmony.webp',
  reading_tao:IMG+'tao-fu-balance.webp',
  reading_tarot:IMG+'hero-olive-incense.webp',
  consultation_free:IMG+'andy-about.png',
  consultation_express:IMG+'andy-about.png',
  consultation_full:IMG+'andy-about.png',
  services_imagery:POSTER+'hypnotherapy-en-v1.webp',
  services_constellations:POSTER+'constellations-en-v1.webp',
  services_business:POSTER+'services-en-v2.webp',
  business_review:IMG+'messenger-zen-stones.svg',
  business_consult:IMG+'andy-about.png',
  business_team:IMG+'homepage-constellations.svg',
  courses_meditations:IMG+'assist-video-meditation.webp',
  'courses_personal-video':IMG+'assist-video-intention.webp',
  video_intention:IMG+'assist-video-intention.webp',
  video_meditation:IMG+'assist-video-meditation.webp',
  video_message:IMG+'assist-video-message.webp',
  courses_opora:IMG+'course-focus-mountain-boy.webp',
  courses_practitioner:IMG+'reiki-practitioner-sunrise.webp',
  courses_yggdrasil:IMG+'reiki-practitioner-sunrise.webp',
  coach_diagnostic:IMG+'hero-olive-incense.webp',
  coach_ai:IMG+'my-coach-mira-hires.webp',
  coach_human:IMG+'andy-about.png',
  magical_wellbeing:IMG+'mandala-gold-reference.webp',
  magical_money:IMG+'tao-fu-prosperity.webp',
  magical_talisman:IMG+'mandala-gold-reference.webp',
  homeopathy_free:POSTER+'homeopathy-en-v2.webp',
  homeopathy_express:POSTER+'homeopathy-en-v2.webp',
  homeopathy_full:POSTER+'homeopathy-en-v2.webp',
});
/** Only a signed, server-parsed service offer may override the service image. */
export function aliWelcomePhotoKey({service=null,offerId=null,supportTopic=null,
  mode=null}={}){
  if(typeof offerId==='string'&&
    Object.hasOwn(TELEGRAM_SERVICE_OPTIONS,offerId)&&
    TELEGRAM_SERVICE_OPTIONS[offerId].service===service&&
    Object.hasOwn(ALI_WELCOME_PHOTO_FILES,offerId))return offerId;
  if(typeof service==='string'&&Object.hasOwn(ALI_WELCOME_PHOTO_FILES,service))
    return service;
  if(typeof supportTopic==='string'){
    const key='support_'+supportTopic;
    if(Object.hasOwn(ALI_WELCOME_PHOTO_FILES,key))return key;
  }
  return mode==='psychologist'?'psychologist':mode==='chat'?'chat':'general';
}
/** A fixed HTTPS host and exact files: no arbitrary client image URLs. */
export function aliWelcomePhotoUrl(key){
  return typeof key==='string'&&Object.hasOwn(ALI_WELCOME_PHOTO_FILES,key)
    ?ORIGIN+ALI_WELCOME_PHOTO_FILES[key]:null;
}
