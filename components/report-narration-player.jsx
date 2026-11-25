'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, LoaderCircle, Pause, RotateCcw, Square } from 'lucide-react'
import styles from './report-narration-player.module.css'

export function ReportNarrationPlayer({ locale = 'en', access, available = true }) {
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
    if (!available) {
      setState('unavailable')
      setError('')
      return
    }
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

  return <div className={styles.root} aria-label={ru ? 'Прослушать отчёт голосом Андрея' : 'Listen to this report in Andrey’s voice'}>
    <button className={styles.primary} type="button" onClick={toggle}
      disabled={state === 'loading'}
      aria-label={state === 'playing' ? (ru ? 'Пауза' : 'Pause') : (ru ? 'Прослушать анализ голосом Андрея' : 'Play the analysis in Andrey’s voice')}
      title={!available
        ? (ru ? 'Озвучка пока не подключена.' : 'Audio narration is not yet connected.')
        : (ru ? 'По нажатию текст анализа передаётся в HeyGen для озвучки AI-копией голоса Андрея.' : 'When pressed, the analysis is sent to HeyGen to synthesize Andrey’s AI-cloned voice.')}>
      {state === 'loading' ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />
        : state === 'playing' ? <Pause size={18} aria-hidden="true" />
          : state === 'done' ? <RotateCcw size={18} aria-hidden="true" />
            : <Volume2 size={18} aria-hidden="true" />}
      <span className={styles.label}>{state === 'loading' ? (ru ? 'Готовим…' : 'Preparing…')
        : state === 'playing' ? (ru ? 'Пауза' : 'Pause')
          : state === 'paused' || state === 'ready' ? (ru ? 'Продолжить' : 'Resume')
            : state === 'done' ? (ru ? 'Сначала' : 'Restart')
              : (ru ? 'Прослушать' : 'Listen')}</span>
    </button>
    {state !== 'idle' && <div className={styles.panel} role="region"
      aria-label={ru ? 'Управление аудиоотчётом' : 'Report audio controls'}>
      {state === 'loading' && <span className={styles.help} role="status">{ru
        ? 'Создаём аудио с вашим личным голосом…'
        : 'Preparing audio in Andrey’s voice…'}</span>}
      {state === 'unavailable' && <small className={styles.help} role="status">{ru
        ? 'Аудиоверсия пока недоступна. Анализ можно прочитать ниже.'
        : 'Audio narration is not connected yet. The analysis remains available below.'}</small>}
      <audio ref={audio} className={styles.audio} controls preload="none"
        onPlay={() => setState('playing')}
        onPause={() => setState(current => current === 'playing' ? 'paused' : current)}
        onEnded={ended} aria-label={ru ? 'Аудиоплеер анализа' : 'Analysis audio player'}
        hidden={!['playing', 'paused', 'ready', 'done'].includes(state)} />
      {total > 1 && !['loading', 'unavailable', 'error'].includes(state) && <small className={styles.part}>
        {ru ? 'Часть' : 'Part'} {Math.min(part + 1, total)} / {total}
      </small>}
      {state === 'ready' && <small className={styles.help}>{ru
        ? 'Если iPhone не запустил звук, нажмите Play на аудиоплеере.'
        : 'If iPhone did not start the sound, tap Play in the audio controls.'}</small>}
      {state !== 'unavailable' && state !== 'error' && <small className={styles.privacy}>{ru
        ? 'AI-копия голоса Андрея. Только по нажатию текст анализа передаётся в HeyGen; аудио не публикуется.'
        : 'Andrey’s AI-cloned voice. Text is sent to HeyGen only after Play; audio is not published.'}</small>}
      {error && <span className={styles.error} role="alert">{error}</span>}
      {['playing', 'paused', 'ready', 'done', 'loading'].includes(state) && <button className={styles.stop}
        type="button" onClick={stop} aria-label={ru ? 'Остановить озвучку' : 'Stop narration'}>
        <Square size={14} aria-hidden="true" />{ru ? 'Стоп' : 'Stop'}
      </button>}
    </div>}
  </div>
}
