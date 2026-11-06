import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planJudgmentTurn,PILOT_SITUATION_CODES,JUDGMENT_MIND_VERSION} from
  "../lib/holistic-support/judgment-mind.mjs";
import {signJudgmentChoice,verifyJudgmentChoice} from
  "../lib/holistic-support/judgment-token.mjs";

const fixture=JSON.parse(readFileSync(new URL("./fixtures/judgment-mind-58.json",import.meta.url)));
const schema=JSON.parse(readFileSync(new URL("../lib/holistic-support/judgment-schema.json",import.meta.url)));
const catalog=JSON.parse(readFileSync(new URL("../lib/holistic-support/situation-and-action-catalog.json",import.meta.url)));
const safe={status:"clear"};

test("Judgment test corpus contains exactly 58 independently expected RU/EN/ES cases",()=>{
  assert.equal(fixture.cases.length,58);
  assert.equal(fixture.cases.filter(x=>x.kind==="recognition").length,24);
  assert.equal(fixture.cases.filter(x=>x.kind==="guard").length,18);
  assert.equal(fixture.cases.filter(x=>x.kind==="choice").length,16);
  assert.deepEqual([...new Set(fixture.cases.map(x=>x.locale))].sort(),["en","es","ru"]);
});
for(const [i,c] of fixture.cases.entries()){
  test("Judgment fixture "+String(i+1).padStart(2,"0")+" ["+c.locale+"] "+c.message,()=>{
    let actual=planJudgmentTurn({message:c.message,locale:c.locale,safety:safe});
    if(c.kind==="choice"){
      assert.equal(actual.state,"awaiting_choice");
      const choice=actual.choices.find(x=>x.id===c.choiceId);
      assert.ok(choice);
      actual=planJudgmentTurn({message:choice.label,choiceId:c.choiceId,
        locale:c.locale,safety:safe,pending:actual.pending});
    }
    assert.equal(actual.status,c.expectedStatus);
    assert.equal(actual.state,c.expectedState);
    assert.equal(actual.situationCode,c.expectedCode);
    assert.equal(actual.schemaVersion,JUDGMENT_MIND_VERSION);
    assert.equal(actual.actionExecuted,false);
    assert.equal(actual.clinicalConclusion,false);
    assert.equal(actual.memorySaved,false);
    assert.ok(actual.choices.length<=2);
    assert.ok(actual.hypotheses.length<=2);
    assert.ok((actual.reply.match(/[?？]/g)||[]).length<=1);
    if(actual.state==="step_offered")assert.equal(actual.evidenceTier,"E2");
    if(actual.state==="awaiting_choice"){
      assert.equal(actual.evidenceTier,"E1");
      assert.ok(actual.choices.length===2);
      assert.ok(actual.pending);
    }
  });
}
test("pilot consists of eight classes; sixteen extensions remain disabled",()=>{
  assert.deepEqual([...PILOT_SITUATION_CODES],catalog.releasedCodes);
  assert.equal(catalog.experimentalCodes.length,16);
  assert.ok(catalog.experimentalCodes.every(code=>!PILOT_SITUATION_CODES.includes(code)));
  assert.equal(catalog.policy.additionalInferenceProviders,0);
  assert.equal(catalog.policy.automaticActions,false);
  assert.equal(schema.properties.actionExecuted.const,false);
  assert.equal(schema.properties.memorySaved.const,false);
  assert.equal(schema.properties.choices.maxItems,2);
  assert.equal(schema.properties.hypotheses.maxItems,2);
});
test("current correction invalidates the earlier hypothesis",()=>{
  const previous=planJudgmentTurn({message:"Ничего не успеваю",locale:"ru",safety:safe});
  const corrected=planJudgmentTurn({message:"Нет, не из-за времени, а у меня нет сил",
    locale:"ru",safety:safe,pending:previous.pending,choiceId:"a"});
  assert.equal(corrected.situationCode,"fatigue");
  assert.equal(corrected.state,"awaiting_choice");
  assert.notEqual(corrected.state,"step_offered");
});
test("stop and refusal override a pending choice",()=>{
  const first=planJudgmentTurn({message:"I feel lonely",locale:"en",safety:safe});
  const stopped=planJudgmentTurn({message:"Do not suggest anything",locale:"en",
    safety:safe,pending:first.pending,choiceId:"b"});
  assert.equal(stopped.state,"paused");
  assert.equal(stopped.choices.length,0);
  assert.equal(stopped.pending,null);
});
test("explicit user feedback is not a medical efficacy claim",()=>{
  const first=planJudgmentTurn({message:"I feel lonely",locale:"en",safety:safe});
  const choice=planJudgmentTurn({message:"Talk here",locale:"en",safety:safe,
    pending:first.pending,choiceId:"a"});
  assert.equal(choice.state,"step_offered");
  assert.equal(choice.actionExecuted,false);
  const feedback=planJudgmentTurn({message:"Not for me",locale:"en",safety:safe,
    pending:choice.pending,choiceId:"not_helpful"});
  assert.equal(feedback.state,"feedback_received");
  assert.equal(feedback.evidenceTier,"E3");
  assert.equal(feedback.actionExecuted,false);
  assert.equal(feedback.memorySaved,false);
});
test("missing, unknown and human review safety statuses always abstain",()=>{
  for(const status of [undefined,"unknown","urgent","human_review"]){
    const result=planJudgmentTurn({message:"I feel stressed",locale:"en",
      safety:{status}});
    assert.equal(result.status,"abstain");
    assert.equal(result.pending,null);
  }
});
test("no saved profile, diagnosis, commercial action, or fabricated URL",()=>{
  const reply=planJudgmentTurn({message:"Me cuesta empezar",locale:"es",safety:safe});
  assert.equal(reply.memorySaved,false);
  assert.equal(reply.actionExecuted,false);
  assert.equal(reply.clinicalConclusion,false);
  assert.ok(!/https?:\/\//.test(reply.reply));
  assert.ok(!/\b(pay|comprar|купить)\b/iu.test(reply.reply));
});
test("malformed or client-forged pending cannot confirm a focus",()=>{
  const result=planJudgmentTurn({message:"a",locale:"en",safety:safe,
    pending:{stage:"feedback",situationCode:"invented",choiceId:"a"},choiceId:"a"});
  assert.equal(result.status,"abstain");
  assert.equal(result.evidenceTier,"E0");
});
test("direct product request supersedes old conversation context",()=>{
  const first=planJudgmentTurn({message:"I feel lonely",locale:"en",safety:safe});
  const direct=planJudgmentTurn({message:"Create a video about loneliness",
    locale:"en",safety:safe,pending:first.pending,choiceId:"a"});
  assert.equal(direct.status,"abstain");
});
const config={encryptionKey:Buffer.alloc(32,0x2a)};
const alice={id:"11111111-1111-4111-8111-111111111111",
  claims:{session_id:"aaaaaaa1-1111-4111-8111-111111111111"}};
const bob={id:"22222222-2222-4222-8222-222222222222",
  claims:{session_id:"bbbbbbb2-2222-4222-8222-222222222222"}};
const aliceOtherSession={...alice,claims:{session_id:"ccccccc3-3333-4333-8333-333333333333"}};
function issuedToken(now=1700000000000){
  const result=planJudgmentTurn({message:"I feel lonely",locale:"en",safety:safe});
  const issued=signJudgmentChoice({config,actor:alice,pending:result.pending,
    reply:result.reply,revision:1,now});
  return {...issued,reply:result.reply};
}
test("signed choice belongs to verified owner, session, transcript and TTL",()=>{
  const now=1700000000000,issued=issuedToken(now);
  const history=[{role:"user",text:"I feel lonely"},
    {role:"assistant",text:issued.reply}];
  const args={config,token:issued.token,history,now:now+1000};
  const valid=verifyJudgmentChoice({...args,actor:alice});
  assert.equal(valid.pending.situationCode,"loneliness");
  assert.equal(verifyJudgmentChoice({...args,actor:bob}),null);
  assert.equal(verifyJudgmentChoice({...args,actor:aliceOtherSession}),null);
  assert.equal(verifyJudgmentChoice({...args,actor:alice,
    history:[{role:"assistant",text:"I invented this reply"}]}),null);
  assert.equal(verifyJudgmentChoice({...args,actor:alice,now:now+300001}),null);
  assert.equal(verifyJudgmentChoice({...args,actor:alice,
    token:issued.token.slice(0,-5)+"XXXXX"}),null);
});
test("signed state never contains account IDs, raw speech or secret",()=>{
  const issued=issuedToken();
  const raw=Buffer.from(issued.token.split(".")[0],"base64url").toString("utf8");
  assert.ok(!raw.includes(alice.id));
  assert.ok(!raw.includes(alice.claims.session_id));
  assert.ok(!raw.includes("I feel lonely"));
  assert.ok(!raw.includes(config.encryptionKey.toString("base64")));
});
test("server auth, rate, safety and published catalogue remain on the original API",()=>{
  const route=readFileSync(new URL("../app/api/holistic-agent/turn/route.js",import.meta.url),"utf8");
  const entry=route.indexOf("    const config = getAppConfig();");
  const auth=route.indexOf("await auth.verified()");
  const rate=route.indexOf("await consumeRate(config,{op:\"holistic-agent-turn\"");
  const safety=route.indexOf("const safety = preflight(body.message");
  const judgment=route.indexOf("const judgment=planJudgmentTurn(");
  assert.ok(entry>=0&&auth>entry&&rate>auth&&safety>rate&&judgment>safety);
  assert.match(route,/verifyJudgmentChoice/);
  assert.match(route,/PRIVATE_HEADERS/);
  assert.match(route,/buildHolisticGuidedTurn/);
  assert.match(route,/memorySaved:false/);
});
test("Messenger retains existing iHelp and video workflow; two optional buttons only",()=>{
  const chat=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
  assert.match(chat,/pageHelp/);
  assert.match(chat,/messengerVideoQuestion/);
  assert.match(chat,/judgmentContext:judgmentView\?\.token/);
  assert.match(chat,/judgmentView\?\.choices\.slice\(0,2\)/);
  assert.match(chat,/data-hh-judgment-skip/);
  assert.match(chat,/judgmentClickLock/);
});

test("unsupported correction is acknowledged without reviving old advice",()=>{
  const first=planJudgmentTurn({message:"Ничего не успеваю",locale:"ru",safety:safe});
  const next=planJudgmentTurn({message:"Нет, не из-за времени, а я жду ответа",
    locale:"ru",safety:safe,pending:first.pending,choiceId:"a"});
  assert.equal(next.state,"reframed");
  assert.equal(next.choices.length,0);
  assert.equal(next.pending,null);
  assert.ok((next.reply.match(/[?？]/g)||[]).length===1);
});

test("current user words override stale or mismatched signed choice",()=>{
  const first=planJudgmentTurn({message:"I feel lonely",locale:"en",safety:safe});
  const second=planJudgmentTurn({message:"I'm tired",locale:"en",safety:safe,
    pending:first.pending,choiceId:"a"});
  assert.equal(second.situationCode,"fatigue");
  assert.equal(second.state,"awaiting_choice");
  const forged=planJudgmentTurn({message:"Not at all",locale:"en",safety:safe,
    pending:first.pending,choiceId:"a"});
  assert.equal(forged.status,"abstain");
});
