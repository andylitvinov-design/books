/**
 * Secretary Mind continuation for the four signed Get Support quiz topics.
 * Reuses already-selected need and mode. No new model, questionnaire, provider,
 * client profile, diagnosis, booking or CRM side effect.
 */
import {telegramSupportSelection,telegramSupportFirstQuestion,
  telegramSupportNeedTitle} from '../crm/telegram-support-quiz.mjs';
export const ALI_SECRETARY_SUPPORT_VERSION='ali-secretary-support-v1';
const COPY=Object.freeze({
 ru:Object.freeze([
  ['Стресс и энергия','Что сейчас сильнее всего забирает силы?','Когда напряжение ощущается заметнее?'],
  ['Отношения и самооценка','Что сейчас сложнее всего в этих отношениях или чувствах?','Когда это особенно заметно?'],
  ['Деньги и личный рост','Что мешает приблизиться к желаемому результату?','В какой ситуации это проявляется?'],
  ['Поддержка бизнеса','Что сильнее всего тормозит решение?','Как это отражается на команде или работе?'],
 ]),
 en:Object.freeze([
  ['Stress and energy',"What's draining your energy most right now?","When is the tension most noticeable?"],
  ['Relationships and esteem',"What's hardest in these relationships or feelings?","When does this show up most?"],
  ['Money and personal growth',"What's getting in the way of your goal?","Where are you noticing it?"],
  ['Business support',"What's slowing down the decision most?","How is it affecting your work or team?"],
 ])
});
export function aliSecretarySupportJourney(digits,locale='en'){
 const choice=telegramSupportSelection(digits);
 if(!choice||choice.modeIndex!==0||!['ru','en'].includes(locale))return null;
 const [topic,challenge,situation]=COPY[locale][choice.topicIndex];
 const need=telegramSupportNeedTitle(locale,digits);
 const first=telegramSupportFirstQuestion(locale,digits);
 return {id:'support_'+choice.topic,locale,topic,need,
   title:topic+' · '+need,
   mode:'secretary',flow:'support_intake',
   questions:{goal:first,challenge,situation}};
}
