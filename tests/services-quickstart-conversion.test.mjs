import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES services give three free and five personal offers before the optional finder", () => {
  const studio = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  const pages = [read("app/[locale]/services/page.tsx"), read("app/es/services/page.tsx")];
  for (const page of pages) {
    assertServicesExplorerOrder(page);
    assert.ok(!page.includes("<ServicesSmartDiscovery"));
  }
  assert.match(studio, /data-services-studio-free/);
  assert.match(studio, /data-services-studio-paid/);
  assert.match(studio, /id: "tests"/);
  assert.match(studio, /id: "remote-energy-support"/);
  assert.match(studio, /<ContactChannelChooser/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /:focus-visible/);
  const directory = read("components/services-directory-page.tsx");
  assert.match(directory, /<ServicesSmartDiscovery/);
  assert.match(directory, /<MarketplaceServiceFinder/);
  const quick = read("components/services-quick-start.tsx");
  assert.doesNotMatch(quick, /fetch\(|sendBeacon\(|localStorage|sessionStorage|\bgtag\(/);
});

test("personal pages keep three price and free alternatives without suggesting automatic booking", () => {
  const page = read("components/personal-service-landing.tsx");
  const css = read("components/personal-service-landing.module.css");
  assert.match(page, /data-personal-service=\{service\}/);
  assert.match(page, /30 min · €50/);
  assert.match(page, /60 min · €100/);
  assert.match(page, /30 мин · €50/);
  assert.match(page, /60 мин · €100/);
  assert.match(page, /Nothing is booked or charged automatically/);
  assert.match(page, /Никакой автоматической записи или оплаты/);
  assert.match(page, /No hay reservas ni cobros automáticos/);
  assert.match(page, /<PersonalConsultationForm locale=\{locale\} service=\{t.orderLabel\}/);
  assert.match(page, /href="#request-session"/);
  assert.match(page, /<h2 id="questions-title">\{ui.forWhom\}<\/h2>/);
  assert.doesNotMatch(page, /<p className=\{styles.smallEyebrow\}>\{ui.forWhom\}<\/p>/);
  assert.match(css, /@media\(min-width:901px\) and \(min-height:820px\)/);
  assert.match(css, /\.order\{position:sticky/);
  assert.match(css, /@media\(max-width:767px\)\{\s*\.order\{position:static\}/);
});

test("real production browser QA covers personal landing CTA and safe messenger draft in all locales", () => {
  const script = read("scripts/verify-public-services-production.mjs");
  const workflow = read(".github/workflows/hh-public-services-production.yml");
  for (const route of ["imagery-therapy", "systemic-constellations"])
    assert.ok(script.includes('"' + route + '"'), route);
  assertBusinessBrowserRoute(script);
  const business = read("components/business-consulting-landing.tsx");
  assert.match(business, /data-business-consulting/);
  assert.match(business, /data-business-offer=\{offer.kind\}/);
  assert.match(script, /main\[data-business-consulting\]/);
  assert.match(script, /data-business-offer="express"/);
  assert.match(script, /Business Strategy & Founder Coaching has its own separate/);
  assert.match(script, /for \(const locale of \["en", "ru", "es"\]\)/);
  assert.match(script, /waitForURL\(\/#request-session\$\/\)/);
  assert.match(script, /assertPreparedContactChannels\(chooser, expect\)/);
  assert.match(script, /personal-request\//);
  assert.doesNotMatch(script, /telegram\.com\/send|wa\.me\/send/);
  assert.match(workflow, /node scripts\/verify-public-services-production\.mjs/);
  assert.match(workflow, /artifacts\/public-services-production/);
});

test("no analytics privacy bypass for conversion optimization", () => {
  const flag = read("lib/public-analytics.ts");
  assert.match(flag, /PUBLIC_ANALYTICS_AVAILABLE = false/);
  const ga = read("components/ga4-analytics.tsx");
  assert.match(ga, /if \(!PUBLIC_ANALYTICS_AVAILABLE/);
  const quick = read("components/services-quick-start.tsx");
  assert.doesNotMatch(quick, /fetch\(|sendBeacon\(|localStorage|sessionStorage|\bgtag\(/);
});

function assertBusinessBrowserRoute(script) {
  assert.match(script, /for \(const locale of \["en", "ru", "es"\]\) \{\s*const page = await createPage\(390\);\s*const label = locale \+ "\/business-consulting\/390";\s*const response = await page\.goto\(origin \+ "\/" \+ locale \+ "\/services\/business-consulting"/);
}

test("Business browser contract rejects missing route or locale coverage", () => {
  const script = read("scripts/verify-public-services-production.mjs");
  assertBusinessBrowserRoute(script);
  for (const changed of [script.replace('locale + "/services/business-consulting"', 'locale + "/services/wrong"'), script.replaceAll('["en", "ru", "es"]', '["en", "ru"]')]) {
    assert.notEqual(changed, script);
    assert.throws(() => assertBusinessBrowserRoute(changed));
  }
});

function assertServicesExplorerOrder(source) {
  const file=ts.createSourceFile('services.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(file.parseDiagnostics.length,0);
  const providers=[];const visit=node=>{if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(file)==='ServicesExplorerProvider')providers.push(node);ts.forEachChild(node,visit)};visit(file);
  assert.equal(providers.length,1,'One actual services explorer');
  const content=providers[0].children.filter(node=>!ts.isJsxText(node)||node.text.trim());
  assert.ok(content.every(ts.isJsxSelfClosingElement),'Services explorer keeps the three direct visible component siblings');
  assert.deepEqual(content.map(node=>node.tagName.getText(file)),['ServicesConversionHero','PublicConsultationCta','ServicesStudioOffers'],'Exact canonical hero → consultation → studio order');
}
for(const route of ['app/[locale]/services/page.tsx','app/es/services/page.tsx'])test(route+': exact current services order rejects missing, duplicated, moved and hidden sections',()=>{
  const source=read(route);assertServicesExplorerOrder(source);
  const tags=Object.fromEntries(['ServicesConversionHero','PublicConsultationCta','ServicesStudioOffers'].map(name=>[name,source.match(new RegExp('<'+name+'\\b[^>]*\\/>'))?.[0]]));
  assert.ok(Object.values(tags).every(Boolean),'All exact JSX mutation anchors exist');
  for(const changed of [source.replace(tags.PublicConsultationCta,''),source.replace(tags.PublicConsultationCta,tags.PublicConsultationCta+tags.PublicConsultationCta),source.replace(tags.PublicConsultationCta,'TEMP').replace(tags.ServicesStudioOffers,tags.PublicConsultationCta).replace('TEMP',tags.ServicesStudioOffers),source.replace(tags.PublicConsultationCta,'<div hidden>'+tags.PublicConsultationCta+'</div>')]){
    assert.notEqual(changed,source);assert.throws(()=>assertServicesExplorerOrder(changed),error=>error?.code==='ERR_ASSERTION');
  }
});
