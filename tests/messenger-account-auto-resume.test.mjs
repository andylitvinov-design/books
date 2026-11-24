import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
const block=source.slice(source.indexOf('const autoResumeAttempted=useRef(false);'),source.indexOf('if(pageHelp){setEntryOpen(true);setPageHelpLink(null);}'));
test('Messenger resumes only account history with consent and no newer work',()=>{
 assert.ok(block.includes('privateTranscript.status!=="ready"'));
 assert.ok(block.includes('!privateTranscript.consent||!privateTranscript.items.length'));
 assert.ok(block.includes('messages.length||draft.trim()||quickPrompt||busy||proBusy||pageHelp'));
 assert.ok(block.includes('homeHandoffPhase!=="idle"||homeHandoffPending.current'));
 assert.ok(block.includes('peekHomeAliHandoff(window.sessionStorage,routeLocale)'));
 assert.ok(block.includes('privateTranscript.restore()'));
 assert.ok(block.includes('autoResumeAttempted.current=true'));
 assert.ok(!block.includes('sendTurn('));
});
