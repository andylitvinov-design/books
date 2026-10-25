import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "../lib/whatsapp-enquiry.js";
import { RECEIPT_SESSION_KEY } from "../lib/practitioners/enquiry-receipt.mjs";
import { classifyPublicLead, courseTopicForPath, trainingEnquiryUrl } from "../lib/public-lead-capture.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

// Run the actual submit handler, with only network/window effects observed in
// memory. Guard clauses are never replaced by fixture behavior or regexes.
async function assertCompactSaveGuards(source) {
  const file = ts.createSourceFile("compact-lead-capture.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(file.parseDiagnostics.length, 0);
  const names = ["parseContact", "currentWhatsappUrl", "channelUrl", "chooseChannel"];
  const definitions = new Map(names.map(name => [name, []]));
  const close = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && definitions.has(node.name?.text)) definitions.get(node.name.text).push(node);
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "closeHandoff") close.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  for (const [name, nodes] of definitions) assert.equal(nodes.length, 1, `one actual ${name} implementation`);
  assert.equal(close.length, 1, "one actual popup cleanup implementation");
  const code = ts.transpileModule([
    ...names.map(name => definitions.get(name)[0].getText(file)),
    `const ${close[0].getText(file)};`, "chooseChannel;",
  ].join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  function fixture() {
    const events = { requests: [], popups: [], receipts: [], publications: [], errors: [], activity: [], uuids: 0 };
    const state = {
      active: true, contextRevision: { current: 2 }, renderRevision: 2,
      inFlight: { current: false }, reference: "", operation: { current: null },
      mounted: { current: true }, activeContext: { current: "current" }, contextKey: "current",
      address: "fictional@example.invalid", consent: true, phoneOnly: false,
      locale: "en", serviceTitle: "Synthetic public service", sourcePath: "/en/services", pathname: "/en/services",
      formatOptions: undefined, selectedFormat: "", savedWhatsapp: "", savedReferenceLabel: "",
      handoff: { current: null }, t: { reference: "Reference", message: "Synthetic public request",
        contextChanged: "context-changed", consentRequired: "consent-required", invalid: "invalid",
        phoneInvalid: "phone-invalid", error: "unconfirmed", handoffError: "handoff-error" },
      URL, RECEIPT_SESSION_KEY, whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp,
      setReference: value => { state.reference = value; events.publications.push(["reference", value]); },
      setSavedWhatsapp: value => events.publications.push(["whatsapp", value]),
      setSavedReferenceLabel: value => events.publications.push(["reference-label", value]),
      setLockedChannel: value => events.activity.push(["locked", value]),
      setBusy: value => events.activity.push(["busy", value]), setError: value => events.errors.push(value),
      window: {
        crypto: { randomUUID: () => { events.uuids++; return "0a1b2c3d-1111-4111-8111-000000000001"; } },
        open: (url, target) => {
          assert.equal(url, "about:blank"); assert.equal(target, "_blank");
          const popup = { closed: false, destinations: [], close() { this.closed = true; },
            location: { replace: destination => popup.destinations.push(destination) } };
          events.popups.push(popup); return popup;
        },
        sessionStorage: { setItem: (...args) => { events.receipts.push(args); state.afterReceipt?.(); } },
      },
      fetch: async (url, options) => {
        assert.equal(url, "/api/service-enquiries"); assert.equal(options.method, "POST");
        events.requests.push(options.body);
        return { ok: true, json: async () => {
          state.beforeResponse?.(); return state.response ?? { saved: true, referenceCode: "HH-ABCDEF123456" };
        } };
      },
    };
    return { state, events, submit: runInNewContext(code, state) };
  }
  function noAdmission(f, label) {
    assert.deepEqual(f.events.activity, [], `${label}: no submit state changes`);
    assert.equal(f.events.requests.length, 0, `${label}: no request`);
    assert.equal(f.events.popups.length, 0, `${label}: no reserved tab`);
    assert.equal(f.events.uuids, 0, `${label}: no new operation`);
    assert.deepEqual(f.events.publications, [], `${label}: no receipt publication`);
  }
  const fresh = fixture(); await fresh.submit("whatsapp");
  assert.equal(fresh.events.requests.length, 1, "fresh current consented request is admitted");
  assert.equal(JSON.parse(fresh.events.requests[0]).contactConsent, true);
  assert.equal(fresh.events.receipts.length, 1, "only a confirmed save persists a receipt");
  assert.equal(fresh.events.popups[0].destinations.length, 1, "current confirmed response can hand off");
  assert.equal(fresh.state.operation.current.confirmed, true);
  for (const [label, change] of [
    ["inactive", state => { state.active = false; }],
    ["stale render revision", state => { state.contextRevision.current++; }],
    ["in flight", state => { state.inFlight.current = true; }],
    ["existing receipt", state => { state.reference = "HH-ABCDEF123456"; }],
    ["confirmed operation", state => { state.operation.current = { confirmed: true, context: "current", channel: "whatsapp", body: "previously confirmed body" }; }],
    ["unmounted", state => { state.mounted.current = false; }],
    ["changed context", state => { state.activeContext.current = "replaced"; }],
    ["unchecked consent", state => { state.consent = false; }],
  ]) {
    const f = fixture(); change(f.state); await f.submit("whatsapp"); noAdmission(f, label);
    if (label === "unchecked consent") assert.deepEqual(f.events.errors, ["consent-required"]);
  }
  const retry = fixture(); retry.state.response = { saved: false, referenceCode: "HH-ABCDEF123456" };
  await retry.submit("whatsapp");
  const attempt = retry.state.operation.current, body = retry.events.requests[0];
  assert.equal(attempt.confirmed, false, "unconfirmed outcome retains original attempt");
  assert.equal(retry.events.receipts.length, 0); assert.deepEqual(retry.events.publications, []);
  assert.equal(retry.events.popups[0].closed, true);
  assert.deepEqual(retry.events.popups[0].destinations, []);
  for (const [label, change, channel] of [
    ["different retry context", state => { state.operation.current = { ...attempt, context: "replaced" }; }, "whatsapp"],
    ["different retry channel", state => { state.operation.current = { ...attempt }; }, "telegram"],
  ]) {
    const f = fixture(); change(f.state); await f.submit(channel); noAdmission(f, label);
  }
  retry.state.response = undefined;
  retry.state.address = "edited@example.invalid"; retry.state.consent = false;
  await retry.submit("whatsapp");
  assert.deepEqual(retry.events.requests, [body, body], "explicit retry reuses the previously consented immutable body");
  assert.equal(retry.events.uuids, 1, "retry must not allocate another operation UUID");
  assert.equal(retry.events.receipts.length, 1); assert.equal(retry.events.popups[1].destinations.length, 1);
  for (const [label, change] of [
    ["unmounted response", state => { state.mounted.current = false; }],
    ["stale response revision", state => { state.contextRevision.current++; }],
    ["changed response context", state => { state.activeContext.current = "replaced"; }],
    ["replaced response body", state => { state.operation.current = { ...state.operation.current, body: "different" }; }],
    ["missing response operation", state => { state.operation.current = null; }],
  ]) {
    const f = fixture(); f.state.beforeResponse = () => change(f.state); await f.submit("whatsapp");
    assert.equal(f.events.requests.length, 1, `${label}: original request was admitted`);
    assert.deepEqual(f.events.publications, [], `${label}: no receipt publication`);
    assert.deepEqual(f.events.receipts, [], `${label}: no receipt persistence`);
    assert.deepEqual(f.events.popups[0].destinations, [], `${label}: no handoff`);
    assert.equal(f.events.popups[0].closed, true, `${label}: close reserved tab`);
    assert.notEqual(f.state.operation.current?.confirmed, true, `${label}: no confirmed operation`);
  }
  const lateHandoff = fixture();
  lateHandoff.state.afterReceipt = () => { lateHandoff.state.contextRevision.current++; };
  await lateHandoff.submit("whatsapp");
  assert.equal(lateHandoff.events.receipts.length, 1, "receipt was confirmed while context was current");
  assert.deepEqual(lateHandoff.events.popups[0].destinations, [], "changed context is rechecked before messenger handoff");
  assert.equal(lateHandoff.events.popups[0].closed, true);
}


