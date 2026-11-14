'use client'

import {useEffect,useState} from 'react'
import {SiteVideoPlayer} from '@/components/site-video-player'
import {ENGLISH_HEYGEN_INTRO_ID} from '@/lib/youtube/english-master-catalog.mjs'

// The initial render uses the exact approved EN/RU video from the profile;
// only a server-confirmed owner-uploaded EN master can replace its source.
export function ProfilePresentationPlayer({locale,presentation,poster}){
  const [verifiedId,setVerifiedId]=useState(null)
  useEffect(()=>{
    setVerifiedId(null)
    if(locale!=='en'||presentation?.heygenId!==ENGLISH_HEYGEN_INTRO_ID)return
    const controller=new AbortController()
    fetch('/api/public/english-intro-video',{
      method:'GET',cache:'no-store',credentials:'omit',signal:controller.signal
    }).then(response=>response.ok?response.json():null)
      .then(data=>{
        if(!controller.signal.aborted&&/^[A-Za-z0-9_-]{11}$/.test(data?.youtubeId||''))
          setVerifiedId(data.youtubeId)
      }).catch(()=>{})
    return ()=>controller.abort()
  },[locale,presentation?.heygenId])
  const youtubeReady=locale==='en'&&/^[A-Za-z0-9_-]{11}$/.test(verifiedId||'')
  const source=youtubeReady
    ?{youtubeId:verifiedId,title:presentation.title,
      durationSeconds:presentation.durationSeconds,language:'en'}
    :presentation
  return <div data-profile-presentation-locale={locale}
    data-profile-presentation-source={youtubeReady||source.youtubeId?'youtube':'heygen'}>
    <SiteVideoPlayer key={locale+':'+(verifiedId||source.youtubeId||source.heygenId)}
      video={source} locale={locale} minimal fallbackPoster={poster} />
  </div>
}
