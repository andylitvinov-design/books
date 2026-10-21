import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

function assertServicesAndyUsesStaticPortrait(sourceText) {
  const file = ts.createSourceFile("services-conversion-hero.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const descendants = root => {
    const result = [];
    const visit = node => { result.push(node); ts.forEachChild(node, visit); };
    visit(root);
    return result;
  };
  const unwrap = node => ts.isAsExpression(node) || ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
  const all = descendants(file);
  const imports = file.statements.filter(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === "@/components/static-portrait");
  assert.equal(imports.length, 1, "actual static portrait module is imported");
  const names = imports[0].importClause?.namedBindings;
  assert.ok(names && ts.isNamedImports(names) && names.elements.some(node => node.name.text === "StaticPortrait" && !node.propertyName), "actual StaticPortrait named import");
  const definitions = all.filter(node => ts.isVariableDeclaration(node) && node.name.getText(file) === "slides");
  assert.equal(definitions.length, 1, "one actual Services slide list");
  const slides = unwrap(definitions[0].initializer);
  assert.ok(ts.isArrayLiteralExpression(slides), "Services slides are a fixed array");
  const property = (node, name) => node.properties.filter(item => ts.isPropertyAssignment(item) && item.name.getText(file) === name);
  const business = slides.elements.filter(node => ts.isObjectLiteralExpression(node) && property(node, "kind").some(item => ts.isStringLiteral(item.initializer) && item.initializer.text === "business"));
  assert.equal(business.length, 1, "one actual business slide");
  const image = property(business[0], "image");
  assert.equal(image.length, 1, "one business portrait asset");
  assert.ok(ts.isStringLiteral(image[0].initializer), "fixed business portrait literal");
  assert.equal(image[0].initializer.text, "/images/holistic-house/andy-about.png", "business slide uses the verified Andy asset");
  const components = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === "ServicesConversionHero");
  assert.equal(components.length, 1, "one actual Services hero");
  const bindings = descendants(components[0].body).filter(node => ts.isVariableDeclaration(node) && node.name.getText(file) === "slide");
  assert.equal(bindings.length, 1, "one current slide binding");
  assert.equal(bindings[0].initializer.getText(file), "slides[index]", "render follows the actual selected slide");
  const returns = components[0].body.statements.filter(ts.isReturnStatement);
  assert.equal(returns.length, 1, "one Services hero render");
  const portraitBranches = descendants(returns[0].expression).filter(node => ts.isConditionalExpression(node) && ts.isBinaryExpression(node.condition) && node.condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && node.condition.left.getText(file) === "slide.image" && ts.isStringLiteral(node.condition.right) && node.condition.right.text === "/images/holistic-house/andy-about.png");
  assert.equal(portraitBranches.length, 1, "one exact Andy asset branch");
  const portrait = unwrap(portraitBranches[0].whenTrue);
  assert.ok(ts.isJsxSelfClosingElement(portrait) && portrait.tagName.getText(file) === "StaticPortrait", "Andy branch renders StaticPortrait, not optimized Image");
  assert.ok(portrait.attributes.properties.every(ts.isJsxAttribute), "portrait attributes cannot be overridden by spreads");
  const src = portrait.attributes.properties.filter(node => node.name.getText(file) === "src");
  assert.equal(src.length, 1, "one portrait src binding");
  assert.ok(ts.isJsxExpression(src[0].initializer), "portrait src is source-bound");
  assert.equal(src[0].initializer.expression?.getText(file), "slide.image", "StaticPortrait receives the selected exact asset");
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
  ];
  for (const fault of faults) {
    assertServicesAndyUsesStaticPortrait(hero);
    assert.notEqual(fault.source, hero, "mutation applies to actual hero source");
    assert.throws(() => assertServicesAndyUsesStaticPortrait(fault.source), fault.reason);
  }
});
