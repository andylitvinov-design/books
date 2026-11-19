import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../"+path, import.meta.url),"utf8");
test("two mobile Home modes have four translated topics each", () => {
 const home=read("components/home-dialogue-entry.tsx");
 for(const id of ["stress","love","confidence","money","business_clients","business_strategy","business_team","business_burnout"]) assert.ok(home.includes(`id:"${id}"`),id);
 for(const name of ["Clients & Revenue","Strategy & Decisions","Team & Partners","Stress & Burnout","Клиенты и доход","Стресс и выгорание","Clientes e ingresos","Estrés y agotamiento"]) assert.ok(home.includes(name),name);
 assert.ok(home.includes('mode==="business"?t.businessHints:t.focusHints'));
 assert.ok(home.includes('mode==="business"?BUSINESS_ICONS:FOCUS_ICONS'));
 assert.ok(home.includes("data-home-focus-grid"));
 assert.ok(home.includes("data-home-intent-composer"));
});
test("Home buttons feed real Support with whitelisted public category/need, while text stays in Ali",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 const route=read("app/[locale]/services/page.tsx");
 const quiz=read("components/services-assist-quiz.tsx");
 assert.ok(home.includes("startTopicJourney(hint.topic,hint.need)"));
 assert.ok(home.includes('router.push(chatPath+"&intent="+intent)'));
 assert.ok(home.includes('if(mode==="self")'));
 assert.ok(home.includes('data-home-request-session'));
 assert.ok(home.includes("encodeURIComponent(topic)"));
 assert.ok(home.includes("encodeURIComponent(need)"));
 assert.ok(route.includes("initialTopic={query?.topic}"));
 assert.ok(route.includes("initialNeed={query?.need}"));
 assert.ok(quiz.includes("t.questions.topic.options.some"));
 assert.ok(quiz.includes("t.needs[topicFromUrl].options.some"));
 assert.ok(quiz.includes("useState(topicFromUrl ? 1 : 0)"));
 for(const name of ["Стресс и выгорание","Stress and burnout","Estrés y agotamiento"]) assert.ok(quiz.includes(name),name);
 assert.ok(home.includes("startConversationWith(draft)"));
 assert.ok(home.includes("stageHomeAliHandoff(window.sessionStorage"));
});
test("first Home payload remains image-only with no video/media fetch on entry",()=>{
 const source=read("components/home-dialogue-entry.tsx");
 const css=read("components/home-dialogue-entry.module.css");
 assert.ok(css.includes(".focusGrid{display:grid;grid-template-columns:repeat(2"));
 assert.ok(css.includes("@media(max-width:430px)"));
 assert.ok(!source.includes("<iframe"));assert.ok(!source.includes("<video"));
});
