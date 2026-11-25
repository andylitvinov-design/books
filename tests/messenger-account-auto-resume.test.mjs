import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
const block=source.slice(source.indexOf('const autoResumeAttempted=useRef(false);'),source.indexOf('if(pageHelp){setEntryOpen(true);setPageHelpLink(null);}'));
test('Messenger restores only consented account history and never replaces an active conversation',()=>{
 assert.ok(block.includes('privateTranscript.status!=="ready"'));
 assert.ok(block.includes('!privateTranscript.consent||!privateTranscript.items.length'));
 assert.ok(block.includes('messages.length||(!homePending&&draft.trim())||quickPrompt||busy||proBusy||pageHelp'));
 assert.ok(block.includes('homeHandoffPhase==="sending"||homeHandoffPhase==="retry"||homeHandoffPending.current'));
 assert.ok(block.includes('peekHomeAliHandoff(window.sessionStorage,routeLocale)'));
 assert.ok(block.includes('privateTranscript.restore()'));
 assert.ok(block.includes('autoResumeAttempted.current=true'));
 assert.ok(!block.includes('sendTurn('));
});
test('Home message waits for history restore and subsequent render, preserving its draft',()=>{
 assert.ok(source.includes('if(!preserveResumeDraft.current)setDraft("")'));
 assert.ok(block.includes('preserveResumeDraft.current=homePending'));
 assert.ok(block.includes('resumeRenderPending.current=true'));
 const gate=source.indexOf('(!autoResumeAttempted.current||resumeRenderPending.current&&!messages.length)');
 const dispatch=source.indexOf('void sendTurn(message).catch');
 assert.ok(gate>=0&&dispatch>gate);
});
test('Handoff completion and retry anchor to actual prior message, not an index invalidated by clipping',()=>{
 assert.ok(source.includes('priorLast:messages.at(-1)||null'));
 assert.ok(source.includes('messages.lastIndexOf(pending.priorLast)'));
 assert.ok(source.includes('previous.lastIndexOf(pending.priorLast)'));
 assert.ok(source.includes('turn.role==="user"&&turn.text===pending.message'));
 assert.ok(source.includes('tail[0]?.role==="user"&&tail[0].text===pending.message'));
 assert.ok(!source.includes('pending.startIndex'));
});
