import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Alchemy shows the short phone request from all three paid session CTAs", () => {
  const form = read("components/alchemy-soul-lead-form.tsx");
  const landing = read("components/alchemy-soul-landing.tsx");

  assert.equal((form.match(/compactPhone compactTrigger stayAfterSave/g) || []).length, 2);
  assert.match(landing, /<ContactChannelChooser locale=\{locale\} whatsappUrl=\{heroWhatsApp\} label=\{t\.cta\}\s+compactPhone compactTrigger stayAfterSave/);
  assert.match(form, /resetKey=\{format \+ ":" \+ topic\}/);
  assert.match(form, /resetKey=\{selected\}/);
  assert.match(form, /publicTopic=\{t\.formatField \+ ": " \+ t\.formatNames\[format\] \+ "; " \+ t\.topicField \+ ": " \+ t\.topicNames\[topic\]\}/);

  // Keep the original direct route for the four-week programme.
  assert.match(form, /format === "month"/);
  assert.match(form, /selected === "month"/);
  assert.match(form, /\/services\/personal-support/);

  // A potentially private topic may be stored only with consent in CRM;
  // it must not leak into a WhatsApp/Telegram preview.
  const draft = form.match(/const whatsappUrl = whatsappEnquiryUrl\(\{([\s\S]*?)\}\);/);
  assert.ok(draft, "Personalised draft found");
  assert.match(draft[1], /option: t\.formatNames\[format\]/);
  assert.doesNotMatch(draft[1], /\btopic\s*:/);
  assert.match(form, /"relationships" \| "stress" \| "business" \| "direction" \| "other"/);
  for (const locale of ["ru", "en", "es"]) {
    assert.match(form, new RegExp("\\b" + locale + ": \\{"));
  }
});

test("Compact request is an accessible progressive phone form with CRM-confirmed handoff", () => {
  const chooser = read("components/contact-channel-chooser.tsx");
  assert.match(chooser, /compactTrigger\?: boolean/);
  assert.match(chooser, /data-compact-phone-trigger=\{compactTrigger \? "true" : undefined\}/);
  assert.match(chooser, /aria-expanded=\{open\} aria-controls=\{panelId\} data-contact-order/);
  assert.match(chooser, /hidden=\{compactTrigger && !open\}/);
  assert.match(chooser, /<PhoneCountryInput/);
  assert.match(chooser, /className=\{styles\.compactConsent\}/);
  assert.match(chooser, /saveEnquiry\("whatsapp"\)/);
  assert.match(chooser, /saveEnquiry\("telegram"\)/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries"/);
  assert.match(chooser, /data\.saved !== true/);
  assert.match(chooser, /window\.open\("about:blank", "_blank"\)/);
  assert.match(chooser, /!stayAfterSave/);
  assert.match(chooser, /publicTopic\?\.trim\(\)/);
  assert.match(chooser, /scrollIntoView\(\{ block: "nearest"/);
});

test("Narrow mobile Alchemy form does not stretch consent checkbox or hide phone controls", () => {
  const css = read("components/alchemy-soul-landing.module.css");
  const shared = read("components/contact-channel-chooser.module.css");
  assert.match(css, /\.leadForm > label > select\{/);
  assert.doesNotMatch(css, /\.leadForm select,\.leadForm input/);
  assert.match(shared, /\.compactPhoneToggle \.compactTogglePanel\[hidden\]/);
  assert.match(shared, /\.compactPhoneToggle \.compactPhoneField :is\(input,select\)/);
  assert.match(shared, /\.compactPhoneToggle \.compactChannels :is\(button,a\)/);
  assert.match(shared, /@media\(max-width:430px\)/);
  assert.match(shared, /@media \(max-width:350px\)/);
  assert.match(shared, /prefers-reduced-motion/);
});
