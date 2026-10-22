import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {normalizeVideoPresentation} from './presentation-contract.js'

const invalid=(code='INVALID_COURSE')=>{throw new AppError(code,400)}
export const COURSE_MEDIA_TYPES=Object.freeze({
 'image/jpeg':{kind:'image',ext:'jpg',max:4000000},
 'image/png':{kind:'image',ext:'png',max:4000000},
 'image/webp':{kind:'image',ext:'webp',max:4000000},
 'audio/mpeg':{kind:'audio',ext:'mp3',max:20000000},
 'audio/mp4':{kind:'audio',ext:'m4a',max:20000000},
 'audio/x-m4a':{kind:'audio',ext:'m4a',max:20000000},
 'audio/webm':{kind:'audio',ext:'webm',max:20000000},
 'audio/wav':{kind:'audio',ext:'wav',max:20000000},
 'audio/x-wav':{kind:'audio',ext:'wav',max:20000000},
 'audio/ogg':{kind:'audio',ext:'ogg',max:20000000},
 'audio/flac':{kind:'audio',ext:'flac',max:20000000},
 'audio/aac':{kind:'audio',ext:'aac',max:20000000},
 'video/mp4':{kind:'video',ext:'mp4',max:25000000},
 'video/quicktime':{kind:'video',ext:'mov',max:25000000},
})
const kinds=new Set(['text','image','audio','video','embed'])
const locales=new Set(['en','ru','es'])
function clean(value,max,required=false){
 if(typeof value!=='string'||value.length>max*2)invalid()
 const v=value.trim()
 if(v.length>max||(required&&!v))invalid()
 return v
}
export function normalizeCourseDraft(input){
 if(!input||typeof input!=='object'||Array.isArray(input))invalid()
 const title=clean(input.title,140,true)
 const description=clean(input.description??'',900)
 const locale=input.locale
 if(!locales.has(locale)||!Array.isArray(input.slides)||input.slides.length>60)invalid()
 const ids=new Set()
 const slides=input.slides.map(slide=>{
   if(!slide||typeof slide!=='object'||Array.isArray(slide))invalid()
   requireUUID(slide.id)
   if(ids.has(slide.id))invalid('DUPLICATE_SLIDE')
   ids.add(slide.id)
   const kind=slide.kind
   if(!kinds.has(kind))invalid()
   const result={id:slide.id,kind,title:clean(slide.title??'',140),body:clean(slide.body??'',4000)}
   if(['image','audio','video'].includes(kind)){
     const assetId=slide.assetId||null
     if(assetId!==null)requireUUID(assetId)
     result.assetId=assetId
   }
   if(kind==='embed'){
     const url=slide.videoUrl||''
     if(url){
       try{result.videoUrl=normalizeVideoPresentation({kind:'external',url})?.url||''}
       catch{invalid('INVALID_VIDEO_LINK')}
       if(!result.videoUrl)invalid('INVALID_VIDEO_LINK')
     }else result.videoUrl=''
   }
   return result
 })
 return {title,description,locale,slides}
}
export function assertPublishableCourse(draft){
 if(!draft.slides?.length)invalid('COURSE_SLIDES_REQUIRED')
 for(const slide of draft.slides){
   if(!slide.title&&!slide.body&&slide.kind==='text')invalid('COURSE_SLIDE_EMPTY')
   if(['image','audio','video'].includes(slide.kind)&&!slide.assetId)invalid('COURSE_MEDIA_REQUIRED')
   if(slide.kind==='embed'&&!slide.videoUrl)invalid('COURSE_VIDEO_LINK_REQUIRED')
 }
 return draft
}
export function makeCourseSlug(title){
 const base=String(title||'course').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65).replace(/-$/,'')||'course'
 return base+'-'+randomUUID().slice(0,8)
}
