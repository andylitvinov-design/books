'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Layers3, Target } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import {INNER_VECTOR_ITEMS,normalizeDevelopmentVectors} from '@/lib/profile/development-vectors.mjs'
import styles from './profile-space-dashboard.module.css'

// Only explicit, owner-saved ACTIVE goals may be shown as "Current Goal".
// Proposed coaching reports, suggested actions and test scores are not goals.
const COPY = {
  en:{goal:'Current Goal',axis:'Chosen Axis',noGoal:'Choose a goal',noAxis:'Choose an axis'},
  ru:{goal:'Моя цель',axis:'Выбранная ось',noGoal:'Выбрать цель',noAxis:'Выбрать ось'},
  es:{goal:'Meta actual',axis:'Eje elegido',noGoal:'Elegir meta',noAxis:'Elegir un eje'},
}
const OPEN_STATUS = new Set(['active','accepted','in_progress'])
const validText = value => typeof value === 'string' ? value.trim().slice(0,180) : ''
function findCurrentGoal(result) {
  if (!Array.isArray(result?.goals)) return ''
  return validText(result.goals.find(goal => OPEN_STATUS.has(goal?.status) && validText(goal?.title))?.title)
}

export function ProfileSpaceFocus({ locale='en', root='/en/app', accountId=null }) {
  const lang = Object.hasOwn(COPY,locale) ? locale : 'en'
  const t = COPY[lang]
  const [state,setState] = useState({accountId:null,goal:'',axis:''})
  useEffect(()=>{
    if (!accountId) return undefined // Guests never request private goal or axis data.
    const controller = new AbortController()
    const refresh=()=>Promise.allSettled([
      appFetch('coaching-life-plan?locale='+lang,undefined,'GET',{accountId,signal:controller.signal}),
      appFetch('development-goals',undefined,'GET',{accountId,signal:controller.signal})
    ]).then(([goalResult,axisResult])=>{
      if (controller.signal.aborted) return
      const plan=goalResult.status==='fulfilled'?goalResult.value:null
      const saved=axisResult.status==='fulfilled'
        ?normalizeDevelopmentVectors(axisResult.value?.goals?.vectors):null
      const selected=saved?.inner?.focusId
      const axis=INNER_VECTOR_ITEMS.find(item=>item.id===selected)?.name?.[lang]||''
      setState({accountId,goal:findCurrentGoal(plan),axis})
    })
    void refresh()
    window.addEventListener('hh:development-vectors-saved',refresh)
    return ()=>{
      controller.abort()
      window.removeEventListener('hh:development-vectors-saved',refresh)
    }
  },[accountId,lang])
  const goal = accountId && state.accountId===accountId ? state.goal : ''
  const axis = accountId && state.accountId===accountId ? state.axis : ''
  return <nav className={styles.focusRow} aria-label={lang==='ru'?'Мои направления':lang==='es'?'Mi enfoque':'My focus'}
    data-profile-space-focus>
    <Link href={root+'/my-coaching-plan'} prefetch={false} className={styles.focusChip} data-profile-current-goal>
      <span className={styles.focusIcon}><Target size={25} aria-hidden="true"/></span>
      <span><small>{t.goal}</small><strong>{goal||t.noGoal}</strong></span>
      <ArrowUpRight size={16} aria-hidden="true"/>
    </Link>
    <Link href={'/'+lang+'/development-vectors'} prefetch={false} className={styles.focusChip} data-profile-chosen-axis>
      <span className={styles.focusIcon}><Layers3 size={25} aria-hidden="true"/></span>
      <span><small>{t.axis}</small><strong>{axis||t.noAxis}</strong></span>
      <ArrowUpRight size={16} aria-hidden="true"/>
    </Link>
  </nav>
}