test("public services, learning and reading pages get contextual final captures", () => {
  const cases = [
    ["/en/services", "en", "personal"],
    ["/ru/services/imagery-therapy", "ru", "personal"],
    ["/es/masters/andy-litvinov", "es", "personal"],
    ["/en/masters/another-practitioner", "en", "network"],
    ["/ru/services/another-practitioner/therapy-session", "ru", "network"],
    ["/en/services/andy-litvinov/homeopathy-consultation", "en", "personal"],
    ["/en/academy", "en", "training"],
    ["/ru/academy/reiki/yggdrasil/basic-course", "ru", "training"],
    ["/es/academy/reiki/tantra-reiki", "es", "training"],
    ["/es/library/distance-homeopathy", "es", "reading"],
    ["/ru/homeopathy/remedies/aconitum", "ru", "reading"],
    ["/en/wu-xing", "en", "reading"],
    ["/books/dao-wuxing-model-steps", "ru", "reading"],
  ];
  for (const [url, locale, kind] of cases) {
    assert.deepEqual(classifyPublicLead(url), { locale, kind }, url);
  }
});

test("no generic capture on private routes, results or dedicated free landings", () => {
  for (const path of [
    "/", "/en", "/ru", "/es", "/en/client", "/es/client/tests",
    "/ru/app/consultations", "/admin", "/api/health", "/en/account/history",
    "/ru/prescriptions/patient", "/en/tests/results",
    "/en/services/free-situation-review", "/ru/services/free-situation-review",
    "/es/services/free-situation-review", "/en/services/dao-health-profile",
    "/ru/services/dao-health-profile", "/es/services/dao-health-profile",
    "/en/about", "/es/privacy", "/ru/terms", "/document-preview/a",
    "/en/auth/callback", "/en/private/report", "/en/settings", "/en/dashboard",
  ]) assert.equal(classifyPublicLead(path), null, "No extra capture on " + path);
});

