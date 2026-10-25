import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {assertSavedMessengerContract, mutateSavedMessengerBranch} from "./helpers/saved-messenger-contract.mjs";

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
  assertSavedMessengerContract(channelChooser);
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

for (const branch of ['normal', 'compact']) for (const [name, target, replacement, reason] of [
  ['missing receipt gate', 'receiptGate', 'true', /saved-receipt gate/],
  ['unconditional messenger', 'whatsapp', 'whatsappUrl', /preparedWhatsApp/],
  ['wrong Telegram handoff', 'telegram', 'preparedWhatsApp', /telegramEnquiryUrlFromWhatsApp/],
  ['missing reference', 'reference', '"unverified"', /verified reference/],
]) test(branch + ': gift messenger contract rejects ' + name, () => {
  const changed = mutateSavedMessengerBranch(channelChooser, branch, target, replacement);
  assert.notEqual(changed, channelChooser);
  assert.throws(() => assertSavedMessengerContract(changed), reason);
});

for (const [name, replacement, reason] of [
  ['missing consent gate', 'busy || googleBusy || (method === "email" ? !email.trim() : !phone.trim())', /consent gate/],
  ['dead consent term', 'busy || googleBusy || (method === "email" ? !email.trim() : !phone.trim()) || (!consent && false)', /effective consent gate/],
  ['negated consent term', 'busy || googleBusy || (method === "email" ? !email.trim() : !phone.trim()) || !!consent', /effective consent gate/],
]) test('gift messenger contract rejects ' + name, () => {
  assert.throws(() => assertSavedMessengerContract(mutateSavedMessengerBranch(channelChooser, 'normal', 'submitDisabled', replacement)), reason);
});

test('gift messenger contract rejects fabricated handler consent in both flows', () => {
  const before = 'contactConsent: consent, website';
  assert.equal(channelChooser.split(before).length - 1, 1);
  assert.throws(() => assertSavedMessengerContract(channelChooser.replace(before, 'contactConsent: true, website')), /actual consent/);
});

test('gift messenger contract rejects missing optional disclosure', () => {
  const before = 'WhatsApp or Telegram is optional.';
  assert.equal(channelChooser.split(before).length - 1, 1);
  assert.throws(() => assertSavedMessengerContract(channelChooser.replace(before, 'Use a messenger to finish.')), /optional/);
});

test('branch mutation rejects unknown, missing and ambiguous AST targets', () => {
  assert.throws(() => mutateSavedMessengerBranch(channelChooser, 'unknown', 'reference', 'null'), /Unknown chooser branch/);
  assert.throws(() => mutateSavedMessengerBranch(channelChooser, 'compact', 'submitDisabled', 'false'), /cardinality/);
  const missing = mutateSavedMessengerBranch(channelChooser, 'compact', 'reference', 'null');
  assert.throws(() => mutateSavedMessengerBranch(missing, 'compact', 'reference', 'null'), /cardinality/);
  const duplicate = mutateSavedMessengerBranch(channelChooser, 'compact', 'reference', 'saved.referenceCode}{saved.referenceCode');
  assert.throws(() => mutateSavedMessengerBranch(duplicate, 'compact', 'reference', 'null'), /cardinality/);
});
