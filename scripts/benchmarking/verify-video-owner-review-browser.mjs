#!/usr/bin/env node
/** Real mobile browser check of the private review UI using only local fixtures. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {buildOwnerVideoReviewModel} from '../../lib/mandala/video-owner-review.mjs';
import {renderVideoOwnerReviewHtml} from '../../lib/mandala/video-owner-review-html.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const publicRoot=resolve(root,'public');
const model=buildOwnerVideoReviewModel({locale:'ru'});
const row=model.rows.find(item=>item.beats.some(beat=>beat.selected?.video));
assert.ok(row,'a checked candidate must exist');
const html=renderVideoOwnerReviewHtml(model,'localreviewtestnonce');
const browser=await chromium.launch({headless:true,...(process.env.HH_REVIEW_CHROMIUM_EXECUTABLE?{executablePath:process.env.HH_REVIEW_CHROMIUM_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const blocked=[];
 await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='http://hh-owner.test'){blocked.push(url.origin);return route.abort();}
   if(url.pathname==='/'){return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});}
   if(!url.pathname.startsWith('/videos/holistic-house/'))return route.abort();
   const path=resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
   if(!path.startsWith(publicRoot+sep))return route.abort();
   try{return route.fulfill({status:200,contentType:path.endsWith('.mp4')?'video/mp4':'image/jpeg',body:await readFile(path)});}
   catch{return route.abort();}
 });
 await page.goto('http://hh-owner.test/');
 await page.locator('#query').fill(row.id);
 await page.locator('#list button').first().click();
 for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   assert.equal(overflow,false,`owner review must fit ${width}px`);
 }
 assert.equal(await page.locator('.card').count(),4,'each story has four review cards');
 const play=page.getByRole('button',{name:'▶ Посмотреть исходный MP4'}).first();
 await play.click();
 const video=page.locator('video').first();
 await video.evaluate(el=>el.play());
 await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.videoWidth>0&&Number.isFinite(v.duration)&&v.duration>0;},null,{timeout:20000});
 await page.locator('.card textarea').first().fill('Synthetic review note');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Скачать JSON-черновик'}).click()]);
 const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(Buffer.from(chunk));
 const draft=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 assert.equal(draft.canExport,false);
 assert.equal(draft.approvedForPublication,false);
 assert.ok(JSON.stringify(draft.notes).includes('Synthetic review note'));
 assert.deepEqual(blocked,[],'review does not contact outside services');
 console.log('PASS private mobile review: 4 cards, local MP4 decode, draft JSON, 320/390/430px');
}finally{await browser.close();}
