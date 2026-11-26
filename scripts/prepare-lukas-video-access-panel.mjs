// Run only on a locally checked-out tree containing BOTH #5638 and #5661.
// Idempotent, fails closed if the exact host anchors have changed. Does not
// deploy, modify flags, create provider sessions, or launch any CI.
import {readFile,writeFile} from 'node:fs/promises'
export function integrateLukasPanel(source){
 const importLine='import MessengerSignIn from "@/components/app/messenger-sign-in";'
 const addedImport='import LukasVideoAccessPanel from "./lukas-video-access-panel";'
 const anchor='    <div ref={threadRef} className={styles.thread} role="log" aria-live="polite"'
 if(source.includes('NEXT_PUBLIC_HH_LUKAS_VIDEO_ACCESS_UI')){
   if(!source.includes(addedImport)||!source.includes('<LukasVideoAccessPanel'))throw Error('PARTIAL_PANEL_INTEGRATION')
   return source
 }
 for(const text of [importLine,anchor])if(source.split(text).length!==2)throw Error('HOST_ANCHOR_CHANGED')
 for(const text of ['const voiceRequiresRecorded=','function beginMessengerVoice()','lukasRef.current?.stop()','setVoicePermissionOpen(true)','const composerRef='])if(!source.includes(text))throw Error('HOST_CONTRACT_CHANGED')
 const panel=`    {process.env.NEXT_PUBLIC_HH_LUKAS_VIDEO_ACCESS_UI==="true"&&messengerView&&!pageHelp&&(authenticated||authStatus==="guest")&&
      <LukasVideoAccessPanel locale={locale} authenticated={authenticated}
        voiceSupported={voiceEnabled&&voice.supported&&(!voiceRequiresRecorded||voice.recordedSupported)}
        onVoice={()=>{lukasRef.current?.stop();if(voice.conversing)return;if(voice.playbackConsent&&voice.sttConsent)beginMessengerVoice();else setVoicePermissionOpen(true);}}
        onText={()=>composerRef.current?.focus({preventScroll:true})}/>}
`
 return source.replace(importLine,importLine+'\n'+addedImport).replace(anchor,panel+anchor)
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const file=process.argv[2]||'components/holistic-agent-chat.tsx'
 const source=await readFile(file,'utf8'),next=integrateLukasPanel(source)
 if(next!==source)await writeFile(file,next)
}
