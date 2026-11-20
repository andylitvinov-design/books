/**
 * Test-only native visitor interactions for the approved three-stage Goal quiz.
 * No DOM writes, synthetic state, provider POST or skipped authorization checks.
 */
import assert from 'node:assert/strict';

export async function completeThreeStepGoalsQuiz(page,{
  engine='chromium',categorySelector='[data-auto-video-category]'
}={}){
  assert.ok(['chromium','webkit'].includes(engine),'GOAL_QUIZ_INVALID_BROWSER');
  const progress=page.locator('[data-video-goal-quiz-progress]');
  const next=page.locator('[data-video-continue-scenarios]');
  // The compact mobile flow may visually hide the progress caption while
  // retaining the actual 3-step React state. WebKit innerText() becomes
  // empty on a CSS-hidden caption, which is not a quiz or media failure.
  // Require its real DOM state and still native-tap all three options.
  await progress.waitFor({state:'attached',timeout:15000});
  // The old lower Continue is intentionally hidden on the updated one-screen
  // Goal mobile layout. It still exposes the real three-stage readiness gate;
  // only the prominent Create Video CTA is visible and taps continueToIdeas.
  await next.waitFor({state:'attached',timeout:15000});
  const visibleAdvance=page.locator('[data-video-goal-create-cta]');
  await visibleAdvance.waitFor({state:'visible',timeout:15000});
  await page.waitForFunction(()=>{
    const meter=document.querySelector('[data-video-goal-quiz-progress]');
    return Boolean(meter?.textContent?.replace(/\s+/g,' ').includes('1 / 3'));
  },undefined,{timeout:15000});
  assert.equal(await next.isDisabled(),true,'IDEAS_CTA_MUST_START_DISABLED');
  const steps=[
    {selector:categorySelector,group:'[data-auto-video-category]',expected:'2 / 3',disabled:true},
    {selector:'[data-auto-video-subcategory]',group:'[data-auto-video-subcategory]',expected:'3 / 3',disabled:true},
    {selector:'[data-video-goal-topic]',group:'[data-video-goal-topic]',expected:'3 / 3',disabled:false},
  ];
  for(const step of steps){
    assert.equal(await page.locator(step.group).count(),4,'GOAL_QUIZ_EXPECTS_FOUR_CHOICES');
    const button=page.locator(step.selector).first();
    await button.waitFor({state:'visible',timeout:15000});
    if(engine==='webkit')await button.tap();
    else await button.click();
    await page.waitForFunction(({expected,disabled})=>{
      const meter=document.querySelector('[data-video-goal-quiz-progress]');
      const action=document.querySelector('[data-video-continue-scenarios]');
      return Boolean(meter?.textContent?.replace(/\s+/g,' ').includes(expected)&&
        action instanceof HTMLButtonElement&&action.disabled===disabled);
    },{expected:step.expected,disabled:step.disabled},{timeout:15000});
  }
  assert.equal(await next.isEnabled(),true,'IDEAS_CTA_MUST_UNLOCK_AFTER_THREE_CHOICES');
  assert.equal(await visibleAdvance.isEnabled(),true,
    'VISIBLE_CREATE_CTA_MUST_ALLOW_THE_COMPLETED_THREE_CHOICE_QUIZ');
}
