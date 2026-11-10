// Coaching Brain: deterministic, auditable decision layer. No provider calls or private storage.
// The model may propose wording; the controller alone owns stage and safety decisions.
export const BRAIN_VERSION='hh-coaching-brain-v1';
export const STAGES=Object.freeze(['goal','reality','resources','options','action','review']);
export const METHODS=Object.freeze(['grow','woop','oskar','solution_focused','motivational']);
const danger=/(?:suicid|kill myself|self.harm|immediate danger|покончить с собой|самоубийств|убить себя|суицид|quiero morir|suicid|hacerme daño)/iu;
const localeOf=value=>['en','ru','es'].includes(value)?value:'en';
const bounded=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const prompts={
 en:{goal:'What would you like to be different after this conversation?',reality:'What is happening now? Can you give one concrete example?',resources:'What has helped you before, even a little?',options:'What possible ways forward do you see?',action:'Which small step would you choose, and when?',review:'What have you decided, and what remains open?',risk:'I am concerned about your immediate safety. Please contact local emergency services or someone you trust now. We can pause coaching.',unclear:'Could you tell me a little more about what matters most here?'},
 ru:{goal:'Что вы хотели бы изменить в результате нашего разговора?',reality:'Что происходит сейчас? Приведите один конкретный пример.',resources:'Что уже помогало вам хотя бы немного?',options:'Какие возможные пути вы видите?',action:'Какой небольшой шаг вы сами выбираете и когда?',review:'Какое решение вы приняли и что пока осталось открытым?',risk:'Сейчас важнее ваша безопасность. Пожалуйста, обратитесь в экстренную службу или к человеку, которому доверяете. Мы можем приостановить коучинг.',unclear:'Расскажите чуть подробнее: что здесь для вас самое важное?'},
 es:{goal:'¿Qué te gustaría cambiar con esta conversación?',reality:'¿Qué está ocurriendo ahora? ¿Puedes dar un ejemplo concreto?',resources:'¿Qué te ha ayudado antes, aunque sea un poco?',options:'¿Qué caminos posibles ves?',action:'¿Qué pequeño paso eliges tú y cuándo?',review:'¿Qué has decidido y qué queda abierto?',risk:'Tu seguridad es lo primero. Contacta con los servicios de emergencia o alguien de confianza. Podemos pausar el coaching.',unclear:'¿Puedes contarme un poco más sobre lo que más importa aquí?'}
};
export function selectCoachingMethod({topic='',goal='',resistance=false,preferred=''}={}){
 if(METHODS.includes(preferred))return {method:preferred,reason:'client_preference'};
 const input=(bounded(topic,100)+' '+bounded(goal,300)).toLowerCase();
 if(resistance||/боюсь|страшно|не могу начать|afraid|hesitat|resist|miedo|temor/i.test(input))
   return {method:'motivational',reason:'ambivalence'};
 if(/привыч|habit|hábito|если.*то|if.then/i.test(input))return {method:'woop',reason:'implementation_intention'};
 if(/выгора|ресурс|energy|burnout|agotad|resource/i.test(input))return {method:'oskar',reason:'resource_focus'};
 if(/отношен|relationship|relaci|конфликт|conflict/i.test(input))return {method:'solution_focused',reason:'relational_options'};
 return {method:'grow',reason:'general_goal'};
}
export function nextCoachingTurn(input={}){
 const locale=localeOf(input.locale),p=prompts[locale];
 const stage=STAGES.includes(input.stage)?input.stage:'goal';
 const text=bounded(input.message,2000);
 const risk=danger.test(text);
 if(risk)return {version:BRAIN_VERSION,locale,stage,method:null,status:'safety_interrupt',reply:p.risk,nextStage:stage,reason:'explicit_safety_signal'};
 const chosen=selectCoachingMethod({topic:input.topic,goal:input.goal,resistance:input.resistance,preferred:input.preferredMethod});
 const hasContent=text.length>=3;
 const nextStage=hasContent?STAGES[Math.min(STAGES.indexOf(stage)+1,STAGES.length-1)]:stage;
 return {version:BRAIN_VERSION,locale,stage,method:chosen.method,methodReason:chosen.reason,
  status:hasContent?'continue':'clarify',reply:hasContent?p[nextStage]:p.unclear,
  nextStage,reason:hasContent?'user_answer_received':'insufficient_context',
  // No client facts, diagnoses, inferred commitments or fabricated metrics.
  evidence:hasContent?[{kind:'client_statement',source:'current_turn',confirmed:false}]:[]};
}
export function validateBrainSuggestion(value,controller){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 if(controller?.status==='safety_interrupt')return null;
 if(!STAGES.includes(value.stage)||value.stage!==controller?.nextStage)return null;
 if(typeof value.reply!=='string'||value.reply.trim().length<8||value.reply.length>650)return null;
 if(/(?:diagnos|диагноз|диагност|garantiz|guarantee|гарантир)/i.test(value.reply))return null;
 return {stage:controller.nextStage,reply:value.reply.trim(),method:controller.method};
}
