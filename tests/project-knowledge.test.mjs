import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { KNOWLEDGE_TOPICS, searchProjectKnowledge, buildOwnerProjectContext,
  prepareKnowledgeRecord, validKnowledgeSourceUrl } from "../lib/project-knowledge/registry.mjs";
import { loadPrivateKnowledge, parseKnowledgeSheetRanges, knowledgeConfig }
  from "../lib/project-knowledge/google-sheets.mjs";

test("knowledge cards support RU, EN, topic and typo-free terms",()=>{
  assert.ok(KNOWLEDGE_TOPICS.length>=8);
  assert.equal(searchProjectKnowledge({query:"наши цвета"})[0]?.id,"brand");
  assert.equal(searchProjectKnowledge({query:"CI merge"})[0]?.id,"delivery");
  assert.equal(searchProjectKnowledge({query:"SEO analytics",locale:"en"})[0]?.id,"analytics");
  assert.equal(searchProjectKnowledge({query:"проверка",category:"palette"}).length,0);
});
test("project assistant denied by default and never includes untrusted raw prompts",()=>{
  assert.deepEqual(buildOwnerProjectContext({query:"маркетинг"}),{status:"access_denied",results:[]});
  const x=buildOwnerProjectContext({ownerAuthorized:true,query:"маркетинг"});
  assert.equal(x.status,"matched");
  assert.equal(x.verifiedLive,false);
  assert.equal(x.provenance,"curated_overview_only");
  assert.equal(JSON.stringify(x).includes("https://docs.google.com/"),false);
});
test("URLs, IDs and records are strictly constrained",()=>{
  assert.equal(validKnowledgeSourceUrl("https://evil.example/?x=1"),null);
  assert.equal(validKnowledgeSourceUrl("javascript:alert(1)"),null);
  assert.equal(validKnowledgeSourceUrl("https://docs.google.com.evil.org/document/d/12345678901234567890/edit"),null);
  assert.ok(validKnowledgeSourceUrl("https://docs.google.com/document/d/12345678901234567890/edit"));
  assert.equal(prepareKnowledgeRecord({id:"PRIVATE",category:"decision",title:"unsafe"}),null);
  const x=prepareKnowledgeRecord({id:"DEC-002",category:"decision",title:"A",sourceUrl:"https://evil.example",
    summary:"x".repeat(10000)});
  assert.equal(x.sourceUrl,null);
  assert.equal(x.summary.length,700);
});
test("sheet parsing uses only approved columns and never exposes extra owner data",()=>{
  const ranges=[
    {values:[["DES-001","Brand","Design Bible","Google Docs","Основной","2026-11-02",
      "Colors", "https://docs.google.com/document/d/12345678901234567890/edit","Да"]]},
    {values:[["DEC-003","Бренд","Наши цвета","Утверждено","Внедрение проверить","P0",
      "2026-11-02","DES-001","https://docs.google.com/document/d/12345678901234567890/edit","palette",""]]},
    {values:[["TASK-002","Studio","Voice preview","P1","QA","WAIT_CI","Real audio","TEC-001",""]]},
    {values:[["primary","#067A67","Teal Green","CTA","Brand",""]]},
  ];
  const records=parseKnowledgeSheetRanges(ranges);
  assert.deepEqual(records.map(x=>x.category),["source","decision","plan","palette"]);
  const x=searchProjectKnowledge({query:"цвета",records});
  assert.ok(x.some(r=>r.id==="DEC-003"));
  assert.ok(x.every(r=>!JSON.stringify(r).includes("access_token")));
});
test("private provider is opt-in only; no network in unconfigured mode",async()=>{
  let called=false;
  assert.equal(knowledgeConfig({}),null);
  const result=await loadPrivateKnowledge({env:{},fetcher:()=>{called=true;throw Error("network");}});
  assert.equal(result.mode,"not_configured");
  assert.equal(called,false);
});
test("Google JWT read is scoped, safe and returns verified private rows",async()=>{
  const {privateKey}=generateKeyPairSync("rsa",{modulusLength:2048,
    privateKeyEncoding:{type:"pkcs8",format:"pem"},
    publicKeyEncoding:{type:"spki",format:"pem"}});
  const env={HH_KNOWLEDGE_SHEET_ID:"12345678901234567890",
    HH_KNOWLEDGE_GOOGLE_CLIENT_EMAIL:"readonly@demo.iam.gserviceaccount.com",
    HH_KNOWLEDGE_GOOGLE_PRIVATE_KEY:privateKey};
  let requests=0;
  const fake=async (url,options)=>{
    requests++;
    if(url.includes("/token")){
      assert.equal(options.method,"POST");
      assert.ok(String(options.body).includes("assertion"));
      return {ok:true,json:async()=>({access_token:"FAKE_TOKEN_1234567890"})};
    }
    assert.ok(url.includes("/values:batchGet"));
    assert.ok(options.headers.authorization.startsWith("Bearer "));
    return {ok:true,json:async()=>({valueRanges:[
      {values:[["MKT-001","Маркетинг","Marketing Mind","Doc","Основной","2026-11-02","Воронка",""]]},
      {values:[["DEC-002","Маркетинг","Стратегия","Утверждено","НЕ LIVE","P0","2026-11-02","MKT-001","","воронка"]]},
      {values:[]},{values:[]},
    ]})};
  };
  const result=await loadPrivateKnowledge({env,fetcher:fake,clock:()=>1793630000000});
  assert.equal(result.mode,"drive_readonly");
  assert.equal(requests,2);
  assert.equal(result.records.length,2);
  assert.equal(result.records[1].status,"Утверждено / НЕ LIVE");
});
test("provider errors never surface auth tokens or private URLs",async()=>{
  const result=await loadPrivateKnowledge({env:{
    HH_KNOWLEDGE_SHEET_ID:"12345678901234567890",
    HH_KNOWLEDGE_GOOGLE_CLIENT_EMAIL:"bad-email",
    HH_KNOWLEDGE_GOOGLE_PRIVATE_KEY:"invalid",
  },fetcher:()=>{throw Error("secret");}});
  assert.equal(result.mode,"not_configured");
  assert.equal(result.records.length,0);
});
