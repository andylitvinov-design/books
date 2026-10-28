'use client'
import {useEffect, useRef, useState} from 'react'
import {Room, RoomEvent, Track} from 'livekit-client'
import {Headphones, Mic, MicOff, Radio, Square, Volume2} from 'lucide-react'
import Link from 'next/link'
import {HOST_IDENTITY} from '@/lib/live-audio/policy.mjs'

const translation = {
  en: {
    onAir:'Live now', offline:'No broadcast right now', unavailable:'Live audio is not available yet',
    checking:'Checking the broadcast…', retry:'Try again', listener:'Listen live', host:'Start broadcast',
    connecting:'Connecting…', reconnecting:'Reconnecting…', connected:'You are listening',
    hosting:'You are broadcasting', muted:'Microphone muted', mute:'Mute microphone',
    unmute:'Turn microphone on', leave:'Leave broadcast', end:'End broadcast',
    ending:'Ending…', sound:'Enable sound', speakers:'Listeners',
    permission:'Microphone permission was denied. Allow the microphone in your browser settings.',
    signIn:'Sign in to the existing practitioner cabinet before starting a broadcast.',
    stopped:'The host has left. The broadcast has ended.', generic:'Connection failed. Please try again.',
    noCamera:'Audio only · no camera or automatic recording',
    noAutoplay:'Sound plays only after you choose to listen.',
    practice:'Open My Practice', library:'Explore recorded meditations',
  },
  ru: {
    onAir:'В прямом эфире', offline:'Сейчас эфира нет', unavailable:'Аудиоэфиры пока недоступны',
    checking:'Проверяем эфир…', retry:'Повторить', listener:'Слушать эфир', host:'Начать эфир',
    connecting:'Подключаем…', reconnecting:'Восстанавливаем соединение…', connected:'Вы слушаете эфир',
    hosting:'Вы ведёте эфир', muted:'Микрофон выключен', mute:'Выключить микрофон',
    unmute:'Включить микрофон', leave:'Покинуть эфир', end:'Завершить эфир',
    ending:'Завершаем…', sound:'Включить звук', speakers:'Слушателей',
    permission:'Доступ к микрофону запрещён. Разрешите микрофон в настройках браузера.',
    signIn:'Сначала войдите в существующий кабинет практика.',
    stopped:'Ведущий вышел. Трансляция завершена.', generic:'Не удалось подключиться. Попробуйте ещё раз.',
    noCamera:'Только звук · без камеры и автоматической записи',
    noAutoplay:'Звук включается только после вашего нажатия.',
    practice:'Открыть Мою практику', library:'Посмотреть записи медитаций',
  },
  es: {
    onAir:'En directo', offline:'No hay transmisión ahora', unavailable:'Audio en directo aún no disponible',
    checking:'Comprobando transmisión…', retry:'Reintentar', listener:'Escuchar en directo', host:'Iniciar transmisión',
    connecting:'Conectando…', reconnecting:'Reconectando…', connected:'Estás escuchando',
    hosting:'Estás transmitiendo', muted:'Micrófono silenciado', mute:'Silenciar micrófono',
    unmute:'Activar micrófono', leave:'Salir', end:'Finalizar transmisión',
    ending:'Finalizando…', sound:'Activar sonido', speakers:'Oyentes',
    permission:'Se denegó el micrófono. Permítelo en el navegador.',
    signIn:'Entra primero en tu gabinete profesional.',
    stopped:'El anfitrión salió. La transmisión terminó.', generic:'No se pudo conectar. Inténtalo de nuevo.',
    noCamera:'Solo audio · sin cámara ni grabación automática',
    noAutoplay:'El sonido comienza solo cuando eliges escuchar.',
    practice:'Abrir Mi práctica', library:'Explorar meditaciones grabadas',
  },
}

