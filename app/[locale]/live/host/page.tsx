import {notFound} from 'next/navigation'
import {PublicSiteHeader} from '@/components/public-site-header'
import {LiveAudioRoom} from '@/components/live-audio-room'
import '../live-audio.css'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Host Live Audio | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
const copy={
  en:{eyebrow:'My Practice · Live Audio',title:'Start a voice broadcast',lead:'The microphone turns on only after you press Start. No camera and no recording.'},
  ru:{eyebrow:'Моя практика · Аудиоэфир',title:'Запустить голосовой эфир',lead:'Микрофон включится только после нажатия «Начать эфир». Камера и запись выключены.'},
  es:{eyebrow:'Mi práctica · Audio en vivo',title:'Iniciar una transmisión de voz',lead:'El micrófono se activa solo cuando pulses Iniciar. Sin cámara ni grabación.'},
}
export default async function LiveAudioHostPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params
  if(!Object.hasOwn(copy,locale))notFound()
  const lang=locale as keyof typeof copy
  const t=copy[lang]
  return <>
    <PublicSiteHeader locale={lang}/>
    <main className="hh-live-page" data-hh-live-host-page>
      <div className="hh-live-shell">
        <p className="hh-live-eyebrow">{t.eyebrow}</p>
        <h1 className="hh-live-title">{t.title}</h1>
        <p className="hh-live-lead">{t.lead}</p>
        <LiveAudioRoom role="host" locale={lang}/>
      </div>
    </main>
  </>
}
