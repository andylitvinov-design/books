import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PublicSiteHeader} from '@/components/public-site-header'
import PublicTelegramNewsOptIn from '@/components/public-telegram-news-optin'
import {publicLocales} from '@/lib/public-locales'
import type {PublicLocale} from '@/lib/public-locales'
import {metadataBaseFor} from '@/data/site-metadata'
import styles from '../../contact/page.module.css'

type Props={params:Promise<{locale:string}>}
const COPY={
 en:{title:'Telegram updates · Holistic House',intro:'Subscribe to public educational news without creating an account.',back:'Back to contact options'},
 ru:{title:'Новости в Telegram · Holistic House',intro:'Подпишитесь на полезные материалы без регистрации аккаунта.',back:'Все способы связи'},
 es:{title:'Noticias por Telegram · Holistic House',intro:'Recibe noticias educativas sin crear una cuenta.',back:'Opciones de contacto'},
}
const valid=(locale:string):locale is PublicLocale=>publicLocales.includes(locale as PublicLocale)
export const dynamic='force-static'
export function generateStaticParams(){return publicLocales.map(locale=>({locale}))}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale}=await params
 if(!valid(locale))return {title:'Not found'}
 const t=COPY[locale]
 return {metadataBase:metadataBaseFor(),title:t.title,description:t.intro,
  alternates:{canonical:'/'+locale+'/subscribe/telegram',
   languages:{en:'/en/subscribe/telegram',ru:'/ru/subscribe/telegram',
    es:'/es/subscribe/telegram','x-default':'/en/subscribe/telegram'}}}
}
export default async function TelegramGuestNewsPage({params}:Props){
 const {locale}=await params
 if(!valid(locale))notFound()
 const t=COPY[locale]
 return <main className={styles.root} lang={locale}>
   <PublicSiteHeader locale={locale}/>
   <div className={styles.wrap}>
    <header className={styles.hero}>
     <span className={styles.kicker}>HOLISTIC HOUSE · TELEGRAM</span>
     <h1>{t.title}</h1><p>{t.intro}</p>
    </header>
    <PublicTelegramNewsOptIn locale={locale}/>
    <p className={styles.privacy}>
      <Link href={'/'+locale+'/contact'}>{t.back} →</Link>
    </p>
   </div>
 </main>
}
