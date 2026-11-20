import test from "node:test";
import assert from "node:assert/strict";
import { checkHomeContract, HOME_ROUTES, summarizeHomeHtml } from "../scripts/verify-home-critical-response.mjs";

const hero = '<link rel="preload" href="/images/holistic-house/ideas-pine-reference.webp" as="image" fetchpriority="high">';
test("all three locales and explicit React requests are inspected", () => {
  assert.deepEqual(HOME_ROUTES, ["/", "/ru", "/es", "/?full=1", "/ru?full=1"]);
});
test("static first-screen inlining passes cacheable, zero-blocking-CSS acceptance", () => {
  const html = '<html><head>'+hero+'<style data-home-critical-css>body{margin:0}</style></head><body data-fast-home="en"></body></html>';
  const row = summarizeHomeHtml(html, new Headers({"cache-control":"public, s-maxage=3600","x-vercel-cache":"HIT"}));
  assert.equal(row.renderBlockingStylesheets, 0);
  assert.equal(row.inlineStyles, 1);
  assert.equal(row.staticFirstScreen, true);
  assert.doesNotThrow(() => checkHomeContract("/", row, {requireEdgeHit:true}));
});
test("blocking styles and missing LCP priority fail closed", () => {
  const row = summarizeHomeHtml('<html><head>'+hero+'<link rel="stylesheet" href="/heavy.css"></head><body data-fast-home="ru"></body></html>');
  assert.equal(row.renderBlockingStylesheets, 1);
  assert.throws(() => checkHomeContract("/ru", row));
  assert.throws(() => checkHomeContract("/es", {...row,staticFirstScreen:false}, {inlineReact:true}));
  assert.throws(() => checkHomeContract("/", {...row,renderBlockingStylesheets:0,inlineStyles:1,heroPreloadHighPriority:false}));
});
test("private HTML and CDN MISS never pass cache HIT acceptance", () => {
  const html='<html><head>'+hero+'<style></style></head><body data-fast-home="en"></body></html>';
  const row=summarizeHomeHtml(html,new Headers({"cache-control":"private, no-store","x-vercel-cache":"MISS"}));
  assert.throws(() => checkHomeContract("/",row));
  assert.throws(() => checkHomeContract("/",{...row,cacheControl:"public, s-maxage=3600"},{requireEdgeHit:true}));
});
test("original React layout can be dynamic but still needs CSS inlining", () => {
  const html='<html><head>'+hero+'<style data-precedence="next">.root{display:block}</style></head><body data-app="true"></body></html>';
  const row=summarizeHomeHtml(html,new Headers({"cache-control":"private, no-store"}));
  assert.doesNotThrow(() => checkHomeContract("/es",row,{inlineReact:true}));
  assert.doesNotThrow(() => checkHomeContract("/?full=1",row,{inlineReact:true}));
});
