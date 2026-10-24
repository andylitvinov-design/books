import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { telegramEnquiryUrlFromWhatsApp, whatsappEnquiryUrl } from "../lib/whatsapp-enquiry.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("compact capture asks for an explicit opt-in and routes both messenger choices through a confirmed CRM commit", () => {
  const source = read("components/compact-lead-capture.tsx");
  const choose = source.slice(source.indexOf("async function chooseChannel("), source.indexOf("\n  return (\n    <section"));

  assert.match(source, /<form className=\{styles.form\} data-compact-lead-form/);
  assert.match(source, /contactConsent: true/);
  assert.match(source, /checked=\{consent\}/);
  assert.match(source, /if \(!consent\) \{ setError\(t\.consentRequired\); return; \}/);
  assert.match(source, /if \(busy \|\| reference\) return;/);
  assert.match(source, /window\.crypto\.randomUUID\(\)/);
  assert.match(source, /credentials: "same-origin"/);
  assert.match(source, /result\?\.saved !== true/);
  assert.match(source, /setReference\(committedReference\)/);
  assert.match(source, /RECEIPT_SESSION_KEY/);
  assert.match(source, /window\.open\("about:blank", "_blank"\)/);
  assert.match(source, /handoffWindow\.location\.replace\(destination\)/);
  assert.match(source, /setError\(t\.handoffError\)/);
  assert.equal((source.match(/data-compact-channel="whatsapp"/g) || []).length, 2);
  assert.equal((source.match(/data-compact-channel="telegram"/g) || []).length, 2);
  assert.ok(choose.indexOf('fetch("/api/service-enquiries"') >= 0);
  assert.ok(choose.indexOf("setReference(committedReference)") > choose.indexOf("result?.saved !== true"));
  assert.ok(choose.indexOf("handoffWindow.location.replace(destination)") > choose.indexOf("setReference(committedReference)"));
  assert.doesNotMatch(source, /window\.location\.assign|gtag\(|lead_created|booking_confirmed|payment_received/);
  assert.doesNotMatch(source, /href="https:\/\/t\.me\/AndyTherapist"/);
});

test("messenger drafts carry only public service and reference, no submitted contact or health details", () => {
  const source = read("components/compact-lead-capture.tsx");
  assert.match(source, /request: t\.message \+ " " \+ t\.reference \+ ": " \+ referenceCode/);
  assert.match(source, /pagePath: sourcePath \|\| pathname/);
  assert.doesNotMatch(source, /request: .*address|request: .*contact\.phone|request: .*contact\.email/);

  for (const locale of ["en", "ru", "es"]) {
    const id = "HH-13B822F68D70";
    const whatsapp = whatsappEnquiryUrl({
      locale,
      service: "Personal session",
      request: "Please advise the next step. Reference: " + id,
      pagePath: "/" + locale + "/services/imagery-therapy?private=never-send",
    });
    const telegram = telegramEnquiryUrlFromWhatsApp(whatsapp);
    assert.equal(new URL(whatsapp).origin, "https://wa.me");
    assert.equal(new URL(telegram).hostname, "t.me");
    for (const url of [whatsapp, telegram]) {
      const message = new URL(url).searchParams.get("text") || "";
      assert.ok(message.includes(id));
      assert.ok(message.includes("Personal session"));
      assert.ok(!message.includes("private=never-send"));
      assert.ok(!message.includes("@example.com"));
    }
  }
});

test("portrait-led card preserves 320px single-screen action grouping and tap-safe fallbacks", () => {
  const css = read("components/compact-lead-capture.module.css");
  const source = read("components/compact-lead-capture.tsx");
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height:52px/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /@media\(max-width:365px\)/);
  assert.match(css, /\.section\.inline/);
  assert.match(css, /:focus-visible/);
  assert.match(source, /<StaticPortrait/);
  assert.match(source, /<a href=\{channelUrl\(reference, "whatsapp"\)\}/);
  assert.match(source, /<a href=\{channelUrl\(reference, "telegram"\)\}/);
});
