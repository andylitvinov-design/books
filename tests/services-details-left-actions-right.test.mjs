import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

function actionBlock(file, marker) {
  const src = read(file);
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, "Missing service action group: " + marker);
  const end = src.indexOf("</div>", start + marker.length);
  assert.notEqual(end, -1, "Missing action group ending: " + marker);
  return src.slice(start, end);
}

function expectDetailsBeforePrimary(block, detailsMarker, primaryMarker) {
  const left = block.indexOf(detailsMarker);
  const right = block.indexOf(primaryMarker);
  assert.ok(left >= 0 && right >= 0, "Both actions must be present");
  assert.ok(left < right, "Details must be left of the burgundy CTA");
}

test("all free recommendation cards show Details before the burgundy action", () => {
  expectDetailsBeforePrimary(
    actionBlock("components/services-free-recommendations.tsx", '<div className={styles.actions}>'),
    'data-free-service-action="details"',
    'data-free-service-action="order"'
  );
  const css = read("components/services-free-recommendations.module.css");
  assert.ok(css.includes(".order{background:#84334e"));
  assert.ok(css.includes(".details{background:#f4f5f8"));
});

test("matched and editorial service cards show Details first on all locales", () => {
  const file = "components/services-smart-discovery.tsx";
  expectDetailsBeforePrimary(actionBlock(file, '<div className={styles.suggestionActions}>'),
    'className={styles.suggestionDetailsToggle}', '<TrackedServiceLink');
  expectDetailsBeforePrimary(actionBlock(file, '<div className={styles.editorialCardActions}>'),
    'className={styles.editorialDetailsButton}', 'className={styles.editorialOrderButton}');
  const css = read("components/services-smart-discovery.module.css");
  assert.ok(!/\.suggestionActions a(?::hover)?:(first|last)-child/.test(css));
  assert.ok(css.includes(".editorialOrderButton{border:1px solid #82304b;background:#82304b"));
  assert.ok(css.includes("grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr)"));
});

test("personal offer cards show expandable Details to the left of the request action", () => {
  const src = read("components/services-studio-offers.tsx");
  const start = src.indexOf('<div className={styles.actions}>');
  const end = src.indexOf('</article>', start + 10);
  assert.ok(start >= 0 && end > start);
  const actions = src.slice(start, end);
  assert.ok(actions.indexOf('<details className={styles.details}>') >= 0);
  assert.ok(actions.indexOf('<details className={styles.details}>') < actions.indexOf('<Link href={offer.href} className={styles.action}'));
  assert.match(src, /<ContactChannelChooser/);
  const css = read("components/services-studio-offers.module.css");
  assert.match(css, /\.actions\{[^}]*grid-template-columns:/);
  assert.match(css, /\.details summary\{/);
  assert.match(css, /\.booking/);
});

test("marketplace service and practitioner cards keep their burgundy action on the right", () => {
  const src = read("components/master-network-explorer.tsx");
  const serviceStart = src.indexOf("function ServiceCard");
  const serviceEnd = src.indexOf("export function MarketplaceServiceFinder", serviceStart);
  assert.ok(serviceStart >= 0 && serviceEnd > serviceStart);
  expectDetailsBeforePrimary(src.slice(serviceStart,serviceEnd),
    '{t.details}</Link>', '<TrackedServiceLink serviceId={service.id}');
  const masterStart = src.indexOf("export function MarketplaceMasterFinder");
  assert.ok(masterStart >= 0);
  expectDetailsBeforePrimary(src.slice(masterStart),
    '{t.viewService}</Link>', '{t.viewProfile}<span');
  assert.ok(read("components/master-network-explorer.module.css").includes("margin-inline-start:auto"));
});
