import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("all approved repeated teacher portraits load pre-encoded responsive WebP, not 2MB PNG transforms", () => {
  const paths = [
    "app/[locale]/about/page.tsx", "app/es/about/page.tsx",
    "components/tantra-free-initiation.tsx", "components/tantra-reiki-story.tsx",
  ];
  for(const path of paths) {
    const code = read(path);
    assert.match(code, /import \{ StaticPortrait \} from "@\/components\/static-portrait"/);
    assert.match(code, /<StaticPortrait\b/);
    assert.match(code, /src="\/images\/holistic-house\/andy-about\.png"/);
    assert.doesNotMatch(code, /import Image from ["']next\/image["']/);
  }
  assert.match(read("components/static-portrait.tsx"), /unoptimized: true/);
  assert.match(read("components/static-portrait.tsx"), /srcSet=\{srcSet\}/);
});

test("small original Yggdrasil JPG images are served directly without paid runtime transformations", () => {
  const records = [
    ["components/yggdrasil-basic-course-description.tsx","basic-program.jpg"],
    ["components/yggdrasil-free-initiation.tsx","school-introduction.jpg"],
  ];
  for(const [component,image] of records) {
    assert.match(read(component), new RegExp('<Image unoptimized src="/academy/reiki-yggdrasil/source/' + image.replace('.','\\.') + '"'));
    const bytes=statSync(new URL("../public/academy/reiki-yggdrasil/source/"+image, import.meta.url)).size;
    assert.ok(bytes > 30000 && bytes < 200000, image+" is safe as a directly served static asset");
  }
});

test("books retain explicit transformations until source-cover sizes can be proven safe", () => {
  const config = read("next.config.ts");
  assert.doesNotMatch(config, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(read("components/book-catalog.tsx"), /<Image/);
});
