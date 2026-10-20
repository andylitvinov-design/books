import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(join(root, path), 'utf8');

const opora = source('components/app/course-slide-player.jsx');
const oporaCss = source('components/app/course-slide-player.module.css');
const map = source('components/app/course-quest.jsx');
const mapCss = source('components/app/course-quest.module.css');
const academy = source('components/energywork-ai-learner.tsx');
const academyCss = source('components/energywork-ai-learner.module.css');

test('OPORA: one-screen lesson uses a compact progress bar and real choice handling', () => {
  assert.match(opora, /data-course-one-screen="v1"/);
  assert.match(opora, /role="progressbar"/);
  assert.match(opora, /style=\{\{width:progress \+ '%'\}\}/);
  assert.match(opora, /onClick=\{\(\)=>void updatePreferences\(\{length:'quick'\}\)\}/);
  assert.match(opora, /onClick=\{\(\)=>void updatePreferences\(\{length:'standard'\}\)\}/);
  assert.match(opora, /onClick=\{\(\)=>void updatePreferences\(\{imagery:'no_imagery'\}\)\}/);
  assert.match(opora, /data-course-optional-explanation/);
  assert.match(opora, /<details className=\{styles\.supportDetails\}/);
  assert.match(opora, /lesson\.antiStress\?\.neutralText\|\|lesson\.disclaimer/);
  assert.match(opora, /onClick=\{finished/);
  assert.match(oporaCss, /HH ONE SCREEN COURSE 2026-10-17/);
  assert.match(oporaCss, /\.overlay\[data-course-one-screen\] \.footer/);
  assert.match(oporaCss, /\.overlay\[data-course-one-screen\] \.primary \{order:1;\}/);
});

test('OPORA: small screens prioritize first screen while preserving accessibility fallback', () => {
  assert.match(oporaCss, /@media\(max-width:700px\)/);
  assert.match(oporaCss, /@media\(max-width:700px\) and \(max-height:740px\)/);
  assert.match(oporaCss, /height:clamp\(110px,23dvh,177px\)/);
  assert.match(oporaCss, /object-fit:contain/);
  assert.match(oporaCss, /overflow-y:auto;overflow-x:hidden/);
  assert.match(opora, /words\.safety/);
  assert.match(opora, /onDiscomfort=/);
  assert.match(opora, /onStopPractice=/);
  assert.doesNotMatch(oporaCss.slice(oporaCss.indexOf('HH ONE SCREEN COURSE 2026-10-17')), /\.content\{overflow:hidden/);
});

test('OPORA learning path: five nearby steps and a manual 14-day reveal without progress rewrites', () => {
  assert.match(map, /const \[showAllDays, setShowAllDays\] = useState\(false\)/);
  assert.match(map, /const visibleRoadmap = showAllDays \? roadmap : roadmap\.filter/);
  assert.match(map, /item\.day < firstVisibleDay \+ 5/);
  assert.match(map, /\{visibleRoadmap\.map/);
  assert.match(map, /aria-expanded=\{showAllDays\}/);
  assert.match(map, /View all 14 lessons/);
  assert.match(map, /onClick=\{\(\) => \{ setShowAllDays\(value => !value\); setSelected\(null\) \}\}/);
  assert.match(map, /const xp = 20 \* count/);
  assert.match(mapCss, /\.mapShell \.pathToggle/);
});

test('Academy: bottom save status retains guest, consent and authenticated persistence', () => {
  assert.match(academy, /data-course-one-screen="v1"/);
  assert.match(academy, /data-energywork-slide-kind=\{slide\.kind\}/);
  assert.match(academy, /<details className=\{styles\.saveDetails\}>/);
  assert.match(academy, /sync === "guest"/);
  assert.match(academy, /sync === "consent"/);
  assert.match(academy, /sync === "ready"/);
  assert.match(academy, /checked=\{consented\}/);
  assert.match(academy, /onClick=\{startSaving\}/);
  assert.match(academy, /onClick=\{signIn\}/);
  assert.ok(academy.indexOf('<aside className={styles.preview}') > academy.indexOf('<section className={styles.slide'));
  assert.ok(academy.indexOf('<aside className={styles.preview}') < academy.indexOf('<footer className={styles.footer}>'));
});

test('Academy: immersive mobile viewport still scrolls dense lessons and keeps real video', () => {
  assert.match(academyCss, /HH ONE SCREEN COURSE 2026-10-17/);
  assert.match(academyCss, /position:fixed;inset:0;z-index:2147483000;height:100dvh/);
  assert.match(academyCss, /overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain/);
  assert.match(academyCss, /\.page\[data-course-one-screen\] \.next\{/);
  assert.match(academyCss, /\.page\[data-course-one-screen\] \.art\{/);
  assert.match(academy, /<AcademyVideoPlayer key=\{slide\.id\}/);
  assert.match(academy, /\{t\.stop\}/);
});
