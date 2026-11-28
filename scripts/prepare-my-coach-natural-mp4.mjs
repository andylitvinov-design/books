// Native MP4s and their matching posters are committed under versioned names.
// Keep older clients' public URLs playable without fetching or encoding video.
import {copyFile} from 'node:fs/promises'
import {coachNaturalFilename, NATURAL_MOTION_VARIANTS} from '../lib/coaching/coach-natural-motion.mjs'

const production = process.env.VERCEL_ENV === 'production' || process.env.HH_COACH_NATURAL_BUILD === '1'
if (production) {
  const directory = new URL('../public/images/holistic-house/my-coach-motion/', import.meta.url)
  let copied = 0
  for (const persona of ['mira', 'sofia', 'max', 'alex']) {
    for (const take of NATURAL_MOTION_VARIANTS) {
      const current = new URL(coachNaturalFilename(persona, take), directory)
      const legacy = new URL(persona + '-natural-' + take + '-v1.mp4', directory)
      await copyFile(current, legacy)
      copied++
    }
  }
  console.log('HH_COACH_NATURAL_MP4 ' + copied + '/8 native clips with v1 compatibility')
} else {
  console.log('HH_COACH_NATURAL_MP4_SKIP_NON_PROD')
}

await import('./prepare-samir-motion-mp4.mjs')

// Optional verified static reactions; no new generation or FFmpeg.
const {prepareCoachV8}=await import('./prepare-coach-reaction-v8.mjs')
await prepareCoachV8()
