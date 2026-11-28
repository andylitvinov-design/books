'use client'
import {useEffect,useState} from 'react'
import {caesarVideoMetadataMatches} from '@/lib/coaching/caesar-greeting-video.mjs'
const fill={position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 20%'}
export default function CaesarGreetingMedia({media,videoRef,active,waiting}){
 const [motion,setMotion]=useState(false),[neutralReady,setNeutralReady]=useState(false),[neutralFailed,setNeutralFailed]=useState(false)
 useEffect(()=>{
  const pref=window.matchMedia('(prefers-reduced-motion: reduce)')
  const sync=()=>setMotion(!pref.matches&&document.visibilityState==='visible')
  sync();pref.addEventListener?.('change',sync);document.addEventListener('visibilitychange',sync)
  return()=>{pref.removeEventListener?.('change',sync);document.removeEventListener('visibilitychange',sync)}
 },[])
 const showNeutral=motion&&!active&&!waiting&&!neutralFailed
 useEffect(()=>{if(!showNeutral)setNeutralReady(false)},[showNeutral])
 function validate(video){if(caesarVideoMetadataMatches(video,media.neutral))return true;video.pause();setNeutralFailed(true);setNeutralReady(false);return false}
 return <span data-coach-motion-context="greeting" data-coach-motion-media="caesar" style={{position:'absolute',inset:0,overflow:'hidden',display:'block'}}>
  <img src={media.poster} alt="" draggable={false} style={fill}/>
  {showNeutral&&<video src={media.neutral.src} poster={media.poster} playsInline muted autoPlay loop preload="metadata" style={{...fill,visibility:neutralReady?'visible':'hidden'}} onLoadedMetadata={e=>validate(e.currentTarget)} onPlaying={e=>{if(validate(e.currentTarget))setNeutralReady(true)}} onError={()=>{setNeutralFailed(true);setNeutralReady(false)}}/>}
  {media.greeting&&<video ref={videoRef} poster={media.poster} playsInline preload="none" data-caesar-greeting-visible={active?'true':'false'} style={{...fill,visibility:active?'visible':'hidden'}}/>}
 </span>
}
