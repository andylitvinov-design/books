import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

// This intentionally recognizes only the current source contract, not general
// TSX. The lightweight public-performance job has no installed dependencies.
// Strings/comments are atomic; templates, regexes and ambiguous slash syntax
// fail closed instead of letting an unused source-looking decoy satisfy a guard.
function portraitSourceTokens(source) {
  const tokens = [];
  for (let i = 0; i < source.length;) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    if (source.startsWith("//", i)) { const end = source.indexOf("\n", i); i = end < 0 ? source.length : end + 1; continue; }
    if (source.startsWith("/*", i)) { const end = source.indexOf("*/", i + 2); assert.ok(end >= 0, "closed source comment"); i = end + 2; continue; }
    if (c === '"' || c === "'") {
      const quote = c; let value = ""; i++;
      for (; i < source.length && source[i] !== quote; i++) {
        assert.ok(!/[\r\n]/.test(source[i]), "single-line literal string");
        if (source[i] === "\\") { value += source[i++]; assert.ok(i < source.length, "closed string escape"); }
        value += source[i];
      }
      assert.equal(source[i], quote, "closed source string"); i++;
      tokens.push("string:" + value); continue;
    }
    assert.notEqual(c, "`", "template syntax is outside this narrow portrait grammar");
    if (c === "/") assert.ok(tokens.at(-1) === "<" || source[i + 1] === ">", "regex/division syntax is outside this narrow portrait grammar");
    const word = source.slice(i).match(/^[A-Za-z_$][\w$]*/)?.[0];
    const operator = ["===", "!==", "...", "=>", "&&", "||", "?."].find(value => source.startsWith(value, i));
    const token = word || operator || c;
    tokens.push(token); i += token.length;
  }
  return tokens;
}

function portraitScope(tokens) {
  const pairs = new Map(), stack = [], close = { "(": ")", "[": "]", "{": "}" };
  for (let i = 0; i < tokens.length; i++) {
    if (close[tokens[i]]) stack.push(i);
    else if ([")", "]", "}"].includes(tokens[i])) {
      const open = stack.pop();
      assert.equal(close[tokens[open]], tokens[i], "balanced portrait source scope");
      pairs.set(open, i);
    }
  }
  assert.equal(stack.length, 0, "closed portrait source scopes");
  const matches = (at, pattern) => pattern.every((token, offset) => tokens[at + offset] === token);
  const find = (pattern, nested = false) => {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      if (matches(i, pattern)) result.push(i);
      if (!nested && pairs.has(i)) i = pairs.get(i);
    }
    return result;
  };
  const one = (pattern, reason, nested = false) => { const found = find(pattern, nested); assert.equal(found.length, 1, reason); return found[0]; };
  const group = at => { assert.ok(pairs.has(at), "expected balanced source group"); return tokens.slice(at + 1, pairs.get(at)); };
  return { pairs, matches, find, one, group };
}

