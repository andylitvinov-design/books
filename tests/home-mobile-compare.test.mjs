import test from "node:test";
import assert from "node:assert/strict";
import { summarizeLighthouse, summarizePair } from "../scripts/report-home-mobile-compare.mjs";

const fixture = (score, extra = {}) => ({
  lighthouseVersion: "13.6.0",
  requestedUrl: "https://holistichouse.vercel.app/",
  categories: {performance: {score: score/100}},
  configSettings: {formFactor: "mobile", throttlingMethod: "simulate", throttling: {rttMs: 150, throughputKbps: 1638.4}},
  audits: {
    "first-contentful-paint": {numericValue: 2200},
    "largest-contentful-paint": {numericValue: 3100},
    "cumulative-layout-shift": {numericValue: 0.067},
    "total-blocking-time": {numericValue: 0},
    "speed-index": {numericValue: 4900},
    metrics: {details: {items: [{observedLoad: 14800}]}},
  }, ...extra,
});
test("Lighthouse parser retains observed load as unthrottled, not fabricated slow-4G load", () => {
  const res = summarizeLighthouse(fixture(84));
  assert.equal(res.performance, 84);
  assert.equal(res.fcpMs, 2200);
  assert.equal(res.lcpMs, 3100);
  assert.equal(res.observedLoadEventMs, 14800);
});
test("matched paired mobile-only median identifies pass/fail without hiding regressions", () => {
  const before=[summarizeLighthouse(fixture(80)), summarizeLighthouse(fixture(82))];
  const after=[summarizeLighthouse(fixture(92)), summarizeLighthouse(fixture(94))];
  for (const item of after) { item.fcpMs=1550; item.lcpMs=2300; }
  const result=summarizePair(before,after);
  assert.equal(result.performance.before,81);
  assert.equal(result.performance.after,93);
  assert.equal(result.performance.delta,12);
  assert.deepEqual(result.mobileTargets,{performance90:true,fcpUnder1800:true,lcpUnder2500:true,clsUnder01:true});
  assert.throws(() => summarizePair(before.slice(1),after));
  assert.throws(() => summarizePair(before,[{...after[0],settings:{formFactor:"desktop",throttlingMethod:"simulate"}},after[1]]));
});

import {snapshot,assertHeroPreload} from "../scripts/measure-home-css-network.mjs";
test("CSS network audit requires the actual rendered hero portrait to be preloaded",()=>{
  for(const url of ["/images/holistic-house/ali-inner-alchemist-hero.webp","/images/holistic-house/my-coach-motion/genie-calm-loop-poster.webp"]){
    const portrait='<img class="home-dialogue-entry_heroPortrait__abc" src="'+url+'" loading="eager" fetchPriority="high"/>';
    const preload='<link rel="preload" as="image" href="'+url+'" fetchPriority="high"/>';
    const data=snapshot(preload+portrait);
    assert.equal(data.heroImage,url);
    assert.doesNotThrow(()=>assertHeroPreload(data));
    assert.throws(()=>assertHeroPreload(snapshot(portrait)));
    assert.throws(()=>assertHeroPreload(snapshot(preload+portrait.replace('loading="eager"','loading="lazy"'))));
    assert.throws(()=>assertHeroPreload(snapshot(preload+portrait.replace(url,"/images/wrong.webp"))));
    assert.throws(()=>assertHeroPreload(snapshot(preload+portrait+portrait)));
  }
});
