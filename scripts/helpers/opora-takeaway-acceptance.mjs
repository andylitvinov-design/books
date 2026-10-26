import assert from 'node:assert/strict'

// The real fixture compiles CSS Modules; raw `.summaryItem` is not a DOM class.
// Scope the current Day5 takeaway by its semantic marker, never by generated CSS.
export async function verifyOporaTakeaway(page, expect, moment) {
  assert.ok(moment==='recap'||moment==='recapNext','Only the two Day5 takeaways are accepted')
  const panel=page.locator('[data-opora-current-screen="'+moment+'"]')
  assert.equal(await panel.count(),1,'Exactly one active takeaway panel')
  const summary=panel.locator(moment==='recap'?'[data-opora-lesson-recap="true"]':'[data-opora-daily-homework="5"]')
  assert.equal(await summary.count(),1,'Exactly one semantic takeaway container')
  const idea=summary.locator(':scope > div')
  assert.equal(await idea.count(),1,'Each takeaway has exactly one visible idea')
  await expect(idea).toBeVisible()
  const copy=idea.locator(':scope > div')
  assert.equal(await copy.count(),1,'The one idea has one copy group')
  assert.equal(await copy.locator(':scope > *').count(),2,'The one idea has only its heading and detail')
  for(const tag of ['strong','small']) {
    const field=copy.locator(':scope > '+tag)
    assert.equal(await field.count(),1,'The idea has exactly one '+tag)
    assert.equal(await idea.locator(tag).count(),1,'No duplicate nested '+tag)
    await expect(field).toBeVisible()
    assert.ok((await field.innerText()).trim().length>0,'The idea '+tag+' is nonempty')
  }
}