function assertServicesAndyUsesStaticPortrait(sourceText) {
  const tokens = portraitSourceTokens(sourceText), source = portraitScope(tokens);
  const asset = "string:/images/holistic-house/andy-about.png";
  const modulePath = "string:@/components/static-portrait";
  const imports = source.find(["import"]);
  const portraitImports = imports.filter(at => tokens[source.pairs.get(at + 1) + 2] === modulePath);
  assert.equal(portraitImports.length, 1, "actual static portrait module is imported");
  const imported = portraitImports[0];
  assert.ok(source.matches(imported, ["import", "{", "StaticPortrait", "}", "from", modulePath, ";"]), "actual StaticPortrait named import");
  const declaration = source.one(["const", "slides"], "one actual Services slide list");
  let assignment = declaration + 2;
  while (assignment < tokens.length && tokens[assignment] !== "=" && tokens[assignment] !== ";") assignment = (source.pairs.get(assignment) ?? assignment) + 1;
  assert.ok(source.matches(assignment, ["=", "["]), "Services slides are a fixed array");
  const slides = source.group(assignment + 1), list = portraitScope(slides);
  assert.equal(tokens[source.pairs.get(assignment + 1) + 1], ";", "fixed Services slide initializer ends here");
  const business = [];
  for (let i = 0; i < slides.length; i++) {
    if (slides[i] === ",") continue;
    assert.equal(slides[i], "{", "Services slide is a literal object");
    const object = list.group(i), fields = portraitScope(object);
    const kind = fields.one(["kind", ":"], "one literal slide kind");
    if (object[kind + 2] === "string:business") business.push(object);
    i = list.pairs.get(i);
  }
  assert.equal(business.length, 1, "one actual business slide");
  assert.ok(!business[0].includes("..."), "business asset cannot be overridden by a spread");
  const businessKeys = [];
  for (let i = 0; i < business[0].length;) {
    const [key, colon, value, separator] = business[0].slice(i, i + 4);
    assert.ok(["kind", "image", "position"].includes(key) && colon === ":" && value?.startsWith("string:") && [",", undefined].includes(separator), "business fields are fixed literals, without computed overrides");
    businessKeys.push(key); i += separator === "," ? 4 : 3;
  }
  assert.deepEqual(businessKeys.sort(), ["image", "kind", "position"], "business literal fields are unique");
  const image = portraitScope(business[0]).one(["image", ":"], "one business portrait asset");
  assert.equal(business[0][image + 2], asset, "business slide uses the verified Andy asset");
  assert.ok([",", undefined].includes(business[0][image + 3]), "fixed business portrait literal");
  const component = source.one(["export", "function", "ServicesConversionHero", "("], "one actual Services hero export");
  const bodyStart = source.pairs.get(component + 3) + 1;
  assert.equal(tokens[bodyStart], "{", "hero has an explicit source body");
  const body = source.group(bodyStart), scope = portraitScope(body);
  const binding = scope.one(["const", "slide", "="], "one current slide binding");
  assert.ok(scope.matches(binding, ["const", "slide", "=", "slides", "[", "index", "]", ";"]), "render follows the actual selected slide");
  const returns = scope.one(["return"], "one Services hero render");
  assert.equal(body[returns + 1], "(", "explicit hero render group");
  const rendered = scope.group(returns + 1), render = portraitScope(rendered);
  assert.ok(render.matches(0, ["<", "section"]), "actual hero returns the Services section");
  const branch = render.one(["{", "slide", ".", "image", "===", asset, "?", "("], "one exact Andy asset branch", true);
  const mediaStarts = render.find(["<", "div"], true).filter(at => at < branch);
  const mediaStart = mediaStarts.at(-1);
  assert.ok(mediaStart !== undefined && rendered[branch - 1] === ">", "portrait is the direct media render child");
  const mediaTag = rendered.slice(mediaStart + 2, branch - 1), media = portraitScope(mediaTag);
  const mediaClass = media.one(["className", "="], "one actual media class binding");
  assert.ok(media.matches(mediaClass, ["className", "=", "{", "styles", ".", "slideMedia", "}"]), "portrait belongs to the actual slide media");
  assert.ok(render.matches(render.pairs.get(branch) + 1, ["<", "/", "div", ">"]), "portrait condition ends inside its media div");
  const portrait = render.group(branch + 7), props = portraitScope(portrait);
  assert.ok(props.matches(0, ["<", "StaticPortrait"]), "Andy branch renders StaticPortrait, not optimized Image");
  assert.deepEqual(portrait.slice(-2), ["/", ">"], "Andy branch is one self-closing portrait");
  assert.equal(props.find(["<"], true).length, 1, "one portrait element without unused JSX decoys");
  assert.ok(!portrait.includes("..."), "portrait attributes cannot be overridden by spreads");
  const src = props.one(["src", "="], "one portrait src binding");
  assert.ok(props.matches(src, ["src", "=", "{", "slide", ".", "image", "}"]), "StaticPortrait receives the selected exact asset");
  assert.ok(render.matches(render.pairs.get(branch + 7) + 1, [":", "("]), "portrait is the true conditional render arm");
}

