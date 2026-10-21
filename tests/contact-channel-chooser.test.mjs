import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp, TELEGRAM_USERNAME } from "../lib/whatsapp-enquiry.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Telegram prefill preserves all verified enquiry details in EN/RU/ES, without source query strings", () => {
  for (const locale of ["en", "ru", "es"]) {
    const wa = whatsappEnquiryUrl({
      locale, service: "Tantra Reiki Level 1",
      request: "Please confirm the full initiation and the available start date",
      option: "Personal initiation · €50 / 30 min",
      topic: "Energy practice",
      pagePath: "/" + locale + "/academy/reiki/tantra-reiki/free-initiation?private=do-not-send",
    });
    const tg = new URL(telegramEnquiryUrlFromWhatsApp(wa));
    assert.equal(tg.origin, "https://t.me");
    assert.equal(tg.pathname, "/" + TELEGRAM_USERNAME);
    assert.equal(tg.searchParams.get("text"), new URL(wa).searchParams.get("text"));
    assert.match(tg.searchParams.get("text") || "", /Tantra Reiki Level 1/);
    assert.doesNotMatch(tg.searchParams.get("text") || "", /do-not-send/);
  }
});

test("Telegram deep link helper rejects arbitrary URLs and generic messages", () => {
  for (const bad of [
    "https://evil.example/?text=hello",
    "https://wa.me/1000000000?text=hello",
    "https://wa.me/14376066502",
    "https://wa.me.evil.example/14376066502?text=hello",
  ]) assert.throws(() => telegramEnquiryUrlFromWhatsApp(bad));
});

