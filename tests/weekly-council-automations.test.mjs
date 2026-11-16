import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {councilIsDue,buildCouncilCoverageQuestion,normalizeCouncilProposal} from '../lib/automations/weekly-council.mjs';
const ROOT=new URL('../',import.meta.url);
test('weekly trigger is exactly Monday at 07:17 UTC',()=>{
  assert.equal(councilIsDue('2026-11-09T07:17:00.000Z'),true);
  for(const x of ['2026-11-09T08:17:00.000Z','2026-11-09T07:18:00.000Z','2026-11-10T07:17:00.000Z','invalid'])assert.equal(councilIsDue(x),false);
});
test('Council prompt uses bounded public content with no private records',()=>{
 const question=buildCouncilCoverageQuestion({sourcingQueue:[{categoryId:'stress-anxiety',topicId:'stress-calm',optionsShortOfFour:4}]});
 assert.ok(question.includes('stress-calm'));assert.ok(question.length<1800);
 assert.ok(question.includes('no clinical, private or customer data')||question.includes('No clinical, private or customer data'));
});
test('Council result remains only an owner-reviewed proposal, never executable',()=>{
 const base={status:'ok',synthesis:{status:'ok',parsed:{answer:'Find additional footage',actions:[{step:'Search for two calm river scenes',why:'gap in coverage',check:'Confirm source pages and imageinfo'}],unknowns:[]}}};
 const proposed=normalizeCouncilProposal(base);assert.equal(proposed.ownerApprovalRequired,true);assert.equal(proposed.rightsApproved,false);assert.equal(proposed.publishAuthorized,false);
 assert.equal(normalizeCouncilProposal({status:'error'}),null);
});
test('weekly route opts out of potential Argon credit usage',()=>{
 const s=readFileSync(new URL('../lib/automations/weekly-council-runner.js',import.meta.url),'utf8');
 assert.match(s,/HH_AUTOMATION_COUNCIL_ENABLED!=='true'/);
 assert.match(s,/HH_COUNCIL_ARGON_GATEWAY_ENABLED:'false'/);
});
test('proposal SQL prohibits anonymous access and automatic effect',()=>{
 const s=readFileSync(new URL('../sql/ai-council-weekly-proposals-v2-20261106.sql',import.meta.url),'utf8');
 assert.match(s,/FORCE ROW LEVEL SECURITY/);assert.match(s,/REVOKE ALL ON .* FROM PUBLIC,anon,authenticated/);
 assert.match(s,/ownerApprovalRequired/);assert.match(s,/publishAuthorized/);
 assert.doesNotMatch(s,/UPDATE\(.*policy_version/);
});
