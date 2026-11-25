import { deepFreeze } from './contracts.js'
import { traumaDimensionShape } from './trauma-administration.js'
export function traumaScaleGuide(definition, catalog, language='en') {
  const ru=language==='ru'
  const note=ru?'Суммы оригинальных английских вопросов. Без диагностических порогов, норм, категорий тяжести и автоматического назначения упражнений. Русский отчёт не является валидированной русской адаптацией.':'Sums of original English items. No diagnostic cutoffs, norms, severity categories or automatic exercise prescriptions. Translated report text is not a validated questionnaire adaptation.'
  const followUp=ru?'Обсудите беспокоящие симптомы и их влияние на жизнь с квалифицированным специалистом независимо от балла.':'Discuss concerning symptoms and their impact with a qualified professional regardless of the score.'
  return deepFreeze({key:definition.key,version:definition.version,language,instrumentLanguage:'en',title:catalog.title[language]||definition.title,purpose:catalog.description[language]||catalog.description.en,
    timeframe:ru?'Следуйте периоду в каждом разделе':'Follow the timeframe in each section',sourceTitle:definition.source.title,sourceUrl:definition.source.url,kind:'professional',questions:definition.questions.length,suggestedRepeatDays:null,measurementAxes:[],skillAxes:[],documentPath:`docs/assessments/guides/${definition.key}.md`,disclaimer:note,
    scales:traumaDimensionShape(definition).map(d=>({key:d.key,label:d.sourceConstruct,axis:null,axisLabel:ru?'Симптомы после травматического опыта':'Trauma-related symptoms',type:'symptom_sum',min:d.min,max:d.max,direction:d.direction,timeframe:d.timeframe,watch:followUp,action:followUp,skill:null,canChooseSkill:false,bands:{basis:'descriptive',rows:[],note}}))})
}
