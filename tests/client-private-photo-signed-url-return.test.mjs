import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gallery=readFileSync(new URL('../components/app/video-photo-library.jsx',import.meta.url),'utf8');
const portrait=readFileSync(new URL('../components/app/support-photo-cabinet.jsx',import.meta.url),'utf8');
const galleryApi=readFileSync(new URL('../app/api/app/video-photos/route.js',import.meta.url),'utf8');
const portraitApi=readFileSync(new URL('../app/api/app/support-photo/route.js',import.meta.url),'utf8');

test('private storage signed thumbnails are revalidated before 120-second expiry on tab return',()=>{
  assert.match(galleryApi,/createSignedUrl\([^\n]*,120\)/);
  assert.match(portraitApi,/createSignedUrl\(key,120\)/);
  for(const component of [gallery,portrait]){
    assert.match(component,/Date\.now\(\).*90_000/);
    assert.match(component,/document\.visibilityState==='visible'/);
    assert.match(component,/window\.addEventListener\('focus',refreshOnReturn\)/);
    assert.match(component,/document\.addEventListener\('visibilitychange',refreshOnReturn\)/);
    assert.match(component,/window\.removeEventListener\('focus',refreshOnReturn\)/);
    assert.match(component,/document\.removeEventListener\('visibilitychange',refreshOnReturn\)/);
  }
  assert.match(gallery,/onToggle=\{event=>setOpened\(event\.currentTarget\.open\)\}/);
});

test('gallery can retry temporary failures without re-upload or cross-account URL caching',()=>{
  assert.match(gallery,/async function retry\(\)/);
  assert.match(gallery,/status==='guest'\|\|status==='unavailable'/);
  assert.match(gallery,/onClick=\{\(\)=>void retry\(\)\}/);
  for(const copy of ["retry:'Try again'","retry:'Повторить загрузку'","retry:'Volver a intentar'"])
    assert.ok(gallery.includes(copy),copy);
  assert.match(gallery,/request\('\/api\/app\/video-photos'\)/);
  assert.match(portrait,/fetch\('\/api\/app\/support-photo'/);
  assert.match(gallery,/credentials:'same-origin'/);
  assert.match(portrait,/credentials:'same-origin'/);
  assert.doesNotMatch(gallery,/localStorage|sessionStorage|setInterval|setTimeout/);
  assert.doesNotMatch(portrait,/localStorage|sessionStorage|setInterval|setTimeout/);
});
