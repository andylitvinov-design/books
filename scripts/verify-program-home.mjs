import assert from 'node:assert/strict'

export async function verifyProgramHome(page,{locale,width}){
 const label=locale+'/'+width
 const root=page.locator('[data-home-program-page]')
 await root.waitFor({state:'visible'})
 assert.equal(await root.count(),1,label+': unique home')
 assert.equal(await root.getAttribute('lang'),locale)
 assert.equal(await root.locator('[data-home-dialogue-header] h1').innerText(),'Holistic House')
 const dashboard=root.locator('[data-profile-space-dashboard]')
 const tabs=dashboard.locator('[data-goal-profile-tab]')
 assert.deepEqual(await tabs.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-goal-profile-tab'))),['clarity','goals','business'])
 assert.equal(await tabs.first().getAttribute('aria-pressed'),'true')
 const titles=await tabs.evaluateAll(nodes=>nodes.map(n=>n.innerText.trim()))
 assert.deepEqual(titles,{en:['Express','My Goal','My Business'],ru:['Экспресс','Моя цель','Мой бизнес'],es:['Exprés','Mi meta','Mi negocio']}[locale])
 const bounds=await tabs.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,width:r.width,height:r.height}}))
 assert.ok(bounds.every(r=>r.x>=-1&&r.right<=width+1&&r.y>=0&&r.y<700&&r.width>=44&&r.height>=44),label+': first-screen tabs '+JSON.stringify(bounds))
 const panels={clarity:'[data-profile-clarity-support]',goals:'[data-goal-program-landing]',business:'[data-profile-business]'}
 for(const id of ['clarity','goals','business']){
  const selected=dashboard.locator('[data-goal-profile-tab="'+id+'"]')
  if(await selected.getAttribute('aria-pressed')!=='true')await selected.click()
  await page.waitForFunction(id=>document.querySelector('[data-home-program-page] [data-profile-space-dashboard]')?.getAttribute('data-profile-space-section')===id,id)
  await dashboard.locator(panels[id]).waitFor({state:'visible'})
  assert.equal(await selected.getAttribute('aria-pressed'),'true')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+'/'+id+': no overflow')
  if(id==='business'){
   const pdf=dashboard.locator('[data-business-report-pdf]')
   assert.equal(await pdf.count(),1)
   assert.ok((await pdf.getAttribute('href'))?.endsWith('.pdf'),label+': real business PDF')
   assert.equal(await dashboard.locator('[data-business-daybook-link]').count(),1)
  }else{
   const trigger=dashboard.locator('[data-program-request-trigger]').first()
   await trigger.click()
   await dashboard.locator('[data-program-contact-options]').first().waitFor({state:'visible'})
   for(const channel of ['whatsapp','telegram']){
    const link=dashboard.locator('[data-messenger-only-channel="'+channel+'"]').first()
    await link.waitFor({state:'visible'})
    assert.ok((await link.getAttribute('href'))?.length>1,label+': '+channel+' handoff')
   }
   await trigger.click()
   await dashboard.locator('[data-program-contact-options]').first().waitFor({state:'hidden'})
  }
 }
 await dashboard.locator('[data-goal-profile-tab="clarity"]').click()
 await dashboard.locator(panels.clarity).waitFor({state:'visible'})
 await page.evaluate(()=>window.scrollTo(0,0))
 assert.equal(await page.locator('[data-home-dialogue-entry], [data-home-intent-form], [data-home-focus-grid], [data-home-featured-workspace], [data-home-video-below-fold]').count(),0,label+': old Home fully retired')
 assert.equal(await dashboard.locator('[data-profile-my-page-courses-entry], [data-profile-my-video]').count(),0)
 const dock=page.locator('[data-hh-unified-dock]')
 if(width<760){
  await dock.waitFor({state:'visible'})
  for(const id of ['ai','profile'])assert.equal(await dock.locator('[data-unified-dock-item="'+id+'"]').count(),1)
 }
 return {locale,width,tabs:titles,programSwitches:3,contactHandoffs:true,oldHomeAbsent:true}
}
