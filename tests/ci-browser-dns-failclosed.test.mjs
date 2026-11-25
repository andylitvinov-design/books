import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('Pinned real Chromium + container WebKit and OPORA retain all real acceptance gates', () => {
  const opora=read('.github/workflows/opora-module-ci.yml');
  const video=read('.github/workflows/site-video-browser.yml');
  const proof=read('scripts/ci-playwright-launch-proof.cjs');
  const remote=read('scripts/ci-playwright-remote-webkit-proof.cjs');
  const about=read('scripts/verify-about-testimonials-browser.mjs');

  assert.ok(opora.includes('@playwright/test@1.63.0'), 'OPORA browser version remains pinned');
  assert.ok(opora.includes('playwright install "$HH_TEST_BROWSER"'));
  assert.ok(opora.includes('playwright install --with-deps "$HH_TEST_BROWSER"'));
  assert.ok(opora.includes('ci-playwright-launch-proof.cjs "$HH_TEST_BROWSER"'));
  assert.ok(opora.includes('node scripts/verify-opora-as56-browser.mjs'));
  assert.ok(opora.includes('node scripts/verify-opora-course-ready-viewport.mjs'));

  assert.ok(video.includes('@playwright/test@1.64.0'), 'Video browser host must match remote container');
  assert.ok(video.includes('mcr.microsoft.com/playwright:v1.64.0-noble'), 'Use official preinstalled Linux dependencies');
  assert.ok(video.includes('docker run --detach --rm --init --network host'));
  assert.ok(video.includes('run-server --host 127.0.0.1 --port 39120'));
  assert.ok(video.includes('playwright install chromium'));
  assert.ok(video.includes('node scripts/ci-playwright-launch-proof.cjs chromium'));
  assert.ok(video.includes('node scripts/ci-playwright-remote-webkit-proof.cjs'));
  assert.ok(video.includes('node scripts/verify-site-video-browser.mjs'));
  assert.ok(video.includes('node scripts/verify-site-video-admin-browser.mjs'));
  assert.ok(video.includes('docker rm -f hh-site-video-webkit-'), 'Browser container must be cleaned up');
  assert.doesNotMatch(video,/playwright install --with-deps chromium webkit/);

  assert.ok(about.includes("['chromium',chromium],['webkit',webkit]"));
  assert.ok(about.includes("for(const locale of ['en','ru','es'])for(const width of [320,390,430])"));
  assert.ok(about.includes('webkit.connect(remoteWebKitUrl'));
  assert.ok(about.includes('assert.deepEqual(errors,[]'), 'Browser errors remain a failing assertion');
  assert.ok(remote.includes('webkit.connect(endpoint'), 'Real WebKit must start');
  assert.doesNotMatch(remote, /\brequire\s*\(/, 'WebKit helper must not use forbidden require imports');
  assert.ok(remote.includes('HH_BROWSER_REAL_REMOTE_WEBKIT_OK'));
  assert.ok(remote.includes('page.goto('), 'Actual browser page proof');
  assert.ok(remote.includes('process.exitCode = 1'), 'Browser not available fails closed');
  assert.ok(proof.includes('engines[name].launch({headless:true, timeout:15000})'));
  assert.doesNotMatch(proof,/\bconst module\s*=/);
});

test('Remote WebKit rejects missing/foreign/credentialed addresses without any browser', () => {
  const path=new URL('../scripts/ci-playwright-remote-webkit-proof.cjs',import.meta.url).pathname;
  for(const endpoint of ['', 'ws://0.0.0.0:39120/', 'ws://example.com:39120/', 'wss://127.0.0.1:39120/', 'ws://user:pass@127.0.0.1:39120/', 'ws://127.0.0.1:39120/extra']) {
    const r=spawnSync(process.execPath,[path],{env:{...process.env,HH_SITE_VIDEO_WEBKIT_WS_ENDPOINT:endpoint},encoding:'utf8',timeout:3000});
    assert.notEqual(r.status,0,'Nonloopback or missing WebKit endpoint must fail: '+endpoint);
  }
});

test('Redis service CLI bridge preserves actual isolated Redis checks without APT', () => {
  const wf=read('.github/workflows/site-video-browser.yml');
  const bridge=read('scripts/ci-redis-cli-bridge.sh');
  assert.doesNotMatch(wf, /apt-get install -y redis-tools/);
  assert.equal((wf.match(/bash scripts\/ci-redis-cli-bridge\.sh/g)||[]).length,2);
  assert.ok(bridge.includes('docker ps --filter ancestor=redis:7-alpine'));
  assert.ok(bridge.includes('docker exec'));
  assert.ok(bridge.includes('redis-cli ping | grep -Fxq PONG'));
  assert.ok(bridge.includes('>> "$GITHUB_PATH"'));
  assert.ok(wf.includes('redis:7-alpine'));
  assert.ok(wf.includes('node scripts/verify-site-video-admin-browser.mjs'));
});
