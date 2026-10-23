import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GUIDE_QUALITY_CATEGORIES, GUIDE_QUALITY_SIGNALS,
  validateGuideQualityFeedback, validateGuideQualityPriorities,
  orderGuideClarificationChoices,
} from "../lib/home-guide-quality.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("only exact opt-in coarse feedback is accepted, never transcript or identifiers", () => {
  assert.deepEqual(validateGuideQualityFeedback({
    category: "business", signal: "clarified", locale: "ru", consent: true,
  }), { category: "business", signal: "clarified", locale: "ru" });
  for (const input of [
    null, {}, [], { category: "business", signal: "clarified", locale: "ru" },
    { category: "love", signal: "helpful", locale: "ru", consent: false },
    { category: "love", signal: "helpful", locale: "ru", consent: "true" },
    { category: "health_diagnosis", signal: "clarified", locale: "ru", consent: true },
    { category: "other", signal: "custom_training", locale: "ru", consent: true },
    { category: "other", signal: "clarified", locale: "de", consent: true },
    { category: "site", signal: "unhelpful", locale: "en", consent: true,
      question: "My private medical record" },
    { category: "site", signal: "unhelpful", locale: "en", consent: true,
      email: "visitor@example.com" },
    { category: "site", signal: "unhelpful", locale: "en", consent: true,
      symptoms: "confidential" },
  ]) assert.equal(validateGuideQualityFeedback(input), null, JSON.stringify(input));
  assert.equal(GUIDE_QUALITY_CATEGORIES.length, 6);
  assert.deepEqual(GUIDE_QUALITY_SIGNALS, ["clarified","unresolved","helpful","unhelpful"]);
});

test("public daily ranking is bounded, validated, stable and never reveals counts", () => {
  assert.deepEqual(validateGuideQualityPriorities({
    categories: ["business","business","invalid","site","love","courses","energy","other"],
  }), ["business","site","love","courses"]);
  assert.deepEqual(validateGuideQualityPriorities({ categories: null }), []);
  const choices = ["topic-love","topic-energy","topic-business","topic-courses","topic-site","other-help"]
    .map(id => ({ id }));
  assert.deepEqual(orderGuideClarificationChoices(choices,["site","business"]).map(x => x.id),
    ["topic-site","topic-business","topic-love","topic-energy","topic-courses","other-help"]);
  assert.deepEqual(orderGuideClarificationChoices(choices,[]), choices);
  assert.equal(choices[0].id,"topic-love","Original editorial order must not mutate");
});

test("backend enforces same-origin, strict payload, rate limits and no raw text", () => {
  const endpoint = read("app/api/home-guide/quality/route.js");
  for (const token of ["requireSameOrigin(request, config)","requestOrigin(request, config)",
    "consumeRate(config", "readBody(request, 512)", "validateGuideQualityFeedback",
    "insertHomeGuideQuality(config, data)", "PRIVATE_HEADERS"]) {
    assert.ok(endpoint.includes(token), token);
  }
  for (const forbidden of ["request.json()", "chatMessage", "question:", "transcript",
    "request.body.text", "console.log("]) {
    assert.ok(!endpoint.includes(forbidden), forbidden);
  }
  const schema=read("supabase/migrations/20261023160700_home_guide_quality_feedback.sql");
  for(const token of [
    "create table if not exists app_private.home_guide_quality_events",
    "create table if not exists app_private.home_guide_quality_daily",
    "enable row level security", "force row level security",
    "from public, anon, authenticated, service_role, hh_app_inbox",
    "to hh_app_backend",
    "created_at timestamptz", "category text not null", "signal text not null",
  ]) assert.ok(schema.includes(token),token);
  assert.ok(!/question_text|raw_question|visitor_id|email_address|ip_address|transcript text/.test(schema));
});

test("daily housekeeping aggregates safely with no new cron and bounded retention", () => {
  const service=read("lib/app/home-guide-quality.js");
  const cron=read("app/api/internal/housekeeping/route.js");
  const scheduler=read("vercel.json");
  for(const fragment of ["having sum(event_count) >= 5", "interval '14 days'",
    "::date - 60", "on conflict (report_day, category, locale, signal)",
    "where signal = 'clarified'", "limit 4", "{ server: true }"]) {
    assert.ok(service.includes(fragment),fragment);
  }
  assert.ok(cron.includes("refreshHomeGuideQualityDaily(config)"));
  assert.ok(cron.includes("runAppHousekeeping(config)"));
  assert.equal(JSON.parse(scheduler).crons.filter(x => x.path === "/api/internal/housekeeping").length,1);
  assert.ok(!/question|transcript|user_id|ip_address/.test(service));
});

test("browser keeps questions local, asks for consent and reorders only safe topic chips", () => {
  const ui=read("components/home-conversation-guide.tsx");
  const helper=read("lib/home-guide-quality-client.ts");
  const priorities=read("app/api/home-guide/priorities/route.js");
  for(const phrase of ["setQualityConsent(false)", "data-home-guide-quality-consent",
    "checked={qualityConsent}", "needsClarification", "orderGuideClarificationChoices",
    "getGuideClarificationPriorities()", "shareGuideQualityFeedback",
    "disabled={!qualityConsent || feedbackSaved || qualityPending}",
    "rateGuideSuggestion", "feedbackSaved ?"]) {
    assert.ok(ui.includes(phrase),phrase);
  }
  for(const forbidden of ["fetch(", "sendBeacon(", "localStorage", "sessionStorage"]) {
    assert.ok(!ui.includes(forbidden),forbidden);
  }
  assert.ok(helper.includes('credentials: "omit"'));
  assert.ok(helper.includes("validateGuideQualityFeedback("));
  assert.ok(helper.includes("consent: true"));
  assert.ok(priorities.includes("getHomeGuidePriorities"));
  assert.ok(priorities.includes("categories: []"));
  assert.ok(!/request\.url|searchParams|question/.test(priorities), "No free text in anonymous priority fetch");
});
