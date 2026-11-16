'use client'
import {useEffect,useState} from 'react'
import {HolisticAgentChat} from '../holistic-agent-chat'
import {HOME_INTENT_HANDOFF_KEY,parseHomeIntentHandoff} from '../../lib/home-intent-handoff.mjs'
import css from './messenger-ai-workspace.module.css'

// Only the existing Ali messenger consumes an intentionally submitted Home
// message. This keeps personal text out of URL, server logs and analytics;
// the one-tab handoff is removed before any AI reply is requested.
export default function MessengerAiWorkspace({locale='en',authenticated=false,authStatus='guest',onAuthRetry=undefined,onConversationLocaleChange=undefined}){
 const [quickPrompt,setQuickPrompt]=useState(null)
 useEffect(()=>{
   if(new URLSearchParams(window.location.search).get('from')!=='home')return
   let raw=null
   try{
     raw=window.sessionStorage.getItem(HOME_INTENT_HANDOFF_KEY)
     window.sessionStorage.removeItem(HOME_INTENT_HANDOFF_KEY)
   }catch{return}
   const handoff=parseHomeIntentHandoff(raw,locale)
   if(!handoff)return
   // The visitor pressed Send on the first screen: deliver once through Ali's
   // existing rule/consent pipeline, not a second AI service or a hidden API.
   setQuickPrompt({revision:Date.now(),text:handoff.text,autoSubmit:true})
 },[locale])
 return <div className={css.layout} data-hh-compact-ai-workspace>
   <div className={css.content}>
     <HolisticAgentChat locale={locale} compact messengerView quickPrompt={quickPrompt}
       authenticated={authenticated} authStatus={authStatus}
       onAuthRetry={onAuthRetry} onConversationLocaleChange={onConversationLocaleChange}/>
   </div>
 </div>
}
