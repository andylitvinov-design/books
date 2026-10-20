import {notFound} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import InstallHolisticHouse from '@/components/app/install-holistic-house'
import styles from './install.module.css'

const COPY={
  en:{
    title:'Holistic House on your phone',
    intro:'Install your private cabinet like an app. Open your messages, consultations, reports, tests and courses from the Home Screen.',
    open:'Open my cabinet',
    messages:'Open my messages',
    settings:'Manage notifications',
    stepsTitle:'Install and receive message alerts',
    steps:[
      'On iPhone, use Safari → Share → Add to Home Screen. On Android, use Chrome → Install app.',
      'Open Holistic House from the new Home Screen icon and sign in to your account.',
      'In Cabinet Settings, allow notifications and separately enable alerts for private messages.'
    ],
    privacy:'Only a generic arrival notification appears on the Lock Screen. The actual conversation stays behind your account login.',
    note:'Home Screen installation works now. A separately signed App Store / Play Store version is a later distribution channel.'
  },
  ru:{
    title:'Holistic House на вашем телефоне',
    intro:'Установите личный кабинет как приложение. Сообщения, консультации, отчёты, тесты и курсы будут доступны с главного экрана.',
    open:'Открыть мой кабинет',
    messages:'Мои сообщения',
    settings:'Настроить уведомления',
    stepsTitle:'Установка и уведомления',
    steps:[
      'На iPhone откройте Safari → Поделиться → На экран «Домой». На Android откройте Chrome → Установить приложение.',
      'Запустите Holistic House через новую иконку на телефоне и войдите в аккаунт.',
      'В настройках кабинета разрешите уведомления и отдельно включите новые личные сообщения.'
    ],
    privacy:'На заблокированном экране отображается только факт нового сообщения. Сама переписка защищена входом в аккаунт.',
    note:'Установка на главный экран доступна сейчас. Подписанная версия из App Store / Google Play — отдельный этап.'
  }
}
export async function generateMetadata({params}){
  const {locale}=await params
  const ru=locale==='ru'
  return {
    title:(ru?'Установить приложение':'Install app')+' | Holistic House',
    description:ru?'Установка Holistic House на iPhone и Android и уведомления о сообщениях.':
      'Install Holistic House on iPhone and Android, with private-message notifications.',
    robots:{index:false,follow:false},
    manifest:ru?'/holistic-house-app-ru.webmanifest':'/holistic-house-app.webmanifest',
    icons:{icon:'/icons/holistic-house-teal.svg',apple:'/holistic-house-icon/180'}
  }
}
export default async function InstallPage({params}){
  const {locale}=await params
  if(!['en','ru'].includes(locale))notFound()
  const c=COPY[locale]
  return <main className={styles.wrap}>
    <section className={styles.hero}>
      <Image src="/holistic-house-icon/192" unoptimized width={92} height={92} alt="Holistic House" className={styles.mark}/>
      <div>
        <p className={styles.eyebrow}>HOLISTIC HOUSE · MOBILE</p>
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
      </div>
    </section>
    <InstallHolisticHouse locale={locale} showGuideLink={false}/>
    <div className={styles.actions}>
      <Link className={styles.primary} href={`/${locale}/app/portrait`}>{c.open}</Link>
      <Link className={styles.link} href={`/${locale}/app/consultations`}>{c.messages}</Link>
      <Link className={styles.link} href={`/${locale}/app/settings#hh-phone-notifications`}>{c.settings}</Link>
    </div>
    <section className={styles.steps} aria-label={c.stepsTitle}>
      <h2>{c.stepsTitle}</h2>
      <ol>{c.steps.map((item,i)=><li key={i}><span>{i+1}</span><p>{item}</p></li>)}</ol>
    </section>
    <p className={styles.privacy}>{c.privacy}</p>
    <p className={styles.note}>{c.note}</p>
  </main>
}
