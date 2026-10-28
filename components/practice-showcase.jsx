'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowRight, BarChart3, Bell, BookOpen, CheckCircle2, ChevronRight, ClipboardList,
  FileText, Heart, Home, Leaf, LockKeyhole, MessageCircle, Play, Plus,
  ShieldCheck, Sparkles, UserRound, Users
} from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './practice-showcase.module.css'

const COPY = {
  ru: {
    title:'Кабинет практика', subtitle:'Управляйте своими практиками и услугами',
    preview:'Публичный просмотр', yourProfile:'Ваш профиль', practitioner:'Практик Holistic House',
    profile:'Редактировать профиль', active:'Активно', offers:'услуг', requests:'Заявки',
    new:'новые', add:'Добавить', heroBadge:'ВАШИ ПРАКТИКИ',
    heroTitle:'Добавьте новую практику', heroLead:'Сессии, медитации, рейки и авторские материалы',
    create:'Создать', creations:'Что вы хотите добавить?', myOffers:'Мои предложения',
    allOffers:'Все предложения', tools:'Инструменты практики', clients:'Клиенты',
    contacts:'Контакты', inbox:'Сообщения', inboxLead:'Личный инбокс',
    services:'Услуги', servicesLead:'Мои услуги', materials:'Материалы',
    library:'Библиотека', analytics:'Аналитика', statistics:'Статистика',
    settings:'Профиль', settingsLead:'Настройки', community:'Сообщество',
    mentors:'Наставники', session:'Сессии', meditation:'Медитации',
    talisman:'Талисманы', reiki:'Рейки', course:'Курсы', masters:'Мастера',
    service:'Услуга', meditationOne:'Медитация', talismanOne:'Талисман',
    reikiOne:'Рейки поддержка', courseOne:'Курс', materialOne:'Материал',
    home:'Главная', practice:'Практика', forms:'Заявки', assets:'Материалы',
    signIn:'Войти с Google', signedIn:'Google подключён', gate:'Макет открыт без регистрации. Для создания и управления войдите через Google.',
    hint:'После входа вы вернётесь на эту же страницу. Ваши редакторы и данные остаются в основном кабинете.',
    authCancelled:'Вход не завершён. Можно повторить с любой кнопки.',
    authError:'Не удалось открыть Google-вход. Попробуйте ещё раз.',
    offline:'Не удалось проверить вход. Попробуйте ещё раз.',
    loginPrompt:'Нажмите на нужное действие — откроется вход через Google.',
    countUnknown:'—', defaultName:'Ваш профиль', emptyName:'Заполните профиль',
    loading:'Проверяем вход…', moderation:'Новые материалы остаются черновиками до проверки и публикации.',
    example:'Пример оформления', editTitle:'Мой профиль', next:'Открыть',
  },
  en: {
    title:'Practitioner workspace', subtitle:'Manage your practices and offerings',
    preview:'Public preview', yourProfile:'Your profile', practitioner:'Holistic House practitioner',
    profile:'Edit profile', active:'Active', offers:'services', requests:'Requests',
    new:'new', add:'Add', heroBadge:'YOUR PRACTICE',
    heroTitle:'Share a new practice', heroLead:'Sessions, meditations, Reiki and original materials',
    create:'Create', creations:'What would you like to add?', myOffers:'My offerings',
    allOffers:'All offerings', tools:'Practice tools', clients:'Clients',
    contacts:'Contacts', inbox:'Messages', inboxLead:'Private inbox',
    services:'Services', servicesLead:'My offerings', materials:'Materials',
    library:'Library', analytics:'Analytics', statistics:'Statistics',
    settings:'Profile', settingsLead:'Settings', community:'Community',
    mentors:'Practitioners', session:'Sessions', meditation:'Meditations',
    talisman:'Talismans', reiki:'Reiki', course:'Courses', masters:'Masters',
    service:'Service', meditationOne:'Meditation', talismanOne:'Talisman',
    reikiOne:'Reiki support', courseOne:'Course', materialOne:'Material',
    home:'Home', practice:'Practice', forms:'Requests', assets:'Materials',
    signIn:'Continue with Google', signedIn:'Google connected', gate:'Explore the design without signing in. Google is required to manage your practice.',
    hint:'You return to this same page after sign-in. All editors and data remain in your existing cabinet.',
    authCancelled:'Google sign-in was not completed. Select any action to try again.',
    authError:'Google sign-in is unavailable. Please try again.',
    offline:'Could not check your session. Try again.',
    loginPrompt:'Choose an action to continue with Google.',
    countUnknown:'—', defaultName:'Your profile', emptyName:'Complete your profile',
    loading:'Checking sign-in…', moderation:'New materials remain drafts until approved for publication.',
    example:'Layout preview', editTitle:'My profile', next:'Open',
  },
  es: {
    title:'Espacio profesional', subtitle:'Gestiona tus prácticas y servicios',
    preview:'Vista pública', yourProfile:'Tu perfil', practitioner:'Profesional de Holistic House',
    profile:'Editar perfil', active:'Activos', offers:'servicios', requests:'Solicitudes',
    new:'nuevas', add:'Añadir', heroBadge:'TUS PRÁCTICAS',
    heroTitle:'Añade una práctica nueva', heroLead:'Sesiones, meditaciones, Reiki y materiales propios',
    create:'Crear', creations:'¿Qué quieres añadir?', myOffers:'Mis propuestas',
    allOffers:'Ver todas', tools:'Herramientas', clients:'Clientes',
    contacts:'Contactos', inbox:'Mensajes', inboxLead:'Bandeja privada',
    services:'Servicios', servicesLead:'Mis servicios', materials:'Materiales',
    library:'Biblioteca', analytics:'Analítica', statistics:'Estadísticas',
    settings:'Perfil', settingsLead:'Ajustes', community:'Comunidad',
    mentors:'Profesionales', session:'Sesiones', meditation:'Meditaciones',
    talisman:'Talismanes', reiki:'Reiki', course:'Cursos', masters:'Maestros',
    service:'Servicio', meditationOne:'Meditación', talismanOne:'Talismán',
    reikiOne:'Apoyo Reiki', courseOne:'Curso', materialOne:'Material',
    home:'Inicio', practice:'Práctica', forms:'Solicitudes', assets:'Materiales',
    signIn:'Entrar con Google', signedIn:'Google conectado', gate:'Explora el diseño sin iniciar sesión. Google es necesario para gestionar tu práctica.',
    hint:'Tras iniciar sesión volverás a esta misma página. Tus editores y datos siguen en tu espacio actual.',
    authCancelled:'No se completó el acceso. Puedes intentarlo de nuevo.',
    authError:'No se puede iniciar sesión con Google. Inténtalo de nuevo.',
    offline:'No se ha podido comprobar tu sesión. Inténtalo de nuevo.',
    loginPrompt:'Selecciona una acción para continuar con Google.',
    countUnknown:'—', defaultName:'Tu perfil', emptyName:'Completa tu perfil',
    loading:'Comprobando sesión…', moderation:'Los nuevos materiales quedan como borradores hasta su aprobación.',
    example:'Vista de ejemplo', editTitle:'Mi perfil', next:'Abrir',
  },
}

