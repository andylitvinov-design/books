import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const galleryPath = "components/practitioner-video-gallery.tsx";

// Execute the complete component, not a copied click handler or inferred state
// condition. Only React's state/element primitives and CSS are synthetic.
function galleryRuntime(source) {
  const state = [];
  let cursor = 0;
  const element = (type, props, key) => ({ type, props, key });
  const modules = {
    react: { useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    } },
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "./practitioner-video-gallery.module.css": { default: {} },
  };
  const compiled = ts.transpileModule(source, {
    fileName: galleryPath,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  const exports = {};
  runInNewContext(compiled.outputText, { exports, URL, require(name) {
    assert.ok(Object.hasOwn(modules, name), `Unexpected gallery dependency: ${name}`);
    return modules[name];
  } }, { filename: galleryPath, timeout: 1000 });
  assert.equal(typeof exports.default, "function");
  return props => { cursor = 0; return exports.default(props); };
}

function elements(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, type));
  if (!node || typeof node !== "object") return [];
  return [...(node.type === type ? [node] : []), ...elements(node.props?.children, type)];
}

function assertGalleryPlayback(source) {
  const videos = [
    { title: "First synthetic video", description: "", locale: "en", url: "https://www.youtube.com/watch?v=AbCdEfGhIj0" },
    { title: "Second synthetic video", description: "", locale: "ru", url: "https://www.youtube.com/watch?v=ZyXwVuTsRq9" },
  ];
  const render = galleryRuntime(source);
  // Locale sorting changes display order, so clicks must select the video's
  // source identity rather than assuming its position in the rendered list.
  const props = { videos, locale: "ru" };
  let tree = render(props);
  assert.equal(elements(tree, "article").length, videos.length);
  assert.equal(elements(tree, "iframe").length, 0, "No iframe may exist before Play");
  assert.equal(elements(tree, "button").length, videos.length);
  const cardFor = video => {
    const cards = elements(tree, "article").filter(card =>
      elements(card, "h3").some(heading => heading.props.children === video.title));
    assert.equal(cards.length, 1, `Exactly one card must identify ${video.title}`);
    return cards[0];
  };
  const assertOriginalLink = video => {
    const links = elements(cardFor(video), "a");
    assert.equal(links.length, 1, "Original watch URL must stay a secondary link");
    assert.equal(links[0].props.href, video.url);
    assert.equal(links[0].props.target, "_blank");
    assert.match(links[0].props.rel, /\bnoopener\b/);
    assert.match(links[0].props.rel, /\bnoreferrer\b/);
    assert.equal(elements(links[0], "button").length, 0, "Play must not navigate through the original link");
  };
  videos.forEach(assertOriginalLink);
  for (const video of videos) {
    const buttons = elements(cardFor(video), "button");
    assert.equal(buttons.length, 1, "Inactive video must expose one Play button");
    assert.equal(buttons[0].props.type, "button");
    assert.equal(typeof buttons[0].props.onClick, "function", "Poster button must handle click");
    buttons[0].props.onClick();
    tree = render(props);
    assert.equal(elements(tree, "iframe").length, 1, "Only the selected video may have an iframe after Play");
    const frames = elements(cardFor(video), "iframe");
    assert.equal(frames.length, 1, "Play must activate the clicked video, not a different video");
    const id = new URL(video.url).searchParams.get("v");
    assert.equal(frames[0].props.src, `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`);
    assert.equal(frames[0].props.title, video.title);
    assert.equal(frames[0].props.referrerPolicy, "strict-origin-when-cross-origin");
    assert.equal(elements(cardFor(video), "button").length, 0);
    for (const other of videos.filter(item => item !== video)) {
      assert.equal(elements(cardFor(other), "iframe").length, 0, "Other videos must remain posters");
      assert.equal(elements(cardFor(other), "button").length, 1);
    }
    videos.forEach(assertOriginalLink);
  }
}

