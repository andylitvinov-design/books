import test from 'node:test'
import assert from 'node:assert/strict'
import {coachSessionCard} from '../lib/coaching/coach-session-card.mjs'
import {selectCoachDialogueVariant,coachSemanticQuestionCandidates,coachDialogueBankGuidance} from '../lib/coaching/coach-dialogue-selector.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {conversationalCoachMessages} from '../lib/coaching/conversational-persona.mjs'

const directive={
  locale:'ru',personaId:'mira',methodId:'grow',methodStepId:'grow:goal',
  stage:'goal',interventionId:'clarify_goal',allowQuestion:true,
  canOfferAction:false,readiness:{missing:['goalRestated','workingFocusEstablished']},
}
const policy={conversationAct:'substantive_reply',noAdvice:false,allowQuestion:true,questionStreak:false}
const user=content=>({role:'user',content})
const coach=content=>({role:'assistant',content})

test('session card quotes only client facts from active topic, never coach claims',()=>{
 const input={locale:'ru',turns:[
   user('Я хочу разобраться в ситуации с работой.'),
   coach('Вам поставлен диагноз; вы решили уйти.'),
   user('Вчера на встрече руководитель повысил голос.'),
   user('Мне мешает нехватка времени; я пробовал говорить с ним раньше.')
 ],message:'Мне страшно снова идти на встречу.'}
 const card=coachSessionCard(input,directive)
 assert.equal(card.currentAuthorizedStep,'grow:goal')
 assert.equal(card.workingTopicQuote,'Я хочу разобраться в ситуации с работой.')
 assert.deepEqual(card.keyFactQuotes,['Вчера на встрече руководитель повысил голос.'])
 assert.deepEqual(card.constraintQuotes,['Мне мешает нехватка времени'])
 assert.equal(card.selfReportedFeelingQuote,'Мне страшно снова идти на встречу.')
 assert.equal(card.attemptedApproachQuote,'я пробовал говорить с ним раньше.')
 assert.deepEqual(card.stillMissingEvidence,['goalRestated','workingFocusEstablished'])
 assert.doesNotMatch(JSON.stringify(card),/диагноз|вы решили уйти/)
 assert.match(card.provenance,/provisional/)
})
test('new topic and correction invalidate old theme and client status',()=>{
 const input={locale:'en',turns:[
   user('I want to change jobs.'),
   user("Let's talk about something else."),
   user('Yesterday I phoned my sister.')
 ],message:'I feel angry about the call.'}
 const card=coachSessionCard(input,directive)
 assert.equal(card.workingTopicQuote,null)
 assert.deepEqual(card.keyFactQuotes,['Yesterday I phoned my sister.'])
 assert.equal(card.selfReportedFeelingQuote,'I feel angry about the call.')
 assert.doesNotMatch(JSON.stringify(card),/change jobs/i)
 const corrected=coachSessionCard({...input,message:'You misunderstood. I meant something else.'},directive)
 assert.equal(corrected.workingTopicQuote,null)
 assert.deepEqual(corrected.keyFactQuotes,[])
 assert.doesNotMatch(JSON.stringify(corrected),/phoned my sister/)
})
test('semantic stage shortlist stays authorized, novel, optional and at most two',()=>{
 const input={locale:'ru',message:'Я хочу обсудить важный выбор, пока не могу определиться.',turns:[]}
 const result=coachSemanticQuestionCandidates(input,directive,policy)
 assert.equal(result.questions.length,2)
 assert.equal(result.questions[0].id,result.selected.questionId)
 assert.equal(new Set(result.questions.map(x=>x.id)).size,result.questions.length)
 assert.ok(result.questions.every(x=>x.id.startsWith('grow:goal:')))
 const prompt=coachDialogueBankGuidance(input,directive,policy)
 assert.match(prompt,/SEMANTIC DECISION/)
 assert.match(prompt,/choose by keyword similarity alone/)
 assert.match(prompt,/ask NONE/)
 assert.doesNotMatch(prompt,/не могу определиться/)
 const used=result.questions.map(x=>coach(x.text))
 const repeated=coachSemanticQuestionCandidates({...input,turns:used},directive,policy)
 assert.ok(repeated.questions.every(x=>!used.some(t=>t.content===x.text)))
 for(const quiet of [
   {...policy,conversationAct:'correction'},
   {...policy,noAdvice:true},
   {...policy,allowQuestion:false},
 ]){
   assert.deepEqual(coachSemanticQuestionCandidates(input,directive,quiet).questions,[])
 }
 assert.deepEqual(coachSemanticQuestionCandidates(input,directive,policy,{shortFragment:true}).questions,[])
 assert.equal(selectCoachDialogueVariant(input,directive,policy).methodStepId,'grow:goal')
})
test('working card is in quoted USER context, never a system instruction or second model call',()=>{
 const input=normalizeGenerativeCoachInput({
   personaId:'mira',locale:'en',consent:true,
   message:'Yesterday my manager criticized me again.',
   turns:[user('I want to be more confident at work.'),coach('What happened?')],
 }).input
 const persona=normalizeGenerativeCoachInput({
   personaId:'mira',locale:'en',consent:true,
   message:'Yesterday my manager criticized me again.',
   turns:[user('I want to be more confident at work.'),coach('What happened?')],
 }).persona
 const messages=conversationalCoachMessages(input,persona,'grow','goal',{type:'none'})
 assert.equal(messages.at(-1).content,input.message)
 assert.match(messages.at(-2).content,/sessionCard/)
 assert.match(messages.at(-2).content,/I want to be more confident at work/)
 assert.ok(messages.filter(m=>m.role==='system').every(m=>!m.content.includes('I want to be more confident at work.')))
 assert.match(messages[0].content,/generally under 35 words|Usually write 1–3/)
})