const CREATE = [
  { key:'service', label:'service', Icon:Leaf, tint:'green' },
  { key:'meditation', label:'meditationOne', Icon:Play, tint:'mint' },
  { key:'talisman', label:'talismanOne', Icon:Sparkles, tint:'violet' },
  { key:'reiki', label:'reikiOne', Icon:Heart, tint:'rose' },
  { key:'course', label:'courseOne', Icon:BookOpen, tint:'mint' },
  { key:'material', label:'materialOne', Icon:FileText, tint:'mint' },
]

const CATEGORIES = [
  { key:'session', label:'session', icon:Leaf, artwork:'sessions' },
  { key:'meditationList', label:'meditation', icon:Play, artwork:'meditations' },
  { key:'talismanList', label:'talisman', icon:Sparkles, artwork:'talismans' },
  { key:'reikiList', label:'reiki', icon:Heart, artwork:'reiki' },
  { key:'courseList', label:'course', icon:BookOpen, artwork:'courses' },
  { key:'masters', label:'masters', icon:Users, artwork:'masters' },
]

const TOOLS = [
  { key:'clients', label:'clients', note:'contacts', Icon:Users },
  { key:'requests', label:'requests', note:'new', Icon:ClipboardList },
  { key:'messages', label:'inbox', note:'inboxLead', Icon:MessageCircle },
  { key:'services', label:'services', note:'servicesLead', Icon:Leaf },
  { key:'materials', label:'materials', note:'library', Icon:FileText },
  { key:'analytics', label:'analytics', note:'statistics', Icon:BarChart3 },
  { key:'profile', label:'settings', note:'settingsLead', Icon:UserRound },
  { key:'community', label:'community', note:'mentors', Icon:Users },
]

const TABS = [
  { key:'home', label:'home', Icon:Home },
  { key:'practice', label:'practice', Icon:Leaf },
  { key:'requests', label:'forms', Icon:ClipboardList },
  { key:'materials', label:'assets', Icon:BookOpen },
  { key:'profile', label:'settings', Icon:UserRound },
]

