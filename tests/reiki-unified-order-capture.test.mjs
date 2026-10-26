import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "../lib/whatsapp-enquiry.js";

const read = (file) => readFile(file, "utf8");

// Execute the actual admission/response predicates, not a spelling-sensitive
// whole expression. Every prior blocker and the committed lifecycle guards
// must still reject individually; current and immutable-retry cases must pass.
function assertSaveGuards(source) {
  const file = ts.createSourceFile("contact-channel-chooser.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(file.parseDiagnostics.length, 0);
  const functions = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "saveEnquiry") functions.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(functions.length, 1, "one actual saveEnquiry implementation");
  const body = functions[0].body;
  const admission = [...body.statements].slice(0, 2);
  for (const gate of admission) {
    assert.ok(ts.isIfStatement(gate) && !gate.elseStatement && ts.isReturnStatement(gate.thenStatement)
      && !gate.thenStatement.expression, "both admission gates return before any save effects");
  }
  const admitted = (context) => runInNewContext(`(() => { ${admission.map(node => node.getText(file)).join("\n")} return true; })()`, context) === true;
  const baseline = () => ({ mounted: { current: true }, activeContext: { current: "current" }, contextKey: "current",
    contextRevision: { current: 2 }, renderRevision: 2, busy: false, googleBusy: false, authAttempt: { current: null },
    saved: null, operation: { current: null }, operationPending: { current: false } });
  assert.equal(admitted(baseline()), true, "fresh current request remains admissible");
  const retry = baseline(); retry.operation.current = { confirmed: false, body: "immutable synthetic request" };
  assert.equal(admitted(retry), true, "unconfirmed immutable attempt remains explicitly retryable");
  for (const [label, change] of [
    ["unmounted", state => { state.mounted.current = false; }],
    ["changed context", state => { state.activeContext.current = "replaced"; }],
    ["stale revision", state => { state.contextRevision.current = 3; }],
    ["busy", state => { state.busy = true; }],
    ["Google busy", state => { state.googleBusy = true; }],
    ["Google admission", state => { state.authAttempt.current = {}; }],
    ["saved", state => { state.saved = {}; }],
    ["confirmed operation", state => { state.operation.current = { confirmed: true }; }],
    ["pending operation", state => { state.operationPending.current = true; }],
  ]) {
    const state = baseline(); change(state);
    assert.equal(admitted(state), false, `${label} blocks save admission`);
  }
  const responses = [];
  function findResponse(node) {
    if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement)
      && node.expression.getText(file).includes("activeContext.current !== attempt.context")) responses.push(node);
    ts.forEachChild(node, findResponse);
  }
  findResponse(body);
  assert.equal(responses.length, 1, "one stale-confirmation gate");
  const response = responses[0];
  assert.equal(response.elseStatement, undefined);
  assert.equal(response.thenStatement.statements.length, 2);
  const [close, stop] = response.thenStatement.statements;
  assert.ok(ts.isTryStatement(close) && close.catchClause && !close.finallyBlock);
  assert.equal(close.tryBlock.statements.length, 1);
  assert.equal(close.tryBlock.statements[0].getText(file), "handoffWindow?.close();");
  assert.equal(close.catchClause.block.statements.length, 0);
  assert.ok(ts.isReturnStatement(stop) && !stop.expression, "stale response closes only its reserved window and returns");
  const text = body.getText(file);
  assert.ok(text.indexOf("const data = await response.json()") < text.indexOf(response.getText(file)));
  assert.ok(text.indexOf(response.getText(file)) < text.indexOf("operation.current = { ...attempt, confirmed: true }"));
  const stale = state => runInNewContext(`Boolean(${response.expression.getText(file)})`, state);
  const currentResponse = () => {
    const attempt = { context: "current" };
    return { mounted: { current: true }, activeContext: { current: "current" }, contextRevision: { current: 2 },
      submittedRevision: 2, attempt, operation: { current: attempt } };
  };
  assert.equal(stale(currentResponse()), false, "current confirmed response remains eligible");
  for (const [label, change] of [
    ["unmounted response", state => { state.mounted.current = false; }],
    ["stale response revision", state => { state.contextRevision.current = 3; }],
    ["changed response context", state => { state.activeContext.current = "replaced"; }],
    ["replaced attempt", state => { state.operation.current = { ...state.attempt }; }],
  ]) {
    const state = currentResponse(); change(state);
    assert.equal(stale(state), true, `${label} cannot produce a receipt or handoff`);
  }
}


