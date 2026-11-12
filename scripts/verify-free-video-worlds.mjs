/** Browser acceptance for the existing eight on-device procedural worlds.
 * Run against an isolated local build. Uses no client data or paid provider.
 */
import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = process.env.HH_TEST_PUBLIC_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Loopback origin required');
const families = ['mandala','light','lotus','temple','tree','cosmic','light_tunnel','flowering_garden'];
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors = [], externalPosts = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() === 'POST' && (new URL(request.url()).origin !== origin ||
        /\/api\/.*(?:generate|render)/i.test(new URL(request.url()).pathname))) externalPosts.push(request.url());
    });
    const response = await page.goto(`${origin}/ru/holistic-support/mandala`, {waitUntil:'domcontentloaded'});
    assert.equal(response?.status(), 200);
    await page.locator('[data-video-procedural-options] summary').click();
    await page.locator('[data-free-video-source="generated"]').click();
    const studio = page.locator('[data-free-video-generator]');
    // The source generator now controls the ONE approved movie Canvas.
    const canvas = page.locator('[data-mandala-cinematic-canvas]');
    await canvas.waitFor({state:'visible'});
    assert.equal(await page.locator('[data-mandala-cinematic-canvas]').count(),1,'one actual renderer');
    assert.equal(await studio.locator('canvas').count(),0,'no second miniature renderer');
    const hash = () => canvas.evaluate(el => {
      const pixels = el.getContext('2d').getImageData(0,0,el.width,el.height).data;
      let h = 2166136261;
      for (let i=0;i<pixels.length;i+=43) h = Math.imul(h ^ pixels[i],16777619);
      return h >>> 0;
    });
    const frames = new Map();
    for (const family of families) {
      const button = studio.locator(`[data-free-video-family="${family}"]`);
      await button.click();
      await page.waitForFunction(id => document.querySelector(`[data-free-video-family="${id}"]`)?.getAttribute('aria-pressed') === 'true', family);
      // React's effect paints the paused frame at t=0 after the selection commits.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const initial = await hash();
      frames.set(family, initial);
      await studio.locator('[data-free-video-play]').click();
      await page.waitForFunction(previous => {
        const canvas = document.querySelector('[data-mandala-cinematic-canvas]');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let h=2166136261; for(let i=0;i<pixels.length;i+=43) h=Math.imul(h^pixels[i],16777619);
        return (h>>>0)!==previous;
      }, initial, {timeout:10000});
      const moving = await hash();
      await page.waitForFunction(previous => {
        const canvas = document.querySelector('[data-mandala-cinematic-canvas]');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let h=2166136261; for(let i=0;i<pixels.length;i+=43) h=Math.imul(h^pixels[i],16777619);
        return (h>>>0)!==previous;
      }, moving, {timeout:10000});
      await studio.locator('[data-free-video-play]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await hash(), initial, `${engine}/${family}: same seed and time must reproduce the frame`);
      await studio.locator('[data-free-video-variant]').click();
      await page.waitForFunction(previous => {
        const canvas = document.querySelector('[data-mandala-cinematic-canvas]');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let h=2166136261; for(let i=0;i<pixels.length;i+=43) h=Math.imul(h^pixels[i],16777619);
        return (h>>>0)!==previous;
      }, initial, {timeout:10000});
      await button.click(); // Selecting the same family resets the variation to zero.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await hash(), initial, `${engine}/${family}: resetting the seed must reproduce the frame`);
    }
    assert.equal(new Set(frames.values()).size, families.length, `${engine}: eight families must have distinct pixels`);
    assert.deepEqual(externalPosts, [], `${engine}: no external provider POST`);
    assert.deepEqual(errors, [], `${engine}: no page exceptions`);
    // The canvas check above is not an export test. Attach a real bundled
    // soundtrack and verify the actual downloaded procedural movie as media.
    await page.locator('[data-video-quick-control="phrases"]').click();
    const soundtrack=page.locator('[data-video-quick-music-check]').first();
    await soundtrack.waitFor({state:'visible'});
    if(await soundtrack.getAttribute('aria-checked')!=='true')await soundtrack.click();
    assert.equal(await soundtrack.getAttribute('aria-checked'),'true',`${engine}: soundtrack attached`);
    await page.locator('[data-video-quick-control="video"]').click();
    const create=page.locator('[data-free-video-create]');
    await create.waitFor({state:'visible'});
    assert.equal(await create.isEnabled(),true,`${engine}: procedural export is enabled`);
    console.log('PROCEDURAL_CODEC_CAPABILITIES '+JSON.stringify({engine,...await page.evaluate(()=>({
      explicitAvcAac:typeof MediaRecorder!=="undefined"&&MediaRecorder.isTypeSupported('video/mp4;codecs="avc1.42E01E,mp4a.40.2"'),
      videoEncoder:typeof VideoEncoder!=="undefined",audioEncoder:typeof AudioEncoder!=="undefined",
    }))}));
    await create.click();
    const save=page.locator('[data-mandala-video-download]');
    await page.waitForFunction(()=>{
      const button=document.querySelector('[data-mandala-video-download]');
      return Boolean(button&&button.getClientRects().length)||Boolean(document.querySelector('[data-video-export-unavailable="true"]'));
    },null,{timeout:180000});
    const unavailable=page.locator('[data-video-export-unavailable="true"]');
    assert.equal(await unavailable.count(),0,`${engine}: export unavailable: ${(await unavailable.allTextContents()).join(' ')}`);
    await save.waitFor({state:'visible',timeout:10000});
    const directory=await mkdtemp(join(tmpdir(),'hh-procedural-export-'));
    try {
      const [download]=await Promise.all([page.waitForEvent('download',{timeout:20000}),save.click()]);
      const file=join(directory,'actual-video');
      await download.saveAs(file);
      const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name:format=duration','-of','json',file],{encoding:'utf8'});
      assert.equal(probe.status,0,`${engine}: ffprobe must read the downloaded file: ${probe.stderr}`);
      const media=JSON.parse(probe.stdout),streams=media.streams||[];
      assert.ok(streams.some(s=>s.codec_type==='video'&&s.codec_name==='h264'),`${engine}: H.264 video required; actual ${JSON.stringify(streams)}`);
      assert.ok(streams.some(s=>s.codec_type==='audio'&&s.codec_name==='aac'),`${engine}: AAC audio required; actual ${JSON.stringify(streams)}`);
      assert.ok(Number.isFinite(Number(media.format?.duration))&&Number(media.format.duration)>=28,`${engine}: finite complete duration required`);
      const frame=second=>spawnSync('ffmpeg',['-v','error','-ss',String(second),'-i',file,'-frames:v','1','-vf','scale=32:18','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:1024*1024});
      const first=frame(1),second=frame(4);
      assert.equal(first.status,0,`${engine}: first frame decodes`);
      assert.equal(second.status,0,`${engine}: later frame decodes`);
      assert.ok(first.stdout.length>0&&!first.stdout.equals(second.stdout),`${engine}: exported frames must move`);
      const audio=spawnSync('ffmpeg',['-v','error','-i',file,'-map','0:a:0','-t','2','-ar','8000','-ac','1','-f','s16le','pipe:1'],{maxBuffer:1024*1024});
      assert.equal(audio.status,0,`${engine}: audio decodes`);
      let energy=0;const samples=Math.floor(audio.stdout.length/2);
      for(let i=0;i<samples;i++){const v=audio.stdout.readInt16LE(i*2)/32768;energy+=v*v;}
      assert.ok(samples>4000&&Math.sqrt(energy/samples)>0.003,`${engine}: exported sound must be audible`);
    } finally { await rm(directory,{recursive:true,force:true}); }
    assert.deepEqual(externalPosts, [], `${engine}: export must not call a provider`);
    assert.deepEqual(errors, [], `${engine}: export must not cause a page exception`);
    console.log(`PASS ${engine}: eight distinct, moving and reproducible procedural worlds`);
    await page.close();
  } finally { await browser.close(); }
}
