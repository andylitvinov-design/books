'use client'
import {useState} from 'react'
import {PlayCircle,Video} from 'lucide-react'
import {parseSessionYouTubeUrl} from '@/lib/clients/youtube-resource'
import styles from './client-session.module.css'

// Opt-in, click-to-load. The iframe never loads on a private consultation
// until its viewer explicitly presses Play; no tracking thumbnail request.
export function SessionYouTubePlayer({title,url,description='',locale='en'}) {
  const [started,setStarted]=useState(false)
  const parsed=parseSessionYouTubeUrl(url)
  if(!parsed)return null
  const ru=locale==='ru'
  const label=title||(ru?'Обучающее видео':'Educational video')
  return <article className={styles.youtubeLesson}>
    <div className={styles.youtubeLessonHeading}>
      <Video size={19} aria-hidden="true"/>
      <div>
        <strong>{label}</strong>
        <small>{ru?'Общее обучающее видео · YouTube':'General educational video · YouTube'}</small>
      </div>
    </div>
    <div className={styles.youtubeLessonFrame}>
      {started?
        <iframe title={label} src={'https://www.youtube-nocookie.com/embed/'+parsed.id+'?rel=0'}
          loading="lazy" referrerPolicy="origin"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen/>:
        <button type="button" className={styles.youtubeLessonStart}
          onClick={()=>setStarted(true)} aria-label={(ru?'Смотреть видео: ':'Play video: ')+label}>
          <PlayCircle size={46} aria-hidden="true"/>
          <span>{ru?'Смотреть видео':'Play video'}</span>
        </button>}
    </div>
    {description&&<p className={styles.youtubeLessonDescription}>{description}</p>}
    {!started&&<p className={styles.youtubeLessonPrivacy}>{ru?
      'Плеер YouTube загрузится только после нажатия. YouTube получит технические данные просмотра.':
      'YouTube loads only when you press Play. YouTube may receive viewing data.'}</p>}
  </article>
}
