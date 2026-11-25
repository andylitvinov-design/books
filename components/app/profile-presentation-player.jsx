'use client'

import {useEffect,useState} from 'react'
import {SiteVideoPlayer} from '@/components/site-video-player'
import {ENGLISH_HEYGEN_INTRO_ID} from '@/lib/youtube/english-master-catalog.mjs'
import styles from './profile-presentation-player.module.css'

const youtubeIdValid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(id)

// HeyGen is the owner's production/master library. My Space EN is strictly
// a YouTube PLAYER: it must never create a HeyGen embed, even when the mirror
// hasn't been uploaded yet. The RU video keeps its existing verified source.
export function ProfilePresentationPlayer({locale,presentation,poster}){
  const [verifiedId,setVerifiedId]=useState(null)
  const [checked,setChecked]=useState(false)
  useEffect(()=>{
    setVerifiedId(null)
    setChecked(false)
    if(locale!=='en'||presentation?.heygenId!==ENGLISH_HEYGEN_INTRO_ID)return
    const controller=new AbortController()
    let active=true,checking=false,resolved=false
    const refresh=async()=>{
      if(!active||checking||resolved||document.visibilityState==='hidden')return
      checking=true
      try{
        const response=await fetch('/api/public/english-intro-video',{
          method:'GET',cache:'no-store',credentials:'omit',signal:controller.signal
        })
        const data=response.ok?await response.json():null
        if(!active)return
        const id=youtubeIdValid(data?.youtubeId)?data.youtubeId:null
        if(id){resolved=true;setVerifiedId(id)}
      }catch{/* Keep the honest in-page state; never guess or replace a video. */}
      finally{checking=false;if(active)setChecked(true)}
    }
    void refresh()
    // Refresh when the visitor returns from another tab after an upload.
    // Do not poll every guest: this prevents unnecessary Vercel/Redis costs.
    const onVisible=()=>{if(document.visibilityState!=='hidden')void refresh()}
    window.addEventListener('focus',onVisible)
    document.addEventListener('visibilitychange',onVisible)
    return ()=>{
      active=false
      controller.abort()
      window.removeEventListener('focus',onVisible)
      document.removeEventListener('visibilitychange',onVisible)
    }
  },[locale,presentation?.heygenId])

  const youtubeReady=locale==='en'&&
    presentation?.heygenId===ENGLISH_HEYGEN_INTRO_ID&&youtubeIdValid(verifiedId)
  // If there is no verified upload, show an honest in-place state rather than an
  // external action. Never substitute a short clip, RU narration or HeyGen.
  const source=youtubeReady
    ?{youtubeId:verifiedId,title:presentation.title,
      durationSeconds:presentation.durationSeconds,language:'en'}
    :locale==='en'?null:presentation

  if(locale==='en'&&!youtubeReady){
    return <div data-profile-presentation-locale="en"
      data-profile-presentation-source="youtube-pending"
      data-profile-youtube-status={checked?'awaiting-verified-upload':'checking'}>
      <div className={styles.pending} aria-label="English Holistic House presentation">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Holistic House · English</p>
          <h3 className={styles.title}>It Starts With You</h3>
          <p className={styles.note} role="status">
            {checked
              ?'The full English YouTube presentation will play here once its upload is verified.'
              :'Checking the English YouTube presentation…'}
          </p>
        </div>
      </div>
    </div>
  }

  return <div data-profile-presentation-locale={locale}
    data-profile-presentation-source="youtube">
    <SiteVideoPlayer key={locale+':'+(verifiedId||source.youtubeId)}
      video={source} locale={locale} minimal fallbackPoster={poster} internalOnly />
  </div>
}
