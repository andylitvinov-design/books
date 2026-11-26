import {CLARITY_SYLLABUS} from './app/clarity-program.mjs'
import {STAGES} from './app/daybook-stages.mjs'
import {BUSINESS_SYLLABUS} from './app/business-daybook.mjs'

export const PUBLIC_PROGRAMS=Object.freeze(['clarity','goal','business','reiki'])
export const PROGRAM_LOCALES=Object.freeze(['en','ru','es'])
const copy={
 ru:{
  back:'Назад',tagline:'Терапия · Коучинг · Развитие',language:'Выбрать язык',sessions:'сессии',start:'Начать программу',outline:'Сессии программы',
  clarity:{title:'Clarity & Stress Relief',subtitle:'Ясность, спокойствие и внутренняя опора',intro:'Три бесплатных дня самостоятельной работы; плановый формат коучинга — 20 минут в день, доступность сессий уточняется отдельно.',count:'3 дня · бесплатно',start:'Начать бесплатно',rows:[
   ['Прояснение ситуации','Экспресс-анализ жизненной ситуации и областей, где нужна поддержка.'],
   ['Поддержка состояния и энергии','Индивидуальная поддержка, направляемое воображение и гипнотерапия по согласованию.'],
   ['Анализ и выбор цели развития','Системная расстановка, прояснение цели и следующие шаги.']]},
  goal:{title:'Achieving My Goal',subtitle:'От мечты к реальному результату',count:'8 сессий',review:'Итоги и новые перспективы',reviewDetail:'Оценить результаты и выбрать направление следующего этапа.',progress:'Ускорить движение к цели'},
  business:{title:'Business Support',subtitle:'Стратегия и управляемый рост бизнеса',count:'4 стратегические сессии',organization:'Организационный анализ'},
  reiki:{title:'Reiki Practic',subtitle:'Бесплатный курс из 5 недель',intro:'Авторские медитации, три системы Рейки и подготовка к личной инициации.',count:'5 недель · бесплатно',start:'Начать бесплатно',week:'Неделя',outline:'Пять недель курса',note:'После каждого этапа — короткая практика и личная рефлексия. Инициация согласуется отдельно.',rows:[
   ['Sun Flight','Практика присутствия, внимания и образа солнца.'],
   ['Tantra Reiki','Источник жизни: медитация, чувствительность и символы.'],
   ['Kundalini Reiki','Знакомство с традицией и авторской практикой.'],
   ['Reiki Yggdrasil','Мировое Древо и руническая традиция.'],
   ['Personal Initiation','Подготовка, выбор системы и запрос на личную инициацию.']]}
 },
 en:{
  back:'Back',tagline:'Therapy · Coaching · Growth',language:'Choose language',sessions:'sessions',start:'Start program',outline:'Program sessions',
  clarity:{title:'Clarity & Stress Relief',subtitle:'Clarity, calm and inner support',intro:'Three free workbook days; planned coaching format: 20 minutes per day, session availability is separate.',count:'3 days · free',start:'Start Free Program',rows:[
   ['Clarify the situation','A brief review of your life situation and the areas that need support.'],
   ['Restore energy and support','Individual support, guided imagery and hypnotherapy by agreement.'],
   ['Choose your next goal','Systemic constellation, goal clarification and your next steps.']]},
  goal:{title:'Achieving My Goal',subtitle:'From a dream to real-world progress',count:'8 sessions',review:'Results & New Possibilities',reviewDetail:'Review your results and choose your next direction.',progress:'Build momentum toward your goal'},
  business:{title:'Business Support',subtitle:'Strategy and sustainable business growth',count:'4 strategic sessions',organization:'Organizational analysis'},
  reiki:{title:'Reiki Practic',subtitle:'A free five-week course',intro:'Original meditations, three Reiki traditions and preparation for personal initiation.',count:'5 weeks · free',start:'Start free course',week:'Week',outline:'Your five weeks',note:'Each stage includes a short practice and personal reflection. Initiation is arranged separately.',rows:[
   ['Sun Flight','Presence, attention and guided imagery of the sun.'],
   ['Tantra Reiki','Spring of Life: meditation, sensitivity and symbols.'],
   ['Kundalini Reiki','Explore the tradition and original guided practice.'],
   ['Reiki Yggdrasil','The World Tree and the runic tradition.'],
   ['Personal Initiation','Prepare, choose a tradition and request personal initiation.']]}
 },
 es:{
  back:'Volver',tagline:'Terapia · Coaching · Desarrollo',language:'Elegir idioma',sessions:'sesiones',start:'Empezar programa',outline:'Sesiones del programa',
  clarity:{title:'Claridad y alivio del estrés',subtitle:'Claridad, calma y apoyo interior',intro:'Tres días gratuitos de trabajo autónomo; formato de coaching previsto: 20 minutos al día, disponibilidad por separado.',count:'3 días · gratis',start:'Empezar gratis',rows:[
   ['Aclarar la situación','Revisión breve de tu situación vital y las áreas que necesitan apoyo.'],
   ['Recuperar energía y apoyo','Apoyo individual, imaginación guiada e hipnoterapia según acuerdo.'],
   ['Elegir tu próxima meta','Constelación sistémica, clarificación de la meta y próximos pasos.']]},
  goal:{title:'Alcanzar mi meta',subtitle:'Del sueño a resultados concretos',count:'8 sesiones',review:'Balance y nuevas perspectivas',reviewDetail:'Revisa tus resultados y elige tu próximo rumbo.',progress:'Acelera hacia tu meta'},
  business:{title:'Apoyo empresarial',subtitle:'Estrategia y crecimiento empresarial gestionable',count:'4 sesiones estratégicas',organization:'Análisis organizativo'},
  reiki:{title:'Reiki Practic',subtitle:'Curso gratuito de cinco semanas',intro:'Meditaciones originales, tres tradiciones Reiki y preparación para la iniciación personal. Curso en inglés o ruso.',count:'5 semanas · gratis',start:'Empezar gratis (EN)',week:'Semana',outline:'Tus cinco semanas',note:'Cada etapa incluye una práctica breve y reflexión personal. La iniciación se acuerda por separado.',rows:[
   ['Sun Flight','Presencia, atención e imaginación guiada del sol.'],
   ['Tantra Reiki','Fuente de Vida: meditación, sensibilidad y símbolos.'],
   ['Kundalini Reiki','Conoce la tradición y la práctica guiada original.'],
   ['Reiki Yggdrasil','El Árbol del Mundo y la tradición rúnica.'],
   ['Personal Initiation','Prepárate, elige una tradición y solicita la iniciación personal.']]}
 }
}
export function getProgramOverview(locale,id){
 if(!PROGRAM_LOCALES.includes(locale)||!PUBLIC_PROGRAMS.includes(id))return null
 const t=copy[locale],p=t[id]
 const rows=id==='clarity'?CLARITY_SYLLABUS[locale]:id==='reiki'?p.rows:id==='goal'?
  [...STAGES.map((s,i)=>[i===6?p.progress:s[locale][0],s[locale][1]]),[p.review,p.reviewDetail]]:
  BUSINESS_SYLLABUS[locale].map(([title,description],i)=>[i===1?p.organization:title,description])
 const root='/'+locale
 return {id,locale,title:p.title,subtitle:p.subtitle,count:p.count,intro:p.intro||null,rows,back:t.back,tagline:t.tagline,language:t.language,start:p.start||t.start,outline:p.outline||t.outline,week:p.week||null,note:p.note||null,home:locale==='en'?'/':root,startHref:id==='clarity'?root+'/app/daybook?program=clarity':id==='goal'?root+'/app/daybook?start=vector':id==='reiki'?'/'+(locale==='ru'?'ru':'en')+'/academy/principles-of-energywork/daybook':root+'/app/daybook/business'}
}
