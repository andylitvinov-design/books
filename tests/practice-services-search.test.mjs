import test from 'node:test'
import assert from 'node:assert/strict'
import { filterPracticeServices } from '../lib/practitioners/filter-owned-services.mjs'

const services = [
  {
    id:'one', status:'published', areaKey:'energy_spiritual', deliveryFormat:'online', pricingMode:'free',
    copy:{title:'Reiki introduction',shortDescription:'Free online session'},
    localizedCopy:{ru:{title:'Рейки для начинающих'}}, goals:['relaxation'], methods:['Tantra Reiki'],
  },
  {
    id:'two', status:'submitted', areaKey:'relationships', deliveryFormat:'hybrid', pricingMode:'fixed',
    localizedCopy:{en:{title:'Relationship consultation'}}, confirmedPrice:100, currency:'EUR',
  },
  {
    id:'three', status:'draft', areaKey:'personal_development', deliveryFormat:'in_person', pricingMode:'contact',
    draftCopy:{copy:{es:{title:'Crecimiento interior'}}, pricingMode:'contact'},
    locationLabel:'Toronto',
  },
]

test('search is insensitive to case and searches EN/RU/ES and methods', () => {
  assert.deepEqual(filterPracticeServices(services,{query:'рейки'}).map(x=>x.id),['one'])
  assert.deepEqual(filterPracticeServices(services,{query:'TANTRA'}).map(x=>x.id),['one'])
  assert.deepEqual(filterPracticeServices(services,{query:'crecimiento'}).map(x=>x.id),['three'])
})

test('status, area, format and pricing filters intersect correctly', () => {
  assert.deepEqual(filterPracticeServices(services,{status:'review',format:'online',price:'priced',area:'relationships'}).map(x=>x.id),['two'])
  assert.deepEqual(filterPracticeServices(services,{status:'published',price:'free'}).map(x=>x.id),['one'])
  assert.deepEqual(filterPracticeServices(services,{status:'draft',format:'in_person',price:'contact'}).map(x=>x.id),['three'])
})

test('hybrid offerings appear in either online or in-person searches', () => {
  assert.deepEqual(filterPracticeServices(services,{format:'online'}).map(x=>x.id),['one','two'])
  assert.deepEqual(filterPracticeServices(services,{format:'in_person'}).map(x=>x.id),['two','three'])
})

test('empty and unmatched searches are safe and preserve all services by default', () => {
  assert.equal(filterPracticeServices(null,{query:'some'}).length,0)
  assert.equal(filterPracticeServices(services).length,3)
  assert.equal(filterPracticeServices(services,{query:'no match'}).length,0)
})
