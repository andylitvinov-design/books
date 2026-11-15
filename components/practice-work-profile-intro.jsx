'use client'

import Link from 'next/link'
import { BookOpen, ClipboardList, FileText, Home, Leaf, Plus, Users, BriefcaseBusiness } from 'lucide-react'
import { ProfileModeSwitch } from './master-mode-switch'
import { SiteVideoPlayer } from './site-video-player'
import { profilePresentationForLocale } from '@/lib/profile-presentation.mjs'
import styles from './app/profile-hub-tabs.module.css'

// Work reuses Live's actual localized presentation video, narrow language/mode header,
// and 6+4 navigation layout; neither mode switch nor language switch needs an account.
// The guest-facing surface performs no private account reads; only explicit tool clicks
// invoke PracticeShowcase's existing signed-in / Google / Telegram action gate.
const POSTER = '/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg'
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
  const presentation = profilePresentationForLocale(locale)
  return <section className={styles.hub} data-profile-hub-tabs data-profile-work-hub data-profile-active="today">
    <header className={styles.heading} data-practice-workspace-heading>
      <div><p className={styles.eyebrow}>{t.spaceEyebrow}</p><h2>{t.title}</h2></div>
      <div className={styles.profileHeadingActions}>
        <nav className={styles.languageSwitch} data-profile-language-switch
          aria-label={locale === 'ru' ? 'Язык сайта' : locale === 'es' ? 'Idioma del sitio' : 'Site language'}>
          {['ru','en'].map(language => <Link key={language} href={'/' + language + '/practice'} prefetch={false}
            lang={language} hrefLang={language} aria-current={locale === language ? 'page' : undefined}
            data-profile-language={language}>{language.toUpperCase()}</Link>)}
        </nav>
        <ProfileModeSwitch locale={locale} active="work" />
      </div>
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
        {presentation ? <div data-profile-presentation-locale={locale}
          data-profile-presentation-source={presentation.youtubeId ? 'youtube' : 'heygen'}>
          <SiteVideoPlayer key={locale} video={presentation} locale={locale}
            minimal fallbackPoster={POSTER} />
        </div> : <video controls playsInline preload="none" poster={POSTER}
          aria-label={VIDEO_LABEL[locale] || VIDEO_LABEL.en}>
          <source src="/videos/holistic-house/film-collection-v3/sun-autumn-hills.mp4" type="video/mp4" />
          <track kind="captions" src="/videos/holistic-house/profile-scenic.en.vtt" srcLang="en" label="English" />
        </video>}
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
