import Image from 'next/image'
import {notFound} from 'next/navigation'
import nativeReleases from '@/data/native-public-releases.json'
import {getNativePublicDownloads} from '@/lib/native/public-downloads.mjs'
import InstallAction from './install-action'
import styles from './install.module.css'

const COPY = {
  en: {title: 'Install Holistic House for free', description: 'Add Holistic House to your Home Screen or open it now.'},
  ru: {title: 'Установить Holistic House бесплатно', description: 'Добавьте Holistic House на главный экран или откройте приложение сразу.'},
  es: {title: 'Instala Holistic House gratis', description: 'Añade Holistic House a tu pantalla de inicio o ábrelo ahora.'},
}

export async function generateMetadata({params}) {
  const {locale} = await params
  if (!Object.hasOwn(COPY, locale)) return {title: 'Not found', robots: {index: false}}
  return {
    title: COPY[locale].title,
    description: COPY[locale].description,
    robots: {index: false, follow: false},
    appleWebApp: {capable: true, title: 'Holistic House', statusBarStyle: 'black-translucent'},
    manifest: locale === 'ru' ? '/holistic-house-app-ru.webmanifest' :
      locale === 'es' ? '/holistic-house-app-es.webmanifest' : '/holistic-house-app.webmanifest',
    icons: {icon: '/icons/holistic-house-teal.svg', apple: '/holistic-house-icon/180'},
  }
}

export default async function InstallPage({params}) {
  const {locale} = await params
  if (!Object.hasOwn(COPY, locale)) notFound()
  const downloads = getNativePublicDownloads(nativeReleases)
  return (
    <main className={styles.wrap} data-hh-free-install-landing>
      <section className={styles.card} aria-labelledby="hh-install-title">
        <Image src="/holistic-house-app.svg" unoptimized priority width={88} height={88} alt="" className={styles.mark} />
        <h1 id="hh-install-title">Holistic House</h1>
        <InstallAction locale={locale} androidReleased={Boolean(downloads.androidUrl)} iosReleased={Boolean(downloads.iosUrl)} />
      </section>
    </main>
  )
}
