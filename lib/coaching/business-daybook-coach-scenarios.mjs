// Eight individually authored dialogue plans linked to current Business Daybook.
// Historical four-topic IDs and self-guided practice records are not reused.
import {BUSINESS_SYLLABUS} from '../app/business-daybook.mjs'
const authored=[
 [
  [
   "baseline",
   "Business baseline",
   "Исходная ситуация",
   "Situación de partida",
   "Which verified business facts describe your current position?",
   "Какие проверенные факты описывают текущее положение бизнеса?",
   "¿Qué hechos verificados describen tu situación empresarial?"
  ],
  [
   "priority",
   "Strategic priority",
   "Стратегический приоритет",
   "Prioridad estratégica",
   "Which growth priority would you choose and why?",
   "Какой приоритет роста вы выбираете и почему?",
   "¿Qué prioridad de crecimiento elegirías y por qué?"
  ],
  [
   "target",
   "Measurable target",
   "Измеримая цель",
   "Meta medible",
   "What measurable target and deadline would make this direction concrete?",
   "Какая измеримая цель и срок конкретизируют это направление?",
   "¿Qué meta medible y plazo concretan esta dirección?"
  ],
  [
   "alignment",
   "Leadership alignment",
   "Согласование с руководством",
   "Alineación directiva",
   "Who needs to agree, and what constraint should they consider?",
   "С кем нужно согласовать решение и какое ограничение учесть?",
   "¿Quién debe estar de acuerdo y qué límite debe considerar?"
  ],
  [
   "review",
   "First strategic action",
   "Первый стратегический шаг",
   "Primera acción estratégica",
   "What first action, owner and review date are you prepared to record?",
   "Какой первый шаг, ответственного и дату сверки вы готовы записать?",
   "¿Qué primera acción, responsable y fecha de revisión quieres registrar?"
  ]
 ],
 [
  [
   "map",
   "Function map",
   "Карта функций",
   "Mapa de funciones",
   "Where are the most important gaps or duplicated work across functions?",
   "Где находятся главные пробелы или дублирование функций?",
   "¿Dónde están las principales carencias o duplicidades entre funciones?"
  ],
  [
   "structure",
   "Target structure",
   "Целевая структура",
   "Estructura objetivo",
   "Which priority function needs a clearer owner and responsibilities?",
   "Какой приоритетной функции нужен более ясный ответственный и обязанности?",
   "¿Qué función prioritaria necesita un responsable y responsabilidades más claros?"
  ],
  [
   "metrics",
   "Function measures",
   "Показатели функций",
   "Indicadores de funciones",
   "Which KPI and resource would help this function meet the strategy?",
   "Какой KPI и ресурс помогут функции реализовать стратегию?",
   "¿Qué indicador y recurso ayudarían a cumplir la estrategia?"
  ],
  [
   "pilot",
   "Product pilot",
   "Пилот продукта",
   "Piloto de producto",
   "Which product or offer would you test, with what hypothesis and owner?",
   "Какой продукт или предложение вы протестируете, с какой гипотезой и ответственным?",
   "¿Qué producto u oferta probarías, con qué hipótesis y responsable?"
  ],
  [
   "review",
   "Pilot review",
   "Сверка пилота",
   "Revisión del piloto",
   "What success criterion and review date will you use for the pilot?",
   "Какой критерий успеха и дату проверки вы выберете для пилота?",
   "¿Qué criterio de éxito y fecha de revisión usarás para el piloto?"
  ]
 ],
 [
  [
   "needs",
   "People and customer needs",
   "Люди и потребности клиентов",
   "Personas y necesidades del cliente",
   "What capability gap or customer need is supported by actual evidence?",
   "Какой дефицит компетенций или потребность клиентов подтверждены фактами?",
   "¿Qué carencia de capacidades o necesidad del cliente está respaldada por hechos?"
  ],
  [
   "segment",
   "Target segment",
   "Целевой сегмент",
   "Segmento objetivo",
   "Which customer segment and positioning would you prioritize?",
   "Какой сегмент клиентов и позиционирование вы выберете?",
   "¿Qué segmento de clientes y posicionamiento priorizarías?"
  ],
  [
   "offer",
   "Offer and staffing",
   "Предложение и команда",
   "Oferta y equipo",
   "What change to the offer or team would address this need?",
   "Какое изменение предложения или команды ответит на эту потребность?",
   "¿Qué cambio de oferta o equipo respondería a esta necesidad?"
  ],
  [
   "market",
   "Market test",
   "Рыночная проверка",
   "Prueba de mercado",
   "What customer test can you run with the available people and materials?",
   "Какую проверку на клиентах можно провести с доступными людьми и материалами?",
   "¿Qué prueba con clientes puedes hacer con los recursos disponibles?"
  ],
  [
   "review",
   "Market test review",
   "Критерий рыночной проверки",
   "Revisión de mercado",
   "What test volume, timeframe and success criterion will you review?",
   "Какой объём проверки, срок и критерий успеха вы будете оценивать?",
   "¿Qué volumen, plazo y criterio de éxito revisarás?"
  ]
 ],
 [
  [
   "evidence",
   "Sales evidence",
   "Факты продаж",
   "Evidencia comercial",
   "What actual sales or customer feedback do you have, and what is still unknown?",
   "Какие реальные данные продаж или отзывы есть, а что пока неизвестно?",
   "¿Qué datos reales de ventas o comentarios tienes y qué sigue sin conocerse?"
  ],
  [
   "funnel",
   "Commercial bottleneck",
   "Узкое место продаж",
   "Cuello de botella comercial",
   "Which sales-stage problem matters most based on these facts?",
   "Какое узкое место продаж наиболее важно по этим фактам?",
   "¿Qué problema de la etapa comercial importa más según estos hechos?"
  ],
  [
   "decision",
   "Transformation decisions",
   "Решения о трансформации",
   "Decisiones de transformación",
   "What would you continue, change or stop based on the evidence?",
   "Что вы продолжите, измените или остановите на основе фактов?",
   "¿Qué continuarías, cambiarías o detendrías según la evidencia?"
  ],
  [
   "action",
   "Next commercial steps",
   "Следующие коммерческие шаги",
   "Próximos pasos comerciales",
   "What practical change to the offer or sales process will you test next?",
   "Какое изменение предложения или продаж вы проверите следующим?",
   "¿Qué cambio práctico de oferta o ventas probarás después?"
  ],
  [
   "review",
   "Session-eight target",
   "Цель к восьмой сессии",
   "Meta de la sesión ocho",
   "What measurable target, owner and review date will guide the transformation?",
   "Какая измеримая цель, ответственный и дата сверки будут направлять трансформацию?",
   "¿Qué meta medible, responsable y fecha de revisión orientarán la transformación?"
  ]
 ],
 [
  [
   "implementation",
   "Function implementation",
   "Внедрение по функциям",
   "Implementación funcional",
   "What has actually been implemented, and where are role or workload gaps?",
   "Что уже реально внедрено и где остаются пробелы ролей или нагрузки?",
   "¿Qué se ha implementado realmente y dónde quedan carencias de roles o carga?"
  ],
  [
   "ownership",
   "Management decisions",
   "Управленческие решения",
   "Decisiones de gestión",
   "Which task and decision right should be clarified with its owner?",
   "Какую задачу и право решения нужно уточнить с ответственным?",
   "¿Qué tarea y facultad de decisión deben aclararse con su responsable?"
  ],
  [
   "resources",
   "Resources and KPIs",
   "Ресурсы и KPI",
   "Recursos e indicadores",
   "Which resources, KPI and deadline make that responsibility feasible?",
   "Какие ресурсы, KPI и срок сделают эту ответственность выполнимой?",
   "¿Qué recursos, indicador y plazo hacen viable esa responsabilidad?"
  ],
  [
   "results",
   "First execution review",
   "Первые результаты исполнения",
   "Primera revisión de ejecución",
   "What actual result or obstacle can you report against the plan?",
   "Какой фактический результат или препятствие можно сопоставить с планом?",
   "¿Qué resultado real u obstáculo puedes comparar con el plan?"
  ],
  [
   "review",
   "Next management review",
   "Следующая управленческая сверка",
   "Próxima revisión de gestión",
   "What next action and reporting date will you agree with the owner?",
   "Какой следующий шаг и дату отчёта вы согласуете с ответственным?",
   "¿Qué próxima acción y fecha de informe acordarás con el responsable?"
  ]
 ],
 [
  [
   "baseline",
   "Process baseline",
   "Исходный процесс",
   "Proceso de partida",
   "Which process and actual handoff, duration or error data will you examine?",
   "Какой процесс и реальные данные передачи, длительности или ошибок вы исследуете?",
   "¿Qué proceso y datos reales de traspasos, duración o errores examinarás?"
  ],
  [
   "redesign",
   "Process redesign",
   "Перепроектирование процесса",
   "Rediseño de proceso",
   "Which redundant step or bottleneck would you change in the workflow?",
   "Какой лишний этап или узкое место вы измените в процессе?",
   "¿Qué paso redundante o cuello de botella cambiarías en el flujo?"
  ],
  [
   "target",
   "Process target",
   "Целевые показатели процесса",
   "Meta del proceso",
   "What target time, cost or quality criterion would define an improvement?",
   "Какие целевые время, стоимость или качество определят улучшение?",
   "¿Qué objetivo de tiempo, coste o calidad definiría una mejora?"
  ],
  [
   "trial",
   "Implementation test",
   "Проверка внедрения",
   "Prueba de implementación",
   "What real task can be tested with the new process, and who owns it?",
   "Какую реальную задачу можно проверить по новому процессу и кто ответственный?",
   "¿Qué tarea real puedes probar con el nuevo proceso y quién la dirige?"
  ],
  [
   "review",
   "Before-and-after review",
   "Сравнение до и после",
   "Comparación antes y después",
   "What evidence will you compare at review, or what have you already measured?",
   "Какие данные вы сравните на сверке или уже измерили?",
   "¿Qué evidencia compararás en la revisión o qué has medido ya?"
  ]
 ],
 [
  [
   "diagnostics",
   "Commercial diagnostics",
   "Коммерческая диагностика",
   "Diagnóstico comercial",
   "Which measured funnel, acquisition cost or margin indicates the problem?",
   "Какой измеренный показатель воронки, стоимости привлечения или маржи указывает на проблему?",
   "¿Qué indicador medido del embudo, adquisición o margen muestra el problema?"
  ],
  [
   "bottleneck",
   "Focused bottleneck",
   "Выбранное узкое место",
   "Cuello de botella elegido",
   "Which one bottleneck would you prioritize and why?",
   "Какое одно узкое место вы выберете и почему?",
   "¿Qué único cuello de botella priorizarías y por qué?"
  ],
  [
   "experiment",
   "Focused experiment",
   "Целевой эксперимент",
   "Experimento focalizado",
   "What specific offer, price or sales-stage change would you test?",
   "Какое изменение предложения, цены или этапа продаж вы проверите?",
   "¿Qué cambio concreto de oferta, precio o etapa comercial probarías?"
  ],
  [
   "criteria",
   "Experiment criteria",
   "Критерии эксперимента",
   "Criterios del experimento",
   "What volume, timeframe, owner and success measure will make the test informative?",
   "Какой объём, срок, ответственный и показатель успеха сделают проверку информативной?",
   "¿Qué volumen, plazo, responsable y medida de éxito harán informativa la prueba?"
  ],
  [
   "review",
   "Sales retest review",
   "Сверка повторных продаж",
   "Revisión de repetición comercial",
   "What actual results or planned comparison will inform the next decision?",
   "Какие фактические результаты или запланированное сравнение определят следующее решение?",
   "¿Qué resultados reales o comparación prevista orientarán la próxima decisión?"
  ]
 ],
 [
  [
   "results",
   "Results review",
   "Сверка результатов",
   "Revisión de resultados",
   "Which verified baseline, target and actual results can you compare across sessions?",
   "Какие проверенные исходные, целевые и фактические результаты можно сопоставить по сессиям?",
   "¿Qué resultados verificados iniciales, objetivo y reales puedes comparar entre sesiones?"
  ],
  [
   "learning",
   "Management learning",
   "Управленческие выводы",
   "Aprendizaje de gestión",
   "What worked, what did not and what remains unverified?",
   "Что сработало, что не сработало и что ещё не проверено?",
   "¿Qué funcionó, qué no y qué sigue sin verificarse?"
  ],
  [
   "system",
   "Management system",
   "Система управления",
   "Sistema de gestión",
   "Which validated workflow, responsibility or KPI should become a regular practice?",
   "Какой проверенный процесс, ответственность или KPI следует сделать регулярной практикой?",
   "¿Qué flujo, responsabilidad o indicador validado debería convertirse en práctica habitual?"
  ],
  [
   "plan",
   "90-day plan",
   "План на 90 дней",
   "Plan de 90 días",
   "Which realistic next action, owner, resource and deadline belong in your 90-day plan?",
   "Какой реалистичный шаг, ответственный, ресурс и срок входят в ваш план на 90 дней?",
   "¿Qué acción realista, responsable, recurso y plazo forman parte de tu plan de 90 días?"
  ],
  [
   "review",
   "Next review",
   "Следующая сверка",
   "Próxima revisión",
   "When will you review the plan and who will update the chosen indicators?",
   "Когда вы сверите план и кто обновит выбранные показатели?",
   "¿Cuándo revisarás el plan y quién actualizará los indicadores elegidos?"
  ]
 ]
]
const locales=['en','ru','es'],stageIds=['contact','situation','method','insight','support','integration']
export const BUSINESS_DAYBOOK_COACH_IDS=Object.freeze(authored.map((_,i)=>'business_daybook_'+(i+1)))
export const BUSINESS_DAYBOOK_COACH_GROUP=Object.freeze({id:'business_daybook',title:Object.freeze({en:'My Business · 8 sessions',ru:'Мой бизнес · 8 сессий',es:'Mi negocio · 8 sesiones'}),sessions:Object.freeze(BUSINESS_DAYBOOK_COACH_IDS.map((id,i)=>Object.freeze({id,number:i+1,programId:'business_daybook',title:Object.freeze(Object.fromEntries(locales.map(l=>[l,BUSINESS_SYLLABUS[l][i][0]]))),description:Object.freeze(Object.fromEntries(locales.map(l=>[l,BUSINESS_SYLLABUS[l][i][1]])))})))})
export const businessDaybookCoachSession=id=>BUSINESS_DAYBOOK_COACH_GROUP.sessions.find(x=>x.id===id)||null
export function businessDaybookCoachBlueprint(id,locale='en'){
 const item=businessDaybookCoachSession(id);if(!item)return null
 const l=Math.max(0,locales.indexOf(locale))
 const checkpoints=authored[item.number-1].map((f,i)=>({id:id+'_'+f[0],label:f[1+l],question:f[4+l],kind:'text',progressStage:stageIds[i+1]}))
 const stages=[{id:'contact',label:['Contact','Контакт','Contacto'][l],fields:[],start:0,end:2},...checkpoints.map((f,i)=>({id:f.progressStage,label:f.label,fields:[f.id],start:[2,5,9,13,17][i],end:[5,9,13,17,20][i]}))]
 return {id,durationSeconds:1200,mode:'coaching',stages,checkpoints,week:item.number,practiceTasks:BUSINESS_SYLLABUS[locales[l]][item.number-1][2].map(([label,instruction],i)=>({step:i+1,label,instruction}))}
}
