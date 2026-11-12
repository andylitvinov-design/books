'use client'

import {useEffect} from 'react'

// Match the actually visible iPhone Safari viewport, including toolbars and
// keyboard changes. The account data stays in its existing encrypted session;
// never persist viewport measurements, drafts, or client identity here.
export function useCoachingVisualViewport(rootRef){
  useEffect(()=>{
    const root=rootRef.current
    if(!root||typeof window==='undefined')return
    const viewport=window.visualViewport
    const originalOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const update=()=>{
      const height=Math.max(1,Math.round(viewport?.height||window.innerHeight))
      const top=Math.max(0,Math.round(viewport?.offsetTop||0))
      root.style.setProperty('--coaching-viewport-height',height+'px')
      root.style.setProperty('--coaching-viewport-top',top+'px')
    }
    update()
    window.addEventListener('resize',update)
    viewport?.addEventListener('resize',update)
    viewport?.addEventListener('scroll',update)
    return ()=>{
      window.removeEventListener('resize',update)
      viewport?.removeEventListener('resize',update)
      viewport?.removeEventListener('scroll',update)
      root.style.removeProperty('--coaching-viewport-height')
      root.style.removeProperty('--coaching-viewport-top')
      document.body.style.overflow=originalOverflow
    }
  },[rootRef])
}
