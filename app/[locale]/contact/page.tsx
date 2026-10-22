import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PublicSiteHeader} from '@/components/public-site-header'
import {publicLocales} from '@/lib/public-locales'
import type {PublicLocale} from '@/lib/public-locales'
import {metadataBaseFor} from '@/data/site-metadata'
import {whatsappEnquiryUrl,telegramEnquiryUrlFromWhatsApp} from '@/lib/whatsapp-enquiry'
import styles from './page.module.css'

type Props={params:Promise<{locale:string}>}
const validContactLocale=(value:string):value is PublicLocale=>publicLocales.includes(value as PublicLocale)
const COPY={
 en:{
  eyebrow:'HOLISTIC HOUSE · CONTACT',title:'Contact Holistic House',
  subtitle:'Ask a question, discuss a consultation or get help with your private account. Your message is sent only when you choose Send.',
  msgTitle:'Message Andrey',msg:'For general questions, request a personal reply in WhatsApp or Telegram. Neither app shares your phone number with Holistic House automatically.',
  whatsapp:'Continue in WhatsApp',telegram:'Continue in Telegram',
  consultations:'Business & coaching consultations',consultationText:'Prefer to submit your name and optional email or international phone number? Use the secure business consultation form. The number is used for replying to your request, not marketing.',
  form:'Open consultation form',cabinet:'Client Cabinet contact settings',cabinetText:'Signed-in clients can save or delete a private, unverified contact phone in Settings and separately enable Web Push.',
  settings:'Open Cabinet settings',about:'Meet Andrey',privacy:'Phone numbers and private records are not read from your messenger apps. Never include test reports or confidential health data in public messages.',
 },
 ru:{
  eyebrow:'HOLISTIC HOUSE · КОНТАКТЫ',title:'Связаться с Holistic House',
  subtitle:'Задайте вопрос, обсудите консультацию или получите помощь с личным кабинетом. Сообщение будет отправлено только после вашего подтверждения.',
  msgTitle:'Написать Андрею',msg:'По общим вопросам напишите в WhatsApp или Telegram. Сайт не получает номер телефона из переписки автоматически.',
  whatsapp:'Написать в WhatsApp',telegram:'Написать в Telegram',
  consultations:'Бизнес- и коучинг-консультации',consultationText:'Хотите оставить имя и телефон с кодом страны или email? Заполните защищённую форму заявки. Контакт используется для ответа, а не для рекламной рассылки.',
  form:'Открыть форму консультации',cabinet:'Контакты личного кабинета',cabinetText:'В настройках авторизованный клиент может сохранить или удалить личный неподтверждённый номер и отдельно включить Web Push.',
  settings:'Открыть настройки кабинета',about:'Об Андрее',privacy:'Мы не считываем телефоны из мессенджеров и не помещаем медицинские сведения в публичные сообщения.',
 },
 es:{
  eyebrow:'HOLISTIC HOUSE · CONTACTO',title:'Contactar con Holistic House',
  subtitle:'Haz una pregunta, consulta una sesión o pide ayuda con tu cuenta. El mensaje se envía solo cuando confirmas Enviar.',
  msgTitle:'Escribir a Andrey',msg:'Contacta por WhatsApp o Telegram. El sitio no obtiene tu número automáticamente de conversaciones privadas.',
  whatsapp:'Abrir WhatsApp',telegram:'Abrir Telegram',
  consultations:'Consultoría y coaching',consultationText:'Puedes dejar nombre, correo o teléfono internacional mediante el formulario privado. Tu contacto se usa para responder, no para marketing.',
  form:'Abrir formulario',cabinet:'Teléfono de cuenta privada',cabinetText:'En Ajustes, clientes autenticados pueden guardar o eliminar un teléfono no verificado y activar Web Push por separado.',
  settings:'Abrir ajustes',about:'Conoce a Andrey',privacy:'El sitio no extrae números de aplicaciones de chat ni solicita información médica confidencial en mensajes públicos.',
 },
}
export const dynamic='force-static'
export function generateStaticParams(){return publicLocales.map(locale=>({locale}))}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale}=await params
 if(!validContactLocale(locale))return {title:'Not found'}
 const l=locale as PublicLocale
 return {metadataBase:metadataBaseFor(),title:COPY[l].title,
  description:COPY[l].subtitle,alternates:{canonical:'/'+locale+'/contact',
   languages:{en:'/en/contact',ru:'/ru/contact',es:'/es/contact','x-default':'/en/contact'}}}
}
export default async function ContactPage({params}:Props){
 const {locale}=await params
 if(!validContactLocale(locale))notFound()
 const l=locale as PublicLocale,t=COPY[l]
 const whatsapp=whatsappEnquiryUrl({locale:l,service:'Holistic House',
  request:'General contact enquiry',pagePath:'/'+locale+'/contact'})
 const telegram=telegramEnquiryUrlFromWhatsApp(whatsapp)
 return <main className={styles.root} lang={l}>
  <PublicSiteHeader locale={l}/>
  <div className={styles.wrap}>
   <header className={styles.hero}>
    <span className={styles.kicker}>{t.eyebrow}</span>
    <h1>{t.title}</h1><p>{t.subtitle}</p>
   </header>
   <div className={styles.grid}>
    <section className={styles.card}><h2>{t.msgTitle}</h2><p>{t.msg}</p>
     <div className={styles.actions}>
      <a href={whatsapp} className={styles.primary} target="_blank" rel="noopener noreferrer">{t.whatsapp} ↗</a>
      <a href={telegram} className={styles.secondary} target="_blank" rel="noopener noreferrer">{t.telegram} ↗</a>
     </div>
    </section>
    <section className={styles.card}><h2>{t.consultations}</h2><p>{t.consultationText}</p>
     <Link href={'/'+locale+'/explore/business'} className={styles.secondary}>{t.form} →</Link>
    </section>
    <section className={styles.card}><h2>{t.cabinet}</h2><p>{t.cabinetText}</p>
     <Link href={'/'+locale+'/app/settings#hh-client-contact-phone'} className={styles.secondary}>{t.settings} →</Link>
    </section>
   </div>
   <p className={styles.privacy}>{t.privacy} <Link href={'/'+locale+'/about'}>{t.about} →</Link></p>
  </div>
 </main>
}
