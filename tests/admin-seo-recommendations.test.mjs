import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSeoRecommendations } from "../lib/seo/actionable-recommendations.mjs";
import { verifiedSeoBaseline as baseline } from "../lib/seo/admin-dashboard-data.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const day = new Date("2026-10-17T13:00:00Z");
const standard = { baseline, search: { status: "not_connected" }, sitemap: { status:"live", urls:601 }, days:28, locale:"ru", now:day };
const recommend = (opts={}) => getSeoRecommendations({ ...standard, ...opts });

test("new-site zero impressions yield focused advice, never a fabricated CTR or SEO failure", () => {
  const { items, counts } = recommend();
  assert.equal(counts.P0, 0);
  assert.ok(items.some(x => x.id === "gsc-connect"));
  const zero = items.find(x => x.id === "zero-impressions");
  assert.equal(zero.metric, "0");
  assert.equal(zero.priority, "P1");
  assert.equal(zero.status, "watch");
  assert.match(zero.meaning, /не доказывает техническую ошибку/);
  assert.ok(zero.asOf);
  assert.ok(items.some(x => x.id === "mobile-speed" && x.priority === "P1"));
  assert.ok(items.some(x => x.id === "crawl-healthy" && x.priority === "OK"));
  assert.ok(items.some(x => x.id === "indexing" && x.metric === "1/19" && x.priority === "P2"));
  assert.ok(items.some(x => x.id === "ga4" && x.priority === "P2"));
  assert.equal(items.some(x => x.id === "low-ctr"),false);
  assert.equal(items.some(x => x.id === "low-position"),false);
});

test("7/90-day archived data remain unavailable and are never silently copied from 28 days", () => {
  for (const days of [7,90]) {
    const {items}=recommend({days});
    assert.ok(items.some(x => x.id === "period-no-data" && x.metric === days+" days"));
    assert.ok(!items.some(x => x.id === "zero-impressions"));
  }
});

test("meaningful impressions with low CTR and reasonable position warrant snippet review", () => {
  const {items}=recommend({search: {status:"live",impressions:300,clicks:3,ctr:.01,position:8,asOf:"2026-10-17",settledThrough:"2026-10-14"},days:28});
  assert.ok(items.some(x=>x.id==="low-ctr" && x.metric==="1%" && x.priority==="P1"));
  assert.ok(!items.some(x=>x.id==="gsc-connect"));
  assert.ok(!items.some(x=>x.id==="zero-impressions"));
});

test("with low rankings the system prioritizes relevance, not rewriting snippets", () => {
  const {items}=recommend({search:{status:"live",impressions:500,clicks:30,ctr:.06,position:29.25,asOf:"2026-10-17",settledThrough:"2026-10-14"}});
  assert.ok(items.some(x=>x.id==="low-position" && x.metric==="29.3"));
  assert.equal(items.some(x=>x.id==="low-ctr"),false);
});

test("low data volume does not trigger dubious CTR warnings", () => {
  const {items}=recommend({search:{status:"live",impressions:20,clicks:0,ctr:0,position:6,asOf:"2026-10-17",settledThrough:"2026-10-14"}});
  assert.ok(items.some(x=>x.id==="limited-impressions"));
  assert.equal(items.some(x=>x.id==="low-ctr"),false);
});

test("stale metrics require a refresh before current conclusions", () => {
  const {items}=recommend({now:new Date("2027-01-01T00:00:00Z")});
  assert.ok(items.some(x=>x.id==="search-stale" && x.priority==="P1"));
  assert.equal(items.some(x=>x.id==="zero-impressions"),false);
  assert.ok(items.some(x=>x.id==="indexing" && x.priority==="P1"));
});

test("technical failures override opportunities as P0; mismatch is sourced separately", () => {
  const variant=structuredClone(baseline);
  variant.technical.invalid=2;
  variant.technical.redirects=1;
  const {items}=recommend({baseline:variant,sitemap:{status:"live",urls:605}});
  assert.equal(items[0].id,"crawl-errors");
  assert.equal(items[0].priority,"P0");
  assert.ok(items.some(x=>x.id==="sitemap-mismatch" && x.metric==="605 / 601"));
  assert.equal(items.some(x=>x.id==="crawl-healthy"),false);
});

test("localized explanatory guidance has action links, source dates and safe fixed destinations", () => {
  for (const locale of ["ru","en"]) {
    const {items,counts,labels}=recommend({locale});
    assert.ok(labels.P1);
    assert.equal(items.length,Object.values(counts).reduce((a,b)=>a+b,0));
    assert.equal(items.length,new Set(items.map(x=>x.id)).size);
    for(const item of items) {
      assert.ok(item.title.length>5);
      assert.ok(item.meaning.length>20);
      assert.ok(item.steps.length>=1);
      assert.ok(item.source.length>1);
      assert.ok(item.action.label.length>2);
      assert.match(item.action.url,/^(https:\/\/(?:github\.com\/andylitvinov-design\/books\/|holistichouse\.vercel\.app\/|search\.google\.com\/search-console)|\/admin\/seo#analytics)/);
      assert.doesNotMatch(item.action.url,/\/(?:client|report|prescriptions|app)(?:\/|$)/);
    }
  }
});

test("recommendation cards are visible just below KPIs with a collapsed remainder on mobile", () => {
  const page=read("app/admin/seo/page.jsx");
  const component=read("components/admin-seo-recommendations.jsx");
  const css=read("app/admin/seo/seo-dashboard.module.css");
  assert.match(page, /getSeoRecommendations/);
  assert.match(page, /<SeoRecommendations recommendationResult=\{recommendations\}/);
  assert.ok(page.indexOf("<SeoRecommendations")>page.indexOf("label={t.position}"));
  assert.ok(page.indexOf("<SeoRecommendations")<page.indexOf("t.trend"));
  assert.match(component,/data-seo-recommendations/);
  assert.match(component,/<details/);
  assert.match(component,/item\.source/);
  assert.match(component,/item\.steps/);
  assert.match(css,/\.adviceGrid/);
  assert.match(css,/@media\(max-width:630px\)/);
});