test("training enquiry still identifies the correct programme on existing direct CTAs", () => {
  assert.equal(courseTopicForPath("/en/academy/reiki/yggdrasil/basic-course"), "DAO Reiki Yggdrasil");
  assert.equal(courseTopicForPath("/ru/academy/reiki/tantra-reiki"), "Tantra Reiki");
  assert.equal(courseTopicForPath("/es/academy/mysteries"), "Mysteries & Ancient Traditions");
  for (const locale of ["en", "ru", "es"]) {
    const url = new URL(trainingEnquiryUrl(locale, "/" + locale + "/academy/reiki/tantra-reiki"));
    assert.equal(url.hostname, "wa.me");
    assert.ok((url.searchParams.get("text") || "").includes("Tantra Reiki"));
  }
});

test("global fallback is a short consented footer after page content and preserves provider ownership", () => {
  const root = read("app/layout.tsx");
  const component = read("components/sitewide-lead-capture.tsx");
  const css = read("components/sitewide-lead-capture.module.css");
  const suppress = read("app/sitewide-capture.css");
  assert.ok(root.indexOf("{children}") < root.indexOf("<SitewideLeadCapture"));
  assert.ok(root.indexOf("<SitewideLeadCapture") < root.indexOf("<MobileBottomNavigation"));
  assert.match(component, /clientPath \? classifyPublicLead\(clientPath\) : null/);
  assert.match(component, /setClientPath\(pathname\)/);
  assert.match(component, /setLegacyBookLocale/);
  assert.match(component, /window.location.search/);
  assert.match(component, /<CompactLeadCapture/);
  assert.match(component, /courseTopicForPath\(pathname\)/);
  assert.match(component, /kind === "network"/);
  assert.match(component, /networkService \? "#request-service"/);
  assert.match(component, /networkMaster \? "#practitioner-services"/);
  assert.match(component, /data-sitewide-capture=\{kind\}/);
  assert.match(component, /Independent practitioners own their enquiries/);
  assert.match(suppress, /body:has\(\[data-consultation-cta\]\) \[data-sitewide-capture\]/);
  assert.match(suppress, /body:has\(\[data-reiki-choice-capture\]\) \[data-sitewide-capture\]/);
  assert.match(suppress, /body:has\(\[data-free-entry-landing\]\) \[data-sitewide-capture\]/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /:focus-visible/);
});

