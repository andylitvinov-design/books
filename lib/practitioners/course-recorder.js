// Browser recording settings are deliberately limited to the existing verified
// MP4/M4A private-course upload pipeline. No WebM -> MP4 renaming/transcoding.
export const COURSE_RECORD_LIMITS=Object.freeze({
 audio:Object.freeze({seconds:240,bytes:20000000,extension:'m4a'}),
 video:Object.freeze({seconds:90,bytes:25000000,extension:'mp4'}),
})

export const COURSE_RECORD_TYPES=Object.freeze({
 audio:Object.freeze([
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/x-m4a',
 ]),
 video:Object.freeze([
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
 ]),
})

export function selectCourseRecordingMime(kind,isSupported){
 if(typeof isSupported!=='function'||!COURSE_RECORD_TYPES[kind])return ''
 for(const type of COURSE_RECORD_TYPES[kind]){
  try{if(isSupported(type))return type}catch{/* older browsers */}
 }
 return ''
}
export function normalizeCourseRecordingMime(value,kind){
 const type=String(value||'').split(';')[0].trim().toLowerCase()
 if(kind==='audio')return type==='audio/mp4'||type==='audio/x-m4a'?'audio/mp4':''
 if(kind==='video')return type==='video/mp4'?'video/mp4':''
 return ''
}
export function formatCourseRecordingTime(seconds){
 const n=Math.max(0,Math.floor(Number(seconds)||0))
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')
}
