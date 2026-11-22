'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Layers3, Target } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
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
  const [state,setState] = useState({accountId:null,goal:''})
  useEffect(()=>{
    if (!accountId) return undefined // Guest first screen is public, no private fetch.
    const controller = new AbortController()
    appFetch('coaching-life-plan?locale='+lang,undefined,'GET',{accountId,signal:controller.signal})
      .then(result=>{if(!controller.signal.aborted)setState({accountId,goal:findCurrentGoal(result)})})
      .catch(()=>{if(!controller.signal.aborted)setState({accountId,goal:''})})
    return ()=>controller.abort()
  },[accountId,lang])
  const goal = accountId && state.accountId===accountId ? state.goal : ''
  // The eight axis measurements do not themselves designate a chosen focus.
  // Until the owner explicitly saves a focus axis, display an honest invitation.
  return <nav className={styles.focusRow} aria-label={lang==='ru'?'Мои направления':lang==='es'?'Mi enfoque':'My focus'}
    data-profile-space-focus>
    <Link href={root+'/my-coaching-plan'} prefetch={false} className={styles.focusChip} data-profile-current-goal>
      <span className={styles.focusIcon}><Target size={25} aria-hidden="true"/></span>
      <span><small>{t.goal}</small><strong>{goal||t.noGoal}</strong></span>
      <ArrowUpRight size={16} aria-hidden="true"/>
    </Link>
    <Link href={root+'/portrait?space=path#daybook-axes'} prefetch={false} className={styles.focusChip} data-profile-chosen-axis>
      <span className={styles.focusIcon}><Layers3 size={25} aria-hidden="true"/></span>
      <span><small>{t.axis}</small><strong>{t.noAxis}</strong></span>
      <ArrowUpRight size={16} aria-hidden="true"/>
    </Link>
  </nav>
}
