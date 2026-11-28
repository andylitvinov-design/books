import assert from 'node:assert/strict'

// The root aliases must resolve to the actual existing public catalog, not a
// duplicate renderer. No account, microphone, provider or paid action is started.
export async function verifyMyCoachHome(page,locale){
 const target='/'+locale+'/my-coach'
 await page.waitForURL(url=>url.pathname===target,{timeout:30000})
 const root=page.locator('[data-my-coach-catalog]')
 await root.waitFor({state:'visible',timeout:30000})
 assert.equal(await root.count(),1)
 assert.equal(await root.getAttribute('lang'),locale)
 assert.equal(await page.locator('[data-my-coach-page]').count(),1)
 assert.equal((await root.locator('#my-coach-heading').innerText()).trim(),'My Coach')
 assert.equal(await root.locator('header select').inputValue(),locale)
 await root.locator('[data-my-coach-hero]').waitFor({state:'visible'})
 await root.locator('[data-my-coach-rail]').waitFor({state:'visible'})
 assert.equal(await root.locator('[data-my-coach-program-details]').getAttribute('href'),target+'/programs')
 assert.equal(await page.locator('[data-home-dialogue-entry], [data-home-program-entrance], [data-home-intent-form], [data-home-featured-workspace]').count(),0)
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'My Coach home must not overflow')
 return root
}
