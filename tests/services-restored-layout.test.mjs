import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const order = ["<PublicSiteHeader", "<ServicesConversionHero", "<PublicConsultationCta", "<ServicesStudioOffers",
  "<ServicesIntroMedia", "<PersonalTestimonials", "<ServicesMethodVideos",
  "<ServicesDirectoryInvitation"];

// Execute only the public page composition. Imports are explicit inert component
// identities or pure test boundaries; no config, repository or payment code runs.
async function assertOrder(page, locale, flags = { wise: false, paypal: false }) {
  const imports = {
    "next/navigation": { notFound() { throw Error("not found"); }, redirect() { throw Error("unexpected redirect"); } },
    "@/components/public-site-header": { PublicSiteHeader: "PublicSiteHeader" },
    "@/components/services-conversion-hero": { ServicesConversionHero: "ServicesConversionHero" },
    "@/components/services-explorer-state": { ServicesExplorerProvider: "ServicesExplorerProvider" },
    "@/components/services-studio-offers": { ServicesStudioOffers: "ServicesStudioOffers" },
    "@/components/services-studio-extras": { ServicesIntroMedia: "ServicesIntroMedia", ServicesMethodVideos: "ServicesMethodVideos", ServicesDirectoryInvitation: "ServicesDirectoryInvitation" },
    "@/components/personal-testimonials": { PersonalTestimonials: "PersonalTestimonials" },
    "@/components/public-consultation-cta": { PublicConsultationCta: "PublicConsultationCta" },
    "@/components/compact-lead-capture": { CompactLeadCapture: "CompactLeadCapture" },
    "@/lib/commerce/wise-payments": { wisePaymentsEnabled: () => flags.wise },
    "@/lib/commerce/paypal-personal": { personalPayPalEnabled: () => flags.paypal },
    "@/data/remedies": { getHomeopathyLocaleParams: () => [], isSupportedLocale: value => ["en", "ru"].includes(value) },
    "@/data/site-metadata": { metadataBaseFor: () => "https://example.invalid" },
    "@/lib/spanish-metadata": { spanishMetadata: () => ({}) },
  };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  imports["react/jsx-runtime"] = { jsx, jsxs: jsx, Fragment: "fragment" };
  const compiled = ts.transpileModule(page, { fileName: "services-page.tsx", reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  assert.equal((compiled.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  const exports = {};
  new vm.Script(compiled.outputText).runInNewContext({ exports, require(id) {
    assert.ok(Object.hasOwn(imports, id), "Unexpected page dependency: " + id);
    return imports[id];
  } }, { timeout: 1000 });
  const rendered = await exports.default({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) });
  const nodes = [];
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    nodes.push(node);
    visit(node.props.children);
  };
  visit(rendered);
  assert.equal(rendered.type, "main");
  assert.equal(rendered.props.lang, locale);
  let previous = -1;
  for (const marker of order) {
    const matches = nodes.filter(node => node.type === marker.slice(1));
    assert.equal(matches.length, 1, "Exactly one " + marker);
    assert.equal(matches[0].props.locale, locale, marker + " retains page language");
    const position = nodes.indexOf(matches[0]);
    assert.ok(position > previous, marker + " follows previous section");
    previous = position;
  }
  const chooser = nodes.find(node => node.type === "PublicConsultationCta");
  assert.equal(chooser.props.id, "consultation");
  assert.equal(chooser.props.serviceBooking, true);
  assert.equal(chooser.props.wiseEnabled, flags.wise);
  assert.equal(chooser.props.paypalPersonalEnabled, flags.paypal);
  assert.equal(nodes.find(node => node.type === "PublicSiteHeader").props.showAssessmentStrip, false);
  assert.ok(!nodes.some(node => ["ServicesSmartDiscovery", "ServicesSolutions", "ServicesQuickStart", "ServicesTestsIntro"].includes(node.type)));
}

test("EN/RU/ES Services preserves the published early session selector and personal journey", async () => {
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = read(path);
    const locales = path.includes("/es/") ? ["es"] : ["en", "ru"];
    for (const locale of locales) {
      for (const flags of [{ wise: false, paypal: false }, { wise: true, paypal: false }, { wise: false, paypal: true }, { wise: true, paypal: true }])
        await assertOrder(page, locale, flags);
    }
    const locale = locales.at(-1);
    const tags = new Map(order.map(marker => [marker, page.match(new RegExp(marker + "\\b[^>]*?/>", "s"))?.[0]]));
    for (const marker of order) {
      const tag = tags.get(marker);
      assert.ok(tag, "Mutation target exists: " + marker);
      await assert.rejects(() => assertOrder(page.replace(tag, ""), locale), undefined, "Removing " + marker);
      await assert.rejects(() => assertOrder(page.replace(tag, tag + tag), locale), undefined, "Duplicating " + marker);
    }
    for (let i = 1; i < order.length; i++) {
      const left = tags.get(order[i - 1]), right = tags.get(order[i]);
      const mutation = page.replace(left, "ORDER_TMP").replace(right, left).replace("ORDER_TMP", right);
      await assert.rejects(() => assertOrder(mutation, locale), undefined, "Reversing " + order[i]);
    }
    for (const [from, to] of [
      ['id="consultation"', 'id="not-consultation"'],
      [' serviceBooking ', ' serviceBooking={false} '],
      ['wiseEnabled={wisePaymentsEnabled()}', 'wiseEnabled={false}'],
      ['paypalPersonalEnabled={personalPayPalEnabled()}', 'paypalPersonalEnabled={false}'],
      ['showAssessmentStrip={false}', 'showAssessmentStrip={true}'],
    ]) {
      assert.ok(page.includes(from), "Mutation target exists: " + from);
      await assert.rejects(() => assertOrder(page.replace(from, to), locale, { wise: true, paypal: true }));
    }
    const chooserTag = tags.get("<PublicConsultationCta");
    for (const [from, to, flags] of [
      ['wiseEnabled={wisePaymentsEnabled()}', 'wiseEnabled={personalPayPalEnabled()}', { wise: true, paypal: false }],
      ['paypalPersonalEnabled={personalPayPalEnabled()}', 'paypalPersonalEnabled={wisePaymentsEnabled()}', { wise: false, paypal: true }],
    ]) await assert.rejects(() => assertOrder(page.replace(from, to), locale, flags), undefined, "Payment capability props cannot be crossed");
    const wrongLocale = chooserTag.replace(/locale=\{[^}]+\}|locale="es"/, 'locale="en"');
    assert.notEqual(wrongLocale, chooserTag);
    await assert.rejects(() => assertOrder(page.replace(chooserTag, wrongLocale), locale));
    // Import aliases and harmless wrappers/prop formatting must not mimic regressions.
    const aliased = page.replace('import { PublicConsultationCta }', 'import { PublicConsultationCta as SessionChooser }')
      .replace('<PublicConsultationCta ', '<SessionChooser ')
      .replace('id="consultation" serviceBooking', 'serviceBooking={true}\n          id={"consultation"}')
      .replace('<ServicesExplorerProvider>', '<ServicesExplorerProvider><div>')
      .replace('</ServicesExplorerProvider>', '</div></ServicesExplorerProvider>');
    for (const language of locales) await assertOrder(aliased, language);
  }
});

