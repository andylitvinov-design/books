import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const invite = readFileSync(new URL("../components/client-assessment-invite.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/client-assessment-invite.module.css", import.meta.url), "utf8");
const channelChooser = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
const handoff = readFileSync(new URL("../lib/whatsapp-enquiry.js", import.meta.url), "utf8");

test("gift CTA expands the existing order chooser instead of navigating away", () => {
  assert.match(invite, /action: "Получить диагностику в подарок"/);
  assert.match(invite, /action: "Get your complimentary assessment"/);
  assert.match(invite, /action: "Recibir evaluación de regalo"/);
  assert.match(invite, /<ContactChannelChooser[\s\S]*?label=\{t\.action\}/);
  assert.match(invite, /data-gift-drawing-order/);
  assert.match(channelChooser, /aria-expanded=\{open\}/);
  assert.match(channelChooser, /data-contact-order/);
  assert.match(channelChooser, /WhatsApp/);
  assert.match(channelChooser, /Telegram/);
  assert.match(channelChooser, /Your selected request is prepared in the chat/);
});

test("prepared messenger request carries the selected topic and no private test data", () => {
  assert.match(invite, /whatsappEnquiryUrl\(\{[\s\S]*?service: t\.service,[\s\S]*?request: t\.request,[\s\S]*?topic: t\.options\[topic\]/);
  assert.match(invite, /pagePath: "\/" \+ locale \+ "\/services\/free-situation-review"/);
  assert.match(invite, /event="service_request_start"/);
  assert.match(invite, /analyticsEvent="free_situation_assessment_click"/);
  assert.match(handoff, /telegramEnquiryUrlFromWhatsApp/);
  assert.match(handoff, /safePublicWhatsAppPath\(pagePath\)/);
  assert.doesNotMatch(invite, /sessionStorage|localStorage|testResults|assessmentAnswers/);
});

test("details link leads to the localized service landing, separate from the gift order", () => {
  assert.match(invite, /details: "Подробнее об услуге"/);
  assert.match(invite, /details: "More about the service"/);
  assert.match(invite, /details: "Más información sobre el servicio"/);
  assert.match(invite, /const href = "\/" \+ locale \+ "\/services\/free-situation-review\?topic=" \+ topic/);
  assert.match(invite, /<Link href=\{href\} className=\{styles\.details\}/);
  assert.equal((invite.match(/<Link\b/g) || []).length, 1, "The only navigation link is service details");
  assert.match(css, /\.order\{width:min\(100%,500px\)/);
  assert.match(css, /\.invite \.order :global\(\[data-contact-order\]\)/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /\.order\{width:100%\}/);
});