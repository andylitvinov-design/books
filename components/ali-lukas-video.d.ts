import type {ForwardRefExoticComponent,RefAttributes} from 'react'
export interface AliLukasVideoHandle {
  acceptReply(text:string):boolean
  interrupt():void
  stop():void
}
declare const AliLukasVideo:ForwardRefExoticComponent<{
  locale?:string
  personaId?:string
  blocked?:boolean
  onActivate?:()=>void
}&RefAttributes<AliLukasVideoHandle>>
export default AliLukasVideo
