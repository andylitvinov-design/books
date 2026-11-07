// Pure, reusable Telegram questionnaire policy. Never infer a clinical diagnosis.
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS } from '../assessments/definitions.js'
import { hasTraumaAdministration } from '../assessments/trauma-administration.js'
import { chatPermittedOptions } from '../assessments/test-chat-flow.mjs'

const LANGS = new Set(['ru','en','es'])
export const quizLocale = value => LANGS.has(value) ? value : 'en'
export const QUIZ_PAGE_SIZE = 5
export const QUIZ_TTL_DAYS = 7
const COPY = {
  ru: {
    choose: 'Какой тест вы хотите пройти? Выберите один.',
    search: 'Ещё тесты',previous: 'Предыдущие',
    consent: 'Это добровольный тест самонаблюдения, не медицинская диагностика. Ваши ответы останутся в защищённой системе Holistic House до 7 дней и будут показаны в вашей переписке Telegram. Telegram хранит отправленные сообщения. Возраст 18+. Начать?',
    agree: '✅ Согласен(на), начать',stop: 'Остановить и удалить',menu: 'Другой тест',
    question:'Вопрос',accepted:'Спасибо. Принято.',savedAnswer:'Ваш ответ',back:'Изменить предыдущий ответ',
    blocked:'Этот вопрос уже изменился. Продолжим с текущего.',end:'Тест завершён. Результат носит информационный характер и не является диагнозом.',
    score:'Показатели',done:'Показать результат',deleted:'Тест остановлен. Сохранённые здесь ответы удалены. Сообщения в Telegram можно удалить в приложении.',
    unavailable:'Этот тест недоступен в Telegram. Откройте доступные анкеты на сайте.',
    paused:'Отправьте /tests, чтобы выбрать тест.',waiting:'Откройте /tests, чтобы продолжить.',
    danger:'Ваша безопасность важна. Holistic House не является экстренной службой, и никто не отслеживает ответы в реальном времени. Если есть непосредственная опасность, обратитесь в экстренную службу. В Канаде или США можно позвонить или написать 988. По возможности побудьте с человеком, которому доверяете.',
    acknowledge:'Понятно, продолжить',noResults:'Результат временно недоступен.',
    nextChoices:'Ещё варианты',prevChoices:'Предыдущие варианты',
    rights:'Для этой методики нужны дополнительные инструкции. Откройте защищённую анкету на сайте.',
  },
  en: {
    choose:'Which test would you like to take? Choose one.',search:'More tests',previous:'Earlier tests',
    consent:'This is an optional self-reflection questionnaire, not a diagnosis. Holistic House stores your answers securely for up to 7 days, while Telegram retains delivered chat messages. Age 18+ required. Start?',
    agree:'✅ I agree, start',stop:'Stop and delete',menu:'Choose another test',
    question:'Question',accepted:'Thank you. Saved.',savedAnswer:'Your answer',back:'Change previous answer',
    blocked:'That question has already changed. Here is your current question.',
    end:'Test complete. These results are for self-reflection, not diagnosis.',
    score:'Measures',done:'View result',deleted:'The test was stopped and saved answers deleted. You can separately delete Telegram messages in the app.',
    unavailable:'This test is not available in Telegram. Use the approved questionnaires on the website.',
    paused:'Send /tests to choose a test.',waiting:'Use /tests to continue.',
    danger:'Your safety matters. Holistic House is not an emergency service and nobody monitors answers in real time. If you are in immediate danger, contact emergency services. In Canada or the U.S., call or text 988. If possible, stay with someone you trust.',
    acknowledge:'I understand, continue',noResults:'Your result is temporarily unavailable.',
    nextChoices:'More choices',prevChoices:'Earlier choices',
    rights:'This instrument needs extra instructions. Open the protected questionnaire on the website.',
  },
  es: {
    choose:'¿Qué prueba quieres hacer? Elige una.',search:'Más pruebas',previous:'Pruebas anteriores',
    consent:'Este es un cuestionario voluntario de autoobservación, no un diagnóstico. Holistic House guarda tus respuestas de forma segura hasta 7 días; Telegram conserva los mensajes enviados. Se requiere edad de 18+. ¿Empezar?',
    agree:'✅ Acepto, empezar',stop:'Parar y eliminar',menu:'Elegir otra prueba',
    question:'Pregunta',accepted:'Gracias. Guardado.',savedAnswer:'Tu respuesta',back:'Cambiar respuesta anterior',
    blocked:'La pregunta cambió. Aquí está la pregunta actual.',end:'Prueba terminada. Los resultados no constituyen un diagnóstico.',
    score:'Indicadores',done:'Ver resultado',deleted:'La prueba se detuvo y se borraron las respuestas guardadas. Puedes borrar los mensajes de Telegram por separado.',
    unavailable:'Esta prueba no está disponible en Telegram. Abre los cuestionarios autorizados del sitio.',
    paused:'Envía /tests para elegir una prueba.',waiting:'Escribe /tests para continuar.',
    danger:'Tu seguridad importa. Holistic House no es un servicio de emergencia y nadie supervisa estas respuestas en tiempo real. En peligro inmediato, contacta con los servicios de emergencia o una persona de confianza.',
    acknowledge:'Entiendo, continuar',noResults:'Resultado no disponible temporalmente.',
    nextChoices:'Más opciones',prevChoices:'Opciones anteriores',
    rights:'Este instrumento requiere instrucciones adicionales. Abre el cuestionario protegido en el sitio.',
  },
}
export const quizCopy = locale => COPY[quizLocale(locale)]

