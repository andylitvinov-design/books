import 'server-only'
import {recallClientMemory,clientMemoryEnabled} from './client-memory-store.js'
import {listClientCareTasks} from './client-care-task-store.js'
import {memoryAwareReply} from '../holistic-support/client-memory-dialogue.mjs'

// Never call this from guest, unsafe, external-model or unlinked-Telegram paths.
// The caller already verified the signed-in actor, current request consent,
// and local-rules mode. Every read is additionally session/RLS-scoped.
export async function verifiedClientMemoryReply(config,actor,{message,locale}={}){
 if(!clientMemoryEnabled())return null
 const memory=await recallClientMemory(config,actor,{topic:message})
 if(!memory)return null
 const rows=await listClientCareTasks(config,actor)
 // A practitioner also has access to their clients' task assignments. NEVER
 // include those tasks when this authenticated actor speaks as a client.
 const ownTasks=rows.tasks.filter(task=>task.clientAccountId===actor.id)
 return memoryAwareReply({message,locale,memories:memory.items,tasks:ownTasks,
   allowTaskDetails:memory.sensitiveAllowed===true})
}
