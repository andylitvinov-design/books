import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

// These source-contract tests do not claim real email or CRM delivery.
test("quick free-service capture is immediately visible with a single reply field", () => {
  const chooser = read("components/contact-channel-chooser.tsx");
  const resource = read("components/free-resource-enquiry.tsx");
  const css = read("components/contact-channel-chooser.module.css");

  for (const snippet of [
    "quick?: boolean", "data-quick={quick}", "hidden={!open && !quick}",
    "const [consent, setConsent] = useState(quick)", "quick ? c.quickSubmit : c.submit",
    "quick && <small className={styles.quickConsent}>", "contactConsent: consent",
    'fetch("/api/service-enquiries"', "publicTopic?.trim()",
  ]) assert.ok(chooser.includes(snippet), "Quick request contract missing: " + snippet);
  assert.ok(resource.includes("whatsappUrl={whatsappUrl} quick resetKey={kind}"));
  assert.ok(resource.includes("publicTopic={broadTopic}"));
  assert.ok(resource.includes("<details className={styles.topicOptional}>"));
  assert.doesNotMatch(resource, /<textarea|copyPrivateContext|privateContext/);
  assert.ok(chooser.includes("{!quick && <><details className={styles.optionalName}>"));
  assert.ok(chooser.includes("<form onSubmit={submit}"));
  assert.ok(css.includes(".quickPanel"));
  assert.ok(css.includes("@media(max-width:430px)"));
  assert.ok(css.includes(".quickSwitch:focus-visible"));
});

test("Google prefill and contact-only requests never auto-save leads or subscribe to ads", () => {
  const chooser = read("components/contact-channel-chooser.tsx");
  assert.ok(chooser.includes('continueTo: "enquiry", returnPath: pathname'));
  assert.ok(chooser.includes('fetch("/api/app/auth/contact-profile"'));
  assert.ok(chooser.includes('if (busy || saved) return;'));
  assert.ok(chooser.includes('setSaved({ saved: true, referenceCode: data.referenceCode })'));
  assert.ok(chooser.includes("No marketing, charge or confirmed booking"));
  assert.doesNotMatch(chooser, /autoSubmit|sendBeacon|localStorage/);
  for (const token of ['en: {','ru: {','es: {','quickConsent:','quickSubmit:']) {
    assert.ok(chooser.includes(token), token);
  }
});

test("compact request comes right after the hero, above optional service detail", () => {
  const landing = read("components/free-entry-landing.tsx");
  const css = read("components/free-entry-landing.module.css");
  const hero = landing.indexOf("className={styles.hero}");
  const capture = landing.indexOf("className={styles.capture}");
  const outcomes = landing.indexOf("className={[styles.scene, styles.outcomeScene]");
  const process = landing.indexOf("className={[styles.scene, styles.processScene]");
  assert.ok(hero > 0 && hero < capture && capture < outcomes && outcomes < process);
  assert.ok(landing.includes('<FreeSituationReviewForm locale={locale} />'));
  assert.ok(landing.includes('kind="dao"') === false || landing.includes("kind"));
  assert.ok(css.includes("@media(max-width:430px)"));
});

test("the explicit Spanish Wu Xing route reuses the one-contact landing", () => {
  const spanish = read("app/es/services/dao-health-profile/page.tsx");
  const localized = read("app/[locale]/services/dao-health-profile/page.tsx");
  assert.ok(spanish.includes('<FreeEntryLanding locale="es" kind="dao" />'));
  assert.ok(localized.includes('<FreeEntryLanding locale={locale} kind="dao" />'));
  assert.doesNotMatch(spanish, /CoreServiceDetail|ContactChannelChooser|duplicat/i);
  assert.match(spanish, /spanishMetadata/);
});