function mutateGallery(source, select, replacement) {
  const parsed = ts.createSourceFile(galleryPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const matches = [];
  const visit = node => { if (select(node)) matches.push(node); ts.forEachChild(node, visit); };
  visit(parsed);
  assert.equal(matches.length, 1, "Mutation must select exactly one source node");
  const node = matches[0];
  const mutated = source.slice(0, node.getStart(parsed)) + replacement + source.slice(node.end);
  assert.equal(ts.createSourceFile(galleryPath, mutated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).parseDiagnostics.length, 0);
  return mutated;
}

test("public site video poster mounts exactly sourced YouTube iframe only after Play", () => {
  const source = read("components/site-video-player.tsx");
  assert.match(source, /const playbackYouTubeId = mirrorId \|\| video\.youtubeId/);
  assert.match(source, /https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(source, /autoplay: "1", playsinline: "1"/);
  assert.match(source, /\{playing \? \(\s*<iframe ref=\{playerRef\}/);
  assert.match(source, /data-video-playback=\{playbackYouTubeId \? "youtube" : "heygen"\}/);
  assert.match(source, /<button className="site-video-play"/);
  assert.doesNotMatch(source, /<a className="site-video-play"/);
  assert.match(source, /disabled=\{!interactive\}/);
  assert.match(source, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(source, /const mirrorLink = mirrorId \?/);
});

test("Academy lesson thumbnails start inline YouTube, external watch stays secondary", () => {
  const single = read("components/academy-video-player.tsx");
  const library = read("components/academy-video-library-client.tsx");
  assert.match(single, /onClick=\{\(\) => setPlaying\(true\)\}/);
  assert.match(single, /\{playing \? \(\s*<div className="academy-video-frame">\s*<iframe/);
  assert.match(single, /youtube-nocookie\.com\/embed/);
  assert.match(single, /autoplay=1&playsinline=1&rel=0/);
  assert.match(single, /className="academy-video-direct-link"/);
  assert.match(library, /onClick=\{\(\) => openVideoById\(key\)\}/);
  assert.match(library, /\{playing \? \(\s*<div className=\{styles\.player\}>/);
  assert.match(library, /youtube-nocookie\.com\/embed/);
  assert.match(library, /autoplay=1&playsinline=1&rel=0/);
  assert.match(library, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.doesNotMatch(library, /<a className=\{styles\.lessonToggle\}/);
});

test("public practitioner videos stay on-site and do not iframe before click", () => {
  const gallery = read(galleryPath);
  const presentation = read("components/practitioner-presentation-video.tsx");
  assertGalleryPlayback(gallery);
  assert.match(gallery, /youtube-nocookie\.com\/embed/);
  assert.match(gallery, /autoplay=1&playsinline=1&rel=0/);
  assert.doesNotMatch(gallery, /directYouTube|<a className=\{styles\.poster\}/);
  assert.match(presentation, /\{!playing\?<button/);
  assert.match(presentation, /isExternal\?<iframe/);
  assert.match(presentation, /youtube-nocookie\.com\/embed/);
  assert.match(presentation, /autoplay=1&playsinline=1&rel=0/);
  assert.match(presentation, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(presentation, /loading="eager"/);
  assert.doesNotMatch(presentation, /isExternal&&posterUrl\?<a/);
});

test("practitioner click-to-play contract is independent of TSX formatting", () => {
  const source = ts.createSourceFile(galleryPath, read(galleryPath), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assertGalleryPlayback(ts.createPrinter().printFile(source));
});

for (const mutation of [
  {
    name: "wrong video ID",
    select: node => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "setPlaying",
    replacement: 'setPlaying("not-a-video")',
    failure: /Only the selected video may have an iframe after Play/,
  },
  {
    name: "missing click handler",
    select: node => ts.isJsxAttribute(node) && node.name.text === "onClick",
    replacement: "",
    failure: /Poster button must handle click/,
  },
  {
    name: "iframe before Play",
    select: node => ts.isIdentifier(node) && node.text === "active" && ts.isConditionalExpression(node.parent) && node.parent.condition === node,
    replacement: "true",
    failure: /No iframe may exist before Play/,
  },
]) {
  test(`practitioner playback contract rejects ${mutation.name}`, () => {
    const mutated = mutateGallery(read(galleryPath), mutation.select, mutation.replacement);
    assert.throws(() => assertGalleryPlayback(mutated), { code: "ERR_ASSERTION", message: mutation.failure });
  });
}

test("admin identifies public HeyGen-only migration gaps without forcing private YouTube uploads", () => {
  const admin = read("components/site-video-manager.tsx");
  assert.match(admin, /missingYouTubeCount/);
  assert.match(admin, /data-youtube-migration="pending"/);
  assert.match(admin, /href="\/admin\/youtube-upload"/);
  assert.match(admin, /existingYouTubeMirrors/);
  const player = read("components/site-video-player.tsx");
  assert.match(player, /export const existingYouTubeMirrors/);
});