function destination(locale, key) {
  // Only the existing, server-protected editors. No second CRM or new payments.
  const appLocale = locale === 'es' ? 'en' : locale
  const root = '/' + appLocale + '/app/practice'
  const routes = {
    home:'/' + appLocale + '/app/portrait',
    practice:root,
    create:root + '?panel=services&create=1&starter=session',
    service:root + '?panel=services&create=1&starter=session',
    meditation:root + '?panel=materials&materialTab=courses&create=1&meditation=audio',
    talisman:root + '?panel=services&create=1&starter=energy',
    reiki:root + '?panel=services&create=1&starter=energy',
    course:root + '?panel=materials&materialTab=courses&create=1',
    material:root + '?panel=materials&materialTab=articles',
    session:root + '?panel=services',
    meditationList:root + '?panel=materials&materialTab=courses',
    talismanList:root + '?panel=services',
    reikiList:root + '?panel=services',
    courseList:root + '?panel=materials&materialTab=courses',
    masters:'/' + appLocale + '/masters',
    clients:root + '?panel=clients',
    requests:root + '?panel=requests',
    messages:'/' + appLocale + '/app/messages',
    services:root + '?panel=services',
    materials:root + '?panel=materials',
    analytics:root + '?panel=analytics',
    profile:root + '?panel=profile',
    community:'/' + appLocale + '/masters',
  }
  return routes[key] || root
}

function countRequests(list) {
  return list.filter(item => item?.status === 'requested').length
}