const messages = (code, t) => {
  if (code === 'SIGN_IN_REQUIRED' || code === 'ACCESS_DENIED' || code === 'ACCOUNT_CHANGED') return t.signIn
  if (code === 'NotAllowedError' || code === 'PermissionDenied') return t.permission
  if (code === 'LIVE_AUDIO_DISABLED' || code === 'LIVE_AUDIO_NOT_CONFIGURED') return t.unavailable
  if (code === 'LIVE_AUDIO_OFFLINE') return t.offline
  if (code === 'LIVE_ALREADY_ACTIVE') return t.onAir
  return t.generic
}

export function LiveAudioRoom({role='listener', locale='en'}) {
  const lang = translation[locale] ? locale : 'en'
  const t = translation[lang]
  const [status, setStatus] = useState(null)
  const [statusFailed, setStatusFailed] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [muted, setMuted] = useState(false)
  const [needsAudioTap, setNeedsAudioTap] = useState(false)
  const [error, setError] = useState('')
  const roomRef = useRef(null)
  const audioContainer = useRef(null)
  const busyRef = useRef(false)
  const currentRef = useRef(true)

  useEffect(() => {
    currentRef.current = true
    let cancelled = false
    async function refresh() {
      try {
        const result = await fetch('/api/live-audio/status', {cache:'no-store', credentials:'same-origin'})
        const data = await result.json()
        if (!result.ok) throw new Error(data.error || 'SERVICE_UNAVAILABLE')
        if (!cancelled) {setStatus(data); setStatusFailed(false)}
      } catch {
        if (!cancelled) {setStatusFailed(true); setStatus(null)}
      }
    }
    void refresh()
    const timer = setInterval(refresh, 15000)
    return () => {
      cancelled = true
      currentRef.current = false
      clearInterval(timer)
      roomRef.current?.disconnect().catch(() => {})
      roomRef.current = null
    }
  }, [])

  function disconnect() {
    const room = roomRef.current
    roomRef.current = null
    room?.disconnect().catch(() => {})
    if (audioContainer.current) audioContainer.current.replaceChildren()
    setNeedsAudioTap(false)
    setPhase('idle')
    busyRef.current = false
  }

  async function join() {
    if (busyRef.current || roomRef.current || !status?.enabled ||
      (role === 'listener' && !status.live) ||
      (role === 'host' && status.live)) return
    busyRef.current = true
    setError('')
    setPhase('connecting')
    const room = new Room({adaptiveStream:false, dynacast:false})
    roomRef.current = room
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio && participant.identity === HOST_IDENTITY) {
        const element = track.attach()
        element.autoplay = true
        element.setAttribute('data-hh-live-audio-output', '')
        audioContainer.current?.appendChild(element)
        if (!room.canPlaybackAudio) setNeedsAudioTap(true)
      }
    })
    room.on(RoomEvent.TrackUnsubscribed, track => {
      track.detach().forEach(element => element.remove())
    })
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      setNeedsAudioTap(!room.canPlaybackAudio)
    })
    room.on(RoomEvent.ParticipantDisconnected, participant => {
      if (role === 'listener' && participant.identity === HOST_IDENTITY) {
        setError(t.stopped)
        disconnect()
      }
    })
    room.on(RoomEvent.Reconnecting, () => setPhase('reconnecting'))
    room.on(RoomEvent.Reconnected, () => setPhase('connected'))
    room.on(RoomEvent.Disconnected, () => disconnect())
    try {
      const response = await fetch('/api/live-audio/token', {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'same-origin', cache:'no-store', body:JSON.stringify({role}),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'SERVICE_UNAVAILABLE')
      if (!currentRef.current) return
      await room.connect(data.url, data.token, {autoSubscribe: role === 'listener'})
      if (!currentRef.current) return
      if (role === 'host') {
        await room.localParticipant.setMicrophoneEnabled(true)
        setMuted(false)
      } else {
        try { await room.startAudio() } catch { setNeedsAudioTap(true) }
      }
      setPhase('connected')
    } catch (cause) {
      setError(messages(cause?.name === 'NotAllowedError' ? 'NotAllowedError' : cause?.message, t))
      disconnect()
    } finally {
      busyRef.current = false
    }
  }

  async function toggleMute() {
    const room = roomRef.current
    if (!room || phase !== 'connected') return
    setError('')
    try {
      await room.localParticipant.setMicrophoneEnabled(muted)
      setMuted(current => !current)
    } catch (cause) {
      setError(messages(cause?.name || cause?.message, t))
    }
  }

  async function leave() {
    if (busyRef.current) return
    if (role === 'host') {
      busyRef.current = true
      setPhase('ending')
      try {
        const response = await fetch('/api/live-audio/end', {
          method:'POST', credentials:'same-origin', cache:'no-store',
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'SERVICE_UNAVAILABLE')
        }
      } catch (cause) {
        setError(messages(cause?.message, t))
        setPhase('connected')
        busyRef.current = false
        return
      }
    }
    disconnect()
    setStatus(prev => prev ? {...prev, live:false, listeners:0} : prev)
  }

  const connected = phase === 'connected' || phase === 'reconnecting'
  const busy = phase === 'connecting' || phase === 'ending'
  const available = !!status?.enabled && !statusFailed
  const disabled = !available || busy || (role === 'listener' && !status?.live) ||
    (role === 'host' && !!status?.live)
  const statusLabel = !status && !statusFailed ? t.checking : statusFailed ? t.unavailable :
    !available ? t.unavailable : status.live ? t.onAir : t.offline

  return (
    <section className="hh-live-panel" aria-label={role === 'host' ? t.host : t.listener}
      data-hh-live-audio-role={role}>
      <div className="hh-live-panel-top">
        <span className="hh-live-indicator" data-active={status?.live === true && available}>
          <Radio size={17} aria-hidden="true" />
          <span aria-live="polite">{connected ? (role === 'host' ? (muted ? t.muted : t.hosting) : t.connected) : statusLabel}</span>
        </span>
        <span className="hh-live-audience"><Headphones size={16} aria-hidden="true" />
          {t.speakers}: {status?.listeners ?? '—'}
        </span>
      </div>
      <div className="hh-live-symbol" aria-hidden="true"><span><Radio size={46}/></span></div>
      <p className="hh-live-description">{t.noCamera}</p>
      <p className="hh-live-subdescription">{t.noAutoplay}</p>
      <div className="hh-live-controls">
        {connected ? (
          <>
            {role === 'host' ? (
              <button className="hh-live-secondary" type="button" onClick={toggleMute}
                disabled={phase === 'reconnecting'}>
                {muted ? <Mic size={18}/> : <MicOff size={18}/>}
                {muted ? t.unmute : t.mute}
              </button>
            ) : needsAudioTap ? (
              <button className="hh-live-secondary" type="button" onClick={() => {
                roomRef.current?.startAudio().then(() => setNeedsAudioTap(false))
                  .catch(() => setNeedsAudioTap(true))
              }}><Volume2 size={18}/>{t.sound}</button>
            ) : null}
            <button className="hh-live-end" type="button" onClick={leave}>
              <Square size={17}/>{role === 'host' ? t.end : t.leave}
            </button>
          </>
        ) : (
          <button className="hh-live-primary" type="button" onClick={join} disabled={disabled}>
            {role === 'host' ? <Mic size={18}/> : <Headphones size={18}/>}
            {busy ? (phase === 'ending' ? t.ending : t.connecting) :
              role === 'host' ? t.host : t.listener}
          </button>
        )}
      </div>
      {error ? <p className="hh-live-error" role="alert">{error}</p> : null}
      {phase === 'reconnecting' ? <p role="status">{t.reconnecting}</p> : null}
      <div ref={audioContainer} className="hh-live-playback" aria-hidden="true" />
      <nav className="hh-live-links">
        <Link href={'/' + (lang === 'es' ? 'en' : lang) + '/app/practice'} prefetch={false}>{t.practice}</Link>
        <Link href={'/' + lang + '/holistic-support#meditation-practices'} prefetch={false}>{t.library}</Link>
      </nav>
    </section>
  )
}
