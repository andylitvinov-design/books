import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("mobile Support tools are wrapped compact filter-style navigation links", () => {
  const css = read("components/services-assist-mobile.module.css");
  assert.match(css, /\.assist \.tools \.toolGrid\{display:flex;flex-wrap:wrap;/);
  assert.match(css, /\.assist \.tools \.tool\{display:inline-flex;[^}]*min-height:44px;[^}]*border-radius:999px;/);
  assert.match(css, /\.assist \.tools \.tool>span,\.assist \.tools \.tool small\{display:none\}/);
  assert.match(css, /\.assist \.tools \.tool strong\{[^}]*font-size:12\.5px;/);
  assert.match(css, /\.assist :is\(button,a,textarea\):focus-visible\{/);
});

test("all Support tools keep their original real localized category routes", () => {
  const source = read("components/services-assist-mobile.tsx");
  for (const id of ["therapy", "homeopathy", "reiki", "mandala", "talisman", "constellation", "academy", "masters"]) {
    assert.match(source, new RegExp("\\b" + id + ":\\s*\""), id + " mapped route");
  }
  assert.match(source, /data-assist-tool=\{key\}/);
  assert.match(source, /href=\{"\/"\+locale\+"\/"\+routes\[key\]\}/);
  assert.match(source, /toolList(?:\.slice\([^)]*\))?\.map\(\(key\)=>/);
});
