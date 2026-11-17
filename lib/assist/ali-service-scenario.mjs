/** Public offer registry. Never identity, AI consent, a booking or CRM side effect. */
import {telegramBusinessServiceTitle,BUSINESS_STRATEGY_PAGE_TITLES} from './telegram-business-request.mjs';
export const ALI_SERVICE_SCENARIO_VERSION='ali-service-scenario-v1';
const SCENARIOS=Object.freeze({
 homeopathy:{
 ru:['С каким вопросом вы хотите обратиться на консультацию по психогомеопатии?','Что в этой ситуации сейчас больше всего затрудняет?','Как давно это важно и что вы уже пробовали?'],
 en:['What would you like to discuss in your psycho-homeopathy consultation?','What feels most difficult about that situation now?','How long has this mattered, and what have you already tried?'],
 es:['¿Qué te gustaría consultar en la sesión de psicohomeopatía?','¿Qué resulta más difícil de esa situación ahora?','¿Desde cuándo es importante y qué has intentado?']},
 coaching:{
 ru:['Над каким результатом вы хотели бы поработать на сессии?','Что сейчас мешает приблизиться к этому результату?','В каких обстоятельствах эта трудность проявляется чаще всего?'],
 en:['What outcome would you like to work toward in a session?','What is getting in the way of that outcome now?','In what circumstances does this difficulty show up most often?'],
 es:['¿Qué resultado te gustaría trabajar en una sesión?','¿Qué te impide acercarte a ese resultado ahora?','¿En qué circunstancias aparece más esta dificultad?']},
 reiki:{
 ru:['С каким запросом вы рассматриваете сеанс Рейки?','Что в этой ситуации сейчас больше всего беспокоит или затрудняет?','Какую поддержку вы ищете сейчас и что уже пробовали?'],
 en:['What would you like support with during a Reiki session?','What feels most difficult about that situation right now?','What support are you looking for now, and what have you tried?'],
 es:['¿Con qué intención estás considerando una sesión de Reiki?','¿Qué resulta más difícil de esa situación ahora?','¿Qué apoyo buscas ahora y qué has intentado?']},
 constellations:{
 ru:['Какую ситуацию или отношения вы хотели бы исследовать на расстановке?','Что в этой истории сейчас самое сложное или повторяется?','В каких обстоятельствах это проявляется сегодня?'],
 en:['What situation or relationship would you like to explore in a constellation session?','What is most difficult or recurring in this situation?','Where does this show up in your life today?'],
 es:['¿Qué situación o relación te gustaría explorar en una constelación?','¿Qué es lo más difícil o recurrente en esa situación?','¿En qué circunstancias se manifiesta actualmente?']},
 business:{
 ru:['Какую задачу бизнеса вы хотели бы решить на консультации?','Что сейчас больше всего сдерживает решение этой задачи?','Как обстоят дела сейчас и какие шаги вы уже предпринимали?'],
 en:['What business problem would you like to address in a consultation?','What is the biggest obstacle to resolving it now?','What is the current business context, and what have you tried?'],
 es:['¿Qué problema de tu negocio te gustaría abordar en una consulta?','¿Cuál es el principal obstáculo para resolverlo?','¿Cuál es la situación actual y qué has intentado?']},
 business_strategy:{
 ru:['Какое стратегическое решение или деловую ситуацию вы хотите разобрать?','Что мешает принять это решение или продвинуться к нему?','Какие обстоятельства и ограничения бизнеса сейчас особенно важны?'],
 en:['Which strategic decision or business situation would you like to examine?','What is preventing progress on that decision?','Which current business circumstances and constraints matter most?'],
 es:['¿Qué decisión estratégica o situación de negocios te gustaría examinar?','¿Qué te impide avanzar en esa decisión?','¿Qué circunstancias y limitaciones de tu negocio son más importantes?']}
});
export function aliServiceScenario(service,locale='en'){
 if(typeof service!=='string'||!['ru','en','es'].includes(locale)||!Object.hasOwn(SCENARIOS,service))return null;
 const title=service==='business_strategy'?BUSINESS_STRATEGY_PAGE_TITLES[locale]:
  telegramBusinessServiceTitle(service,locale);
 const q=SCENARIOS[service][locale];
 return title&&q?.length===3?{id:service,title,mode:'secretary',flow:'service_intake',
  questions:{goal:q[0],challenge:q[1],situation:q[2]}}:null;
}
export function aliServiceReady(locale,title){
 if(!['ru','en','es'].includes(locale)||typeof title!=='string'||!title.trim()||title.length>160)return null;
 if(locale==='ru')return 'Спасибо. Для запроса по «'+title+'» информации достаточно. Нажмите «Завершить интервью», чтобы проверить резюме. Мастеру ничего не отправится без вашего подтверждения.';
 if(locale==='es')return 'Gracias. Hay información suficiente para tu solicitud de «'+title+'». Elige «Terminar entrevista» para revisar el resumen. Nada se enviará sin tu confirmación.';
 return 'Thank you. There is enough for an initial “'+title+'” enquiry. Choose “Finish interview” to review your summary. Nothing goes to the practitioner without your confirmation.';
}
export function aliServiceFaq(text,locale,service){
 if(!aliServiceScenario(service,locale)||typeof text!=='string')return null;
 if(/цен|стоим|сколько стоит|оплат|price|cost|pay|precio|costo|pago/iu.test(text))
  return locale==='ru'?'Актуальную стоимость выбранного варианта подтвердит мастер до записи; оплата сейчас не оформляется.':
   locale==='es'?'El profesional confirmará el precio antes de reservar; no se realiza ningún cobro ahora.':
   'The practitioner will confirm the price before booking; no payment is being made now.';
 if(/когда|запис|доступн|онлайн|очно|формат|время|book|availab|schedule|online|format|cu[aá]ndo|reserva|disponib|horario/iu.test(text))
  return locale==='ru'?'Формат и доступность уточним со специалистом после заявки; время ещё не забронировано.':
   locale==='es'?'El profesional confirmará la modalidad y disponibilidad; no hay cita reservada.':
   'The practitioner will confirm format and availability; nothing is booked yet.';
 return null;
}
/** Advisory intent grid; signed provider, STOP, safety and consent take precedence. */
export function routeAliEntry({service=null,locale='en',requestedMode=null,stopped=false,safety=false}={}){
 if(stopped)return {kind:'stopped',mode:null};
 if(safety)return {kind:'safety',mode:null};
 if(!['ru','en','es'].includes(locale))return {kind:'unsupported',mode:null};
 if(['secretary_psychologist','free_diagnostic'].includes(requestedMode))
  return {kind:requestedMode,mode:requestedMode,requiresSeparateConsent:true};
 const selected=aliServiceScenario(service,locale);
 return selected?{kind:'service',mode:'secretary',service:selected.id,title:selected.title,locale,flow:selected.flow}:
  {kind:'general',mode:'secretary',locale};
}
