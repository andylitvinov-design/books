'use client'

import {useEffect,useState} from 'react'
import {SiteVideoPlayer} from '@/components/site-video-player'
import {ENGLISH_HEYGEN_INTRO_ID} from '@/lib/youtube/english-master-catalog.mjs'
import styles from './profile-presentation-player.module.css'

const ENGLISH_CHANNEL='https://www.youtube.com/@aatapro'
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
    fetch('/api/public/english-intro-video',{
      method:'GET',cache:'no-store',credentials:'omit',signal:controller.signal
    }).then(response=>response.ok?response.json():null)
      .then(data=>{
        if(!controller.signal.aborted)
          setVerifiedId(youtubeIdValid(data?.youtubeId)?data.youtubeId:null)
      }).catch(()=>{
        if(!controller.signal.aborted)setVerifiedId(null)
      }).finally(()=>{
        if(!controller.signal.aborted)setChecked(true)
      })
    return ()=>controller.abort()
  },[locale,presentation?.heygenId])

  const youtubeReady=locale==='en'&&
    presentation?.heygenId===ENGLISH_HEYGEN_INTRO_ID&&youtubeIdValid(verifiedId)
  // If the verified upload is absent, display a real channel link and honest
  // state. Never substitute the older 29-second video, RU narration, or HeyGen.
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
              ?'Watch the full presentation here once its English YouTube upload is verified.'
              :'Checking the English YouTube presentation…'}
          </p>
          <a className={styles.channelLink} href={ENGLISH_CHANNEL}
            target="_blank" rel="noopener noreferrer">
            Visit our English YouTube · @aatapro
          </a>
        </div>
      </div>
    </div>
  }

  return <div data-profile-presentation-locale={locale}
    data-profile-presentation-source="youtube">
    <SiteVideoPlayer key={locale+':'+(verifiedId||source.youtubeId)}
      video={source} locale={locale} minimal fallbackPoster={poster} />
  </div>
}
