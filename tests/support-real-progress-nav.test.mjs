import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../components/holistic-support-mobile.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/holistic-support-mobile.module.css',import.meta.url),'utf8');
const video=readFileSync(new URL('../components/app/academy-video-progress.jsx',import.meta.url),'utf8');

test('mobile My Progress always links to canonical owner-account progress, not local counters',()=>{
  assert.match(page,/const accountProgressHref = "\/" \+ \(locale === "es" \? "en" : locale\) \+ "\/app\/progress"/);
  assert.match(page,/data-support-mobile-progress-link/);
  assert.match(page,/data-support-open-account-progress/);
  assert.match(page,/href=\{accountProgressHref\}/);
  assert.doesNotMatch(page,/<a href="#support-progress"><BarChart3/);
  for(const label of ['Activity on this page','На этом экране','Actividad en esta página'])
    assert.ok(page.includes(label),label);
  assert.match(css,/\.accountProgressLink\{/);
  assert.match(css,/@media\(max-width:640px\)/);
});

test('watching local clip is not automatically recorded as completion',()=>{
  assert.match(page,/playing && selected \? <div className=\{styles\.videoAccountProgress\}/);
  assert.match(page,/<AcademyVideoProgress key=\{selected\.id\} videoId=\{selected\.id\} title=\{selected\.title\} locale=\{locale\}/);
  assert.match(video,/onClick=\{\(\)=>void save\('watched'\)\}/);
  assert.match(video,/onClick=\{\(\)=>void save\('mastered'\)\}/);
  assert.match(video,/appFetch\('video-progress'/);
  assert.match(video,/A self-confirmed learning mark, not an automatic playback record/);
  assert.doesNotMatch(page,/localStorage\.setItem\([^)]*progress/i);
});

test('Google login retains the canonical My Progress route and Spanish uses EN account fallback',()=>{
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8');
  const auth=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8');
  assert.ok(workspace.includes("page === 'progress' ? { continueTo: 'progress' }"));
  assert.equal(auth.split("'cabinet','progress','settings','my-practice'").length-1,2);
  assert.ok(auth.includes(": continueTo === 'progress'"));
  assert.ok(auth.includes("${origin}/${locale}/app/progress"));
  assert.ok(video.includes("const accountLang=lang==='es'?'en':lang"));
  assert.ok(video.includes("href={'/'+accountLang+'/app/progress'}"));
  assert.ok(auth.includes('INVALID_CONTINUATION'));
});
