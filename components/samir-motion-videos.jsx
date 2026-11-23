'use client'
import {useEffect,useRef,useState} from 'react'
import {SAMIR_MOTION_TAKES,samirMotionPath} from '@/lib/coaching/samir-motion.mjs'
import styles from './my-coach-motion-media.module.css'

// Three existing, silent first-party files. Render no network/provider/audio
// interactions. Play at most one new target and briefly overlap the old take
// for a gentle crossfade; interruption/listening immediately takes priority.
export default function SamirMotionVideos({take='idle',onReady}){
  const refs=useRef({})
  const wanted=useRef(take)
  const [visible,setVisible]=useState(null)
  const [failed,setFailed]=useState([])
  wanted.current=take
  useEffect(()=>{
    const video=refs.current[take]
    if(!video||failed.includes(take))return
    // Return to the naturally matched first frame upon a state switch.
    try{video.currentTime=0}catch{}
    const started=video.play()
    if(started?.catch)void started.catch(()=>{
      if(wanted.current===take)onReady?.(false)
    })
  },[take,failed])
  useEffect(()=>{
    if(!visible)return
    const task=setTimeout(()=>{
      for(const [name,video] of Object.entries(refs.current)){
        if(name!==visible)video?.pause()
      }
    },340)
    return()=>clearTimeout(task)
  },[visible])
  useEffect(()=>{
    return()=>{
      for(const video of Object.values(refs.current))video?.pause()
    }
  },[])
  return SAMIR_MOTION_TAKES.map(name=>
    <video key={name}
      ref={node=>{if(node)refs.current[name]=node;else delete refs.current[name]}}
      className={[styles.video,styles.samirLayer].join(' ')}
      data-samir-video-take={name}
      data-samir-visible={visible===name?'true':'false'}
      src={samirMotionPath(name)}
      muted playsInline loop preload={name===take?'metadata':'none'}
      controls={false} disablePictureInPicture
      onPlaying={()=>{
        if(wanted.current!==name)return
        setVisible(name)
        onReady?.(true)
      }}
      onError={()=>{
        if(!failed.includes(name))setFailed(prior=>prior.includes(name)?prior:[...prior,name])
        if(wanted.current===name){setVisible(null);onReady?.(false)}
      }}
      aria-hidden="true" />
  )
}
