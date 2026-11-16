import test from "node:test";
import assert from "node:assert/strict";
import {
  makeActionPlan,issueBody,publishActionIssue,ISSUE_TITLE,ISSUE_LABEL
} from "../scripts/holistic-light-qa-handoff.mjs";

const report=(critical=[],warnings=[],route="/ru/holistic-support/mandala",width=390)=>({
  route,width,critical,warnings,
});
const summary=(...reports)=>({
  schema:"hh.design-bible-qa-batch.v1",publicGuestOnly:true,
  reports,criticalCases:reports.filter(p=>p.critical.length>0).length,
});
function fakeGithub() {
  const requests=[],stored=[],labels=new Set();
  const rest={issues:{
    getLabel: async o=>{requests.push(["getLabel",o]);if(!labels.has(o.name))throw {status:404};return {data:{name:o.name}};},
    createLabel: async o=>{requests.push(["createLabel",o]);labels.add(o.name);return {data:o};},
    listForRepo: async o=>{requests.push(["listForRepo",o]);return {data:stored};},
    create: async o=>{requests.push(["create",o]);const issue={number:888,html_url:"https://github.com/andylitvinov-design/books/issues/888",title:o.title,body:o.body};stored.push(issue);return {data:issue};},
    update: async o=>{requests.push(["update",o]);const old=stored.find(x=>x.number===o.issue_number);Object.assign(old,{body:o.body,state:o.state});return {data:old};}
  }};
  return {github:{rest},requests,stored,labels};
}
test("one concrete critical repair task with screenshot evidence, path and acceptance",()=>{
  const p=makeActionPlan(summary(report([{code:"HORIZONTAL_OVERFLOW",reason:"Doc width +18px"}])));
  assert.equal(p.nextAction,"REPRODUCE_AND_REPAIR_EXISTING_CODE");
  assert.equal(p.highest.code,"HORIZONTAL_OVERFLOW");
  assert.equal(p.highest.ownerFile,"app/[locale]/holistic-support/mandala/page.tsx");
  const body=issueBody(p,{runUrl:"https://github.com/andylitvinov-design/books/actions/runs/123",
    sourceHead:"a".repeat(40)});
  for(const t of ["Doc width +18px","320/390/430","existing module","SOURCE_COMMIT","PR","not yet claimed"])
    assert.ok(body.includes(t),t);
});
test("group identical root cause across EN/RU/ES rather than open three tickets",()=>{
  const p=makeActionPlan(summary(
    report([{code:"SOLID_CONTROL_CONTRAST"}],[],"/ru/holistic-support/mandala",320),
    report([{code:"SOLID_CONTROL_CONTRAST"}],[],"/en/holistic-support/mandala",390),
    report([{code:"SOLID_CONTROL_CONTRAST"}],[],"/es/holistic-support/mandala",430)));
  assert.equal(p.findings.length,1);
  assert.deepEqual(p.highest.observations.map(x=>x.locale),["ru","en","es"]);
});
test("high-risk layout/contrast outranks subjective color cast",()=>{
  const p=makeActionPlan(summary(report([{code:"HORIZONTAL_OVERFLOW"}],[{code:"SAGE_GREEN_WASH"}])));
  assert.equal(p.highest.code,"HORIZONTAL_OVERFLOW");
  assert.equal(p.findings[1].kind,"visual-review");
});
test("fail closed on absent reports, private URL or false safety claim",()=>{
  assert.throws(()=>makeActionPlan({schema:"hh.design-bible-qa-batch.v1",publicGuestOnly:true,reports:[]}),/Invalid/);
  assert.throws(()=>makeActionPlan(summary(report([],[],"/ru/app/practice"))),/Unsafe|Invalid/);
  assert.throws(()=>makeActionPlan({...summary(report()),publicGuestOnly:false}),/Invalid/);
});
test("one canonical issue is created and then updated, never duplicated",async()=>{
  const g=fakeGithub();
  const args={github:g.github,owner:"andylitvinov-design",repo:"books",
    summary:summary(report([{code:"HORIZONTAL_OVERFLOW"}])),
    runUrl:"https://github.com/andylitvinov-design/books/actions/runs/987",
    sourceHead:"a".repeat(40)};
  const first=await publishActionIssue(args),second=await publishActionIssue(args);
  assert.equal(first.status,"ISSUE_CREATED");
  assert.equal(second.status,"ISSUE_UPDATED");
  assert.equal(second.issueNumber,888);
  assert.equal(g.stored.length,1);
  assert.equal(g.requests.filter(([name])=>name==="create").length,1);
  assert.equal(g.requests.filter(([name])=>name==="createLabel").length,1);
  assert.ok(g.labels.has(ISSUE_LABEL));
  assert.equal(g.stored[0].title,ISSUE_TITLE);
});
test("clean samples close an existing queue but do not claim human visual approval",async()=>{
  const g=fakeGithub();
  const opts={github:g.github,owner:"andylitvinov-design",repo:"books"};
  await publishActionIssue({...opts,summary:summary(report([{code:"SMALL_TAP_TARGETS"}]))});
  const clean=await publishActionIssue({...opts,summary:summary(report())});
  assert.equal(clean.status,"ISSUE_UPDATED");
  assert.equal(clean.action,"REVIEW_SCREENSHOTS_AND_EXPAND_COVERAGE");
  assert.equal(g.stored[0].state,"closed");
  assert.match(g.stored[0].body,/No machine-confirmed fault/);
});
test("unrelated repository is rejected before Github writes",async()=>{
  const g=fakeGithub();
  await assert.rejects(publishActionIssue({github:g.github,owner:"other",repo:"books",
    summary:summary(report())}),/Repository safety mismatch/);
  assert.equal(g.requests.length,0);
});
