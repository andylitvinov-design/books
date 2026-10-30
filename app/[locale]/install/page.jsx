import {notFound} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import InstallHolisticHouse from '@/components/app/install-holistic-house'
import nativeReleases from '@/data/native-public-releases.json'
import {getNativePublicDownloads} from '@/lib/native/public-downloads.mjs'
import styles from './install.module.css'

const COPY={
  en:{
    title:'Install Holistic House for free',
    intro:'Install our free Home Screen app (PWA) today. Your Messenger and Cabinet are inside. Native App Store and APK editions are not yet released.',
    cost:'Ready now · free PWA · Messenger included',available:'Available to install now',
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
    intro:'Бесплатное приложение на экран iPhone или Android — уже доступно. Внутри мессенджер и кабинет. Нативные версии App Store и APK пока не выпущены.',
    cost:'Установка сейчас · бесплатно · с мессенджером',available:'Можно установить сейчас',
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
    intro:'Instala gratis la PWA en la pantalla de inicio del móvil. Incluye mensajería y tu espacio privado; las versiones nativas aún no se publican.',
    cost:'Disponible ahora · gratis · con mensajería',available:'Disponible para instalar ahora',
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
const NATIVE_COPY={
  en:{
    title:'Real iPhone and Android applications',
    intro:'These are native install packages — not browser shortcuts. Downloads appear here only after signed releases and real-device acceptance tests.',
    iosTitle:'iPhone · iOS',iosText:'Public installation requires the official App Store release. A personal unsigned IPA cannot be installed by everyone from this website in Canada.',
    iosReady:'Open in App Store',iosPending:'App Store version is not published yet.',
    androidTitle:'Android · APK',androidText:'A release-signed APK can be downloaded from this site once its signature, version and private-account flows are verified.',
    androidReady:'Download verified Android APK',androidPending:'A verified, release-signed APK is not published yet.',
    statusReady:'Available',statusPending:'In preparation',
    trust:'Only approved releases are shown. No debug APK, unsigned IPA, test installer or customer data is distributed here.',
    webTitle:'Install Holistic House now — free web app',
    webIntro:'Add the existing app to your phone Home Screen in Safari or Chrome. This is a PWA, not a native App Store or APK download.',
  },
  ru:{
    title:'Настоящее приложение для iPhone и Android',
    intro:'Здесь появятся нативные установщики, а не ярлыки браузера. Загрузка включается только после проверки подписи, безопасности и работы на телефоне.',
    iosTitle:'iPhone · iOS',iosText:'Для массовой установки в Канаде нужен выпуск в App Store. Личный неподписанный IPA нельзя устанавливать всем прямо с этого сайта.',
    iosReady:'Открыть в App Store',iosPending:'Версия для App Store пока не опубликована.',
    androidTitle:'Android · APK',androidText:'Подписанный APK можно будет скачать здесь после проверки сертификата, версии, входа в аккаунт и переписки.',
    androidReady:'Скачать проверенный Android APK',androidPending:'Проверенный подписанный APK пока не опубликован.',
    statusReady:'Доступно',statusPending:'Готовится',
    trust:'Тестовые APK, неподписанные IPA и личные данные клиентов здесь не публикуются.',
    webTitle:'Установить Holistic House сейчас',
    webIntro:'Установка бесплатного PWA на экран телефона доступна сейчас через Safari или Chrome. Отдельный APK или App Store для этого не нужен.',
  },
  es:{
    title:'Aplicaciones reales para iPhone y Android',
    intro:'Aquí aparecerán instaladores nativos, no accesos directos del navegador. Solo se activarán después de verificar firmas, privacidad y pruebas en dispositivos reales.',
    iosTitle:'iPhone · iOS',iosText:'En Canadá, la distribución pública requiere App Store. Un IPA personal sin firmar no se puede instalar desde esta web para todo el mundo.',
    iosReady:'Abrir en App Store',iosPending:'La versión de App Store aún no está publicada.',
    androidTitle:'Android · APK',androidText:'El APK firmado estará aquí tras verificar el certificado, la versión, el inicio de sesión y los mensajes privados.',
    androidReady:'Descargar APK Android verificado',androidPending:'Todavía no hay un APK firmado y verificado publicado.',
    statusReady:'Disponible',statusPending:'En preparación',
    trust:'No compartimos APK de depuración, IPA sin firmar ni datos privados de clientes.',
    webTitle:'Instala Holistic House ahora',
    webIntro:'Instala ahora la PWA gratuita desde Safari o Chrome en la pantalla de inicio. No requiere App Store ni descargar un APK.',
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
  const native=NATIVE_COPY[locale]
  const downloads=getNativePublicDownloads(nativeReleases)
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
    <section className={styles.webSection} aria-label={native.webTitle} data-hh-pwa-alternative>
      <span className={styles.available} data-hh-install-ready>{c.available}</span>
      <h2>{native.webTitle}</h2>
      <InstallHolisticHouse locale={locale} showGuideLink={false} landing/>
      <p>{native.webIntro}</p>
    </section>
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
    <section className={styles.nativeSection} aria-labelledby="hh-native-title" data-hh-native-downloads>
      <h2 id="hh-native-title">{native.title}</h2>
      <p className={styles.nativeIntro}>{native.intro}</p>
      <div className={styles.nativeGrid}>
        <article className={styles.nativeCard} data-hh-native-ios>
          <span className={styles.releaseStatus}>{downloads.iosUrl?native.statusReady:native.statusPending}</span>
          <h3>{native.iosTitle}</h3><p>{native.iosText}</p>
          {downloads.iosUrl
            ? <a className={styles.nativeLink} href="/api/native-download/ios">{native.iosReady}</a>
            : <p className={styles.pending} data-hh-native-ios-pending>{native.iosPending}</p>}
        </article>
        <article className={styles.nativeCard} data-hh-native-android>
          <span className={styles.releaseStatus}>{downloads.androidUrl?native.statusReady:native.statusPending}</span>
          <h3>{native.androidTitle}</h3><p>{native.androidText}</p>
          {downloads.androidUrl
            ? <a className={styles.nativeLink} href="/api/native-download/android">{native.androidReady}</a>
            : <p className={styles.pending} data-hh-native-android-pending>{native.androidPending}</p>}
        </article>
      </div>
      <p className={styles.nativeTrust}>{native.trust}</p>
    </section>
  </main>
}
