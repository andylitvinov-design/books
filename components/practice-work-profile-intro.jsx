'use client'

import { BookOpen, ClipboardList, FileText, Home, Leaf, Plus, Users, BriefcaseBusiness } from 'lucide-react'
import { ProfileModeSwitch } from './master-mode-switch'
import styles from './app/profile-hub-tabs.module.css'

// Work deliberately reuses the exact visual tokens, nature film and 6+4 layout of Live.
// The guest-facing surface performs no private account reads; only explicit tool clicks
// invoke PracticeShowcase's existing signed-in / Google / Telegram action gate.
const VIDEO_LABEL = {
  en:'Scenic introduction to My Space · Work',
  ru:'Природное видео · Моё пространство · Работа',
  es:'Vídeo de naturaleza · Mi espacio · Trabajo',
}
const TABS = [
  { id:'today', action:'practice', Icon:Home },
  { id:'services', action:'services', Icon:Leaf },
  { id:'clients', action:'clients', Icon:Users },
  { id:'requests', action:'requests', Icon:ClipboardList },
  { id:'courses', action:'courseList', Icon:BookOpen },
  { id:'materials', action:'materials', Icon:FileText },
]
const ACTIONS = [
  { action:'services', label:'services', Icon:BriefcaseBusiness },
  { action:'service', label:'create', Icon:Plus },
  { action:'course', label:'course', Icon:BookOpen },
  { action:'requests', label:'requests', Icon:ClipboardList },
]

export default function PracticeWorkProfileIntro({ locale, t, onAction }) {
  return <section className={styles.hub} data-profile-hub-tabs data-profile-work-hub data-profile-active="today">
    <header className={styles.heading} data-practice-workspace-heading>
      <div><p className={styles.eyebrow}>{t.spaceEyebrow}</p><h2>{t.title}</h2></div>
      <ProfileModeSwitch locale={locale} active="work" />
    </header>
    <nav className={styles.tabs} data-work-profile-tabs aria-label={t.workNavigation}>
      {TABS.map(({id,action,Icon}) =>
        <button key={id} type="button" data-work-profile-tab={id}
          aria-current={id==='today'?'page':undefined}
          className={id==='today'?styles.current:styles.tab}
          onClick={() => onAction(action)}>
          <Icon size={20} strokeWidth={1.9} aria-hidden="true" /><span>{t.workTabs[id]}</span>
        </button>)}
    </nav>
    <div className={styles.hero} data-profile-video-hero data-work-video-hero>
      <div className={styles.videoFrame}>
        <video controls playsInline preload="none"
          poster="/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg"
          aria-label={VIDEO_LABEL[locale] || VIDEO_LABEL.en}>
          <source src="/videos/holistic-house/film-collection-v3/sun-autumn-hills.mp4" type="video/mp4" />
          <track kind="captions" src="/videos/holistic-house/profile-scenic.en.vtt" srcLang="en" label="English" />
        </video>
      </div>
      <nav className={styles.quickActions} data-work-profile-quick-actions aria-label={t.workQuickLabel}>
        {ACTIONS.map(({action,label,Icon},index) =>
          <button key={action} type="button" data-work-quick-action={action}
            className={index===0?styles.primaryQuickAction:undefined}
            onClick={() => onAction(action)}>
            <Icon size={19} aria-hidden="true" />{t.workQuick[label]}
          </button>)}
      </nav>
    </div>
  </section>
}