test("YouTube video stills bypass Vercel image transforms but keep the source fallback chain", () => {
  const player = read("components/site-video-player.tsx");
  assert.match(player, /src=\{\x60https:\/\/i\.ytimg\.com\/vi\//);
  assert.match(player, /<Image key=\{poster\}[^>]*\bunoptimized\b/);
  assert.match(player, /current === "maxres" \? "hq" : current === "hq" \? "direct" : null/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(player, /onError=\{showFallbackPoster\}/);
});

test("Andy portrait uses already-built responsive static variants on all audited placements", () => {
  const player = read("components/site-video-player.tsx");
  const home = read("components/holistic-house-home.tsx");
  const serviceHero = read("components/services-conversion-hero.tsx");
  const serviceCards = read("components/services-studio-offers.tsx");
  const portrait = read("components/static-portrait.tsx");
  assert.match(player, /<StaticPortrait className="site-video-poster" src="\/images\/holistic-house\/andy-about\.png"/);
  assert.equal((home.match(/<StaticPortrait\b/g) || []).length, 2);
  assertServicesAndyUsesStaticPortrait(serviceHero);
  assert.match(serviceCards, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(read("app/[locale]/services/free-situation-review/page.tsx"), /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  assert.match(portrait, /unoptimized: true/);
  assert.match(portrait, /srcSet=\{srcSet\}/);
});

test("service cards reuse the verified responsive Andy portrait instead of a 2MB PNG transform", () => {
  const services = read("components/services-solutions.tsx");
  assert.match(services, /import \{ StaticPortrait \} from "@\/components\/static-portrait"/);
  assert.match(services, /\(isHome \? homepageMedia\[offer\.id\] : offer\.image\) === "\/images\/holistic-house\/andy-about\.png"/);
  assert.match(services, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png" alt="" fill/);
  const portrait = JSON.parse(read("data/static-portrait.json"));
  assert.ok(portrait.sourceBytes > 2000000);
  assert.ok(portrait.variants.some(variant => variant.width === 828 && variant.bytes < 160000));
});

test("public Services studio only bypasses transforms for small verified owned images", () => {
  const studio = read("components/services-studio-offers.tsx");
  const images = [
    "/images/holistic-house/course-start-heron.webp",
    "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "/images/holistic-house/video-posters/constellations-en-v1.webp",
    "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    "/academy/reiki-yggdrasil/source/basic-program.jpg",
  ];
  for (const src of images) {
    assert.ok(studio.includes('"' + src + '"'), src);
    const bytes = statSync(new URL("../public" + src, import.meta.url)).size;
    assert.ok(bytes > 1000 && bytes <= 104000, src + " must be small enough for direct delivery");
  }
  assert.match(studio, /unoptimized=\{directStaticServiceImages\.has\(offer\.image\)\}/);
  assert.match(studio, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.doesNotMatch(studio, /\bimages:\s*\{\s*unoptimized:\s*true/);
});

test("the image optimizer remains available for the book images that benefit from resizing", () => {
  const config = read("next.config.ts");
  const book = read("components/book-catalog.tsx");
  assert.doesNotMatch(config, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(book, /bookCoverArtworkUrl\(book\.id, "\/media\/" \+ book\.mediaSeries/);
  assert.match(book, /unoptimized=\{hasBookCoverArtwork\(book\.id\)\}/);
  assert.match(config, /minimumCacheTTL: 2678400/);
});


test("Services portrait contract rejects wrong slide assets, branches and source bindings", () => {
  const hero = read("components/services-conversion-hero.tsx");
  const faults = [
    { source: hero.replace('kind: "business", image: "/images/holistic-house/andy-about.png"', 'kind: "business", image: "/images/holistic-house/other.png"'), reason: /business slide uses the verified Andy asset/ },
    { source: hero.replace('<StaticPortrait src={slide.image}', '<Image src={slide.image}'), reason: /Andy branch renders StaticPortrait/ },
    { source: hero.replace('<StaticPortrait src={slide.image}', '<StaticPortrait src={"/images/holistic-house/other.png"}'), reason: /StaticPortrait receives the selected exact asset/ },
    { source: hero.replace('slide.image === "/images/holistic-house/andy-about.png"', 'slide.image !== "/images/holistic-house/andy-about.png"'), reason: /one exact Andy asset branch/ },
    { source: hero.replace('const slide = slides[index]', 'const slide = slides[0]'), reason: /render follows the actual selected slide/ },
    { source: hero.replace('export function ServicesConversionHero', 'function ServicesConversionHero'), reason: /one actual Services hero export/ },
    { source: hero.replace('<StaticPortrait src={slide.image}', '<StaticPortrait {...override} src={slide.image}'), reason: /portrait attributes cannot be overridden by spreads/ },
    { source: hero.replace('kind: "business", image:', '...override, kind: "business", image:'), reason: /business asset cannot be overridden by a spread/ },
    { source: hero.replace('<StaticPortrait src={slide.image}', '<StaticPortrait src={slide.image} src={other}'), reason: /one portrait src binding/ },
    { source: hero.replace('<StaticPortrait src={slide.image}', '<Image src={slide.image}') + '\n/* <StaticPortrait src={slide.image} /> */\nconst decoy = "<StaticPortrait src={slide.image} />";', reason: /Andy branch renders StaticPortrait/ },
    { source: hero.replace('<StaticPortrait src={slide.image}', '<Image src={slide.image}') + '\nfunction unused() { return (slide.image === "/images/holistic-house/andy-about.png" ? (<StaticPortrait src={slide.image} />) : null); }', reason: /Andy branch renders StaticPortrait/ },
    { source: hero + '\nconst decoy = `<StaticPortrait src={slide.image} />`;', reason: /template syntax is outside this narrow portrait grammar/ },
    { source: hero + '\nconst decoy = /<StaticPortrait/;', reason: /regex\/division syntax is outside this narrow portrait grammar/ },
    { source: hero.replace('kind: "business", image:', '[override]: "wrong", kind: "business", image:'), reason: /business fields are fixed literals, without computed overrides/ },
    { source: hero.replace('className={styles.slideMedia}', 'className={styles.unusedMedia}'), reason: /portrait belongs to the actual slide media/ },

  ];
  assertServicesAndyUsesStaticPortrait(hero + '\n/* { malformed JSX <StaticPortrait /> is only a comment */\nconst commentLikeString = "// not a comment; { not a scope";');
  for (const fault of faults) {
    assertServicesAndyUsesStaticPortrait(hero);
    assert.notEqual(fault.source, hero, "mutation applies to actual hero source");
    assert.throws(() => assertServicesAndyUsesStaticPortrait(fault.source), fault.reason);
  }
});
