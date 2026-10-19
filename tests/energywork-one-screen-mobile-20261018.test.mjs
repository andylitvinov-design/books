import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = () => readFile("components/principles-of-energywork.tsx", "utf8");
const css = () => readFile("components/principles-of-energywork.module.css", "utf8");
function assertCanonicalCourseTarget(page, targetSource) {
  const exports = {};
  const compiled = ts.transpileModule(targetSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, { exports, require: name => { throw new Error('Unexpected course target dependency: '+name); } });
  assert.equal(exports.REIKI_FREE_COURSE_PATH, '/en/academy/principles-of-energywork/learn');
  assert.match(page, /const learnPath = REIKI_FREE_COURSE_PATH/);
  assert.match(page, /import \{ REIKI_FREE_COURSE_PATH \} from "@\/lib\/academy\/reiki-free-course"/);
  for (const marker of ['data-energywork-interactive-course', 'data-energywork-final-online']) {
    assert.equal(page.split(marker).length-1, 1, marker);
    assert.match(page, new RegExp('href=\\{learnPath\\}[^>]+'+marker));
  }
}
function flightSection(page) {
  const id = 'id="energywork-flight-to-sun"';
  assert.equal(page.split(id).length - 1, 1, "one exact meditation section");
  const start = page.lastIndexOf("<section ", page.indexOf(id));
  const end = page.indexOf("</section>", start);
  assert.ok(start >= 0 && end > page.indexOf(id), "scope the flight section independently of surrounding sections");
  return page.slice(start, end + "</section>".length);
}

