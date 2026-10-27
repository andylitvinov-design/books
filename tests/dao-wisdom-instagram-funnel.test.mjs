import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  telegramDaoPublicUrl,telegramDiagnosticPublicUrl,
  telegramPublicStartRequested,transitionTelegramDiagnostic,
} from "../lib/crm/telegram-diagnostic.mjs";
import { TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS } from "../lib/crm/telegram-diagnostic-v2.mjs";

const repo = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const validEnv = Object.freeze({
  VERCEL_ENV: "production",
  HH_CRM_MSG_TELEGRAM_ENABLED: "true",
  HH_CRM_TG_DIAGNOSTIC_ENABLED: "true",
  HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED: "true",
  HH_CRM_MSG_PRODUCTION_APPROVED: "false",
  HH_CRM_MSG_TELEGRAM_TOKEN: "12345678:SYNTHETIC_TEST_ONLY_BOT_TOKEN_12345678",
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET: "SYNTHETIC_TEST_WEBHOOK_SECRET",
  HH_CRM_MSG_TELEGRAM_USERNAME: "holistichouse_bot",
});
const session = (result, consentAt = null) => ({
  stage: result.stage, locale: result.locale, topic: result.topic,
  flowVersion: result.flowVersion, consentAt,
});
const event = (rawText, locale = "ru") => ({ rawText, locale });

test("dao URLs use only the existing owner-approved public Telegram bot, without enabling other channels", () => {
  for (const locale of ["en", "ru", "es"]) {
    assert.equal(telegramDaoPublicUrl(locale, validEnv),
      "https://t.me/holistichouse_bot?start=hhdao_" + locale);
    assert.equal(telegramDiagnosticPublicUrl(locale, validEnv),
      "https://t.me/holistichouse_bot?start=hhreview_" + locale);
    assert.equal(telegramPublicStartRequested("/start hhdao_" + locale), true);
    assert.equal(telegramPublicStartRequested("/start@holistichouse_bot hhdao_" + locale), true);
  }
  assert.equal(telegramDaoPublicUrl("de", validEnv), null);
  assert.equal(telegramDaoPublicUrl("ru", {}), null);
  for (const key of [
    "HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED", "HH_CRM_MSG_TELEGRAM_TOKEN",
    "HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET", "HH_CRM_MSG_TELEGRAM_USERNAME",
  ]) {
    const missing = { ...validEnv };
    delete missing[key];
    assert.equal(telegramDaoPublicUrl("ru", missing), null, key);
  }
  assert.equal(telegramDaoPublicUrl("ru", {...validEnv,VERCEL_ENV:"preview"}),null);
  assert.equal(telegramDaoPublicUrl("ru", {...validEnv,HH_CRM_MSG_PRODUCTION_APPROVED:"false",
    HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:"false"}),null);
});

test("new starter accepts only the fixed public offer codes, never arbitrary URL or sensitive payload", () => {
  for (const bad of [
    "/start hhdao", "/start hhdao_de", "/start hhdao_ru X",
    "/start hhdao_ru&phone=123", "/start hhdao_ru?session=abc",
    "/start https://invalid.example/", "/agree", "/stop",
  ]) assert.equal(telegramPublicStartRequested(bad), false, bad);
  assert.equal(telegramPublicStartRequested("/start"), true);
});

