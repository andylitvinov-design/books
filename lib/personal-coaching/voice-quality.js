// Local browser speech only. Never send private coaching text to an external TTS provider.
// Safari often exposes only basic voices; prefer the best of those actually available.
const QUALITY_MARKERS = /(?:premium|enhanced|natural|neural|high[ -]?quality|siri)/i
const ROBOTIC_MARKERS = /(?:eloquence|compact|novelty|robot|bubbles|boing|bad news|good news|hysterical|jester|trinoids|zarvox|whisper|wobble|fred)/i

function languageTag(value) {
  return String(value || '').replace(/_/g, '-').toLowerCase()
}

function qualityScore(voice, target) {
  const label = String(voice.name || '')
  const spoken = languageTag(voice.lang)
  // Do not accidentally pick an old novelty / Eloquence voice over a normal one.
  return (QUALITY_MARKERS.test(label) ? 160 : 0)
    - (ROBOTIC_MARKERS.test(label) ? 180 : 0)
    + (spoken === target ? 25 : 0)
    + (voice.default ? 12 : 0)
    + (voice.localService === true ? 3 : 0)
}

// Voices explicitly marked remote may upload the spoken question to a provider.
// Keep the on-page coaching audio restricted to local/unspecified device voices.
export function coachingLocalVoices(voices, language = 'en-US') {
  const target = languageTag(language)
  const base = target.split('-')[0]
  return Array.from(voices || [])
    .filter(voice => languageTag(voice?.lang).split('-')[0] === base && voice.localService !== false)
    .sort((a, b) => qualityScore(b, target) - qualityScore(a, target))
}

export function chooseCoachingVoice(voices, language = 'en-US', selected = 'auto') {
  const available = coachingLocalVoices(voices, language)
  if (selected !== 'auto') {
    const match = available.find(voice => (voice.voiceURI || 'name:' + voice.name) === selected)
    if (match) return match
  }
  return available[0] || null
}

export function coachingSpeechProfile(pace = 'calm') {
  // At 0.84x the iPhone default sounds stretched and more robotic.
  // Use the voice's native pitch; keep a slower option for accessibility.
  if (pace === 'unhurried') return { rate: 0.86, pitch: 1, volume: 0.86 }
  if (pace === 'clear') return { rate: 1, pitch: 1, volume: 1 }
  return { rate: 0.96, pitch: 1, volume: 0.9 }
}

export function coachingVoiceSample(locale = 'en') {
  if (locale === 'ru') return 'Можно не торопиться. Что для вас сейчас самое важное?'
  if (locale === 'es') return 'No hay prisa. ¿Qué es lo más importante para ti hoy?'
  return 'There is no rush. What matters most to you today?'
}
