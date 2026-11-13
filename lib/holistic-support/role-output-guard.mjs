/** Pure post-generation quality gate; never a substitute for upstream safety. */
export const ROLE_OUTPUT_GUARD_VERSION = 'hi-role-output-guard-v1';
const FALSE_ACTION_EN = /\b(?:i(?:'ve| have)? (?:already )?(?:booked|scheduled|saved|sent|deleted|paid|charged|cancelled|canceled|placed your order)|your (?:appointment|booking|payment|order) (?:is|has been) (?:confirmed|completed|paid|scheduled|placed)|you (?:are|have been) booked)\b/iu;
const FALSE_ACTION_RU = /(?:я (?:уже )?(?:вас )?(?:записал[а]?|забронировал[а]?|отправил[а]?|сохранил[а]?|удалил[а]?|оплатил[а]?|заказал[а]?|отменил[а]?)(?: вас)?|вы записаны|ваша запись подтверждена|платеж успешно проведен)/iu;
const DIAGNOSIS_EN = /\b(?:you (?:have|suffer from|are diagnosed with) (?:depression|ptsd|adhd|bipolar disorder)|your (?:anxiety|depression) is caused by)\b/iu;
const DIAGNOSIS_RU = /(?:у вас (?:депрессия|птср|сдвг|биполярное расстройство)|вам поставлен диагноз|ваша тревога вызвана)/iu;
const ROBOTIC = /^(?:as an ai language model|as a large language model|как языковая модель|как искусственный интеллект, я не могу)/iu;
const letterCount = (s,re) => (s.match(re)||[]).length;
export function assessRoleReply({text='',locale='en',role='general'}={}) {
  if (typeof text !== 'string' || !text.trim()) return {ok:false,reason:'empty'};
  if (!['secretary','coach'].includes(role) || !['ru','en'].includes(locale))
    return {ok:true,reason:'not_applicable'};
  if ((text.match(/[?？]/g)||[]).length>1) return {ok:false,reason:'question_overload'};
  if (FALSE_ACTION_EN.test(text)||FALSE_ACTION_RU.test(text))
    return {ok:false,reason:'fabricated_action'};
  if (DIAGNOSIS_EN.test(text)||DIAGNOSIS_RU.test(text))
    return {ok:false,reason:'unsupported_diagnosis'};
  if (ROBOTIC.test(text.trim())) return {ok:false,reason:'robotic_preface'};
  if (role==='coach' && (text.match(/(?:^|\n)\s*(?:\d+[.)]|[-*])\s+/gu)||[]).length>1)
    return {ok:false,reason:'multi_step_pressure'};
  const ru=letterCount(text,/\p{Script=Cyrillic}/gu),en=letterCount(text,/\p{Script=Latin}/gu);
  if(ru+en>=24 && ((locale==='ru' && en>=12 && en>ru*1.5) ||
     (locale==='en' && ru>=12 && ru>en*1.5)))
    return {ok:false,reason:'wrong_language'};
  return {ok:true,reason:'pass'};
}