export default function PracticeShowcase({ locale = 'en' }) {
  const router = useRouter()
  const t = COPY[locale] || COPY.en
  const [session, setSession] = useState('checking')
  const [practice, setPractice] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const signedIn = session === 'signed'

  const checkSession = useCallback(async (signal) => {
    try {
      await appFetch('bootstrap', undefined, undefined, { signal })
      if (signal?.aborted) return
      setSession('signed')
      // Both endpoints are private. No practitioner data is returned during SSR.
      const [contact, practitioner] = await Promise.allSettled([
        appFetch('auth/contact-profile', undefined, undefined, { signal }),
        fetch('/api/app/practice', { credentials:'same-origin', cache:'no-store', signal })
          .then(async response => response.ok ? response.json() : null),
      ])
      if (signal?.aborted) return
      if (contact.status === 'fulfilled') setDisplayName(contact.value?.displayName || '')
      if (practitioner.status === 'fulfilled' && practitioner.value && !practitioner.value.error)
        setPractice(practitioner.value)
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') return
      setSession(error?.status === 401 ? 'guest' : 'unavailable')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void checkSession(controller.signal)
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'cancelled' || params.get('auth') === 'failed')
      setNotice(t.authCancelled)
    return () => controller.abort()
  }, [checkSession, t.authCancelled])

  async function openAction(key) {
    if (busy) return
    const target = destination(locale, key)
    setNotice('')
    if (signedIn) {
      router.push(target)
      return
    }
    setBusy(key)
    try {
      if (session === 'checking') {
        try {
          await appFetch('bootstrap')
          router.push(target)
          return
        } catch (error) {
          if (error?.status !== 401) throw error
        }
      }
      // Allowlisted continuation: the callback returns to this same public UI.
      const result = await appFetch('auth/start', { locale, continueTo:'practice-preview' })
      if (!result?.redirectUrl || !result.redirectUrl.startsWith('https://'))
        throw new Error('INVALID_OAUTH_REDIRECT')
      window.location.assign(result.redirectUrl)
    } catch (error) {
      setNotice(error?.status === 503 ? t.offline : t.authError)
      setBusy('')
    }
  }

  const practitioner = practice?.practitioner
  const name = (practitioner?.profile?.displayName || practitioner?.draftProfile?.displayName || displayName || '').trim()
  const services = Array.isArray(practice?.services) ? practice.services : []
  const requests = Array.isArray(practice?.requests) ? practice.requests : []
  const active = services.filter(item => item.status === 'published').length
  const newRequests = countRequests(requests)
  const initials = name ? name.slice(0, 1).toUpperCase() : ''
  const metric = signedIn && practice ? String(active) : t.countUnknown
  const requestMetric = signedIn && practice ? String(newRequests) : t.countUnknown

  return <div className={styles.screen} data-practice-showcase data-auth-state={session}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}><Sparkles size={14} aria-hidden="true" /> HOLISTIC HOUSE <span>·</span> {t.preview}</div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <button className={styles.notification} type="button" aria-label={t.requests} onClick={() => void openAction('requests')}>
          <Bell size={23} aria-hidden="true" />
          {signedIn && newRequests > 0 && <span className={styles.notificationDot} />}
        </button>
      </header>

      <section className={styles.identity} aria-label={t.yourProfile}>
        <span className={styles.avatar} aria-hidden="true">{signedIn ? (initials || <UserRound size={42}/>) : <Image src="/images/holistic-house/support-reference-avatar.webp" alt="" width={68} height={68} />}</span>
        <div className={styles.identityCopy}>
          <strong>{signedIn ? (name || t.emptyName) : t.defaultName}</strong>
          <small>{t.practitioner}</small>
          <button type="button" onClick={() => void openAction('profile')}>{t.profile} <ArrowRight size={15}/></button>
        </div>
        <div className={styles.metrics}>
          <button type="button" className={styles.metricMint} onClick={() => void openAction('services')}>
            <Leaf size={22} aria-hidden="true"/><small>{t.active}</small><b>{metric}</b><span>{t.offers}</span>
          </button>
          <button type="button" className={styles.metricCream} onClick={() => void openAction('requests')}>
            <Users size={22} aria-hidden="true"/><small>{t.requests}</small><b>{requestMetric}</b><span>{t.new}</span>
          </button>
        </div>
      </section>

      <div className={styles.sectionTitle}><h2>{t.creations}</h2></div>
      <div className={styles.quickGrid} aria-label={t.creations}>
        {CREATE.map(({ key, label, Icon, tint }) =>
          <button key={key} type="button" className={styles.quickTile + ' ' + styles[tint]}
            onClick={() => void openAction(key)} aria-busy={busy === key}>
            <span className={styles.tileIcon}><Icon size={25} strokeWidth={1.9} aria-hidden="true"/></span>
            <span className={styles.tileCopy}><strong>{t[label]}</strong><small>{t.add}</small></span>
            <ChevronRight className={styles.tileArrow} size={15} aria-hidden="true"/>
          </button>
        )}
      </div>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}><Sparkles size={17} aria-hidden="true"/> {t.heroBadge}</span>
          <h2>{t.heroTitle}</h2>
          <p>{t.heroLead}</p>
          <button type="button" className={styles.heroButton} onClick={() => void openAction('create')}>
            <Plus size={19} aria-hidden="true"/> {t.create} <ChevronRight size={19} aria-hidden="true"/>
          </button>
        </div>
      </section>

      <section className={styles.offers}>
        <div className={styles.sectionTitle}>
          <h2>{t.myOffers}</h2>
          <button type="button" onClick={() => void openAction('services')}>{t.allOffers} <ArrowRight size={17} aria-hidden="true"/></button>
        </div>
        <div className={styles.offerRail}>
          {CATEGORIES.map(({ key, label, icon:Icon, artwork }, i) =>
            <button type="button" key={key} className={styles.offerCard + ' ' + styles[artwork] + (i === 0 ? ' ' + styles.selectedOffer : '')}
              onClick={() => void openAction(key)}>
              <span className={styles.offerIcon}><Icon size={18} aria-hidden="true"/></span>
              <strong>{t[label]}</strong>
            </button>
          )}
        </div>
      </section>

      <section className={styles.toolbox}>
        <div className={styles.sectionTitle}><h2>{t.tools}</h2></div>
        <div className={styles.toolGrid}>
          {TOOLS.map(({ key, label, note, Icon }) =>
            <button key={key} type="button" className={styles.tool} onClick={() => void openAction(key)}>
              <span className={styles.toolIcon}><Icon size={23} aria-hidden="true"/></span>
              <span className={styles.toolCopy}><strong>{t[label]}</strong><small>
                {key === 'requests' && signedIn && practice ? t.new + ': ' + String(newRequests) : t[note]}
              </small></span>
              <ChevronRight size={16} aria-hidden="true"/>
            </button>
          )}
        </div>
      </section>

      <aside className={styles.gate} aria-live="polite">
        <ShieldCheck size={18} aria-hidden="true"/>
        <div><strong>{signedIn ? t.signedIn : session === 'checking' ? t.loading : t.gate}</strong>
          <p>{t.hint}</p>
          {notice && <p className={styles.alert} role="alert">{notice}</p>}
        </div>
        {!signedIn && <button type="button" className={styles.signIn} disabled={Boolean(busy)} onClick={() => void openAction('practice')}>
          <LockKeyhole size={15} aria-hidden="true"/>{t.signIn}
        </button>}
      </aside>
      <p className={styles.moderation}><CheckCircle2 size={15} aria-hidden="true"/> {t.moderation}</p>
    </div>

    <nav className={styles.bottomNav} aria-label={t.practice}>
      {TABS.map(({key, label, Icon}) =>
        <button key={key} type="button" className={styles.navItem + (key === 'practice' ? ' ' + styles.navActive : '')}
          onClick={() => void openAction(key)} aria-current={key === 'practice' ? 'page' : undefined}>
          <Icon size={21} aria-hidden="true"/><span>{t[label]}</span>
        </button>
      )}
    </nav>
  </div>
}
