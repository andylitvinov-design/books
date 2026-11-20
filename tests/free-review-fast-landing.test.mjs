import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landing = readFileSync(new URL("../components/free-entry-landing.tsx", import.meta.url), "utf8");
const review = readFileSync(new URL("../components/deferred-youtube-review.tsx", import.meta.url), "utf8");
const facade = readFileSync(new URL("../components/home-youtube-facade.tsx", import.meta.url), "utf8");
const enquiry = readFileSync(new URL("../components/personal-express-enquiry.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/[locale]/services/free-situation-review/page.tsx", import.meta.url), "utf8");

test("free review remains a public localized server-rendered landing with its CTA", () => {
  assert.match(route, /generateStaticParams\(\)/);
  assert.match(route, /<FreeEntryLanding locale=\{locale\} kind="situation"\s*\/>/);
  assert.match(landing, /id="free-entry-title"/);
  assert.match(landing, /href=\{kind === "situation" \? "#request-free-review"/);
  assert.match(landing, /<TelegramDiagnosticEntry locale=\{locale\}/);
});

test("all twelve source-backed vertical reviews remain visible but defer heavy player hydration", () => {
  assert.match(landing, /reviewVideos\.map/);
  assert.match(landing, /data-review-count=\{reviewVideos\.length\}/);
  assert.match(landing, /data-review-list-direction="vertical"/);
  assert.match(landing, /data-testimonial-video-id=\{item\.id\}/);
  assert.match(landing, /<DeferredYoutubeReview video=\{\{ youtubeId: item\.id/);
  assert.doesNotMatch(landing, /<SiteVideoPlayer video=\{\{ youtubeId: item\.id/);
  assert.match(review, /IntersectionObserver/);
  assert.match(review, /rootMargin: "350px 0px"/);
  assert.match(review, /nearViewport \? \(/);
  assert.match(review, /dynamic\(/);
  assert.match(review, /ssr: false/);
  assert.match(review, /loading="lazy"/);
  assert.match(review, /site-video-frame/);
  assert.match(review, /site-video-title/);
  assert.match(review, /site-video-watch-link/);
  assert.match(review, /https:\/\/www\.youtube\.com\/watch\?v=/);
  assert.match(review, /<HomeYoutubeFacade video=\{video\}/);
  assert.match(facade, /textLanguage\?\: PublicLocale/);
  assert.match(facade, /lang=\{textLanguage \?\? video\.language\}/);
});

test("request wizard and contact chooser load only after request opens and keep their state", () => {
  assert.match(enquiry, /const ContactChannelChooser = dynamic\(/);
  assert.match(enquiry, /const FreeExpressWizard = dynamic\(/);
  assert.match(enquiry, /disclosureOpenedOnce \? \(publicWizard \? <FreeExpressWizard/);
  assert.match(enquiry, /if \(expanded\) setDisclosureOpenedOnce\(true\)/);
  assert.match(enquiry, /hidden=\{!expanded\}/);
  assert.match(enquiry, /id="request-free-review"/);
  assert.match(enquiry, /allowSecureExpressClaim/);
});

test("free review first-viewport portrait avoids runtime Vercel image transformations", () => {
  const portrait = readFileSync(new URL("../components/static-portrait.tsx", import.meta.url), "utf8");
  const manifest = JSON.parse(readFileSync(new URL("../data/static-portrait.json", import.meta.url), "utf8"));
  assert.match(landing, /kind === "situation"[\s\S]*?<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(landing, /priority sizes="\(max-width: 800px\) 100vw, 48vw"/);
  assert.match(portrait, /unoptimized: true/);
  assert.match(portrait, /fetchPriority: "high"/);
  assert.ok(manifest.variants.length >= 3);
  assert.ok(manifest.variants.every(v => v.path.includes("/portrait-static/")));
});
