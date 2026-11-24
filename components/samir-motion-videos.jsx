'use client'
import {useEffect,useRef,useState} from 'react'
import {SAMIR_MOTION_TAKES,samirMotionPath,nextSamirMotionTake} from '@/lib/coaching/samir-motion.mjs'
import styles from './my-coach-motion-media.module.css'

// One continuous three-clip idle reel; real listening and reviewed speaking
// cues override it. Only the incoming and outgoing take briefly overlap.
export default function SamirMotionVideos({take='idle',cycle=false,onReady}){
  const refs=useRef({})
  const wanted=useRef(null)
  const [visible,setVisible]=useState(null)
  const [failed,setFailed]=useState([])
  const [reelTake,setReelTake]=useState('idle')
  const selected=cycle?(failed.includes(reelTake)?nextSamirMotionTake(reelTake,failed):reelTake):take
  const target=selected&&!failed.includes(selected)?selected:null
  const next=cycle&&target?nextSamirMotionTake(target,failed):null
  wanted.current=target
  useEffect(()=>{
    if(!target){setVisible(null);onReady?.(false);return}
    const video=refs.current[target]
    if(!video)return
    if(video.paused||video.ended){
      try{video.currentTime=0}catch{}
      const started=video.play()
      if(started?.catch)void started.catch(()=>{
        if(wanted.current===target)onReady?.(false)
      })
    }else{
      setVisible(target)
      onReady?.(true)
    }
  },[target,onReady])
  useEffect(()=>{
    if(!visible)return
    const task=setTimeout(()=>{
      for(const [name,video] of Object.entries(refs.current)){
        if(name!==visible&&name!==wanted.current)video?.pause()
      }
    },340)
    return()=>clearTimeout(task)
  },[visible])
  useEffect(()=>{
    const videos=refs.current
    return()=>{for(const video of Object.values(videos))video?.pause()}
  },[])
  return SAMIR_MOTION_TAKES.map(name=>
    <video key={name}
      ref={node=>{if(node)refs.current[name]=node;else delete refs.current[name]}}
      className={[styles.video,styles.samirLayer].join(' ')}
      data-samir-video-take={name}
      data-samir-visible={visible===name?'true':'false'}
      src={samirMotionPath(name)}
      muted playsInline loop={!cycle||next===name} preload={name===target||name===next?'metadata':'none'}
      controls={false} disablePictureInPicture
      onPlaying={()=>{
        if(wanted.current!==name)return
        setVisible(name)
        onReady?.(true)
      }}
      onEnded={()=>{
        if(cycle&&wanted.current===name&&next)setReelTake(next)
      }}
      onError={()=>{
        setFailed(prior=>prior.includes(name)?prior:[...prior,name])
        if(wanted.current===name)onReady?.(false)
      }}
      aria-hidden="true" />
  )
}
