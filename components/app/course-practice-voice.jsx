'use client'

import { useEffect, useRef, useState } from 'react'
import { Headphones, Pause, Play, Square } from 'lucide-react'
import styles from './course-slide-player.module.css'

// Browser speech is an optional reading aid, NOT an approved Andy audio recording.
// No autoplay, external audio service, generated file, or media publication.
export default function CoursePracticeVoice({ text, locale = 'en' }) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState('idle')
  const utteranceRef = useRef(null)
  const ru = locale === 'ru'
  const copy = ru ? {
    listen:'Прослушать практику', resume:'Продолжить аудио', pause:'Пауза',
    stop:'Остановить', note:'Системная озвучка устройства · не запись специалиста',
    unavailable:'Озвучка недоступна. Можно прочитать упражнение ниже.',
    error:'Не удалось включить озвучку. Используйте текст упражнения.',
  } : {
    listen:'Listen to the practice', resume:'Resume audio', pause:'Pause',
    stop:'Stop', note:'Device-generated voice · not a therapist recording',
    unavailable:'Voice playback is unavailable. You can read the practice below.',
    error:'Voice playback did not start. Please use the written practice.',
  }

  useEffect(() => {
    setSupported(typeof window !== 'undefined' &&
      'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window)
    const stopWhenHidden = () => {
      if (document.hidden && utteranceRef.current) {
        utteranceRef.current = null
        window.speechSynthesis.cancel()
        setStatus('idle')
      }
    }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden)
      if (utteranceRef.current) {
        utteranceRef.current = null
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Stop old narration when switching focus, language, or to a neutral exercise.
  useEffect(() => {
    if (utteranceRef.current) {
      utteranceRef.current = null
      window.speechSynthesis?.cancel()
      setStatus('idle')
    }
  }, [text, locale])

  function stop() {
    utteranceRef.current = null
    window.speechSynthesis.cancel()
    setStatus('idle')
  }

  function play() {
    if (!supported || !String(text || '').trim()) return
    const synth = window.speechSynthesis
    if (status === 'paused' && utteranceRef.current) {
      synth.resume()
      setStatus('playing')
      return
    }
    synth.cancel()
    const utterance = new window.SpeechSynthesisUtterance(String(text).trim())
    utterance.lang = ru ? 'ru-RU' : 'en-US'
    utterance.rate = 0.87
    const voices = synth.getVoices()
    const voice = voices.find(item => item.lang?.toLowerCase().startsWith(ru ? 'ru' : 'en') && item.localService)
      || voices.find(item => item.lang?.toLowerCase().startsWith(ru ? 'ru' : 'en'))
    if (voice) utterance.voice = voice
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null
        setStatus('idle')
      }
    }
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null
        setStatus('error')
      }
    }
    utteranceRef.current = utterance
    setStatus('playing')
    synth.speak(utterance)
  }

  function pause() {
    window.speechSynthesis.pause()
    setStatus('paused')
  }

  return <div className={styles.practiceVoice} data-course-practice-voice>
    <div className={styles.practiceVoiceIcon} aria-hidden="true"><Headphones size={24}/></div>
    <div className={styles.practiceVoiceControl}>
      {supported ? <>
        <button type="button" className={styles.practiceListen}
          onClick={status === 'playing' ? pause : play}
          aria-label={status === 'playing' ? copy.pause : status === 'paused' ? copy.resume : copy.listen}>
          {status === 'playing' ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
          {status === 'playing' ? copy.pause : status === 'paused' ? copy.resume : copy.listen}
        </button>
        {(status === 'playing' || status === 'paused') && <button type="button"
          onClick={stop} className={styles.practiceStop} aria-label={copy.stop}>
          <Square size={15}/>{copy.stop}
        </button>}
      </> : <span className={styles.practiceVoiceUnavailable}>{copy.unavailable}</span>}
      <small aria-live="polite">{status === 'error' ? copy.error : copy.note}</small>
    </div>
  </div>
}
