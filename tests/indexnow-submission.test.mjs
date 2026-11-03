import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  validateIndexNowPlan, canonicalInHtml, verifyIndexNowPublicRoutes, sendIndexNow,
} from "../scripts/indexnow-client.mjs";

const config = JSON.parse(readFileSync(new URL("../data/indexnow-public-urls.json", import.meta.url), "utf8"));
const key = readFileSync(new URL("../public/" + config.keyFile.slice(1), import.meta.url), "utf8");
const plan = validateIndexNowPlan(config, key);

test("IndexNow is configured only for public exact-host canonical site and official endpoint", () => {
  assert.equal(plan.host, "holistichouse.vercel.app");
  assert.equal(plan.endpoint, "https://api.indexnow.org/indexnow");
  assert.equal(plan.keyLocation, config.origin + "/" + plan.key + ".txt");
  assert.match(plan.key, /^[a-zA-Z0-9-]{8,128}$/);
  assert.equal(plan.urlList.length, config.paths.length);
  assert.ok(plan.urlList.every(url => url.startsWith("https://holistichouse.vercel.app/")));
  for (const url of plan.urlList) {
    assert.ok(!/\/(?:app|client|admin|api|reports?|prescriptions|payments)(?:\/|$)/.test(url));
    assert.ok(!new URL(url).search && !new URL(url).hash);
  }
});

test("private paths, query strings, duplicates and foreign hosts fail closed", () => {
  for (const paths of [
    ["/en/client/tests"], ["/en/report/secret"], ["/admin/seo"],
    ["/en/services/free-situation-review?email=someone@example.org"],
    ["/en/services/free-situation-review#session"],
    ["/en/services/free-situation-review", "/en/services/free-situation-review"],
    ["https://evil.example/en/services/free-situation-review"],
  ]) assert.throws(() => validateIndexNowPlan({ ...config, paths }, key), TypeError);
  assert.throws(() => validateIndexNowPlan({ ...config, origin:"https://untrusted.example" }, key), TypeError);
  assert.throws(() => validateIndexNowPlan(config, "wrong-key"), TypeError);
  assert.throws(() => validateIndexNowPlan({ ...config, endpoint: "https://evil.example" }, key), TypeError);
});

test("proof and canonicals must be externally verified before any send", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({url,method:options.method});
    if (url === plan.keyLocation) return {
      status:200,headers:{get:()=>null},text:async()=>key,
    };
    return {status:200,headers:{get:()=>null},text:async()=>'<html><head><link rel="canonical" href="' + url + '"></head></html>'};
  };
  const receipt = await verifyIndexNowPublicRoutes(plan, fetchImpl);
  assert.equal(receipt.keyVerified, true);
  assert.equal(receipt.validPublicPages, plan.urlList.length);
  assert.equal(requests.length, plan.urlList.length+1);

  const wrongProof = async (url, options) => ({
    status:200,headers:{get:()=>null},text:async()=>url===plan.keyLocation?"not our key":"<html></html>",
  });
  await assert.rejects(()=>verifyIndexNowPublicRoutes(plan, wrongProof), /PROOF_NOT_LIVE/);
  assert.equal(canonicalInHtml('<meta name="robots" content="noindex"><link rel="canonical" href="'+plan.urlList[0]+'">',plan.urlList[0]),false);
  assert.equal(canonicalInHtml('<link rel="canonical" href="'+plan.urlList[0]+'">',plan.urlList[0]),true);
});

test("submit posts only public URLs and accepts HTTP 200/202 but never pretends indexing", async () => {
  const packets=[];
  const fake = async (url, request) => {
    assert.equal(url, "https://api.indexnow.org/indexnow");
    assert.equal(request.method, "POST");
    packets.push(JSON.parse(request.body));
    return {status:202};
  };
  const response = await sendIndexNow(plan,fake);
  assert.deepEqual(response,{accepted:true,httpStatus:202,urls:plan.urlList.length});
  assert.deepEqual(packets[0].urlList,plan.urlList);
  assert.equal(packets[0].key,plan.key);
  assert.equal(packets[0].keyLocation,plan.keyLocation);
  assert.ok(!JSON.stringify(packets).match(/utm_|client_id|answers|test_scores|diagnosis|fbclid|gclid/));
  await assert.rejects(()=>sendIndexNow(plan,async()=>({status:403})),/NOT_ACCEPTED_HTTP_403/);
});

test("default local invocation is dry-run and makes no network request", () => {
  const runner = spawnSync(process.execPath,
    [new URL("../scripts/submit-indexnow.mjs", import.meta.url).pathname, "--dry-run"],
    {encoding:"utf8",timeout:10000});
  assert.equal(runner.status,0,runner.stderr);
  assert.match(runner.stdout,/DRY RUN \(no network calls\)/);
  assert.match(runner.stdout,/"count":/);
  assert.doesNotMatch(runner.stdout,/accepted|indexingConfirmed/);
});
