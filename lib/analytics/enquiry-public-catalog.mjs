import {safePublicPagePath} from './public-page-traffic.mjs'

// Server-owned, public labels only. Unknown visitor-supplied values remain
// available inside the protected request, but are never forwarded to Telegram.
// Extend this registry from the actual public offer catalogue, not request text.
const SERVICE_TITLES=new Set([
  '60-minute personal session · €100','30-minute express consultation · €50',
  'Личная сессия 60 минут · €100','Экспресс-консультация 30 минут · €50',
  'Sesión personal de 60 minutos · €100','Consulta exprés de 30 minutos · €50',
  'Free test starting-point guidance','Free written Situation Review',
  'Free symbolic Wu Xing Resource Profile','Free drawing-based situation review',
  'Free personal express review','Бесплатная личная экспресс-диагностика','Revisión personal exprés gratuita',
  'Personal service selection with Andrey','Personal session with Andrey Litvinov',
  'Personal Coaching Session with Andrey','Personal support · 2 x 60 min · EUR 200 per month',
  'Daoist talismans · basket quote','Daoist Fu talismans · checkout pending payment',
  'Free Situation Review','Free Wu Xing Resource Profile','Alchemy of the Soul · Psycho-homeopathy',
  'Guided Imagery Hypnotherapy','Business Strategy & Founder Coaching',
  'Диагностика ситуации','Бесплатный профиль ресурсов У-Син','Алхимия души · Психогомеопатия',
  'Курс гипнотерапии','Бизнес-стратегия и коучинг предпринимателей',
  'Revisión gratuita de tu situación','Perfil gratuito de recursos Wu Xing','Alquimia del Alma · Psicohomeopatía',
  'Hipnoterapia con imágenes guiadas','Estrategia de negocios y coaching para emprendedores',
  'Alchemy of the Soul / Psycho-homeopathy','Алхимия души / Психогомеопатия','Alquimia del Alma / Psicohomeopatía',
  'Personal growth & emotional clarity','Relationships & constellations','Business strategy & career','Reiki & energy practices','Free tests & self-discovery',
  'Личное развитие и внутренняя опора','Отношения и расстановки','Бизнес-стратегия и карьера','Рейки и энергетические практики','Тесты и самопознание',
  'Crecimiento personal y claridad','Relaciones y constelaciones','Estrategia empresarial y carrera','Reiki y prácticas energéticas','Pruebas y autoconocimiento',
  'Tantra Reiki','DAO Reiki Yggdrasil','Temple Studies','Mysteries & Ancient Traditions',
  'Runes, Elements & Symbolic Arts','Applied Archetypal Practice','Reiki','Academy training',
  'Academy','Academy archive','Academy videos','Academy school','Holistic House Academy',
])
// Fixed public routes inspected in the repository; no dynamic user slugs,
// private paths, query parameters or arbitrary form input are accepted.
const PUBLIC_PATHS=new Set([
  '/about','/academy','/academy/free-ai-courses','/academy/reiki','/academy/reiki/yggdrasil',
  '/academy/reiki/yggdrasil/basic-course','/academy/reiki/yggdrasil/free-initiation',
  '/academy/reiki/tantra-reiki/discover','/academy/reiki/tantra-reiki/free-initiation',
  '/academy/reiki/free-practitioner-course','/academy/temple-studies','/academy/archive',
  '/academy/videos','/academy/history/faculties','/academy/principles-of-energywork',
  '/academy/egyptian-priesthood','/academy/reiki/kundalini-reiki/free-initiation',
  '/articles','/coaching','/coaching/intake',
  '/coaching/lounge','/contact','/courses','/courses/antistress','/courses/methodology',
  '/dao/hexagrams','/events','/holistic-support','/holistic-support/mandala',
  '/holistic-support/mobile','/homeopathy','/homeopathy/remedies','/install','/masters',
  '/services','/services/alchemy-of-soul','/services/business-consulting','/services/catalog',
  '/services/dao-health-profile','/services/free-consultation','/services/free-situation-review',
  '/services/hypnotherapy-course','/services/imagery-therapy','/services/personal-support',
  '/services/psychohomeopathy','/services/remote-energy-support','/services/systemic-constellations',
  '/shop','/talismans/cart','/toronto','/wu-xing',
])
// Only campaign codes already defined in tracked first-party acquisition data.
const CAMPAIGNS=new Set(['gbp','hh_free_review_en_toronto_202610','hh_reiki_yggdrasil_en'])

export function verifiedEnquiryServiceTitle(value){
  return typeof value==='string'&&SERVICE_TITLES.has(value)?value:null
}
export function verifiedEnquiryPath(value){
  // The checkout is a single fixed public route; don't admit arbitrary cart URLs.
  if(typeof value==='string'&&/^\/(en|ru|es)\/talismans\/cart\/?$/.test(value))return value.replace(/\/$/,'')
  const path=safePublicPagePath(value)
  if(path==='/')return path
  const match=path?.match(/^\/(?:en|ru|es)(\/.*)?$/)
  if(!match)return null
  return !match[1]||PUBLIC_PATHS.has(match[1])?path:null
}
export function verifiedEnquiryCampaign(value){
  return typeof value==='string'&&CAMPAIGNS.has(value)?value:null
}
