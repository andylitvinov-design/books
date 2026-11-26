import type {ForwardRefExoticComponent,RefAttributes} from 'react'
export interface AliLukasVideoHandle {
  acceptReply(text:string):boolean
  interrupt():void
  stop():void
  isActive():boolean
  isSpeaking():boolean
}
declare const AliLukasVideo:ForwardRefExoticComponent<{
  locale?:string
  personaId?:string
  blocked?:boolean
  checkBlocked?:boolean
  audioAvailable?:boolean
  audioActive?:boolean
  audioPaused?:boolean
  onAudioMode?:(switchingFromVideo:boolean)=>void
  onActivate?:()=>void
  onSpeaking?:()=>void
  onSpeechEnd?:()=>void
  onStop?:()=>void
  onSpeakInput?:()=>void
}&RefAttributes<AliLukasVideoHandle>>
export default AliLukasVideo
