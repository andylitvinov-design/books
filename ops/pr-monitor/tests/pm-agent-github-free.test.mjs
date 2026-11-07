import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const f=p=>readFileSync(new URL(p,new URL('../',import.meta.url)),'utf8');
test('Owner PM Github Free option is a public handoff, no hidden execution',()=>{
 const js=f('pm-agent-chat.js'),choice=f('project-management-selection.js');
 assert.match(js,/mode==='github'/);
 assert.match(js,/window\.confirm/);
 assert.match(js,/!pm ask/);
 assert.match(choice,/!pm repair/);
 assert.match(choice,/!pm ask/);
 assert.match(js,/issues\/3890/);
 assert.doesNotMatch(js,/Authorization:|HH_OPENROUTER_FREE_API_KEY|service_role/);
});
test('owner-only API preserves existing private session and reports trusted GitHub comments',()=>{
 const s=f('api/pm-agent-chat.js');
 assert.match(s,/REPORT_ISSUES=\[1419,3128,3890\]/);
 assert.match(s,/issue===3890/);
 assert.match(s,/githubFreeRelay:true/);
 assert.match(s,/isOwner\(req\)/);
 assert.doesNotMatch(s,/fetch\(.*github.*method.*POST/);
});
