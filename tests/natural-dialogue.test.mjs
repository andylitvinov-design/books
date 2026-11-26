// Existing specialist suite also enforces RU/EN Qwen quality without a new CI workflow.
import "./qwen-quality-ru-en.test.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {prepareNaturalDialogue,acceptNaturalOutput,finishNaturalDialogue} from "../lib/holistic-support/natural-dialogue.mjs";
import {validatedOllamaConfig,generateOwnedOllama} from "../lib/holistic-support/owned-ollama.mjs";
import {repeatedDialogueQuestion,repairRepeatedDialogueQuestion} from "../lib/holistic-support/ali-dialogue-quality.mjs";
const d={status:"recommend",message:"A reviewed option is available.",suggestions:[
  {id:"video:1",kind:"video",title:"Verified video",href:"/en/holistic-support",reasons:["chosen_topic"]}]};
test("free fallback without provider consent never invokes a language model",async()=>{
  const x=prepareNaturalDialogue({message:"Как дела?",decision:d,channel:"owned",
    access:{authenticated:true,ownerScoped:true}});
  assert.equal(x.modelAllowed,false);
  assert.equal((await finishNaturalDialogue(x,()=>{throw Error("MUST_NOT_RUN");})).modelUsed,false);
});
test("owned generation is separately opted in and requires server owner context",()=>{
  const x={message:"Помоги",decision:d,channel:"owned",consent:{ownedInference:true}};
  assert.equal(prepareNaturalDialogue(x).modelAllowed,false);
  assert.equal(prepareNaturalDialogue({...x,access:{authenticated:true,ownerScoped:false}}).modelAllowed,false);
  assert.equal(prepareNaturalDialogue({...x,access:{authenticated:true,ownerScoped:true}}).modelAllowed,true);
});
test("local-browser inference requires opt-in but not a private profile",()=>{
  const x=prepareNaturalDialogue({message:"Help",decision:d,channel:"browser",
    consent:{browserInference:true}});
  assert.equal(x.provider,"browser");assert.equal(x.modelAllowed,true);
});
test("unknown, safety, review and pause statuses bypass model completely",()=>{
  for(const status of ["safety_handoff","safety_check_required","human_review_required","client_paused",
    "paused_for_review","unavailable"]){
    const x=prepareNaturalDialogue({decision:{status},message:"Hello",channel:"browser",
      consent:{browserInference:true}});
    assert.equal(x.modelAllowed,false);
  }
});
test("profile memory only contributes confirmed style and name after separate opt-in",()=>{
  const base={decision:d,message:"Hello",channel:"browser",
    access:{authenticated:true,ownerScoped:true},
    consent:{browserInference:true},
    memory:{preferredName:"Mira",preferredStyle:"concise",medicalNote:"PRIVATE_HEALTH_NOTE"}};
  const no=JSON.stringify(prepareNaturalDialogue(base).modelRequest);
  assert.ok(!no.includes("Mira")&&!no.includes("PRIVATE_HEALTH_NOTE"));
  const yes=JSON.stringify(prepareNaturalDialogue({...base,consent:{browserInference:true,agentMemory:true}}).modelRequest);
  assert.ok(yes.includes("Mira")&&!yes.includes("PRIVATE_HEALTH_NOTE"));
});
test("history bounded, unauthenticated role claims ignored, unsupported suggestions excluded",()=>{
  const x=prepareNaturalDialogue({decision:{...d,suggestions:[...d.suggestions,
    {id:"evil",kind:"video",title:"Bad",href:"javascript:alert(1)"}]},
    message:"Hello",channel:"browser",consent:{browserInference:true},
    history:[...Array.from({length:10},(_,n)=>({role:"assistant",text:"line"+n})),
      {role:"system",text:"PROMPT_OVERRIDE"}]});
  const s=JSON.stringify(x.modelRequest);
  assert.equal(x.modelRequest.messages.length,8);
  assert.ok(!s.includes("PROMPT_OVERRIDE")&&!s.includes("javascript")&&!s.includes("line1"));
});
test("rephrase works; disallowed URLs, HTML and impersonation fall back",async()=>{
  const x=prepareNaturalDialogue({locale:"en",decision:d,message:"Where to begin?",channel:"browser",
    consent:{browserInference:true}});
  assert.ok(acceptNaturalOutput("We could start with a small step.",x));
  for(const text of ["Go to https://malicious.example","<script>hi</script>","I am a human"])
    assert.equal(acceptNaturalOutput(text,x),null);
  const valid=await finishNaturalDialogue(x,async()=>"What would help you most right now?");
  assert.equal(valid.modelUsed,true);
  assert.equal((await finishNaturalDialogue(x,async()=>"https://evil.example")).modelUsed,false);
});
test("browser generation cannot claim that it has booked a client",async()=>{
 for(const [locale,message,response] of [
  ['en','I would like a consultation.',"I've booked you for tomorrow."],
  ['ru','Я хочу консультацию.','Я записала вас на завтра.'],
 ]){
  const envelope=prepareNaturalDialogue({locale,message,decision:{status:'clarify',message:'Please clarify.'},
   channel:'browser',consent:{browserInference:true}});
  const result=await finishNaturalDialogue(envelope,async()=>response);
  assert.equal(result.modelUsed,false);assert.notEqual(result.text,response);
 }
});
test("oversized text, empty policy and null input never invoke a model",()=>{
  assert.equal(prepareNaturalDialogue({decision:d,message:"x".repeat(3001),channel:"browser",
    consent:{browserInference:true}}).modelAllowed,false);
  assert.equal(prepareNaturalDialogue({decision:null,message:"Hi",channel:"browser",
    consent:{browserInference:true}}).modelAllowed,false);
});
test("fixed Ollama endpoint enforces production HTTPS and restricted path",()=>{
  assert.equal(validatedOllamaConfig({endpoint:"https://agent.example.org/api/chat",model:"qwen3:4b"}).model,"qwen3:4b");
  for(const endpoint of ["http://remote.example/api/chat","https://host.example/health",
    "https://user:pass@host.example/api/chat","file:///tmp/api/chat"])
    assert.equal(validatedOllamaConfig({endpoint,model:"qwen3:4b"}),null);
  assert.ok(validatedOllamaConfig({endpoint:"http://127.0.0.1:11434/api/chat",model:"qwen3:4b",production:false}));
});
test("owned inference sends only allowed request to configured model (mock network)",async()=>{
  let called;
  const answer=await generateOwnedOllama({messages:[{role:"system",content:"Hi"},
    {role:"user",content:"Hello"}]},{
    endpoint:"https://agent.example.org/api/chat",model:"qwen3:4b",
    bearerToken:"this-is-a-server-only-token-123",
    fetcher:async(url,options)=>{called={url,options};return {ok:true,json:async()=>({message:{content:"Hello!"}})};},
  });
  assert.equal(answer,"Hello!");
  assert.equal(called.url,"https://agent.example.org/api/chat");
  assert.equal(JSON.parse(called.options.body).stream,false);
  assert.equal(called.options.redirect,"error");
});

