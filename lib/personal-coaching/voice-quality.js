// Browser-only coaching narration. Never send private prompts to an external TTS API.
// Safari/iOS may expose only its basic installed voices through speechSynthesis.
const QUALITY_MARKERS = /(?:premium|enhanced|natural|neural|high[ -]?quality)/i

function languageTag(value) {
  return String(value || '').replace(/_/g, '-').toLowerCase()
}

function qualityScore(voice, target) {
  const label = String(voice.name || '')
  const spoken = languageTag(voice.lang)
  return (QUALITY_MARKERS.test(label) ? 100 : 0)
    + (spoken === target ? 12 : 0)
    + (voice.default ? 5 : 0)
    + (voice.localService === true ? 2 : 0)
}

// A remote-only voice may transmit private question text to a provider.
// Only expose explicit voice choices the browser marks local (or unspecified).
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
  // Avoid excessively slow or low-pitched synthetic speech on iOS.
  return pace === 'clear'
    ? { rate: 0.96, pitch: 1, volume: 1 }
    : { rate: 0.84, pitch: 0.96, volume: 0.88 }
}
