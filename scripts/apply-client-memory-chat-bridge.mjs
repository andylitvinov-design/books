// Manual, reviewable source integration helper for an authorized clean worktree.
// It is NOT a CI workflow and NEVER pushes or deploys.
import {readFile,writeFile} from 'node:fs/promises'
const path='app/api/holistic-agent/turn/route.js'
const oldImport='import { generateOwnedOllama, validatedOllamaConfig } from "@/lib/holistic-support/owned-ollama.mjs";'
const newImport=oldImport+'\nimport { verifiedClientMemoryReply } from "@/lib/app/client-memory-dialogue-bridge.js";'
const needle='    if(fastRule&&FAST_RULE_IDS.has(fastRule.id)){'
const injection=`    // Only explicit personalization for signed-in, safety-clear rules dialogue;
    // no third-party inference, auto-saving, Telegram identity guessing or raw prompt logs.
    const memoryReply=body.mode==="rules" && body.usePrivateProfile===true &&
      safety.status==="clear" && !recentUnsafe &&
      process.env.HH_CLIENT_MEMORY_ENABLED==="true"
      ? await verifiedClientMemoryReply(config,actor,{message:body.message,locale:body.locale})
      : null;
    if(memoryReply)return auth.apply(NextResponse.json(memoryReply,{headers:PRIVATE_HEADERS}));
` + needle
const original=await readFile(path,'utf8')
if(original.includes('verifiedClientMemoryReply')){
 console.log('Already integrated; no changes');process.exit(0)
}
if(!original.includes(oldImport)||!original.includes(needle)){
 console.error('Source contract changed: review integration manually');process.exit(2)
}
const modified=original.replace(oldImport,newImport).replace(needle,injection)
if(modified===original)process.exit(3)
await writeFile(path,modified)
console.log('Integration staged locally. Run source tests and review diff before publishing.')
