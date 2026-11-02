import assert from 'node:assert/strict'

// Next persists a second save after the answer save. Await that exact operation
// before asserting the next item; response headers alone are not a UI commit.
export async function advanceSavedGuidedQuestion(page, expect, { locale, progress, guest }) {
 const prefix=guest?'/api/app/guest/runs/':'/api/app/runs/'
 const next=page.getByRole('button',{name:locale==='ru'?'Далее':'Next',exact:true})
 await expect(next).toBeEnabled()
 const saved=page.waitForResponse(response=>{
  const request=response.request(),url=new URL(response.url())
  if(!url.pathname.startsWith(prefix)||!url.pathname.endsWith('/save')||request.method()!=='POST')return false
  const body=request.postDataJSON()
  return body?.progress===progress&&Object.keys(body.answers||{}).length===0
 })
 const [response]=await Promise.all([saved,next.click()])
 assert.ok(response.ok(),'guided progress save must succeed')
 const run=await response.json()
 assert.equal(run.progress,progress,'server must persist the exact next question')
 await response.finished()
}
