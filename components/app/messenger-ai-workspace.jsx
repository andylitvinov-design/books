'use client'
import {HolisticAgentChat} from '../holistic-agent-chat'
import css from './messenger-ai-workspace.module.css'

// One established AI conversation, auth, history and consent pipeline.
// The six illustrated entry actions and video poster are inside its scroll log;
// its text composer stays usable above the existing single mobile dock.
export default function MessengerAiWorkspace({locale='en',authenticated=false,authStatus='guest',onAuthRetry=undefined,onConversationLocaleChange=undefined}){
 return <div className={css.layout} data-hh-compact-ai-workspace>
   <div className={css.content}>
     <HolisticAgentChat locale={locale} compact messengerView
       authenticated={authenticated} authStatus={authStatus}
       onAuthRetry={onAuthRetry} onConversationLocaleChange={onConversationLocaleChange}/>
   </div>
 </div>
}
