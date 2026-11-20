/**
 * Three Ali Secretary policies, one first-party intelligence and one signed
 * host. No additional model, state store, consent grant or booking side effect.
 */
import {SECRETARY_MODES} from './secretary-modes.mjs';
import {aliSecretaryOfferJourney} from './ali-secretary-offer-journeys.mjs';
export const ALI_SECRETARY_ALGORITHMS_VERSION='ali-secretary-algorithms-v1';
export const ALI_SECRETARY_ALGORITHM_STAGES=Object.freeze({
 [SECRETARY_MODES.SECRETARY]:Object.freeze([
   'selected_service','consent','time_or_help','format_if_needed','review','confirmed_handoff']),
 [SECRETARY_MODES.PSYCHOLOGIST]:Object.freeze([
   'voluntary_consent','situation','goal','challenge','impact','attempts','support',
   'review_brief','confirmed_handoff']),
 [SECRETARY_MODES.DIAGNOSTICIAN]:Object.freeze([
   'selected_review','diagnostic_consent','goal','challenge','situation',
   'drawing_optional','review_brief','confirmed_handoff',
   'questionnaire_verified','portrait_optional','complete']),
});
const LOCALES=new Set(['ru','en','es']);
export const ALI_FREE_DIAGNOSTIC_OFFER_IDS=Object.freeze([
 'browse_situation','consultation_free','homeopathy_free','business_review',
]);
const REVIEW=new Set(ALI_FREE_DIAGNOSTIC_OFFER_IDS);
export function aliVerifiedDiagnosticOffer({service=null,offerId=null,locale='en'}={}){
 const row=aliSecretaryOfferJourney(offerId,service,locale);
 return Boolean(row&&REVIEW.has(offerId)&&row.kind==='review'&&
   row.priceKind==='free'&&row.url.endsWith('/services/free-situation-review'));
}
/** Host arguments must be verified; request text alone is NEVER an opt-in. */
export function resolveAliSecretaryAlgorithm({
 locale='en',service=null,offerId=null,requestedMode=null,
 entryVerified=false,consentVerified=false,
}={}){
 const trusted=entryVerified===true&&LOCALES.has(locale);
 const psych=trusted&&requestedMode===SECRETARY_MODES.PSYCHOLOGIST;
 const diagnostic=trusted&&!psych&&(
   requestedMode===SECRETARY_MODES.DIAGNOSTICIAN||
   aliVerifiedDiagnosticOffer({service,offerId,locale}));
 const mode=psych?SECRETARY_MODES.PSYCHOLOGIST:
   diagnostic?SECRETARY_MODES.DIAGNOSTICIAN:SECRETARY_MODES.SECRETARY;
 return Object.freeze({
   version:ALI_SECRETARY_ALGORITHMS_VERSION,mode,
   reason:!trusted?'unverified_entry':psych?'signed_psychologist':
     diagnostic?'signed_diagnostic_or_free_review':'regular_service',
   stages:ALI_SECRETARY_ALGORITHM_STAGES[mode],
   consentRequired:mode!==SECRETARY_MODES.SECRETARY,
   activated:mode===SECRETARY_MODES.SECRETARY||consentVerified===true,
   canCollectPrivateMedia:mode===SECRETARY_MODES.DIAGNOSTICIAN&&consentVerified===true,
 });
}
const INTRO=Object.freeze({
 ru:t=>'Здравствуйте! Я Ali. Вы выбрали «'+t+
   '». С вашего согласия уточню три вопроса для разбора. Затем можно отправить рисунок и заполнить анкету; личное фото необязательно. Начнём?',
 en:t=>'Hello! I’m Ali. You selected “'+t+
   '”. With your permission I’ll ask three questions for the review. Then you can add a drawing and fill in a questionnaire; a personal photo is optional. Shall we begin?',
 es:t=>'¡Hola! Soy Ali. Has elegido «'+t+
   '». Con tu permiso haré tres preguntas para la revisión. Después puedes enviar un dibujo y completar un formulario; la foto personal es opcional. ¿Empezamos?',
});
export function aliDiagnosticServiceIntro(locale='en',verifiedTitle=''){
 const l=LOCALES.has(locale)?locale:'en';
 const title=typeof verifiedTitle==='string'&&verifiedTitle.trim()
   ?verifiedTitle.trim().slice(0,120):
   ({ru:'Бесплатный разбор',en:'Free review',es:'Revisión gratuita'}[l]);
 return INTRO[l](title);
}
