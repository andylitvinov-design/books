import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {metricoolSiteConfig,verifyMetricoolSiteBrand} from "../lib/growth-studio/metricool.mjs";

const environment={
  METRICOOL_USER_TOKEN:"site-only-valid-token-not-for-chatgpt",
  METRICOOL_USER_ID:"5533197",
  METRICOOL_BLOG_ID:"7153286",
  METRICOOL_BRAND_NAME:"Holistic House",
};

function fakeResponse(body,{status=200,length=null}={}){
  const text=typeof body==="string"?body:JSON.stringify(body);
  return {
    ok:status>=200&&status<300,status,
    headers:{get:(name)=>name==="content-length"?length:null},
    text:async()=>text,
  };
}

test("website credentials require an exact userId, blogId, token and owner-chosen brand name",()=>{
  assert.deepEqual(metricoolSiteConfig({}),{ready:false});
  assert.deepEqual(metricoolSiteConfig({...environment,METRICOOL_USER_TOKEN:""}),{ready:false});
  assert.deepEqual(metricoolSiteConfig({...environment,METRICOOL_USER_TOKEN:"bad\nheader"}),{ready:false});
  assert.deepEqual(metricoolSiteConfig({...environment,METRICOOL_USER_ID:"other account"}),{ready:false});
  assert.deepEqual(metricoolSiteConfig({...environment,METRICOOL_BLOG_ID:""}),{ready:false});
  assert.deepEqual(metricoolSiteConfig({...environment,METRICOOL_BRAND_NAME:""}),{ready:false});
  assert.deepEqual(metricoolSiteConfig({...environment,METRICOOL_BRAND_NAME:"bad\nbrand"}),{ready:false});
  const configured=metricoolSiteConfig(environment);
  assert.equal(configured.ready,true);
  assert.equal(configured.blogId,environment.METRICOOL_BLOG_ID);
});

test("missing credentials never send a network request or invent a brand",async()=>{
  let calls=0;
  const out=await verifyMetricoolSiteBrand({environment:{},fetchFn:async()=>{calls++;throw Error("unexpected request")}});
  assert.deepEqual(out,{state:"not_connected"});
  assert.equal(calls,0);
});

test("one official GET verifies exactly owner-selected brand without leaking credentials",async()=>{
  const requests=[];
  const fetchFn=async(url,options)=>{
    requests.push({url,options});
    return fakeResponse({data:[{blogId:7153286,name:"Holistic House"},
      {blogId:8000000,name:"Another brand"}]});
  };
  const out=await verifyMetricoolSiteBrand({environment,fetchFn});
  assert.deepEqual(out,{state:"verified_read_only",blogId:"7153286",brandName:"Holistic House"});
  assert.equal(requests.length,1);
  const {url,options}=requests[0];
  const u=new URL(url);
  assert.equal(u.origin,"https://app.metricool.com");
  assert.equal(u.pathname,"/api/admin/simpleProfiles");
  assert.deepEqual([...u.searchParams.entries()],[["userId","5533197"]]);
  assert.equal(options.method,"GET");
  assert.equal(options.headers["X-Mc-Auth"],environment.METRICOOL_USER_TOKEN);
  assert.equal(options.headers.Accept,"application/json");
  assert.equal(options.redirect,"error");
  assert.equal(options.credentials,"omit");
  assert.equal(options.cache,"no-store");
  assert.equal(options.body,undefined);
  assert.ok(!JSON.stringify(out).includes("site-only-valid-token"));
  assert.ok(!JSON.stringify(out).includes("5533197"));
});

test("wrong brand, missing response name or duplicate brand fail closed",async()=>{
  const invalid=[
    [{blogId:100,name:"Holistic House"}],
    [{blogId:7153286,name:"Other Project"}],
    [{blogId:7153286}],
    [{blogId:7153286,name:"Holistic House"},{blogId:7153286,name:"Holistic House"}],
    {data:[]},
  ];
  for(const body of invalid){
    const result=await verifyMetricoolSiteBrand({environment,fetchFn:async()=>fakeResponse(body)});
    assert.equal(result.state,"brand_unverified",JSON.stringify(body));
    assert.ok(!result.blogId);
  }
  const canonical=await verifyMetricoolSiteBrand({
    environment:{...environment,METRICOOL_BRAND_NAME:"holistic house"},
    fetchFn:async()=>fakeResponse([{blogId:"7153286",name:"HOLISTIC HOUSE"}]),
  });
  assert.equal(canonical.state,"verified_read_only");
});

test("401/403 cannot be confused with real access, malformed/oversized/network responses never verify",async()=>{
  for(const status of [401,403]){
    const r=await verifyMetricoolSiteBrand({environment,fetchFn:async()=>fakeResponse({}, {status})});
    assert.deepEqual(r,{state:"auth_unverified"});
  }
  for(const request of [
    async()=>fakeResponse({}, {status:429}),
    async()=>fakeResponse("not-json"),
    async()=>fakeResponse({message:"ok"}),
    async()=>fakeResponse([{blogId:7153286,name:"Holistic House"}],{length:"400001"}),
    async()=>fakeResponse("x".repeat(200_001)),
    async()=>{throw Error("Network proxy blocked")},
  ]){
    const r=await verifyMetricoolSiteBrand({environment,fetchFn:request});
    assert.deepEqual(r,{state:"unavailable"});
  }
});

test("owner-only action and UI reveal no API secret, no budget or publishing methods",()=>{
  const actions=readFileSync(new URL("../app/admin/growth-studio/actions.js",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/growth-studio-connections.jsx",import.meta.url),"utf8");
  const helper=readFileSync(new URL("../lib/growth-studio/metricool.mjs",import.meta.url),"utf8");
  const page=readFileSync(new URL("../app/admin/growth-studio/page.js",import.meta.url),"utf8");
  const start=actions.indexOf("export async function checkGrowthMetricoolBrandAction()");
  const end=actions.indexOf("export async function checkGrowthTelegramPublisherAction()",start);
  assert.ok(start>=0&&end>start);
  const scoped=actions.slice(start,end);
  assert.match(scoped,/requireAdminRequest\(\)/);
  assert.match(scoped,/await verifyMetricoolSiteBrand\(\)/);
  assert.doesNotMatch(scoped,/sendTelegram|createScheduledPost|publish|sendMessage|client|patient|fetch\(/);
  assert.match(page,/requireAdminRequest\(\)/);
  assert.match(ui,/checkGrowthMetricoolBrandAction\(\)/);
  assert.match(ui,/onClick=\{checkMetricool\}/);
  assert.match(ui,/metricoolResult\?\.state==='verified_read_only'/);
  assert.match(ui,/posting not enabled/);
  assert.match(ui,/t\.bridgeNote/);
  assert.doesNotMatch(ui,/process\.env|X-Mc-Auth|METRICOOL_USER_TOKEN\s*=/);
  assert.doesNotMatch(helper,/scheduler\/posts|\/add-profile|method:"POST"|sendTelegram|paidAds|client_id/);
});
