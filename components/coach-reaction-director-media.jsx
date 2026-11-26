'use client'

import {useEffect,useRef,useState} from 'react'
import {createReactionPlayback} from '@/lib/coaching/coach-reaction-playback.mjs'
import styles from './my-coach-motion-media.module.css'

// Separate visual-only renderer for the verified V4 original-camera group.
// Two fixed video elements retain the outgoing endpoint until the incoming
// video is ready. The live audio owner and the legacy card player are untouched.
export default function CoachReactionDirectorMedia({media,intent,enabled,onReady}){
  const firstRef=useRef(null),secondRef=useRef(null)
  const controller=useRef(null)
  const readyRef=useRef(onReady)
  readyRef.current=onReady
  const [visible,setVisible]=useState(null)
  const [activeBlock,setActiveBlock]=useState(null)
  useEffect(()=>{
    const a=firstRef.current,b=secondRef.current
    if(!a||!b||!media)return
    setVisible(null);setActiveBlock(null);readyRef.current?.(false)
    const player=createReactionPlayback({
      media,videos:[a,b],
      onVisible:(slot,id)=>{setVisible(slot);setActiveBlock(id)},
      onReady:value=>readyRef.current?.(value)
    })
    controller.current=player
    return ()=>{controller.current=null;player.dispose()}
  },[media])
  useEffect(()=>{
    controller.current?.update(intent,enabled)
  },[media,intent,enabled])
  return [firstRef,secondRef].map((ref,index)=>
    <video key={index} ref={ref}
      className={[styles.video,styles.reactionLayer].join(' ')}
      data-coach-reaction-layer={index}
      data-reaction-visible={visible===index?'true':'false'}
      data-coach-reaction-block={visible===index?activeBlock:undefined}
      muted playsInline preload="none" controls={false}
      disablePictureInPicture aria-hidden="true"/>
  )
}
