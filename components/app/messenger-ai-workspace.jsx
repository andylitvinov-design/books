'use client'
import {useState} from 'react'
import {HolisticAgentChat} from '../holistic-agent-chat'
import {IHelpTopics,IHelpWelcome} from '../ihelp-welcome'
import css from './messenger-ai-workspace.module.css'

// Messages owns ONE real chat and its private history. The shared welcome is
// presentation only; topic chips prepare an unsent draft in the same chat.
export default function MessengerAiWorkspace({locale='en',authenticated=false,authStatus='guest',onAuthRetry=undefined}){
 const [quickPrompt,setQuickPrompt]=useState(undefined)
 return <div className={css.layout} data-hh-compact-ai-workspace>
   <IHelpWelcome locale={locale} section="general" compact/>
   <div className={css.content}>
     <HolisticAgentChat locale={locale} compact quickPrompt={quickPrompt}
       authenticated={authenticated} authStatus={authStatus} onAuthRetry={onAuthRetry}/>
   </div>
   <IHelpTopics locale={locale} onSelect={prompt=>setQuickPrompt(
     previous=>({revision:(previous?.revision||0)+1,text:prompt}))}/>
 </div>
}
