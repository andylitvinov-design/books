import assert from 'node:assert/strict';

// Public metadata only. This synthetic visual proves no real image fidelity,
// provider availability, genuine image decoding or media playback.
export const expectedTestimonialPoster = 'https://i.ytimg.com/vi/m9RfDgK76PU/hqdefault.jpg';
export const additionalTestimonialPoster = 'https://i.ytimg.com/vi/5oj0BIbLT4w/hqdefault.jpg';
const posterIds = new Map([[expectedTestimonialPoster,'m9RfDgK76PU'],[additionalTestimonialPoster,'5oj0BIbLT4w']]);
export const syntheticPosterSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><title>Isolated synthetic poster fixture</title><rect width="640" height="360" fill="#d7dedb"/><path d="M0 0L640 360M640 0L0 360" stroke="#82918a" stroke-width="4"/></svg>';
const browserHeaders = new Set(['accept','accept-encoding','accept-language','cache-control','connection','dnt','host','origin','pragma','priority','referer','user-agent',
  'sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','sec-fetch-dest','sec-fetch-mode','sec-fetch-site']);

export function createExpectedTestimonialPosterFixture(origin, locale) {
  assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);assert.equal(new URL(origin).origin,origin);assert.ok(['en','ru','es'].includes(locale));
  const frameUrl=origin+'/'+locale+'/services/free-consultation';const counts=new Map([['m9RfDgK76PU',0],['5oj0BIbLT4w',0]]);
  return {
    get responses(){return [...counts.values()].reduce((sum,count)=>sum+count,0)},
    responsesFor(id){assert.ok(counts.has(id));return counts.get(id)},
    async tryFulfill(route){
      let id;
      try{
        const request=route.request();id=posterIds.get(request.url());
        if(!id||counts.get(id)!==0||request.method()!=='GET'||request.resourceType()!=='image'||request.isNavigationRequest()!==false||
          ![null,''].includes(request.postData())||request.frame().url()!==frameUrl)return false;
        const headers=await request.allHeaders();
        if(!headers||typeof headers!=='object'||Array.isArray(headers))return false;
        const names=Object.keys(headers);
        if(new Set(names.map(name=>name.toLowerCase())).size!==names.length||names.some(name=>!browserHeaders.has(name.toLowerCase())))return false;
        const value=key=>headers[names.find(name=>name.toLowerCase()===key)];
        if(value('host')!==undefined&&value('host')!=='i.ytimg.com')return false;
        if(value('referer')!==undefined&&![origin+'/',frameUrl].includes(value('referer')))return false;
        if(value('origin')!==undefined&&value('origin')!==origin)return false;
        if(value('sec-fetch-dest')!==undefined&&value('sec-fetch-dest')!=='image')return false;
      }catch{return false}
      // Header absence is provisional, not proof about an actual wire request.
      // Safety depends on the fresh isolated context and never contacting the provider.
      if(counts.get(id)!==0)return false;counts.set(id,1);
      await route.fulfill({status:200,contentType:'image/svg+xml',body:syntheticPosterSvg,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
      return true;
    },
  };
}

export function assertSyntheticPosterObservation(snapshot){
  assert.equal(snapshot.targetCount,1,'Exactly one declared public poster target');
  assert.equal(snapshot.imageCount,1,'Exactly one expected poster image');
  assert.equal(snapshot.requests,1,'Exactly one requested fixture; absent or repeated requests fail');
  assert.equal(snapshot.sourceMatches,true,'Exact declared public poster source');
  assert.equal(snapshot.complete,true,'Synthetic fixture must finish, not a broken or unrequested image');
  assert.equal(snapshot.naturalWidth,640);assert.equal(snapshot.naturalHeight,360);
  assert.ok(Number.isFinite(snapshot.width)&&snapshot.width>120&&Number.isFinite(snapshot.height)&&snapshot.height>0);
  assert.ok(Math.abs(snapshot.width/snapshot.height-16/9)<0.03,'Keep declared 16:9 layout, not a one-pixel placeholder');
}
