'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import {initialCoachMicActivity,stepCoachMicActivity} from '@/lib/coaching/coach-reaction-director.mjs'

// Observe the EXISTING voice engine's normalized microphone level. No new
// getUserMedia, AudioContext, voice recording, transcription or network request.
export default function useCoachReactionActivity(phase,personaId){
  const phaseRef=useRef(phase)
  phaseRef.current=phase
  const activity=useRef(initialCoachMicActivity())
  const staleTimer=useRef(null)
  const [active,setActive]=useState(false)
  const clearTimer=useCallback(()=>{
    if(staleTimer.current!==null)clearTimeout(staleTimer.current)
    staleTimer.current=null
  },[])
  useEffect(()=>{
    clearTimer()
    activity.current=initialCoachMicActivity()
    setActive(false)
    return clearTimer
  },[phase,personaId,clearTimer])
  const observe=useCallback(level=>{
    if(phaseRef.current!=='listening')return
    const prior=activity.current
    const next=stepCoachMicActivity(prior,Number(level)||0,Date.now(),'listening')
    activity.current=next
    if(prior.active!==next.active)setActive(next.active)
    clearTimer()
    staleTimer.current=setTimeout(()=>{
      const wasActive=activity.current.active
      activity.current=initialCoachMicActivity()
      if(wasActive)setActive(false)
      staleTimer.current=null
    },750)
  },[clearTimer])
  return {micActive:phase==='listening'&&active,observe}
}
