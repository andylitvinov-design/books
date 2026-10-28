import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";

// Owner retained Business Constellations on 2026-10-28. Exercise only its
// Business landing -> shared showcase -> registry -> player composition.
// No browser, network, CSS contents, forms, providers or client records.
export function assertBusinessConstellationVideo(read) {
  const jsx = (type, props) => ({ type, props: props || {} });
  const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree)
    ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const style = { default: new Proxy({}, { get: (_, key) => String(key) }) };
  // Inspect rating props only; never load its hook, fetch or voting implementation.
  const PublicVideoStarRating = Symbol("PublicVideoStarRating boundary");
  let hooks;
  const react = {
    useState(initial) {
      const index = hooks.index++;
      if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
      return [hooks.values[index], value => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }];
    },
    useRef(initial) {
      const index = hooks.index++;
      return hooks.values[index] ??= { current: initial };
    },
    useId() { const index = hooks.index++; return hooks.values[index] ??= "business-video-title"; },
    useEffect(effect, dependencies) {
      const index = hooks.index++;
      const previous = hooks.values[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) hooks.effects.push(effect);
      hooks.values[index] = dependencies;
    },
  };
  const stubs = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/image": { default: "Image" },
    "next/link": { default: "Link" },
    "lucide-react": new Proxy({}, { get: (_, key) => String(key) }),
    "@/components/static-portrait": { StaticPortrait: "StaticPortrait" },
    "@/components/acquisition-event-link": { AcquisitionEventLink: "AcquisitionEventLink" },
    "@/components/contact-channel-chooser": { ContactChannelChooser: "ContactChannelChooser" },
    "@/components/public-site-header": { PublicSiteHeader: "PublicSiteHeader" },
    "@/components/business-website-enquiry": { BusinessWebsiteEnquiry: "BusinessWebsiteEnquiry" },
    "@/components/public-video-star-rating": { PublicVideoStarRating },
    "@/lib/whatsapp-enquiry": { whatsappEnquiryUrl: () => "https://example.invalid/inert-enquiry" },
    "./business-consulting-landing.module.css": style,
    "./service-video-showcase.module.css": style,
    "./site-video-minimal.module.css": style,
  };
  const paths = {
    "@/components/business-consulting-landing": "components/business-consulting-landing.tsx",
    "@/components/service-video-showcase": "components/service-video-showcase.tsx",
    "@/components/site-video-player": "components/site-video-player.tsx",
    "@/data/business-consulting-copy": "data/business-consulting-copy.ts",
    "@/data/service-video-library": "data/service-video-library.ts",
    "@/lib/site-videos/model": "lib/site-videos/model.js",
  };
  // One realm preserves the real model's plain-object source validation.
  const context = vm.createContext({ URL, URLSearchParams });
  const cache = new Map();
  function load(name) {
    if (Object.hasOwn(stubs, name)) return stubs[name];
    assert.ok(Object.hasOwn(paths, name), "Unexpected dependency: " + name);
    if (cache.has(name)) return cache.get(name).exports;
    const loadedModule = { exports: {} };
    cache.set(name, loadedModule);
    const path = paths[name];
    const compiled = ts.transpileModule(read(path), {
      fileName: path,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInContext("(function(require, module, exports) {\n" + compiled + "\n})", context, { filename: path })(load, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const { BusinessConsultingLanding } = load("@/components/business-consulting-landing");
  const { ServiceVideoShowcase } = load("@/components/service-video-showcase");
  const { SiteVideoPlayer } = load("@/components/site-video-player");
  const { getServiceVideoMedia } = load("@/data/service-video-library");
  const { businessConsultingCopy } = load("@/data/business-consulting-copy");
  const approved = getServiceVideoMedia("constellation-case", "en");
  assert.deepEqual(JSON.parse(JSON.stringify(approved)), {
    video: { youtubeId: "sfVFOQNr2qk", language: "en", title: "Business Constellations" },
    poster: "/images/holistic-house/andy-about.png", general: false,
  }, "Retain the exact approved public recording, not an unrelated/private source");
  for (const locale of ["en", "ru", "es"]) {
    assert.equal(getServiceVideoMedia("constellation-case", locale), approved, "Reuse one approved source for every locale");
    const landing = BusinessConsultingLanding({ locale });
    assert.equal(landing.props.lang, locale);
    const content = nodes(landing);
    assert.equal(content.filter(node => node.type === "iframe" || node.type === "video" || node.type === SiteVideoPlayer).length, 0,
      "No extra Business player may bypass the shared click-to-load showcase");
    const placements = content.filter(node => node.type === ServiceVideoShowcase);
    assert.equal(placements.length, 1, "Business retains exactly one approved showcase");
    assert.deepEqual(placements.map(node => ({ ...node.props })), [{
      topic: "constellation-case", locale, id: "business-constellation-video",
    }]);
    assert.equal(content.find(node => node.props.id === "business-hero-title").props.children, businessConsultingCopy[locale].headline);
    const freeCtas = content.filter(node => node.props.attributes?.["data-business-cta"]);
    assert.equal(freeCtas.length, 2);
    assert.ok(freeCtas.every(node => node.props.href === `/${locale}/services/free-situation-review?topic=business`));
    assert.ok(content.some(node => node.props.href === "#business-offers"));
    assert.ok(content.some(node => node.props.href === "#business-direct-request"));

    const showcase = ServiceVideoShowcase(placements[0].props);
    assert.equal(showcase.props.lang, locale);
    assert.equal(showcase.props["data-service-video"], "constellation-case");
    assert.equal(showcase.props["aria-labelledby"], "business-constellation-video-title");
    assert.equal(nodes(showcase).filter(node => node.type === "iframe" || node.type === "video").length, 0,
      "The showcase must delegate playback to the guarded shared player");
    const playerNodes = nodes(showcase).filter(node => node.type === SiteVideoPlayer);
    assert.equal(playerNodes.length, 1);
    const playerProps = playerNodes[0].props;
    assert.equal(playerProps.video, approved.video);
    assert.equal(playerProps.locale, locale);
    assert.equal(playerProps.textLanguage, "en", "Translated UI must not invent translated audio");
    assert.equal(playerProps.fallbackPoster, approved.poster);
    const ratingNodes = nodes(showcase).filter(node => node.type === PublicVideoStarRating);
    assert.equal(ratingNodes.length, 1, "One inert rating boundary accompanies the approved recording");
    assert.equal(ratingNodes[0].props.video, approved.video, "Rating must receive the same approved video object");
    assert.equal(ratingNodes[0].props.locale, locale, "Rating must retain the current interface locale");

    hooks = { index: 0, values: [], effects: [] };
    const playable = SiteVideoPlayer(playerProps);
    assert.ok(playable && typeof playable.type === "function", "Real source validator must accept the approved recording");
    const render = () => { hooks.index = 0; hooks.effects = []; return playable.type(playable.props); };
    const first = render();
    assert.equal(nodes(first).filter(node => node.type === "iframe" || node.type === "video").length, 0,
      "No player or autoplay before the visitor acts");
    for (const effect of hooks.effects) effect();
    const hydrated = render();
    assert.equal(nodes(hydrated).filter(node => node.type === "iframe" || node.type === "video").length, 0,
      "Hydration alone must not start playback");
    const fallback = nodes(hydrated).find(node => node.type === "a" && node.props.href === "https://www.youtube.com/watch?v=sfVFOQNr2qk");
    assert.ok(fallback, "The original public source remains available when embedding is blocked");
    assert.equal(fallback.props.target, "_blank");
    assert.equal(fallback.props.rel, "noopener noreferrer");
    assert.match(fallback.props["aria-label"], /Business Constellations/);
    const play = nodes(hydrated).find(node => node.type === "button" && node.props.className === "site-video-play");
    assert.ok(play && play.props.disabled === false && play.props.type === "button");
    assert.match(play.props["aria-label"], /Business Constellations/);
    play.props.onClick(); // Synthetic user action: inspect the tree, never load the URL.
    const frames = nodes(render()).filter(node => node.type === "iframe");
    assert.equal(frames.length, 1);
    const frame = frames[0];
    const url = new URL(frame.props.src);
    assert.equal(url.origin, "https://www.youtube-nocookie.com");
    assert.equal(url.pathname, "/embed/sfVFOQNr2qk");
    assert.deepEqual(Object.fromEntries(url.searchParams), { autoplay: "1", playsinline: "1", rel: "0", hl: locale, cc_lang_pref: "en" });
    assert.equal(url.hash, "");
    assert.equal(frame.props.title, "Business Constellations");
    assert.equal(frame.props.referrerPolicy, "strict-origin-when-cross-origin");
  }
}
