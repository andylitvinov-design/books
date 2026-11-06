import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getIHelpContext } from "../lib/ihelp-context.mjs";

const context = (pathname, locale="ru", tab="") => getIHelpContext({pathname,locale,tab});

test("iHelp reads only route and approved tab to select the correct video support",()=>{
  const video="/ru/holistic-support/mandala";
  assert.equal(context(video,"ru","video").id,"video");
  assert.equal(context(video,"ru","effects").id,"videoEffects");
  assert.equal(context(video,"ru","style").id,"videoEffects");
  assert.equal(context(video,"ru","audio").id,"videoAudio");
  assert.equal(context(video,"ru","text").id,"videoText");
  assert.equal(context(video,"ru","editor").id,"videoText");
  assert.equal(context(video,"ru","settings").id,"videoSettings");
  assert.equal(context(video,"ru","ideas").id,"videoIdeas");
  assert.equal(context("/en/video-studio","en","effects").id,"videoEffects");
  assert.equal(context("/ru/holistic-support/mandala?mode=photo","ru","effects").id,"video");
});

test("iHelp provides context-specific actions on important public and private routes",()=>{
  const cases=[
    ["/ru/tests","tests"],
    ["/en/mytube","mytube"],
    ["/es/academy","academy"],
    ["/en/services","services"],
    ["/ru/app/portrait","cabinet"],
    ["/ru/app/messages","messages"],
    ["/en/library","library"],
    ["/en/holistic-support/mobile","practice"],
    ["/es/shop","shop"],
    ["/","home"],
    ["/en","home"],
    ["/admin/private","home"],
  ];
  for(const [path,id] of cases) {
    const got=context(path);
    assert.equal(got.id,id,path);
    assert.ok(got.intro.length>10,path);
    assert.ok(got.actions.length>=2,path);
    assert.ok(got.actions.every(row=>row.label&&row.question&&row.reply),path);
  }
});

test("iHelp suggestions are localized, informative and include another-question action",()=>{
  for(const locale of ["ru","en","es"]) {
    for(const path of ["/"+locale+"/tests","/"+locale+"/video-studio","/"+locale+"/app/messages"]) {
      const got=context(path,locale);
      assert.ok(got.intro.length>10);
      assert.ok(got.otherLabel.length>5);
      assert.ok(got.actions.length<=3);
      assert.equal(new Set(got.actions.map(x=>x.id)).size,got.actions.length);
    }
  }
  assert.match(context("/ru/tests","ru").otherLabel,/другой вопрос/i);
  assert.match(context("/es/tests","es").otherLabel,/pregunta/i);
  assert.match(context("/en/tests","en").otherLabel,/question/i);
});

test("unknown tabs, private data and query tokens cannot become contextual messages",()=>{
  const token="sensitiveCanaryAccountValue123";
  const probe=context("/en/app/portrait?secret="+token,"en",token);
  assert.equal(probe.id,"cabinet");
  assert.doesNotMatch(JSON.stringify(probe),/sensitiveCanaryAccountValue123/);
  const weird=context("/ru/holistic-support/mandala","ru","untrusted-long-private-identifier");
  assert.equal(weird.id,"video");
  assert.doesNotMatch(JSON.stringify(weird),/untrusted/);
});

test("sitewide iHelp only opens after user action and embeds the existing Messenger agent",()=>{
  const root=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
  const widget=readFileSync(new URL("../components/sitewide-ihelp.tsx",import.meta.url),"utf8");
  const agent=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
  assert.match(root,/<SitewideIHelp initialLocale=\{lang\}/);
  assert.match(widget,/useState\(false\)/);
  assert.match(widget,/data-hh-ihelp-launch/);
  assert.match(widget,/onClick=\{showHelp\}/);
  assert.match(widget,/dialog\.showModal\(\)/);
  assert.match(widget,/onCancel=/);
  assert.match(widget,/<HolisticAgentChat locale=\{locale\} compact entryContext=\{context\}/);
  assert.match(widget,/data-video-quick-control/);
  assert.doesNotMatch(widget,/window\.localStorage|document\.cookie|fetch\(|sessionStorage/);
  assert.match(agent,/entryContext\?:IHelpContext\|null/);
  assert.match(agent,/data-hh-ihelp-context-options/);
  assert.match(agent,/data-hh-ihelp-other-question/);
  assert.match(agent,/function chooseContextAction\(action:IHelpAction\)/);
});

test("iHelp help choices keep the original protected/freeform messenger path",()=>{
  const agent=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
  assert.match(agent,/async function submit\(event:FormEvent<HTMLFormElement>\)/);
  assert.match(agent,/requiresProtectedReply\(text,locale\)/);
  assert.match(agent,/\/api\/holistic-agent\/turn/);
  assert.match(agent,/setEntryOpen\(false\)/);
  assert.match(agent,/controller\.current\?\.abort\(\)/);
  assert.doesNotMatch(readFileSync(new URL("../components/sitewide-ihelp.module.css",import.meta.url),"utf8"),/display:\s*none\s*!important/);
});
