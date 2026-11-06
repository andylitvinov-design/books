'use client'
import {HolisticAgentChat} from '../holistic-agent-chat'
import css from './messenger-ai-workspace.module.css'

// Reuse the existing protected agent rather than creating a second chatbot.
export default function MessengerAiWorkspace({locale='en',authenticated=false}){
 return <div className={css.layout} data-hh-compact-ai-workspace>
   <div className={css.content}>
     <HolisticAgentChat locale={locale} compact authenticated={authenticated}/>
   </div>
 </div>
}
