import { requireAdminRequest } from "@/lib/prescriptions/admin";
import { readSearchMetrics, readPublicSitemap, verifiedSeoBaseline as baseline } from "@/lib/seo/admin-dashboard-data.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = value => {
  const string = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(string) ? "'" + string : string;
  return '"' + safe.replace(/"/g, '""').replace(/\r?\n/g, " ") + '"';
};
export async function GET(request) {
  if (!(await requireAdminRequest())) return new Response("Unauthorized", {
    status: 401, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
  const daysRequested = Number(new URL(request.url).searchParams.get("days"));
  const days = [7, 28, 90].includes(daysRequested) ? daysRequested : 28;
  const [data, sitemap] = await Promise.all([readSearchMetrics(days), readPublicSitemap()]);
  const actual = data.status === "live";
  const snapshot = !actual && days === 28;
  const clicks = actual ? data.clicks : snapshot ? baseline.search.clicks : null;
  const impressions = actual ? data.impressions : snapshot ? baseline.search.impressions : null;
  const rowData = [
    ["section","metric","value","source","as_of"],
    ["overview","period_days",days,actual?"Google Search Console API":snapshot?"GSC archived snapshot":"unavailable",actual?data.settledThrough:snapshot?baseline.search.settledThrough:""],
    ["search","clicks",clicks,actual?"GSC API":snapshot?"Verified archive":"unavailable",actual?data.settledThrough:snapshot?baseline.search.settledThrough:""],
    ["search","impressions",impressions,actual?"GSC API":snapshot?"Verified archive":"unavailable",actual?data.settledThrough:snapshot?baseline.search.settledThrough:""],
    ["search","ctr",actual?data.ctr:snapshot?baseline.search.ctr:null,actual?"GSC API":snapshot?"Verified archive":"unavailable",actual?data.settledThrough:snapshot?baseline.search.settledThrough:""],
    ["search","avg_position",actual?data.position:snapshot?baseline.search.position:null,actual?"GSC API":snapshot?"Verified archive":"unavailable",actual?data.settledThrough:snapshot?baseline.search.settledThrough:""],
    ["sitemap","public_urls",sitemap.urls,sitemap.status==="live"?"Live sitemap":"Verified archive",new Date().toISOString()],
    ["index","tracked",baseline.tracker.tracked,"GSC Wizard archived tracker",baseline.tracker.checkedAt],
    ["index","indexed_tracked",baseline.tracker.indexed,"GSC Wizard archived tracker",baseline.tracker.checkedAt],
    ["index","indexed_sitemap_report",baseline.sitemap.indexedReported,"GSC sitemaps archived report",baseline.sitemap.fetchedAt],
    ["audit","http_200",baseline.technical.ok200,"GitHub Actions archived run",baseline.technical.checkedAt],
    ["audit","redirects",baseline.technical.redirects,"GitHub Actions archived run",baseline.technical.checkedAt],
    ["lighthouse","mobile_performance",baseline.lighthouse.mobile.performance,"Lighthouse archived lab test",baseline.lighthouse.checkedAt],
    ["lighthouse","desktop_performance",baseline.lighthouse.desktop.performance,"Lighthouse archived lab test",baseline.lighthouse.checkedAt],
  ];
  if(actual) {
    for(const [section, rows] of [["query", data.queries],["page", data.pages],["day", data.daily]]) {
      for(const row of rows) rowData.push([section,row.name??row.date, row.impressions, "GSC API impressions; clicks="+row.clicks, data.settledThrough]);
    }
  }
  const csv = "\uFEFF" + rowData.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new Response(csv, { status: 200, headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="holistic-house-seo-'+days+'d.csv"',
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
  }});
}
