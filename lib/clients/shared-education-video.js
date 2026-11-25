import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { granulesGuideConfig, GRANULES_GUIDE_OBJECT_KEY } from './shared-education-model.js'
import { privateMediaObjectStream } from './session-delivery-storage.js'

// Never enable just because a HeyGen job exists. An approved MP4 must first be
// independently QA'd and uploaded once to the existing PRIVATE Storage bucket.
export function sharedGranulesGuideReady(env=process.env) {
  return granulesGuideConfig(env).ready && Boolean(env.HH_APP_SUPABASE_SECRET_KEY)
}
export async function streamSharedGranulesGuide(config,request) {
  if (!sharedGranulesGuideReady()) throw new AppError('SESSION_UNAVAILABLE',404)
  const {bytes}=granulesGuideConfig(process.env)
  return privateMediaObjectStream(config,{
    object_key:GRANULES_GUIDE_OBJECT_KEY, bytes, mime:'video/mp4',
  },request)
}