test("single-field request is explicit opt-in with real CRM commit receipt and no private details", async () => {
  const form = read("components/compact-lead-capture.tsx");
  const css = read("components/compact-lead-capture.module.css");
  const api = read("app/api/service-enquiries/route.js");
  const writer = read("lib/practitioners/public-service-enquiry.js");
  for (const locale of ["en:", "ru:", "es:"]) assert.ok(form.includes(locale));
  assert.match(form, /data-compact-last-slide/);
  assert.match(form, /data-compact-lead-form/);
  assert.match(form, /contactConsent: true/);
  assert.match(form, /const inFlight = useRef\(false\)/);
  await assertCompactSaveGuards(form);
  assert.match(form, /if \(!consent\) \{ setError\(t\.consentRequired\); return; \}/);
  assert.match(form, /whatsappEnquiryUrl\(\{/);
  assert.match(form, /telegramEnquiryUrlFromWhatsApp\(draft\.toString\(\)\)/);
  assert.match(form, /data-compact-channel="whatsapp"/);
  assert.match(form, /data-compact-channel="telegram"/);
  assert.match(form, /parseContact\(address\)/);
  assert.match(form, /window.crypto.randomUUID\(\)/);
  assert.match(form, /fetch\("\/api\/service-enquiries"/);
  assert.match(form, /result\?\.saved !== true/);
  assert.match(form, /committedReference = result.referenceCode/);
  assert.match(form, /setReference\(committedReference\)/);
  assert.match(form, /RECEIPT_SESSION_KEY/);
  assert.doesNotMatch(form, /lead_created|booking_confirmed|payment_received|gtag\(/);
  assert.match(api, /createPublicServiceEnquiry/);
  assert.match(writer, /insert into app\.public_service_enquiries/);
  assert.match(writer, /insert into app\.crm_contacts/);
  assert.match(writer, /if \(contact && !crmEnabled\(\)\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(css, /:focus-visible/);
});

test("free landing's final slide is just the compact form, in all three languages", () => {
  const page = read("components/free-entry-landing.tsx");
  const pageCss = read("components/free-entry-landing.module.css");
  const main = read("app/[locale]/services/page.tsx");
  const es = read("app/es/services/page.tsx");
  assert.match(page, /const finalCopy = \{/);
  assert.match(page, /tests: \{ title:/);
  assert.match(page, /situation: \{ title:/);
  assert.match(page, /dao: \{ title:/);
  assert.match(page, /id=\{captureId\}/);
  assert.match(page, /disclaimer=\{common.limitations\}/);
  assert.ok(page.lastIndexOf("<CompactLeadCapture") > page.lastIndexOf("<PersonalTestimonials"));
  assert.ok(page.lastIndexOf("<CompactLeadCapture") > page.lastIndexOf("<SiteVideoPlayer"));
  assert.doesNotMatch(page, /<section className=\{styles\.end\}/);
  assert.doesNotMatch(page, /<FreeResourceEnquiry/);
  assert.match(page, /data-optional-written-review/);
  assert.match(pageCss, /\.page\{padding-bottom:0\}/);
  assert.match(main, /<CompactLeadCapture locale=\{locale as Locale\}/);
  assert.match(es, /<CompactLeadCapture locale="es"/);
  assert.ok(main.lastIndexOf("<CompactLeadCapture") > main.lastIndexOf("<ServicesDirectoryInvitation"));
  assert.ok(es.lastIndexOf("<CompactLeadCapture") > es.lastIndexOf("<ServicesDirectoryInvitation"));
});
