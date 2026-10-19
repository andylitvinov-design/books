'use client'

import { useEffect, useRef, useState } from 'react'
import { Headphones, Pause, Play, RotateCcw, Square } from 'lucide-react'
import styles from './report-narration-player.module.css'

export function ReportNarrationPlayer({ locale = 'en', access }) {
  const ru = locale === 'ru'
  const audio = useRef(null)
  const request = useRef(null)
  const urls = useRef(new Map())
  const busy = useRef(false)
  const mounted = useRef(true)
  const [state, setState] = useState('idle')
  const [part, setPart] = useState(0)
  const [total, setTotal] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current?.abort()
      audio.current?.pause()
      for (const url of urls.current.values()) URL.revokeObjectURL(url)
      urls.current.clear()
    }
  }, [])

  async function playSegment(index) {
    if (busy.current || !mounted.current) return
    busy.current = true
    setError('')
    setPart(index)
    try {
      let url = urls.current.get(index)
      if (!url) {
        setState('loading')
        request.current = new AbortController()
        const response = await fetch('/api/report-narration', {
          method: 'POST', cache: 'no-store', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...access, locale, part: index }),
          signal: request.current.signal,
        })
        if (!response.ok) {
          if (response.status === 429) throw new Error('limit')
          if (response.status === 503) throw new Error('unavailable')
          throw new Error('access')
        }
        const count = Number(response.headers.get('X-Report-Narration-Parts'))
        if (!Number.isSafeInteger(count) || count < 1 || count > 8) throw new Error('unavailable')
        const blob = await response.blob()
        if (!blob.size || !blob.type.startsWith('audio/')) throw new Error('unavailable')
        if (!mounted.current) return
        setTotal(count)
        url = URL.createObjectURL(blob)
        urls.current.set(index, url)
      }
      const player = audio.current
      if (!player || !mounted.current) return
      player.src = url
      player.load()
      setState('ready')
      // iOS Safari may require a second gesture after the first synthesis.
      // Native audio controls remain visible so a blocked play is recoverable.
      try { await player.play() }
      catch { if (mounted.current) setState('ready') }
    } catch (caught) {
      if (caught?.name === 'AbortError' || !mounted.current) return
      setState('error')
      setError(caught.message === 'limit'
        ? (ru ? 'Лимит прослушиваний на сегодня достигнут.' : 'Today’s narration limit has been reached.')
        : caught.message === 'access'
          ? (ru ? 'Доступ к отчёту изменился. Откройте актуальную ссылку.' : 'Report access changed. Open the current report link.')
          : (ru ? 'Озвучка пока недоступна. Вы можете прочитать анализ ниже.' : 'Narration is temporarily unavailable. You can read the analysis below.'))
    } finally {
      busy.current = false
      request.current = null
    }
  }

  function toggle() {
    const player = audio.current
    if (state === 'loading') return
    if (state === 'done') { void playSegment(0); return }
    if (player?.src && ['paused', 'ready', 'playing'].includes(state)) {
      if (!player.paused) player.pause()
      else void player.play().catch(() => setState('ready'))
      return
    }
    void playSegment(part)
  }

  function stop() {
    request.current?.abort()
    const player = audio.current
    if (player) { player.pause(); player.removeAttribute('src'); player.load() }
    setPart(0)
    setState('idle')
    setError('')
  }

  function ended() {
    if (part + 1 < total) void playSegment(part + 1)
    else setState('done')
  }

  return <aside className={styles.box} aria-label={ru ? 'Озвучка анализа Андреем' : 'Andrey voice narration'}>
    <div className={styles.heading}>
      <span className={styles.icon}><Headphones size={20} aria-hidden="true" /></span>
      <div>
        <strong>{ru ? 'Анализ голосом Андрея' : 'Your analysis in Andrey’s voice'}</strong>
        <span>{ru ? 'Андрей Литвинов · AI-копия голоса' : 'Andrey Litvinov · AI-cloned voice'}</span>
      </div>
    </div>
    <div className={styles.controls}>
      <button className={styles.primary} type="button" onClick={toggle}
        disabled={state === 'loading'} aria-label={state === 'playing'
          ? (ru ? 'Пауза' : 'Pause') : (ru ? 'Прослушать анализ' : 'Play analysis')}>
        {state === 'playing' ? <Pause size={20} aria-hidden="true" />
          : state === 'done' ? <RotateCcw size={20} aria-hidden="true" />
            : <Play size={20} aria-hidden="true" />}
        {state === 'loading' ? (ru ? 'Готовим аудио…' : 'Preparing audio…')
          : state === 'playing' ? (ru ? 'Пауза' : 'Pause')
            : state === 'paused' || state === 'ready' ? (ru ? 'Продолжить' : 'Resume')
              : state === 'done' ? (ru ? 'Слушать снова' : 'Listen again')
                : (ru ? '▶ Слушать анализ' : '▶ Play analysis')}
      </button>
      {state !== 'idle' && <button className={styles.stop} type="button" onClick={stop}
        aria-label={ru ? 'Остановить озвучку' : 'Stop narration'}>
        <Square size={17} aria-hidden="true" />
        {ru ? 'Стоп' : 'Stop'}
      </button>}
    </div>
    <audio ref={audio} className={styles.audio} controls preload="none"
      onPlay={() => setState('playing')}
      onPause={() => setState(current => current === 'playing' ? 'paused' : current)}
      onEnded={ended} aria-label={ru ? 'Аудиоплеер анализа' : 'Analysis audio player'}
      hidden={!['playing', 'paused', 'ready', 'done'].includes(state)} />
    {total > 1 && state !== 'idle' && <small className={styles.part}>
      {ru ? 'Часть' : 'Part'} {Math.min(part + 1, total)} / {total}
    </small>}
    {state === 'ready' && <small className={styles.help}>{ru
      ? 'Если iPhone не запустил звук, нажмите Play в плеере.'
      : 'If playback did not start on your phone, tap Play in the audio controls.'}</small>}
    {error && <span className={styles.error} role="alert">{error}</span>}
    <small className={styles.privacy}>{ru
      ? 'Только по вашему нажатию Play текст этого анализа передаётся в HeyGen для озвучки. Запись не публикуется.'
      : 'Only when you press Play is this analysis sent to HeyGen for voice synthesis. The audio is not published.'}</small>
  </aside>
}
