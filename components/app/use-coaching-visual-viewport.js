'use client'

import {useEffect} from 'react'

// Keep private Coaching and Academy players inside the iOS Safari *visible*
// viewport, including the keyboard and changing browser chrome. Never persist
// viewport measurements or client answers to storage.
export function useCoachingVisualViewport(rootRef){
  useEffect(()=>{
    const node=rootRef.current
    if(!node)return
    const viewport=window.visualViewport
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const update=()=>{
      const height=Math.max(1,Math.round(viewport?.height||window.innerHeight))
      node.style.setProperty('--coaching-viewport-height',height+'px')
      node.style.setProperty('--coaching-viewport-top',Math.max(0,Math.round(viewport?.offsetTop||0))+'px')
    }
    update()
    window.addEventListener('resize',update)
    viewport?.addEventListener('resize',update)
    viewport?.addEventListener('scroll',update)
    return ()=>{
      window.removeEventListener('resize',update)
      viewport?.removeEventListener('resize',update)
      viewport?.removeEventListener('scroll',update)
      node.style.removeProperty('--coaching-viewport-height')
      node.style.removeProperty('--coaching-viewport-top')
      document.body.style.overflow=previousOverflow
    }
  },[rootRef])
}