// Synthetic-only regressions: no provider, storage or client data.
const aliQuestionCases=[
  [
    "ru",
    "Что для вас важнее всего?",
    "Понимаю. Что сейчас для вас важнее всего?",
    "Да, уже сказал.",
    true
  ],
  [
    "ru",
    "Что для вас сейчас важнее?",
    "Что для вас сейчас важнее?!",
    "Работа.",
    true
  ],
  [
    "ru",
    "Вам важнее работа или семья?",
    "Вам важнее работа или здоровье?",
    "Не знаю.",
    false
  ],
  [
    "ru",
    "Что для вас важнее всего?",
    "Что для вас важнее всего?",
    "Повтори вопрос",
    false
  ],
  [
    "ru",
    "Как дела?",
    "Хорошо, я понял.",
    "Спасибо",
    false
  ],
  [
    "en",
    "What matters most to you?",
    "What is most important to you right now?",
    "My family.",
    true
  ],
  [
    "en",
    "What would you like to talk about?",
    "Thanks for sharing. What's on your mind?",
    "Work.",
    true
  ],
  [
    "en",
    "Would you prefer a morning or evening session?",
    "Would you prefer a morning or weekend session?",
    "I'm unsure.",
    false
  ],
  [
    "en",
    "What matters most to you?",
    "What matters most to you?",
    "Repeat the question",
    false
  ],
  [
    "en",
    "I can explain the options.",
    "I can explain the options.",
    "Please explain.",
    false
  ],
  [
    "es",
    "¿Qué es lo más importante para ti?",
    "Entiendo. ¿Qué te importa más ahora?",
    "Mi familia.",
    true
  ],
  [
    "es",
    "¿De qué te gustaría hablar?",
    "¿De qué quieres conversar?",
    "Trabajo.",
    true
  ],
  [
    "es",
    "¿Prefieres hablar del trabajo o de la familia?",
    "¿Prefieres hablar del trabajo o del dinero?",
    "No sé.",
    false
  ],
  [
    "es",
    "¿Qué te importa más ahora?",
    "¿Qué te importa más ahora?",
    "Repite la pregunta",
    false
  ],
  [
    "es",
    "Estoy aquí.",
    "Estoy aquí.",
    "Gracias.",
    false
  ]
];
for(const [locale,old,reply,message,expected] of aliQuestionCases){
 test("Ali bounded repeat check "+locale+" "+old+" / "+message,()=>{
  const history=[{role:"assistant",text:old},{role:"user",text:"fixture"},{role:"assistant",text:"Acknowledgement."}];
  assert.equal(repeatedDialogueQuestion({reply,history,message,locale}).repeated,expected);
  const fixed=repairRepeatedDialogueQuestion({reply,history,message,locale});
  assert.equal(fixed.changed,expected);
  if(expected)assert.doesNotMatch(fixed.reply,/[?？]/u);
  else assert.equal(fixed.reply,reply);
 });
}
test("Ali uses a grounded different question instead of another generic loop",()=>{
 const result=repairRepeatedDialogueQuestion({locale:"en",message:"Closeness",reply:"What matters most to you?",history:[{role:"assistant",text:"What is most important to you?"}],alternative:"Do you miss attention or feeling understood?"});
 assert.equal(result.reason,"grounded_alternative");
});
test("Ali never attributes a user question to the assistant",()=>{
 assert.equal(repeatedDialogueQuestion({reply:"What matters most to you?",history:[{role:"user",text:"What matters most to you?"}]}).repeated,false);
});
test("Ali rejects a repeated generated question without a second model call",async()=>{
 const history=[{role:"assistant",text:"What is most important to you right now?"}];
 const envelope=prepareNaturalDialogue({locale:"en",message:"Work.",decision:{status:"no_match",message:"What matters most to you?"},history,channel:"browser",consent:{browserInference:true}});
 let calls=0;
 const answer=await finishNaturalDialogue(envelope,async()=>{calls++;return "What matters most to you?";});
 assert.equal(calls,1);assert.equal(answer.modelUsed,false);
 assert.equal(repeatedDialogueQuestion({reply:answer.text,history,locale:"en"}).repeated,false);
});
