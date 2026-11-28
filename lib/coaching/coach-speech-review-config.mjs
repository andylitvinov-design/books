// Independent rollout and rollback control for the optional review lane.
// Existing Basic/Ali/Studio dictation is not changed. No key is exposed.
export function coachSpeechReviewEnabled(env={}){
 return env.HH_MY_COACH_SPEECH_REVIEW_ENABLED==='true'&&
 env.HH_AUDIO_STT_FREE_CONFIRMED==='true'&&env.HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED==='true'&&
 Boolean(env.HH_FIRST_VIDEO_GROQ_API_KEY)
}
export function isCoachSpeechReviewRequest({purpose,filename,review}={}){
 return purpose==='my_coach'&&(filename==='coach-review.wav'||review==='yes')
}