test("Kundalini joins existing Academy three-card capture style on mobile and desktop", async () => {
  const [page, capture, css, academy] = await Promise.all([
    read("components/kundalini-reiki-course.tsx"),
    read("components/kundalini-reiki-order-capture.tsx"),
    read("components/academy-course-capture.module.css"),
    read("components/academy-course-capture.tsx"),
  ]);
  assert.match(page, /<KundaliniReikiOrderCapture locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /https:\/\/wa\.me\/|https:\/\/t\.me\/|enquiryUrl\(/);
  assert.match(capture, /from "\.\/academy-course-capture\.module\.css"/);
  assert.match(capture, /id="kundalini-enquire"/);
  assert.match(capture, /data-consultation-cta="kundalini"/);
  assert.match(capture, /data-kundalini-course-capture/);
  assert.match(capture, /optionOrder\.map/);
  assert.match(capture, /aria-pressed=\{active\}/);
  assert.match(capture, /data-kundalini-choice=\{id\}/);
  assert.match(capture, /<Image src=\{optionImages\[id\]\} alt=""/);
  assert.match(capture, /<ContactChannelChooser/);
  assert.match(capture, /label=\{c\.action\}/);
  assert.match(capture, /stayAfterSave/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.choices \{ grid-template-columns: 1fr/);
  assert.match(css, /\.action \{ min-height: 54px/);
  assert.match(academy, /data-academy-course-capture/);
});

test("Kundalini three options contain distinct, public-only, localized messages", async () => {
  const capture = await read("components/kundalini-reiki-order-capture.tsx");
  for (const option of ["free", "personal", "training"]) {
    assert.match(capture, new RegExp(option + ': "/academy/kundalini-reiki/kundalini-manual-level-'));
  }
  for (const phrase of [
    "Try the free Level 1 introduction",
    "Request personal Level 1",
    "Explore all three levels",
    "Попробовать 1-ю ступень бесплатно",
    "Личную инициацию 1-й ступени",
    "Пройти все три ступени",
    "Probar el Nivel 1 gratis",
    "Una iniciación personal de Nivel 1",
    "Conocer los tres niveles",
  ]) assert.ok(capture.includes(phrase), "Missing localized choice: " + phrase);
  assert.match(capture, /whatsappEnquiryUrl\(\{/);
  assert.match(capture, /service: "Kundalini Reiki"/);
  assert.match(capture, /request: c\.messages\[selected\]/);
  assert.match(capture, /option: c\.options\[selected\]\.title/);
  assert.match(capture, /pagePath,/);
  assert.doesNotMatch(capture, /medical history|diagnosis|health score|password/i);
  for (const locale of ["en", "ru", "es"]) {
    const request = "Kundalini Reiki training and current fees";
    const url = whatsappEnquiryUrl({
      locale, service: "Kundalini Reiki", request, option: "Three levels",
      pagePath: "/" + locale + "/academy/reiki/kundalini-reiki",
    });
    assert.equal(new URL(url).hostname, "wa.me");
    const telegram = new URL(telegramEnquiryUrlFromWhatsApp(url));
    assert.equal(telegram.hostname, "t.me");
    assert.ok(telegram.searchParams.get("text")?.includes(request));
  }
});

test("all Reiki/Academy request forms wait for server-confirmed save before showing messenger links", async () => {
  const chooser = await read("components/contact-channel-chooser.tsx");
  for (const file of [
    "components/kundalini-reiki-order-capture.tsx",
    "components/academy-course-capture.tsx",
    "components/reiki-choice-capture.tsx",
    "components/energywork-reiki-capture.tsx",
    "components/reiki-landing-forms.tsx",
    "components/yggdrasil-initiation-form.tsx",
    "components/tantra-initiation-choice.tsx",
    "components/principles-of-energywork.tsx",
  ]) {
    const source = await read(file);
    assert.match(source, /<ContactChannelChooser/);
    assert.match(source, /stayAfterSave/);
  }
  assert.match(await read("components/tantra-initiation-form.tsx"), /<TantraInitiationChoice/);
  assert.match(await read("components/tantra-initiation-form.tsx"), /whatsappUrl: tantraInitiationWhatsAppUrl\(locale, intent\)/);
  assert.match(chooser, /stayAfterSave\?: boolean/);
  assert.match(chooser, /if \(!stayAfterSave && !compactPhone\) router\.push/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries", \{/);
  assert.match(chooser, /operationId: crypto\.randomUUID\(\)/);
  assert.match(chooser, /normalizePublicServiceEnquiry\(payload\)/);
  assert.match(chooser, /body: JSON\.stringify\(payload\), context: contextKey/);
  assert.match(chooser, /body: attempt\.body/);
  assert.match(chooser, /contactConsent: consent/);
  assert.match(chooser, /if \(!response\.ok \|\| data\.saved !== true/);
  assert.match(chooser, /setSaved\(\{ saved: true, referenceCode: data\.referenceCode, whatsappUrl: attempt\.whatsappUrl \}\)/);
  assert.match(chooser, /data-contact-channel": "whatsapp"/);
  assert.match(chooser, /data-contact-channel": "telegram"/);
  // An unsubmitted or failed request must never produce a fabricated CRM receipt.
  assertSaveGuards(chooser);
  assert.match(chooser, /const \[consent, setConsent\] = useState\(false\)/);
  assert.match(chooser, /setError\(c\.error\)/);
});