test("Three free offers and five personal services use canonical local photo-left cards", () => {
  const offers = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  assert.match(offers, /const free: Offer\[\] = \[/);
  assert.match(offers, /id: "tests"/);
  assert.match(offers, /id: "situation"/);
  assert.match(offers, /id: "dao"/);
  assert.match(offers, /const paid: Offer\[\] = \[/);
  assert.match(offers, /session\("alchemy"\)/);
  assert.match(offers, /session\("hypnotherapy"\)/);
  assert.match(offers, /session\("business"\)/);
  assert.match(offers, /id: "constellations"/);
  assert.match(offers, /id: "remote-energy-support"/);
  assert.match(offers, /free\.map\(\(offer, index\) => <ServiceCard/);
  assert.match(offers, /paid\.map\(\(offer, index\) => <ServiceCard/);
  assert.match(offers, /ContactChannelChooser/);
  assert.match(offers, /whatsappEnquiryUrl/);
  assert.match(offers, /<details className=\{styles.details\}>/);
  assert.match(offers, /data-services-studio-action/);
  assert.match(offers, /€50 \/ 30 min · €100 \/ 60 min/);
  assert.match(offers, /Homeopathy has no reliable evidence/);
  assert.match(css, /\.freeGrid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.paidGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(max-width:365px\)/);
  assert.match(css, /:focus-visible/);
});

test("Dedicated directory retains all discovery, practitioners and localized routes", () => {
  const directory = read("components/services-directory-page.tsx");
  const invitation = read("components/services-studio-extras.tsx");
  const originalHeader = read("components/public-site-header.tsx");
  assert.match(directory, /<ServicesSmartDiscovery/);
  assert.match(directory, /<MarketplaceServiceFinder/);
  assert.match(directory, /createPractitionerRepository/);
  assert.match(directory, /coreServiceOffers\(locale\)/);
  assert.match(invitation, /href=\{"\/" \+ locale \+ "\/services\/catalog"\}/);
  assert.match(invitation, /<PageVideo slot="services-intro" locale=\{locale\} \/>/);
  assert.match(invitation, /<ServiceVideoShowcase locale="es" topic="overview"/);
  assert.match(invitation, /id="method-videos"/);
  assert.match(invitation, /<details className=\{styles.methods\}/);
  assert.match(originalHeader, /<SiteNavigation locale=\{locale\} \/>/);
  assert.match(read("app/[locale]/services/catalog/page.tsx"), /<ServicesDirectoryPage/);
  assert.match(read("app/es/services/catalog/page.tsx"), /<ServicesDirectoryPage locale="es"/);
});

test("Free-first hero preserves the real portrait and optional paid session route", () => {
  const hero = read("components/services-conversion-hero.tsx");
  const css = read("components/services-conversion-hero.module.css");
  assert.match(hero, /<StaticPortrait/);
  assert.match(hero, /andy-about\.png/);
  assert.match(hero, /className=\{styles.cta\} href="#free-insights" data-service-hero-cta="free"/);
  assert.match(hero, /className=\{styles.paidLink\} href="#consultation" data-service-hero-cta="paid"/);
  assert.match(hero, /freeCta: "Start free · 3 options"/);
  assert.match(css, /\.hero \{/);
  assert.match(css, /@media\(max-width:760px\)/);
});