test("contact chooser is a progressive, accessible mobile-friendly component", () => {
  const src = read("components/contact-channel-chooser.tsx");
  const submission = read("lib/practitioners/public-enquiry-submission.js");
  const css = read("components/contact-channel-chooser.module.css");
  for (const text of [
    'aria-expanded={open}', 'aria-controls={panelId}', 'hidden={!open}',
    'Оставьте контакт, чтобы записаться или узнать подробности',
    'Leave your contact to enquire or join',
    'Deja tus datos para consultar o inscribirte', 'WhatsApp', 'Telegram',
    'data-contact-channel-chooser', 'data-contact-order',
    'telegramEnquiryUrlFromWhatsApp', 'role="group"',
  ]) assert.ok(src.includes(text), text);
  assert.match(src, /<button[\s\S]*?type="button"/);
  assert.match(src, /onClick=\{\(\) => setOpen\(\(value\) => !value\)\}/);
  assert.match(src, /<details className=\{styles\.optionalNote\}>/);
  assert.match(src, /<textarea[\s\S]*?maxLength=\{1400\} rows=\{2\}/);
  assert.doesNotMatch(src, /c\.situation \+ ": " \+ description\.trim\(\)/);
  assert.match(src, /originalMessage \+ "\\n\\n" \+ c\.reference/);
  assert.match(src, /<form onSubmit=\{submit\}/);
  assert.match(src, /import \{ createPublicEnquirySubmissionScope \} from "@\/lib\/practitioners\/public-enquiry-submission"/);
  assert.match(src, /const scope = createPublicEnquirySubmissionScope\(\)/);
  assert.match(src, /const result = await scope\.submit\(\{/);
  assert.match(submission, /fetchImpl\('\/api\/service-enquiries', \{/);
  assert.match(submission, /method: 'POST', credentials: 'same-origin'/);
  assert.match(submission, /response\.ok && data\?\.saved === true/);
  assert.match(src, /if \(result\.kind === "saved"\)/);
  assert.match(src, /\{!saved \? \(/);
  assertCompactAuthBoundary(src);
  assert.doesNotMatch(submission, /localStorage|sessionStorage|sendBeacon|autoSubmit/i);
  assert.match(css, /\.trigger/);
  assert.match(css, /min-height:56px/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.optionalNote > summary/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@container \(max-width: 300px\)/);
  assert.match(src, /onChannelClick\?\./);
  assert.match(src, /scrollIntoView/);
});

test("primary capture components render channel chooser after service selection while downloads remain immediate", () => {
  for (const path of [
    "components/reiki-choice-capture.tsx",
    "components/academy-course-capture.tsx",
    "components/energywork-reiki-capture.tsx",
    "components/consultation-choice-capture.tsx",
    "components/sitewide-lead-capture.tsx",
    "components/core-service-detail.tsx",
    "components/yggdrasil-initiation-form.tsx",
    "components/tantra-initiation-form.tsx",
    "components/principles-of-energywork.tsx",
    "components/temple-initiation-chooser.tsx",
    "components/free-drawing-intake.tsx",
  ]) {
    const src = read(path);
    assert.match(src, /<ContactChannelChooser/, path);
    assert.match(src, /whatsappUrl=\{/, path);
  }
  assert.match(read("components/yggdrasil-initiation-form.tsx"), /href=\{pdfUrl\} download/);
  assert.match(read("components/reiki-choice-capture.tsx"), /href=\{guideUrl\}/);
  assert.match(read("components/consultation-choice-capture.tsx"), /isPaidRequest \? \(/);
});


// Static source-bound auth boundary only. Nothing loads OAuth, sessions, APIs,
// a database or a provider. The lifecycle suite exercises inert callbacks.
function assertCompactAuthBoundary(source) {
  const tree = ts.createSourceFile('contact-channel-chooser.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls = [], fetchIdentifiers = [], storageIdentifiers = [];
  const visit = node => {
    if (ts.isCallExpression(node)) calls.push(node);
    if (ts.isIdentifier(node) && node.text === 'fetch') fetchIdentifiers.push(node);
    if (ts.isIdentifier(node) && node.text === 'sessionStorage') storageIdentifiers.push(node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  const fetches = calls.filter(node => ts.isIdentifier(node.expression) && node.expression.text === 'fetch');
  assert.equal(fetchIdentifiers.length, fetches.length, 'No aliased or additional fetch dispatch');
  assert.deepEqual(fetches.map(node => ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : null),
    ['/api/app/auth/contact-profile', '/api/app/auth/start'], 'Exact auth endpoints only; lead POST belongs to the immutable submission scope');
  const compact = node => node.getText(tree).replace(/\s+/g, '');
  const property = (node, key) => node.properties.find(prop => ts.isPropertyAssignment(prop) && prop.name.getText(tree) === key)?.initializer;
  for (const [index, call] of fetches.entries()) {
    assert.equal(call.arguments.length, 2); const options = call.arguments[1]; assert.ok(ts.isObjectLiteralExpression(options));
    assert.equal(property(options, 'credentials')?.text, 'same-origin');
    assert.equal(property(options, 'method')?.text, index === 0 ? 'GET' : 'POST');
    assert.deepEqual(options.properties.map(prop => prop.name?.getText(tree)), index === 0 ? ['method', 'credentials', 'cache'] : ['method', 'credentials', 'headers', 'body']);
    if (index === 0) assert.equal(property(options, 'cache')?.text, 'no-store');
    else assert.equal(compact(property(options, 'body')), 'JSON.stringify({locale,continueTo:"enquiry",returnPath:pathname})', 'Only public auth-start identity');
  }
  const storage = calls.filter(node => node.expression.getText(tree).startsWith('window.sessionStorage.'));
  assert.equal(storageIdentifiers.length, storage.length, 'No indirect storage alias or additional storage operation');
  assert.deepEqual(storage.map(node => node.expression.name?.text), ['getItem', 'removeItem', 'setItem', 'removeItem'], 'Exact temporary-marker operations');
  for (const call of storage) {
    assert.ok(ts.isStringLiteral(call.arguments[0]));
    assert.equal(call.arguments[0].text, 'hh-google-enquiry-return', 'Exact public return marker key');
    if (call.expression.name.text === 'setItem') {
      assert.equal(call.arguments.length, 2);
      assert.equal(compact(call.arguments[1]), 'JSON.stringify({path:pathname,service:serviceTitle,panel:panelId})', 'Only public return marker identity; no private values');
    } else assert.equal(call.arguments.length, 1);
  }
  assert.doesNotMatch(source, /localStorage|sendBeacon|autoSubmit/i);
  assert.doesNotMatch(source, /\[['"](?:fetch|sessionStorage)['"]\]/);
}

for (const [label, before, after, diagnostic] of [
  ['unknown auth endpoint', 'fetch("/api/app/auth/contact-profile"', 'fetch("/api/app/auth/unrecognized"', /Exact auth endpoints/],
  ['direct lead dispatch', 'fetch("/api/app/auth/contact-profile"', 'fetch("/api/service-enquiries"', /Exact auth endpoints/],
  ['private auth body', 'continueTo: "enquiry", returnPath: pathname', 'continueTo: "enquiry", returnPath: pathname, email', /Only public auth-start identity/],
  ['private return marker', '{ path: pathname, service: serviceTitle, panel: panelId }', '{ path: pathname, service: serviceTitle, panel: panelId, description }', /Only public return marker identity/],
  ['unexpected marker key', 'getItem("hh-google-enquiry-return")', 'getItem("private-contact")', /Exact public return marker key/],
  ['extra private storage', 'setGoogleBusy(true);', 'setGoogleBusy(true); window.sessionStorage.setItem("extra", description);', /Exact temporary-marker operations/],
]) test('compact chooser boundary rejects ' + label + ' after nominal source passes', () => {
  const source = read('components/contact-channel-chooser.tsx'); assertCompactAuthBoundary(source);
  assert.ok(source.includes(before), 'Mutation reaches exact current source');
  assert.throws(() => assertCompactAuthBoundary(source.replace(before, after)), diagnostic);
});
