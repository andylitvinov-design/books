import {notFound} from 'next/navigation'
import {PublicSiteHeader} from '@/components/public-site-header'
import {LiveAudioRoom} from '@/components/live-audio-room'
import './live-audio.css'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Live Audio | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
const copy={
  en:{eyebrow:'Holistic House · Live Audio',title:'Join a live audio practice',lead:'Guided voice sessions and calm meditations. Listen directly in your browser without installing an app.'},
  ru:{eyebrow:'Holistic House · Аудиоэфиры',title:'Присоединяйтесь к аудиоэфиру',lead:'Живые голосовые практики и медитации. Слушайте прямо на сайте, без установки приложения.'},
  es:{eyebrow:'Holistic House · Audio en vivo',title:'Escucha una práctica en directo',lead:'Meditaciones y sesiones guiadas de voz. Escucha desde el navegador sin instalar otra aplicación.'},
}
export default async function LiveAudioPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params
  if(!Object.hasOwn(copy,locale))notFound()
  const lang=locale as keyof typeof copy
  const t=copy[lang]
  return <>
    <PublicSiteHeader locale={lang}/>
    <main className="hh-live-page" data-hh-live-listener-page>
      <div className="hh-live-shell">
        <p className="hh-live-eyebrow">{t.eyebrow}</p>
        <h1 className="hh-live-title">{t.title}</h1>
        <p className="hh-live-lead">{t.lead}</p>
        <LiveAudioRoom role="listener" locale={lang}/>
      </div>
    </main>
  </>
}