function approvedDefinition(entry, locale) {
  const versions = ASSESSMENT_DEFINITIONS.filter(d=>d.key===entry.key && d.version===entry.version)
  return versions.find(d=>d.instrumentLocale===(locale==='ru'?'ru':'en'))
    || versions.find(d=>d.instrumentLocale==='en') || versions[0] || null
}
export function subscriberQuizCatalog(locale='en') {
  const approved = MONITORING_CATALOG.filter(x=>
    x.startable===true && x.rightsStatus==='cleared' && x.guestEligible===true &&
    x.key!=='phq-9')
  return approved.map(item=>({item,definition:approvedDefinition(item,quizLocale(locale))}))
    .filter(x=>x.definition && !hasTraumaAdministration(x.definition) &&
      x.definition.questions?.length>0 && x.definition.questions.length<=200 &&
      x.definition.questions.every(q=>typeof q.text==='string' && q.text.length<=3600))
}
export function parseSubscriberQuizCallback(input) {
  if(typeof input!=='string'||input.length>64)return null
  if(input==='hhq:x')return {type:'cancel'}
  if(input==='hhq:n')return {type:'new'}
  if(input==='hhq:r')return {type:'result'}
  const menu=/^hhq:m:(\d{1,4})$/.exec(input)
  if(menu)return {type:'menu',page:Number(menu[1])}
  const select=/^hhq:s:([a-z][a-z0-9-]{0,48})$/.exec(input)
  if(select)return {type:'select',key:select[1]}
  const agree=/^hhq:g:([a-z][a-z0-9-]{0,48})$/.exec(input)
  if(agree)return {type:'agree',key:agree[1]}
  const pair=/^hhq:(a|p):(\d{1,7}):(\d{1,3})$/.exec(input)
  if(pair){const revision=Number(pair[2]),value=Number(pair[3]);return pair[1]==='a'
    ?{type:'answer',revision,value}:{type:'options',revision,page:value}}
  const rev=/^hhq:(b|k):(\d{1,7})$/.exec(input)
  if(rev)return {type:rev[1]==='b'?'back':'ack',revision:Number(rev[2])}
  return null
}
const btn=(text,callback_data)=>({text:String(text).slice(0,63),callback_data})
const keyboard=rows=>({inline_keyboard:rows})
export function subscriberQuizMenu(locale='en',page=0) {
  const lang=quizLocale(locale),list=subscriberQuizCatalog(lang),t=quizCopy(lang)
  const maxPage=Math.max(0,Math.ceil(list.length/QUIZ_PAGE_SIZE)-1)
  const p=Math.max(0,Math.min(maxPage,Number.isInteger(page)?page:0))
  const rows=list.slice(p*QUIZ_PAGE_SIZE,(p+1)*QUIZ_PAGE_SIZE)
    .map(x=>[btn(x.item.title?.[lang]||x.item.title?.en||x.definition.title,
      'hhq:s:'+x.item.key)])
  const nav=[]
  if(p>0)nav.push(btn('‹ '+t.previous,'hhq:m:'+(p-1)))
  if(p<maxPage)nav.push(btn(t.search+' ›','hhq:m:'+(p+1)))
  if(nav.length)rows.push(nav)
  return {text:t.choose+'  ('+(p+1)+'/'+(maxPage+1)+')',keyboard:keyboard(rows)}
}
export function subscriberQuizConsent(definition,locale='en') {
  const lang=quizLocale(locale),t=quizCopy(lang)
  const title=MONITORING_CATALOG.find(x=>x.key===definition?.key)?.title?.[lang]||definition?.title||''
  const notice=[definition?.instructions,definition?.eligibilityText,definition?.safetyText,
    definition?.printedScoringText,definition?.requiredSiteAttribution]
    .filter(v=>typeof v==='string'&&v.trim()).join('\n')
  const text=[title,t.consent,notice].filter(Boolean).join('\n\n')
  if(text.length>3750)return {text:t.rights+' https://holistichouse.vercel.app/'+(lang==='es'?'en':lang)+'/tests'}
  return {text,keyboard:keyboard([
    [btn(t.agree,'hhq:g:'+definition.key)],[btn(t.stop,'hhq:x')]
  ])}
}
export function subscriberQuizQuestion(definition,locale='en',progress=0,revision=0,answers={},optionPage=0,ack='') {
  const t=quizCopy(locale),question=definition?.questions?.[progress]
  if(!question)return null
  const options=chatPermittedOptions(definition,question,answers)
  if(!options.length)return null
  const p=Math.max(0,Math.min(Math.ceil(options.length/10)-1,Number.isInteger(optionPage)?optionPage:0))
  const rows=[]
  for(let i=p*10;i<Math.min(options.length,(p+1)*10);i+=2) {
    const pair=options.slice(i,i+2).map(opt=>{
      const text=opt.label===String(opt.value)?opt.label:
        opt.value+' · '+opt.label
      return btn((definition.key==='asrs-6' && opt.value>=question.shadedFrom?'▧ ':'')+text,
        'hhq:a:'+revision+':'+opt.value)
    })
    rows.push(pair)
  }
  const nav=[]
  if(p>0)nav.push(btn('‹ '+t.prevChoices,'hhq:p:'+revision+':'+(p-1)))
  if((p+1)*10<options.length)nav.push(btn(t.nextChoices+' ›','hhq:p:'+revision+':'+(p+1)))
  if(nav.length)rows.push(nav)
  if(progress>0)rows.push([btn('‹ '+t.back,'hhq:b:'+revision)])
  rows.push([btn(t.stop,'hhq:x')])
  const text=[ack,t.question+' '+(progress+1)+'/'+definition.questions.length,question.text,
    question.anchors?.length?'('+question.anchors[0]+' — '+question.anchors.at(-1)+')':null]
    .filter(Boolean).join('\n\n')
  if(text.length>3800)return {text:t.rights+' https://holistichouse.vercel.app/'+(quizLocale(locale)==='es'?'en':quizLocale(locale))+'/tests'}
  return {text,keyboard:keyboard(rows)}
}
export function subscriberQuizSafety(locale,revision) {
  const t=quizCopy(locale)
  return {text:t.danger,keyboard:keyboard([[btn(t.acknowledge,'hhq:k:'+revision)],[btn(t.stop,'hhq:x')]])}
}
export function subscriberQuizResult(definition,result,locale) {
  const t=quizCopy(locale)
  const lines=Array.isArray(result?.dimensions)?result.dimensions.slice(0,8).map(d=>
    String(d.sourceConstruct||d.key).slice(0,110)+': '+d.value+
    (Number.isFinite(d.max)?' / '+d.max:'')):[]
  const note=(result?.dimensions?.length||0)>8?'…':null
  return {text:[t.end,lines.length?t.score+':\n'+lines.join('\n'):null,note].filter(Boolean).join('\n\n'),
    keyboard:keyboard([[btn(t.menu,'hhq:n')],[btn(t.stop,'hhq:x')]])}
}
