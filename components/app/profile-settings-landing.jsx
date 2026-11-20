import Link from 'next/link'
import { ArrowRight, Bell, BriefcaseBusiness, CreditCard, Eye, FileText, Heart, MessageCircle, Plus, Settings2, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import styles from './profile-settings-landing.module.css'

// Photo-led navigation only. The real authenticated forms remain in AppWorkspace.
const WORDS = {
  ru: {
    life:'Моя жизнь',work:'Моя работа',eyebrow:'ПРОФИЛЬ',title:'Настройки профиля',
    intro:'Управление аккаунтом, связью и персональными параметрами.',
    accountAction:'Управление аккаунтом',accountActionHint:'Ваши данные, вход и безопасность.',
    account:'Аккаунт и данные',accountHint:'Имя, язык, часовой пояс и вход',
    messaging:'Связь и мессенджеры',messagingHint:'Telegram, WhatsApp и сообщения',
    plans:'Тарифы и подписка',personal:'Параметры профиля',personalHint:'Моя страница и личные сведения',
    privacy:'Уведомления и приватность',privacyHint:'Сообщения, согласия и безопасность',
    quick:'Быстрые действия',create:'Создать',view:'Просмотр',results:'Результаты',
    sections:'Разделы настроек',safe:'Личные настройки доступны только в защищённом кабинете.',
  },
  en: {
    life:'My Life',work:'My Work',eyebrow:'PROFILE',title:'Profile Settings',
    intro:'Manage your account, connections and personal preferences.',
    accountAction:'Manage your account',accountActionHint:'Your details, sign-in and security.',
    account:'Account & details',accountHint:'Name, language, time zone and sign-in',
    messaging:'Messages & messengers',messagingHint:'Telegram, WhatsApp and messages',
    plans:'Plans & subscription',personal:'Profile preferences',personalHint:'My Page and personal details',
    privacy:'Notifications & privacy',privacyHint:'Messages, consent and security',
    quick:'Quick actions',create:'Create',view:'View',results:'Results',
    sections:'Settings sections',safe:'Personal settings are accessible only in your protected account.',
  },
  es: {
    life:'Mi vida',work:'Mi trabajo',eyebrow:'PERFIL',title:'Ajustes del perfil',
    intro:'Gestiona tu cuenta, conexiones y preferencias personales.',
    accountAction:'Gestionar mi cuenta',accountActionHint:'Tus datos, acceso y seguridad.',
    account:'Cuenta y datos',accountHint:'Nombre, idioma, zona horaria y acceso',
    messaging:'Mensajes y mensajería',messagingHint:'Telegram, WhatsApp y mensajes',
    plans:'Planes y suscripción',personal:'Preferencias del perfil',personalHint:'Mi página y datos personales',
    privacy:'Avisos y privacidad',privacyHint:'Mensajes, consentimiento y seguridad',
    quick:'Acciones rápidas',create:'Crear',view:'Ver',results:'Resultados',
    sections:'Secciones de ajustes',safe:'Los ajustes personales solo están en tu cuenta protegida.',
  },
}

export default function ProfileSettingsLanding({ locale='en', root='/en/app', plans=[] }) {
  const language = Object.hasOwn(WORDS,locale) ? locale : 'en'
  const t = WORDS[language]
  const planLine = plans.map(({key,amount}) => amount === 0 ? 'Free'
    : key.charAt(0).toUpperCase()+key.slice(1)+' €'+amount).join(' · ')
  const tiles = [
    {key:'account',icon:UserRound,href:'#hh-settings-account',title:t.account,detail:t.accountHint},
    {key:'messaging',icon:MessageCircle,href:'#hh-settings-messengers',title:t.messaging,detail:t.messagingHint},
    {key:'plans',icon:CreditCard,href:'#hh-settings-plans',title:t.plans,detail:planLine},
    {key:'personal',icon:Settings2,href:'/'+language+'/my-page',title:t.personal,detail:t.personalHint},
  ]
  return <div className={styles.landing} data-profile-settings-landing>
    <nav className={styles.mode} aria-label={t.life+' / '+t.work}>
      <Link href={root+'/portrait'} prefetch={false} className={styles.life} data-profile-settings-life>
        <Heart size={22} aria-hidden="true"/>{t.life}</Link>
      <Link href={'/'+language+'/practice'} prefetch={false} className={styles.work} data-profile-settings-work>
        <BriefcaseBusiness size={22} aria-hidden="true"/>{t.work}</Link>
    </nav>
    <section className={styles.hero} data-profile-settings-photo-hero aria-label={t.title}>
      <p className={styles.eyebrow}><Sparkles size={20} aria-hidden="true"/>{t.eyebrow}</p>
      <h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p>
      <a className={styles.heroAction} href="#hh-settings-account" data-profile-settings-account-cta>
        <span className={styles.actionIcon}><UserRound size={29} aria-hidden="true"/></span>
        <span className={styles.actionText}><strong>{t.accountAction}</strong><small>{t.accountActionHint}</small></span>
        <span className={styles.roundArrow}><ArrowRight size={24} aria-hidden="true"/></span>
      </a>
    </section>
    <nav className={styles.tiles} data-profile-settings-overview aria-label={t.sections}>
      {tiles.map(({key,icon:Icon,href,title,detail})=>
        <a className={styles.tile} href={href} key={key} data-profile-settings-card={key}>
          <span className={styles.photo} data-photo={key} aria-hidden="true"/>
          <span className={styles.tileCopy}>
            <span className={styles.tileIcon}><Icon size={21} aria-hidden="true"/></span>
            <strong>{title}</strong><small>{detail}</small>
          </span>
          <ArrowRight className={styles.tileArrow} size={19} aria-hidden="true"/>
        </a>)}
    </nav>
    <a className={styles.privacy} href="#hh-settings-more" data-profile-settings-privacy>
      <span className={styles.privacyIcon}><Bell size={26} aria-hidden="true"/></span>
      <span className={styles.privacyText}><strong>{t.privacy}</strong><small>{t.privacyHint}</small></span>
      <span className={styles.roundArrow}><ArrowRight size={23} aria-hidden="true"/></span>
    </a>
    <section className={styles.quick} data-profile-settings-actions aria-label={t.quick}>
      <h2>{t.quick}</h2>
      <nav aria-label={t.quick}>
        <Link href={'/'+language+'/personality-profiles'} prefetch={false}><Plus size={27} aria-hidden="true"/><strong>{t.create}</strong></Link>
        <Link href={root+'/portrait'} prefetch={false}><Eye size={27} aria-hidden="true"/><strong>{t.view}</strong></Link>
        <Link href={root+'/portrait?space=reports'} prefetch={false}><FileText size={27} aria-hidden="true"/><strong>{t.results}</strong></Link>
      </nav>
    </section>
    <p className={styles.safe}><ShieldCheck size={16} aria-hidden="true"/>{t.safe}</p>
  </div>
}