test("Dao greeting stays EN/RU/ES and preserves the owner-authored six-stage script after consent", () => {
  const greeting = {
    en: /DAO WISDOM .*Free personal Wu Xing express review/,
    ru: /ДАОССКАЯ МУДРОСТЬ .*Бесплатный личный блиц-разбор по У-Син/,
    es: /SABIDURÍA TAOÍSTA .*Revisión personal exprés gratuita de Wu Xing/,
  };
  for (const locale of ["en", "ru", "es"]) {
    let r = transitionTelegramDiagnostic(null, event("/start hhdao_" + locale, locale));
    const canonical = transitionTelegramDiagnostic(null, event("/start hhreview_" + locale, locale));
    assert.equal(r.stage, "consent");
    assert.equal(r.locale, locale);
    assert.equal(r.body, null, "deep link alone MUST NOT create a CRM lead");
    assert.equal(r.consent, false);
    assert.match(r.reply, greeting[locale]);
    assert.ok(r.reply.endsWith(canonical.reply), "owner-authored intro unchanged");
    assert.deepEqual(r.keyboard, canonical.keyboard);
    const labels = TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS[locale];
    r = transitionTelegramDiagnostic(session(r), event(labels.yes, locale));
    assert.equal(r.stage, "focus");
    assert.equal(r.consent, true);
    assert.match(r.body, /consent/);
    r = transitionTelegramDiagnostic(session(r, "2026-10-27T00:00:00Z"),
      event(labels.other, locale));
    assert.equal(r.stage, "photo");
    r = transitionTelegramDiagnostic(session(r, "2026-10-27T00:00:00Z"),
      event(labels.skipPhoto, locale));
    assert.equal(r.stage, "question");
    r = transitionTelegramDiagnostic(session(r, "2026-10-27T00:00:00Z"),
      event("Goal and difficulty without health or identity data", locale));
    assert.equal(r.stage, "drawing");
    r = transitionTelegramDiagnostic(session(r, "2026-10-27T00:00:00Z"),
      event(labels.skipDrawing, locale));
    assert.equal(r.stage, "done");
    assert.equal(r.photoFileId, null);
    assert.ok(r.reply.includes("/" + locale + "/coaching/intake?topic=other"));
  }
});

test("STOP remains terminal, and the new visitor cannot bypass signed webhook or CRM gate", () => {
  const start = transitionTelegramDiagnostic(null, event("/start hhdao_ru"));
  const stopped = transitionTelegramDiagnostic(session(start), event("/stop"));
  assert.equal(stopped.stage, "stopped");
  assert.equal(stopped.body, null);
  assert.equal(transitionTelegramDiagnostic(session(stopped),event("/start hhdao_ru")).reply,null);
  const webhook = repo("lib/crm/messenger-webhook.js");
  const route = repo("app/api/app/crm/messenger/webhook/[provider]/route.js");
  assert.match(webhook,/telegramPublicStartRequested\(rawStop\)/);
  assert.match(webhook,/publicIntake&&!previous/);
  assert.match(webhook,/ingestMessengerEventInTransaction\(db,'telegram'/);
  assert.ok(route.indexOf("verifyMessengerWebhook(provider,raw,request.headers)") <
    route.indexOf("processTelegramDiagnostic(event,config)"));
});

test("web handoff fails closed and keeps existing non-Telegram first-party CRM intake", () => {
  const route = repo("app/api/public/telegram-diagnostic/route.js");
  const ui = repo("components/dao-telegram-handoff.tsx");
  const page = repo("components/free-entry-landing.tsx");
  assert.match(route,/channelTransportReady\('telegram',env\)/);
  assert.match(route,/daoUrls\?\.en&&daoUrls\?\.ru&&daoUrls\?\.es/);
  assert.match(route,/available:false/);
  assert.match(ui,/body\?\.available === true/);
  assert.match(ui,/safeDaoUrl\(body\?\.daoUrls\?\.\[locale\], locale\)/);
  assert.match(ui,/referrerPolicy="no-referrer"/);
  assert.match(ui,/if \(!url\) return null/);
  assert.match(page,/<DaoTelegramHandoff locale=\{locale\} \/>/);
  assert.match(page,/<CompactLeadCapture/);
  assert.match(page,/dao-free-start/);
  assert.equal((page.match(/<DaoTelegramHandoff locale=\{locale\}/g)||[]).length,1,
    "one and only one Dao Instagram Telegram component");
  assert.equal((page.match(/<CompactLeadCapture/g)||[]).length,2,
    "one direct Dao fallback and unchanged tests capture");
  const heroEnd = page.indexOf('{kind === "dao" ? <div id="dao-free-start"');
  const resultStory = page.indexOf('styles.daoOutcomeScene');
  assert.ok(heroEnd > page.indexOf('<section className={[styles.hero'),
    "Dao CTA follows the hero");
  assert.ok(resultStory > heroEnd,
    "Instagram visitors see Telegram and fallback form before the long details");
});
