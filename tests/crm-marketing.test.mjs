import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateMarketingLead, validateMarketingStage, validateMarketingMilestone, marketingSnapshot,
} from '../lib/crm/marketing.js'
const contactId='123e4567-e89b-42d3-a456-426614174000'
const leadId='223e4567-e89b-42d3-a456-426614174000'
test('strict manual verified marketing attribution allows only public-safe dimensions',()=>{
  const lead=validateMarketingLead({contactId,source:'instagram',medium:'paid_social',
    campaign:'HH_REIKI_A',creative:'video_01',offer:'reiki_course'})
  assert.deepEqual([lead.campaign,lead.creative],['hh_reiki_a','video_01'])
  for(const data of [
    {contactId,source:'instagram',medium:'paid_social',campaign:'my@email.com',offer:'reiki_course'},
    {contactId,source:'instagram',medium:'paid_social',campaign:'diagnosis here',offer:'reiki_course'},
    {contactId,source:'instagram',medium:'paid_social',message:'sensitive',offer:'reiki_course'},
    {contactId,source:'unknown',medium:'fake',offer:'other'},
  ]) assert.throws(()=>validateMarketingLead(data))
})
test('only known CRM stages, optimistic revisions, and course milestones are writable',()=>{
  assert.equal(validateMarketingStage({id:leadId,stage:'qualified',expectedRevision:0}).stage,'qualified')
  assert.throws(()=>validateMarketingStage({id:leadId,stage:'paid',expectedRevision:0}))
  assert.throws(()=>validateMarketingStage({id:leadId,stage:'booked',expectedRevision:-1}))
  assert.equal(validateMarketingMilestone({id:leadId,milestone:'reiki_course_started'}).milestone,'reiki_course_started')
  assert.throws(()=>validateMarketingMilestone({id:leadId,milestone:'refund'}))
})
test('one course contact may have multiple milestones without becoming multiple unique clients',()=>{
  const leads=[
    {source:'instagram',stage:'booked',contact_id:contactId},
    {source:'instagram',stage:'received',contact_id:contactId},
    {source:'referral',stage:'qualified',contact_id:'323e4567-e89b-42d3-a456-426614174000'},
  ]
  const result=marketingSnapshot(leads,[{source:'instagram'},{source:'manual'}])
  assert.deepEqual(result.totals,{leads:3,qualified:2,booked:1,uniqueContacts:2})
  assert.equal(result.rows[0].uniqueContacts,1)
  assert.equal(result.legacy.manual,1)
})
