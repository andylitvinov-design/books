'use client'
import {useState} from 'react'
import Link from 'next/link'
import {ArrowRight,ChevronDown,ClipboardList,Compass,FileText,Heart,Lightbulb,PlayCircle,Route,ShieldCheck,Sparkles,Target,TrendingUp,UserRound,Zap} from 'lucide-react'
import {whatsappEnquiryUrl,telegramEnquiryUrlFromWhatsApp} from '@/lib/whatsapp-enquiry'
import css from './dream-path-map.module.css'

// One catalog for the profile; no shadow client account, progress store or paid ledger.
const STEPS=[
 {id:'discover',icon:Compass,
  ru:['Найти свою цель','Понять, где я сейчас и чего хочу','Карта жизни и желаний','Оцените выбранные жизненные и смысловые оси: сейчас и желаемое. Увидите разницу и выберете приоритет.','Открыть колёса жизни','Найти цель с ИИ-коучем','Разговор о желаниях, противоречиях и личных приоритетах.','Расширенный анализ профиля','Персональная карта ответов, смыслов и возможных направлений в текстовом отчёте.','Диагностика ситуации с Андреем','Личный разбор жизненной ситуации, системная карта факторов и 1–2 следующих шага.'],
  en:['Find your goal','Understand your current life and what you want','My life and wishes map','Rate current and desired life areas and meaning axes. See the gaps and choose a priority.','Open my life wheels','Find a goal with AI','Explore wishes, competing priorities and what matters most.','Expanded profile analysis','A tailored written map of your self-ratings, meanings and possible goals.','Personal situation review with Andrey','Explore your situation, influences and next steps together.'],
  es:['Encuentra tu meta','Comprende dónde estás y qué deseas','Mapa de mi vida y deseos','Evalúa tus áreas de vida y ejes de sentido, ahora y deseado.','Abrir mis ruedas','Encontrar una meta con IA','Explora deseos, prioridades y necesidades personales.','Análisis ampliado del perfil','Informe personalizado de respuestas y posibles direcciones.','Revisión personal con Andrey','Explora tu situación y los siguientes pasos.'],
  freeRoute:'vectors'},
 {id:'vision',icon:Heart,
  ru:['Зажечь свою мечту','Придать желанию ясность, смысл и привлекательный образ','Конструктор моей мечты','Ответьте на несколько вопросов о желаемой жизни, личном смысле и признаках успеха.','Начать мини-интервью','Прояснить мечту с ИИ','20 минут вопросов о ценностях, образе будущего и реалистичных критериях.','Персональная мандала мечты','Оригинальный символический образ и карточка личного намерения — без видео.','Образная сессия с Андреем','Направляемое воображение и исследование личного видения, ценностей и внутренних противоречий.'],
  en:['Bring your dream to life','Find clarity, meaning and a vivid image of the future','My dream builder','Answer a few questions about your desired life, meaning and signs of success.','Start a mini interview','Clarify a dream with AI','Explore values, future vision and realistic milestones.','Personal dream mandala','An original symbolic illustration and intention card — not a video.','Guided imagery with Andrey','Explore your vision, values and tensions through guided imagery.'],
  es:['Da vida a tu sueño','Aclara su significado y tu visión','Creador de sueños','Responde preguntas sobre tu vida deseada, tus valores y las señales de éxito.','Empezar entrevista','Aclarar el sueño con IA','Explora valores, visión y criterios realistas.','Mandala personal del sueño','Imagen simbólica original y tarjeta de intención, sin vídeo.','Sesión de imágenes con Andrey','Explora tu visión y tus valores mediante imágenes guiadas.'],
  prompts:{ru:['Как бы выглядел один хороший день из твоего желаемого будущего?','Почему именно это важно тебе?','По какому небольшому признаку поймёшь, что приблизился?'],en:['What would one good day in your desired future look like?','Why does that matter to you?','What small sign would show you are getting closer?'],es:['¿Cómo sería un buen día en tu futuro deseado?','¿Por qué es importante para ti?','¿Qué señal mostraría que te acercas?']}},
 {id:'plan',icon:Route,
  ru:['Построить путь к цели','Превратить желание в последовательность реальных действий','Мой маршрут в Daybook','Составьте ориентир на 90 дней, план недели и одно посильное действие с резервным вариантом.','Открыть планировщик','Создать стратегию с ИИ','Проверка этапов, рисков и трёх уровней действия: минимум, рабочий и максимум.','Дорожная карта на 90 дней','Персональный подробный план с вехами, сроками, рисками и критериями — без видео.','Стратегическая сессия с Андреем','Системное исследование стратегии, возможная расстановка и согласованный план действий.'],
  en:['Build your path','Turn a wish into practical steps','My Daybook route','Set a 90-day direction, a weekly plan and one small action with a fallback.','Open my planner','Plan with an AI coach','Explore stages, risks and minimum/standard/stretch actions.','Personal 90-day roadmap','A detailed plan with milestones, risks and success criteria — not a video.','Strategy session with Andrey','Explore strategies and relationships, then agree on practical actions.'],
  es:['Construye tu camino','Convierte el deseo en pasos reales','Mi ruta en Daybook','Define 90 días, un plan semanal y un pequeño paso de reserva.','Abrir planificador','Planificar con IA','Analiza etapas, riesgos y tres niveles de acción.','Ruta personal de 90 días','Plan detallado con etapas, riesgos y criterios, sin vídeo.','Estrategia con Andrey','Explora opciones sistémicas y crea un plan viable.'],
  freeRoute:'daybook'},
 {id:'resources',icon:Zap,
  ru:['Открыть свои ресурсы','Найти силы и опору для действий','Карта сил и поддержки','Отметьте сильные стороны, успешный опыт, источники поддержки и один полезный ресурс.','Начать карту ресурсов','Открыть силу с ИИ','Вспомнить успешный опыт и найти доступные внутренние и внешние ресурсы.','Видео ресурсной поддержки','Персональные образы и короткие фразы поддержки после выбора нужного ресурса.','Ресурсная сессия с Андреем','Образная и системная работа с личными опорами, поддержкой и ограничениями.'],
  en:['Find your resources','Identify strengths and support for action','My strengths and support map','Note strengths, successes and sources of support, then choose one resource.','Explore my strengths','Find strengths with AI','Reflect on successes and your inner and outer resources.','Personal resource-support video','Gentle personalized imagery and words of support, after selecting your need.','Resource session with Andrey','Explore personal strengths and support through imagery and systemic work.'],
  es:['Descubre tus recursos','Encuentra fuerzas y apoyo','Mapa de recursos','Anota fortalezas, logros y fuentes de apoyo.','Explorar recursos','Fortalezas con IA','Recuerda logros y descubre recursos disponibles.','Vídeo de apoyo personal','Imágenes y mensajes de apoyo para una necesidad definida.','Sesión de recursos con Andrey','Explora apoyos personales y fortalezas con imágenes y trabajo sistémico.'],
  prompts:{ru:['Какая твоя сильная сторона уже помогала тебе раньше?','Кто или что может поддержать тебя сейчас?','Какой маленький способ восстановить силы доступен сегодня?'],en:['Which strength has helped you before?','Who or what supports you now?','What small way to recharge is available today?'],es:['¿Qué fortaleza te ayudó antes?','¿Quién o qué te apoya ahora?','¿Cómo podrías recuperar energías hoy?']}},
 {id:'obstacles',icon:ShieldCheck,
  ru:['Преодолеть препятствия','Исследовать страхи и сомнения без давления','Мягкий разбор WOOP','Уточните желание, результат, главное препятствие и безопасный план «если — то».','Пройти WOOP','Разобрать сомнения с ИИ','Исследование препятствий, убеждений и одного обратимого следующего шага.','Видео эмоциональной поддержки','Спокойные образы и выбранные пользователем поддерживающие фразы — не лечение.','Работа с барьерами с Андреем','Индивидуальная психологическая и образная работа с внутренними конфликтами по согласию.'],
  en:['Work through obstacles','Explore fear and hesitation without pressure','Gentle WOOP reflection','Name your wish, outcome, obstacle and a safe if–then plan.','Start WOOP','Explore doubts with AI','Look at obstacles and one reversible next action.','Emotional support video','Gentle images and approved supportive words, not treatment.','Explore barriers with Andrey','Personal imagery and psychological work with internal conflicts, by consent.'],
  es:['Supera obstáculos','Explora dudas y temores sin presión','Reflexión WOOP','Expresa deseo, resultado, obstáculo y plan si–entonces.','Empezar WOOP','Dudas con IA','Analiza obstáculos y una acción reversible.','Vídeo de apoyo emocional','Imágenes suaves y mensajes elegidos por ti; no es tratamiento.','Barreras con Andrey','Trabajo personal con imágenes y conflictos internos, con consentimiento.'],
  prompts:{ru:['Какого результата ты хочешь добиться?','Что внутри или снаружи чаще всего мешает?','Если это препятствие возникнет, какой безопасный шаг ты выберешь?'],en:['What outcome would you like?','What most often gets in the way?','If that obstacle appears, what safe step could you take?'],es:['¿Qué resultado deseas?','¿Qué suele impedirte avanzar?','Si aparece ese obstáculo, ¿qué paso seguro tomarías?']}},
 {id:'options',icon:Lightbulb,
  ru:['Открыть новые возможности','Посмотреть на ситуацию с разных сторон','Генератор вариантов','Составьте три альтернативы, сравните пользу, риски и выберите небольшой эксперимент.','Найти варианты','Поиск решений с ИИ','20 минут поиска стратегий и оценки последствий альтернатив.','Персональная карта решений','Дерево альтернатив, преимуществ и рисков в виде схемы — не видео.','Новые стратегии с Андреем','Исследование слепых зон, системных влияний и доступных путей.'],
  en:['Open new possibilities','See more than one path forward','Options builder','Consider three alternatives, compare tradeoffs and choose a small experiment.','Find alternatives','Find solutions with AI','Explore options, tradeoffs and realistic tests.','Personal decision map','A visual tree of alternatives, benefits and risks — not a video.','New strategies with Andrey','Explore blind spots, systemic influences and new paths.'],
  es:['Descubre posibilidades','Considera caminos alternativos','Generador de opciones','Compara tres alternativas y elige un pequeño experimento.','Buscar alternativas','Soluciones con IA','Explora opciones, costes y pasos de prueba.','Mapa personal de decisiones','Árbol visual de alternativas y riesgos, no vídeo.','Nuevas estrategias con Andrey','Explora puntos ciegos e influencias sistémicas.'],
  prompts:{ru:['Какую ситуацию хочется решить иначе?','Какой ещё вариант можно попробовать, пусть небольшой?','По какому признаку поймёшь, что вариант подходит?'],en:['What situation needs a new approach?','What different, small option could you try?','How would you know the option works?'],es:['¿Qué situación necesita otra perspectiva?','¿Qué otra opción pequeña probarías?','¿Cómo sabrás si funciona?']}},
 {id:'progress',icon:TrendingUp,
  ru:['Ускорить движение','Увидеть прогресс и сохранить устойчивый темп','Мой дневник успеха','Отмечайте действия, открытия и препятствия; раз в неделю пересматривайте следующий шаг.','Открыть Daybook','Разобрать прогресс с ИИ','Сопоставить запланированные и реальные действия без самокритики.','Мотивационное видео','Видео с подтверждёнными достижениями и личными поддерживающими фразами.','Интеграция с Андреем','Обзор прогресса, работа с затруднениями и корректировка стратегии.'],
  en:['Build momentum','Notice progress and keep a sustainable pace','My progress journal','Track actions and discoveries, then review your next step each week.','Open Daybook','Review progress with AI','Compare plans with real actions, without blame.','Personal motivation video','A video of confirmed achievements and your chosen encouraging phrases.','Integration with Andrey','Review progress and refine your next strategy.'],
  es:['Mantén el impulso','Observa avances y un ritmo sostenible','Mi diario de avances','Anota acciones y revisa la próxima semana.','Abrir Daybook','Revisar avances con IA','Compara lo planeado con tus acciones sin culpas.','Vídeo de motivación','Vídeo de logros confirmados y frases de apoyo.','Integración con Andrey','Revisa los avances y ajusta tu estrategia.'],
  freeRoute:'daybook'}
]
const UI={
 ru:{title:'Моя карта пути к мечте',lead:'Семь направлений. Начните с любого, раскройте инструменты и выберите подходящую поддержку.',free:'Самостоятельно',coach:'С ИИ-коучем',personal:'Персональный материал',human:'Лично с Андреем',none:'Бесплатно',duration:'до 20 минут',session:'60 минут · €100',ask:'Запросить заказ',start:'Открыть инструмент',coachStart:'Открыть ИИ-коуча',contact:'Запросить личную сессию',expand:'Посмотреть варианты',close:'Свернуть',result:'Что внутри',report:'Покупка и списание XP для этого формата ещё не подключены. Можно отправить запрос для согласования.',aiNote:'100 XP — проектный тариф. Открывается существующий коучинг; автоматического списания здесь нет.',humanNote:'1000 XP / €100 — цена встречи. Запрос не означает оплату или подтверждённую запись.',need:'Ответьте на несколько вопросов. Черновик остаётся на этом экране, пока вы не решите его скопировать.',next:'Следующий вопрос',finish:'Посмотреть результат',again:'Начать заново',copy:'Скопировать мои ответы',save:'Открыть Daybook для сохранения',quizTitle:'Короткая самостоятельная практика',empty:'Можно пропустить вопрос. Не вводите сюда конфиденциальные сведения.',question:'Ваш ответ',done:'Ваш черновик',copied:'Можно скопировать текст и сохранить его в Daybook. Ничего не отправляется автоматически.',view:'Открыть',request:'Запросить',whatsapp:'Отправить запрос в WhatsApp',telegram:'Запросить через Telegram',other:'Выберите канал обращения. Сообщение содержит только название услуги и цену, не ваши ответы.',zero:'Бесплатный инструмент',priceNote:'Форматы и цены: личная сессия €100/1000 XP; стоимость остальных XP-продуктов пока не является активным платежом.',available:'Уже доступно',requestOnly:'По запросу'},
 en:{title:'My journey to a dream',lead:'Seven directions. Begin anywhere, expand each step and choose what supports you.',free:'Self-guided',coach:'AI coach',personal:'Personalized material',human:'With Andrey',none:'Free',duration:'up to 20 minutes',session:'60 min · €100',ask:'Request this',start:'Open tool',coachStart:'Open AI coach',contact:'Request personal session',expand:'Explore offers',close:'Collapse',result:'What is included',report:'XP checkout for this product is not active yet. You can request details.',aiNote:'100 XP is a proposed price. Existing coaching opens without a charge here.',humanNote:'1000 XP / €100 is the session price. A request is not a booking or payment.',need:'Answer a few prompts. Responses remain on this screen until you choose to copy them.',next:'Next question',finish:'View summary',again:'Start again',copy:'Copy my answers',save:'Open Daybook to save',quizTitle:'Short self-guided reflection',empty:'You may skip any question. Avoid entering sensitive information.',question:'Your answer',done:'Your draft',copied:'Copy your text into Daybook if you wish. Nothing is sent automatically.',view:'Open',request:'Request',whatsapp:'Request via WhatsApp',telegram:'Request via Telegram',other:'Choose a contact channel. Only product name and price are included, not your answers.',zero:'Free tool',priceNote:'Prices: personal session €100/1000 XP; other XP charges are not yet live.',available:'Available',requestOnly:'Request only'},
 es:{title:'Mi mapa hacia el sueño',lead:'Siete direcciones. Elige una etapa, ábrela y selecciona el apoyo adecuado.',free:'Por mi cuenta',coach:'Coach IA',personal:'Material personal',human:'Con Andrey',none:'Gratis',duration:'hasta 20 minutos',session:'60 min · €100',ask:'Solicitar',start:'Abrir herramienta',coachStart:'Abrir coach IA',contact:'Solicitar sesión',expand:'Ver opciones',close:'Cerrar',result:'Qué incluye',report:'El pago con XP aún no está activo. Puedes solicitar detalles.',aiNote:'100 XP es un precio propuesto. Abrir el coach aquí no cobra créditos.',humanNote:'1000 XP / €100 es la tarifa. Solicitar no reserva ni paga.',need:'Responde unas preguntas. Tus respuestas quedan en esta pantalla hasta que las copies.',next:'Siguiente pregunta',finish:'Ver resumen',again:'Empezar de nuevo',copy:'Copiar respuestas',save:'Abrir Daybook para guardar',quizTitle:'Reflexión guiada breve',empty:'Puedes omitir preguntas. Evita datos confidenciales.',question:'Tu respuesta',done:'Tu borrador',copied:'Puedes pegarlo en Daybook. No se envía automáticamente.',view:'Abrir',request:'Solicitar',whatsapp:'Solicitar por WhatsApp',telegram:'Solicitar por Telegram',other:'El mensaje incluye solo el nombre y precio del producto.',zero:'Herramienta gratuita',priceNote:'Sesión individual: €100/1000 XP. Los demás cargos XP aún no están disponibles.',available:'Disponible',requestOnly:'Por solicitud'}
}
function Item({step,locale,ui}){
 const [open,setOpen]=useState(false)
 const [form,setForm]=useState(false)
 const [index,setIndex]=useState(0)
 const [answers,setAnswers]=useState({})
 const [draft,setDraft]=useState('')
 const [showRequest,setShowRequest]=useState(null)
 const copy=step[locale]
 const Icon=step.icon
 const root='/'+(locale==='es'?'en':locale)
 const localRoot='/'+locale
 const freeHref=step.freeRoute==='vectors'?localRoot+'/development-vectors':root+'/app/daybook'
 const prompts=step.prompts?.[locale]||[]
 const lines=prompts.map((question,i)=>question+'\n'+(answers[i]||'—')).join('\n\n')
 const doCopy=()=>{ if(typeof navigator!=='undefined'&&navigator.clipboard)navigator.clipboard.writeText(lines).catch(()=>{}) }
 const inquiry=(kind)=>{
  const label=kind==='personal'?copy[7]:copy[9]
  const price=kind==='personal'?'250 XP':'1000 XP / €100 · 60 min'
  return whatsappEnquiryUrl({locale,service:label,request:locale==='ru'?'Хочу согласовать заказ по программе «7 шагов к мечте».':locale==='es'?'Quisiera solicitar este servicio.':'I would like to request this Dream Path service.',option:price,topic:copy[0],pagePath:localRoot+'/services'})
 }
 const whatsapp=showRequest?inquiry(showRequest):''
 return <article className={css.step} data-dream-step={step.id}>
  <button type="button" className={css.stepHead} aria-expanded={open} onClick={()=>setOpen(x=>!x)}>
   <span className={css.stepIndex}>{String(STEPS.indexOf(step)+1).padStart(2,'0')}</span>
   <span className={css.stepSymbol}><Icon size={24} strokeWidth={1.7} aria-hidden="true"/></span>
   <span className={css.stepText}><strong>{copy[0]}</strong><small>{copy[1]}</small></span>
   <ChevronDown size={22} className={open?css.chevronOpen:css.chevron} aria-hidden="true"/>
  </button>
  {open&&<div className={css.inside} data-dream-offers={step.id}>
   <div className={css.offers}>
    {[
     {name:copy[2],detail:copy[3],price:'0 XP',mode:ui.free,icon:ClipboardList,kind:'free'},
     {name:copy[5],detail:copy[6],price:'100 XP',mode:ui.coach,icon:PlayCircle,kind:'coach'},
     {name:copy[7],detail:copy[8],price:'250 XP',mode:ui.personal,icon:FileText,kind:'personal'},
     {name:copy[9],detail:copy[10],price:'1000 XP',mode:ui.human,icon:UserRound,kind:'human'}
    ].map((o,i)=>{
     const OfferIcon=o.icon
     return <div key={o.kind} className={css.offer} data-dream-offer={o.kind}>
      <div className={css.offerTop}><span className={css.offerKind}><OfferIcon size={17} aria-hidden="true"/>{i+1}. {o.mode}</span><strong className={css.price}>{o.price}</strong></div>
      <h4>{o.name}</h4><p>{o.detail}</p>
      {o.kind==='human'&&<small className={css.humanDuration}>{ui.session}</small>}
      {o.kind==='free'&&(step.freeRoute
       ?<Link prefetch={false} className={css.action} href={freeHref}>{copy[4]}<ArrowRight size={17}/></Link>
       :<button className={css.action} type="button" onClick={()=>{setForm(x=>!x);setIndex(0)}}>{copy[4]}<ArrowRight size={17}/></button>)}
      {o.kind==='coach'&&<><Link prefetch={false} className={css.action} href={localRoot+'/my-coach'}>{ui.coachStart}<ArrowRight size={17}/></Link><small className={css.notice}>{ui.aiNote}</small></>}
      {(o.kind==='personal'||o.kind==='human')&&<><button type="button" className={css.action} onClick={()=>setShowRequest(v=>v===o.kind?null:o.kind)}>{o.kind==='human'?ui.contact:ui.ask}<ArrowRight size={17}/></button><small className={css.notice}>{o.kind==='human'?ui.humanNote:ui.report}</small></>}
     </div>
    })}
   </div>
   {form&&prompts.length>0&&<div className={css.guide} data-dream-free-guide={step.id}>
     <h4>{ui.quizTitle}</h4>
     <p>{ui.need}</p>
     {index<prompts.length?<div><label className={css.question} htmlFor={'dream-answer-'+step.id}>{index+1}/{prompts.length} · {prompts[index]}</label>
       <textarea id={'dream-answer-'+step.id} value={draft} maxLength={600} rows={3} onChange={e=>setDraft(e.target.value)} placeholder={ui.question}/>
       <div className={css.guideActions}><span>{ui.empty}</span><button type="button" onClick={()=>{setAnswers(prev=>({...prev,[index]:draft.trim()}));setIndex(n=>n+1);setDraft('')}}>{index===prompts.length-1?ui.finish:ui.next}<ArrowRight size={16}/></button></div>
       </div>:<div><strong>{ui.done}</strong><pre className={css.answerText}>{lines}</pre><p>{ui.copied}</p><div className={css.guideActions}><button type="button" onClick={doCopy}>{ui.copy}</button><Link href={root+'/app/daybook'}>{ui.save}</Link><button type="button" onClick={()=>{setIndex(0);setAnswers({});setDraft('')}}>{ui.again}</button></div></div>}
   </div>}
   {showRequest&&<div className={css.contact} data-dream-order-channel={showRequest}>
     <p>{ui.other}</p><div className={css.contactLinks}>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer">{ui.whatsapp}<ArrowRight size={16}/></a>
      <a href={telegramEnquiryUrlFromWhatsApp(whatsapp)} target="_blank" rel="noopener noreferrer">{ui.telegram}<ArrowRight size={16}/></a>
     </div>
   </div>}
  </div>}
 </article>
}
export default function DreamPathMap({locale='en'}){
 const language=Object.hasOwn(UI,locale)?locale:'en'
 const ui=UI[language]
 return <section className={css.map} data-dream-path-map lang={language} aria-labelledby="dream-path-heading">
   <header className={css.heading}><div><span className={css.eyebrow}><Sparkles size={16} aria-hidden="true"/>HOLISTIC HOUSE · DREAM PATH</span><h2 id="dream-path-heading">{ui.title}</h2><p>{ui.lead}</p></div><Target size={36} strokeWidth={1.3} aria-hidden="true" /></header>
   <div className={css.timeline}>{STEPS.map(step=><Item key={step.id} step={step} locale={language} ui={ui}/>)}</div>
   <p className={css.footer}>{ui.priceNote}</p>
 </section>
}
