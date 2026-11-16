import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("the six video workspaces share the compact Goal mobile chrome",()=>{
  const shared=css.slice(css.indexOf("/* 05 Nov one-viewport iPhone follow-up."));
  const mobileRule=(selector)=>{
    const start=shared.indexOf(selector);
    assert.ok(start>=0,selector);
    return shared.slice(start,shared.indexOf("}",start));
  };
  assert.equal(studio.split("<nav className={videoStyles.quickBrandBar}").length,2);
  assert.equal(studio.split("<nav className={videoStyles.quickVideoNav}").length,2);
  assert.ok(css.includes(".studio[data-active-workspace] .quickBrandMobileTitle{display:none!important}"));
  assert.ok(mobileRule(".studio[data-active-workspace] .quickBuilder>.quickBrandBar{").includes("min-height:37px!important"));
  assert.ok(mobileRule(".studio[data-active-workspace] .quickBrandIdentity{").includes("display:grid!important"));
  assert.ok(mobileRule(".studio[data-active-workspace] .quickVideoNav button{").includes("min-height:44px!important;max-height:46px"));
  assert.ok(mobileRule(".studio[data-active-workspace] .quickVideoNav button svg{").includes("width:16px!important;height:16px!important"));
  assert.ok(mobileRule(".studio[data-active-workspace] .quickBrandPhoto span{").includes("display:none"));
  assert.ok(!css.includes('.studio[data-active-workspace="editor"] .quickBuilder>.quickBrandBar{display:none!important}'));
});
