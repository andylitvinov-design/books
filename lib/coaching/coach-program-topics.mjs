// The program selection is an editorial direction, not an enrollment or progress update.
// Titles follow Clarity PR #5559, My Goal PR #5560 and the production Business Daybook.
import {BUSINESS_SYLLABUS} from '../app/business-daybook.mjs'

const locales=['en','ru','es']
const copy=(en,ru,es)=>Object.freeze({en,ru,es})
const CLARITY_SYLLABUS={
 en:[['Discover yourself','Understand your current situation, wishes and needs.'],['Understand what is happening','Explore facts, feelings, needs and available support.'],['Restore energy and support','Identify gentle practices and resources for your wellbeing.'],['Choose your next direction','Review changes and define one achievable next step.']],
 ru:[['Познать себя','Исследуйте текущее состояние, желания и потребности.'],['Понять, что происходит','Разберите факты, чувства, потребности и доступную поддержку.'],['Восстановить силы и опору','Найдите бережные практики и ресурсы для своего состояния.'],['Выбрать направление','Оцените изменения и определите один реалистичный следующий шаг.']],
 es:[['Conócete','Explora tu situación actual, deseos y necesidades.'],['Comprende lo que ocurre','Explora hechos, emociones, necesidades y apoyo disponible.'],['Recupera energía y apoyo','Identifica prácticas suaves y recursos para tu bienestar.'],['Elige tu próximo rumbo','Revisa los cambios y define un siguiente paso alcanzable.']]
}
const goalTitle={
 en:['Define the Result', 'Ignite Motivation', 'Build an Action Plan', 'Activate Resources', 'Overcome Inner Blocks', 'Find New Opportunities', 'Accelerate Toward the Goal', 'Results & New Perspectives'],
 ru:['Определить результат', 'Зажечь мотивацию', 'Построить план', 'Активировать ресурсы', 'Преодолеть препятствия', 'Найти возможности', 'Ускорение к цели', 'Итоги и новые перспективы'],
 es:['Definir el resultado', 'Encender la motivación', 'Construir un plan', 'Activar recursos', 'Superar obstáculos', 'Encontrar posibilidades', 'Acelerar hacia la meta', 'Resultados y nuevas perspectivas']
}
const goalDetail={
 en:['Clarify your desired outcome', 'Reconnect with your inner why', 'Choose your next practical actions', 'Find your energy and support', 'Work with obstacles gently', 'Discover new options and solutions', 'Strengthen what works and adjust your next actions', 'Reflect on results and choose what comes next'],
 ru:['Что конкретно я хочу получить', 'Зачем мне это важно', 'Мои следующие действия', 'Моя энергия, люди и поддержка', 'Мягкая работа со страхами', 'Новые пути и решения', 'Усилить работающие действия и скорректировать план', 'Оценить результаты и выбрать дальнейшее направление'],
 es:['Aclarar el resultado deseado', 'Reconectar con tu porqué', 'Planificar los próximos pasos', 'Encontrar energía y apoyo', 'Abordar bloqueos con cuidado', 'Explorar nuevas soluciones', 'Reforzar lo que funciona y ajustar las acciones', 'Revisar resultados y elegir el siguiente rumbo']
}
const goalIds=['result','motivation','plan','resources','obstacles','possibilities','acceleration','integration']
const entries=(group,ids,read)=>Object.freeze(ids.map((id,index)=>Object.freeze({
 id:group+'_'+id,programId:group,number:index+1,
 title:Object.freeze(Object.fromEntries(locales.map(l=>[l,read(l,index)[0]]))),
 description:Object.freeze(Object.fromEntries(locales.map(l=>[l,read(l,index)[1]])))
})))
export const INTRODUCTORY_COACH_SESSION_ID='introductory'
export const INTRODUCTORY_COACH_SESSION=Object.freeze({
 id:INTRODUCTORY_COACH_SESSION_ID,
 title:copy('Introductory session','Вводная сессия','Sesión introductoria'),
 description:copy('Clarify your request, get acquainted and optionally review your personal profile.',
  'Познакомьтесь, проясните запрос и при желании исследуйте личный профиль.',
  'Aclara tu petición, conoce al coach y revisa tu perfil personal si lo deseas.')
})
export const COACH_PROGRAM_GROUPS=Object.freeze([
 Object.freeze({id:'clarity',title:copy('Clarity & Anti-stress','Ясность и антистресс','Claridad y antiestrés'),
  sessions:entries('clarity',['discover','understand','support','direction'],(l,i)=>CLARITY_SYLLABUS[l][i])}),
 Object.freeze({id:'goal',title:copy('Achieving My Goal','Достижение моей цели','Alcanzar mi meta'),
  sessions:entries('goal',goalIds,(l,i)=>[goalTitle[l][i],goalDetail[l][i]])}),
 Object.freeze({id:'business',title:copy('Business Support','Поддержка бизнеса','Apoyo empresarial'),
  sessions:entries('business',['strategy','design','transformation','execution'],(l,i)=>BUSINESS_SYLLABUS[l][i])})
])
export const COACH_PROGRAM_SESSIONS=Object.freeze(COACH_PROGRAM_GROUPS.flatMap(group=>group.sessions))
