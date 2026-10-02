import {deepFreeze} from '../../lib/assessments/contracts.js'
export const CURRENT_STATE_EN_V1 = deepFreeze({
  key:'hh-current-state',version:'v1',instrumentLocale:'en',translationVersion:'hh-en-v1',timeframe:'right-now',scoringKey:'raw-state',scoringVersion:'v1',resultVersion:'v1',title:'Current state',
  source:{title:'Holistic House Current State',status:'non-diagnostic-not-validated-clinical-scale',reviewedAt:'2026-10-02'},
  questions:[
    {id:'state.problem_intensity',label:'Difficulty',text:'How strong is your main difficulty right now?',type:'integer',min:0,max:10,required:true,anchors:['None','Very strong'],direction:'lower-reported-difficulty',dimensionClass:'state'},
    {id:'state.resource',label:'Resource',text:'How much energy and inner support do you feel right now?',type:'integer',min:0,max:10,required:true,anchors:['None','A great deal'],direction:'higher-reported-resource',dimensionClass:'state'},
    {id:'state.tension',label:'Inner tension',text:'How much inner tension do you feel right now?',type:'integer',min:0,max:10,required:true,anchors:['None','Very strong'],direction:'lower-reported-tension',dimensionClass:'state'},
    {id:'state.fatigue',label:'Fatigue',text:'How tired do you feel right now?',type:'integer',min:0,max:10,required:true,anchors:['Not tired','Very tired'],direction:'lower-reported-fatigue',dimensionClass:'state'},
    {id:'state.life_impact',label:'Impact on daily life',text:'How much is your current difficulty interfering with what you want to do?',type:'integer',min:0,max:10,required:true,anchors:['Not at all','Very much'],direction:'lower-reported-interference',dimensionClass:'state'}
  ],optionalContext:[{id:'current_focus',maxLength:1000},{id:'what_helps',maxLength:1000},{id:'note',maxLength:1000}],suggestedRepeatDays:7,
  id:'a4e5e3b7-0b2f-56b6-ae91-44bc577a6c06',contentHash:'sha256:7576d54f4e1f920b051628777b6732f33e6f2a6dac0669c9930a0f9c326312fc'
})
export const CURRENT_STATE_RU_V1 = deepFreeze({
  key:'hh-current-state',version:'v1',instrumentLocale:'ru',translationVersion:'hh-ru-v1',timeframe:'right-now',scoringKey:'raw-state',scoringVersion:'v1',resultVersion:'v1',title:'Моё состояние',
  source:{title:'Holistic House Current State',status:'non-diagnostic-not-validated-clinical-scale',reviewedAt:'2026-10-02'},
  questions:[
    {id:'state.problem_intensity',label:'Трудность',text:'Насколько сильно сейчас ощущается ваша основная трудность?',type:'integer',min:0,max:10,required:true,anchors:['Нет','Очень сильно'],direction:'lower-reported-difficulty',dimensionClass:'state'},
    {id:'state.resource',label:'Ресурс',text:'Сколько сил и внутренней опоры вы сейчас ощущаете?',type:'integer',min:0,max:10,required:true,anchors:['Нет','Очень много'],direction:'higher-reported-resource',dimensionClass:'state'},
    {id:'state.tension',label:'Напряжение',text:'Насколько сильное внутреннее напряжение вы сейчас ощущаете?',type:'integer',min:0,max:10,required:true,anchors:['Нет','Очень сильно'],direction:'lower-reported-tension',dimensionClass:'state'},
    {id:'state.fatigue',label:'Усталость',text:'Насколько сильную усталость вы сейчас ощущаете?',type:'integer',min:0,max:10,required:true,anchors:['Не чувствую','Очень сильная'],direction:'lower-reported-fatigue',dimensionClass:'state'},
    {id:'state.life_impact',label:'Влияние на жизнь',text:'Насколько текущая трудность мешает вам делать то, что вы хотите?',type:'integer',min:0,max:10,required:true,anchors:['Совсем не мешает','Очень мешает'],direction:'lower-reported-interference',dimensionClass:'state'}
  ],optionalContext:[{id:'current_focus',maxLength:1000},{id:'what_helps',maxLength:1000},{id:'note',maxLength:1000}],suggestedRepeatDays:7,
  id:'89938340-0775-59a2-864e-11228113f0db',contentHash:'sha256:8f317095b763de74571f51a97bb9dbe6972cc77442c95bb7267318aa4f6b00ac'
})
// Compatibility export only; each run has a real instrument locale.
export const CURRENT_STATE_V1=CURRENT_STATE_EN_V1
