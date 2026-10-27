import {notFound} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import InstallHolisticHouse from '@/components/app/install-holistic-house'
import styles from './install.module.css'

const COPY={
  en:{
    title:'Install Holistic House for free',
    intro:'Add Holistic House to your iPhone or Android Home Screen, with its own icon and an app-like window. Keep your private messages, reports, tests and courses within easy reach.',
    cost:'Free installation · No app store required',
    open:'Open my Cabinet',messages:'Open my messages',settings:'Notification settings',
    stepsTitle:'Three steps to get started',
    steps:[
      'Open in Safari on iPhone (Share → Add to Home Screen) or Chrome on Android (menu ⋮ → Install app). First try “Install for free” above. If no system prompt appears, use the browser menu.',
      'Open Holistic House from the new Home Screen icon. Sign in to access your personal Cabinet.',
      'For private-message alerts, open Cabinet Settings and opt in separately. Availability depends on device and browser permissions.'
    ],
    privacy:'Your private messages, test answers and reports stay behind your account login. The installed app does not save private conversations for offline reading.',
    note:'This is the free Home Screen web app (PWA), not an APK download or a Google Play / App Store package. An internet connection is needed. Some services and courses are paid separately.'
  },
  ru:{
    title:'Установить Holistic House бесплатно',
    intro:'Добавьте Holistic House на главный экран iPhone или Android — отдельная иконка, окно как у приложения. Ваши сообщения, отчёты, тесты и курсы будут под рукой.',
    cost:'Установка бесплатна · Без App Store и Google Play',
    open:'Открыть кабинет',messages:'Мои сообщения',settings:'Настройки уведомлений',
    stepsTitle:'Три шага для установки',
    steps:[
      'В Safari на iPhone: Поделиться → На экран «Домой». В Chrome на Android: меню ⋮ → Установить приложение. Сначала попробуйте кнопку «Установить бесплатно» выше.',
      'Запустите Holistic House с новой иконки на главном экране и войдите в личный кабинет.',
      'Уведомления о личных сообщениях включаются отдельно в настройках, если телефон и браузер их поддерживают.'
    ],
    privacy:'Сообщения, ответы на тесты и отчёты остаются за входом в аккаунт. Установленное приложение не хранит личную переписку для офлайн-просмотра.',
    note:'Это бесплатная установка веб-приложения (PWA) на главный экран, а не скачивание APK и не Google Play / App Store. Для работы нужен интернет. Некоторые услуги и курсы оплачиваются отдельно.'
  },
  es:{
    title:'Instala Holistic House gratis',
    intro:'Añade Holistic House a la pantalla de inicio de tu iPhone o Android. Abre mensajes privados, informes, pruebas y cursos desde su propio icono, como una aplicación.',
    cost:'Instalación gratuita · Sin tienda de aplicaciones',
    open:'Abrir mi espacio',messages:'Abrir mis mensajes',settings:'Configurar notificaciones',
    stepsTitle:'Tres pasos para instalar',
    steps:[
      'En Safari (iPhone): Compartir → Añadir a la pantalla de inicio. En Chrome (Android): menú ⋮ → Instalar aplicación. Prueba primero «Instalar gratis» arriba.',
      'Abre Holistic House desde el nuevo icono e inicia sesión para acceder a tu espacio privado.',
      'Las alertas de mensajes son opcionales: actívalas por separado en Configuración si tu dispositivo lo permite.'
    ],
    privacy:'Los mensajes, las respuestas de pruebas y los informes permanecen protegidos por tu cuenta. Las conversaciones privadas no se guardan para leerlas sin conexión.',
    note:'Esta es una aplicación web para la pantalla de inicio (PWA), no un archivo APK ni una descarga desde Google Play / App Store. Necesita internet. Algunos servicios y cursos se pagan por separado.'
  }
}
export async function generateMetadata({params}){
  const {locale}=await params
  if(!COPY[locale])return {title:'Not found',robots:{index:false}}
  return {
    title:COPY[locale].title+' | Holistic House',
    description:COPY[locale].intro,
    robots:{index:false,follow:false},
    appleWebApp:{capable:true,title:'Holistic House',statusBarStyle:'black-translucent'},
    manifest:locale==='ru'?'/holistic-house-app-ru.webmanifest':locale==='es'?'/holistic-house-app-es.webmanifest':'/holistic-house-app.webmanifest',
    icons:{icon:'/icons/holistic-house-teal.svg',apple:'/holistic-house-icon/180'}
  }
}
export default async function InstallPage({params}){
  const {locale}=await params
  if(!Object.hasOwn(COPY,locale))notFound()
  const c=COPY[locale]
  return <main className={styles.wrap} data-hh-free-install-landing>
    <section className={styles.hero}>
      <Image src="/holistic-house-icon/192" unoptimized width={92} height={92} alt="Holistic House" className={styles.mark}/>
      <div>
        <p className={styles.eyebrow}>HOLISTIC HOUSE · FREE MOBILE APP</p>
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
        <p className={styles.free}>{c.cost}</p>
      </div>
    </section>
    <InstallHolisticHouse locale={locale} showGuideLink={false} landing/>
    <div className={styles.actions}>
      <Link className={styles.primary} href={`/${locale}/app/messages`}>{c.messages}</Link>
      <Link className={styles.link} href={`/${locale}/app/portrait`}>{c.open}</Link>
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
