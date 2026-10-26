import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sourceFixture, blocked, icons, css, link, textContent } from "./helpers/current-navigation-fixture.mjs";
import { isPublicSeoPath, searchDateRange, serviceAccountReady, readSearchMetrics, verifiedSeoBaseline } from "../lib/seo/admin-dashboard-data.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("SEO access is gated by same signed admin session as the existing cabinet", () => {
  const page = read("app/admin/seo/page.jsx");
  const exportRoute = read("app/admin/seo/export/route.js");
  assert.match(page, /requireAdminRequest\(\)/);
  assert.match(page, /redirect\("\/admin\/login\?destination=seo"\)/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /dynamic = "force-dynamic"/);
  assert.match(exportRoute, /if \(!\(await requireAdminRequest\(\)\)\)/);
  assert.match(exportRoute, /status: 401/);
  assert.match(exportRoute, /private, no-store/);
  assert.match(exportRoute, /noindex, nofollow/);
});

test("SEO remains discoverable through the real owner tools header and Marketing route", () => {
  // #1495 intentionally removed duplicate marketing cards from /admin/tools.
  for (const locale of ["en", "ru"]) {
    const fixture = sourceFixture({ document: { cookie: "fixture-locale=" + locale },
      window: { addEventListener() {}, removeEventListener() {} } });
    const uiLocale = { readUiLocale: () => locale, saveUiLocale: blocked };
    const { PrescriptionAdminHeader } = fixture.load(read("components/prescription-admin-header.jsx"), "header.jsx", {
      "next/link": link, "@/app/admin/logout/actions": { logout: blocked }, "@/lib/ui-locale": uiLocale,
    }, { exports: ["PrescriptionAdminHeader"] });
    const { PractitionerCabinet } = fixture.load(read("components/practitioner-cabinet.jsx"), "cabinet.jsx", {
      "next/link": link, "@/components/prescription-admin-header": { PrescriptionAdminHeader },
      "@/lib/ui-locale": uiLocale, "./practitioner-cabinet.module.css": css,
      "lucide-react": icons("Archive BadgeCheck ChevronDown ChevronRight FileText Film Headphones Images Inbox PlusCircle ReceiptText Users"),
    }, { exports: ["PractitionerCabinet"] });
    const cabinet = fixture.mount(PractitionerCabinet, {});
    const header = cabinet.one(node => node.type === PrescriptionAdminHeader);
    assert.equal(header.props.compactMarketing, undefined);
    const marketing = cabinet.one(node => node.type === "a" && node.props.href === `/${locale}/app/practice?panel=marketing`);
    assert.match(textContent(marketing), locale === "ru" ? /Маркетинг/ : /Marketing/);
    for (const compactMarketing of [false, true]) {
      const navigation = fixture.mount(PrescriptionAdminHeader, { ...header.props, initialLocale: locale, compactMarketing });
      const seo = navigation.one(node => node.type === "a" && node.props.href === "/admin/seo");
      assert.equal(textContent(seo), "SEO");
      if (compactMarketing) {
        navigation.one(node => node.type === "a" && node.props.href === `/${locale}/app/practice?panel=marketing`);
        assert.equal(navigation.nodes().filter(node => node.type === "details").length, 0);
      } else {
        const more = navigation.one(node => node.type === "details");
        assert.ok(textContent(more).includes("SEO"));
      }
    }
    fixture.assertNoExternalOperations();
  }
  assert.doesNotMatch(read("components/public-site-header.tsx"), /\/admin\/seo/);
});

test("SEO metrics are sourced, with accurate distinctions between two indexing reports", () => {
  assert.equal(verifiedSeoBaseline.search.clicks, 0);
  assert.equal(verifiedSeoBaseline.search.impressions, 0);
  assert.equal(verifiedSeoBaseline.search.ctr, null);
  assert.equal(verifiedSeoBaseline.search.position, null);
  assert.equal(verifiedSeoBaseline.sitemap.submittedUrls, 601);
  assert.equal(verifiedSeoBaseline.tracker.tracked, 19);
  assert.equal(verifiedSeoBaseline.tracker.indexed, 1);
  assert.equal(verifiedSeoBaseline.technical.ok200, 601);
  assert.ok(verifiedSeoBaseline.tracker.checkedAt);
  assert.ok(verifiedSeoBaseline.lighthouse.reportUrl.startsWith("https://github.com/"));
});

test("site's private report, login and client pages never enter SEO query/page output", () => {
  for (const privatePath of [
    "/admin", "/admin/seo", "/api/admin", "/en/app/insights",
    "/en/client/123", "/ru/prescriptions/abc", "/es/report/private",
    "https://evil.example.com/", "javascript:alert(1)",
  ]) {
    assert.equal(isPublicSeoPath(privatePath), false, privatePath);
  }
  for (const path of ["/", "/en/about", "/ru/books", "/es/services", "/en/homeopathy/remedies/arnica"]) {
    assert.equal(isPublicSeoPath(path), true, path);
  }
});

test("calendar range is settled and bounded, and missing Google permissions never invent values", async () => {
  assert.deepEqual(searchDateRange(28, new Date("2026-10-17T17:00:00Z")), { startDate: "2026-09-17", endDate: "2026-10-14" });
  assert.deepEqual(searchDateRange(7, new Date("2026-10-17T17:00:00Z")), { startDate: "2026-10-08", endDate: "2026-10-14" });
  assert.equal(serviceAccountReady({}), false);
  const result = await readSearchMetrics(28, {});
  assert.equal(result.status, "not_connected");
  assert.equal(result.clicks, undefined);
  assert.equal(result.impressions, undefined);
});

test("Google credentials remain server-only; no secret or raw API errors in HTML/UI", () => {
  const service = read("lib/seo/admin-dashboard-data.mjs");
  const page = read("app/admin/seo/page.jsx");
  const csv = read("app/admin/seo/export/route.js");
  assert.match(service, /HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY/);
  assert.match(service, /webmasters\.readonly/);
  assert.match(service, /oauth2\.googleapis\.com/);
  assert.match(service, /searchconsole\.googleapis\.com/);
  assert.doesNotMatch(page, /process\.env|Authorization:|Bearer |getAccessToken|createSign/);
  assert.doesNotMatch(csv, /process\.env|Authorization:|Bearer /);
  assert.match(csv, /Content-Disposition/);
  assert.match(csv, /X-Content-Type-Options/);
});

test("dashboard shows search, sitemap, Lighthouse and unavailable GA4 separately", () => {
  const page = read("app/admin/seo/page.jsx");
  const css = read("app/admin/seo/seo-dashboard.module.css");
  for (const text of ["Клики из Google", "Поисковые запросы", "Карта сайта и индексация", "Технический аудит", "Скорость и Lighthouse", "GA4 и конверсии"]) {
    assert.ok(page.includes(text), text);
  }
  assert.match(page, /sourceDate/);
  assert.match(page, /[7,28,90]/.source ? /includes\(Number\(params\?\.days\)\)/ : /searchParams/);
  assert.match(css, /@media\(max-width:570px\)/);
});