test("Energywork landing has one compact mobile concept per visible screen", async () => {
  const [page, styles] = await Promise.all([source(), css()]);
  for (const section of ["intro", "meditation", "foundations", "initiation"]) {
    assert.ok(page.includes('data-energywork-screen="' + section + '"'), section);
  }
  assert.match(page, /data-energywork-screen=\{system\.key\}/);
  assert.match(styles, /\.courseDeck > \.hero[\s\S]*?min-height: 0/);
  assert.match(styles, /\.courseDeck \.foundationCard\s*\{[\s\S]*?grid-template-columns: 36px minmax\(0, 1fr\)/);
  assert.match(styles, /\.courseDeck \.systemCard\s*\{[\s\S]*?flex-direction: column/);
  assert.match(styles, /@media \(max-width: 550px\)/);
  assert.doesNotMatch(styles, /\.courseDeck > section\s*\{[^}]*overflow: hidden/);
});

test("Flight to the Sun has one description, retains video, poster fallback and source link", async () => {
  const page = await source();
  const flight = flightSection(page);
  assert.match(flight, /<h2 id="flight-to-sun-title">\{v\.flightTitle\}<\/h2>/);
  assert.match(flight, /<AcademyVideoPlayer youtubeId=\{flight\.youtubeId\}/);
  assert.match(flight, /data-video-source-pending="flight-to-sun"/);
  assert.match(flight, /https:\/\/www\.youtube\.com\/watch\?v=/);
  assert.doesNotMatch(flight, /<h3>\{v\.flightTitle\}<\/h3>/);
  assert.equal((flight.match(/<p>\{v\.flightLead\}<\/p>/g) || []).length, 1, "one complete meditation description");
});

test("Each Reiki path keeps its initiation links, original videos and optional resources", async () => {
  const [page, styles] = await Promise.all([source(), css()]);
  assert.match(page, /href=\{academyUrl\(locale, system\.free\)\}/);
  assert.match(page, /href=\{academyUrl\(locale, system\.study\)\}/);
  assert.match(page, /<EnergyworkReikiCapture locale=\{locale\} course=\{system\.key\} \/>/);
  assert.match(page, /<EnergyworkVideoArchive locale=\{locale\} \/>/);
  assert.match(page, /<details className=\{styles\.captureDisclosure\}>/);
  assert.match(page, /<details className=\{styles\.extraVideoDisclosure\}>/);
  assert.match(page, /<details className=\{styles\.archiveDisclosure\}>/);
  assert.match(page, /youtubeId="DYo-fG-SyKw"/);
  assert.match(styles, /\.captureDisclosure > summary:focus-visible/);
  assert.match(page, /locale === "ru"[\s\S]*?locale === "es"/);
  assert.match(page, /const learnPath = REIKI_FREE_COURSE_PATH/);
  assert.match(page, /import \{ REIKI_FREE_COURSE_PATH \} from "@\/lib\/academy\/reiki-free-course"/);
  assert.match(page, /href=\{learnPath\}[^>]+data-energywork-interactive-course/);
  assert.match(page, /href=\{learnPath\}[^>]+data-energywork-final-online/);
});

test('both course CTAs execute the approved shared EN target and reject wrong routes or bindings', async () => {
  const page = await source();
  const target = await readFile('lib/academy/reiki-free-course.ts','utf8');
  assertCanonicalCourseTarget(page,target);
  for (const route of ['/ru/academy/principles-of-energywork/learn','/en/academy/reiki/tantra-reiki/free-initiation','/en/app/course','/en/academy/principles-of-energywork/learn?start=1']) {
    assert.throws(()=>assertCanonicalCourseTarget(page,target.replace('/en/academy/principles-of-energywork/learn',route)));
  }
  assert.throws(()=>assertCanonicalCourseTarget(page.replace('const learnPath = REIKI_FREE_COURSE_PATH','const learnPath = "/wrong"'),target));
  for (const marker of ['data-energywork-interactive-course','data-energywork-final-online']) {
    assert.throws(()=>assertCanonicalCourseTarget(page.replace(marker,''),target));
    assert.throws(()=>assertCanonicalCourseTarget(page.replace(marker,marker+' '+marker),target));
  }
});


test("actual Flight section renders its verified video or honest poster fallback without a fabricated source link", async () => {
  const jsx = (type, props) => ({ type, props: props || {} });
  const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
  const section = flightSection(await source());
  const output = ts.transpileModule("export function render() { return (" + section + "); }", {
    fileName: "flight.tsx", compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const flight of [{ youtubeId: "HqfixazXqRY", title: "Verified Flight" }, { image: "/approved-poster.webp" }, undefined]) {
    const exports = {};
    runInNewContext(output, {
      exports, flight, styles: {}, AcademyVideoPlayer: "video-player", Image: "image", ArrowRight: "arrow",
      v: { flightTitle: "Flight title", flightLead: "One description", flightPending: "Source pending", youtubeLink: "Source" },
      require: name => { assert.equal(name, "react/jsx-runtime"); return { jsx, jsxs: jsx }; },
    });
    const rendered = nodes(exports.render());
    assert.equal(rendered.filter(node => node.type === "h2" && node.props.id === "flight-to-sun-title").length, 1);
    assert.equal(rendered.filter(node => node.type === "p" && node.props.children === "One description").length, 1);
    const players = rendered.filter(node => node.type === "video-player");
    const posters = rendered.filter(node => node.type === "image");
    const pending = rendered.filter(node => node.props["data-video-source-pending"] === "flight-to-sun");
    const links = rendered.filter(node => node.type === "a" && node.props.href.startsWith("https://"));
    if (flight?.youtubeId) {
      assert.equal(players.length, 1); assert.equal(players[0].props.youtubeId, "HqfixazXqRY");
      assert.equal(players[0].props.title, flight.title); assert.equal(posters.length, 0); assert.equal(pending.length, 0);
      assert.equal(links.length, 1); assert.equal(links[0].props.href, "https://www.youtube.com/watch?v=HqfixazXqRY");
      assert.equal(links[0].props.target, "_blank"); assert.equal(links[0].props.rel, "noopener noreferrer");
    } else {
      assert.equal(players.length, 0); assert.equal(links.length, 0); assert.equal(pending.length, 1); assert.equal(posters.length, 1);
      assert.equal(posters[0].props.src, flight?.image ?? "/academy/reiki-yggdrasil/source/toltec-tradition.jpg");
    }
  }
});
