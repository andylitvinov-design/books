import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizePlaudImport,parseLinearGraphqlResponse,prepareFirefliesRecord} from '../lib/business-context/connectors.mjs'

test('Plaud uses an explicit user import and never pretends a personal API pull is available',()=>{
 assert.throws(()=>normalizePlaudImport({mode:'api',content:'hello'}),/PLAUD_IMPORT_MODE_UNSUPPORTED/)
 const record=normalizePlaudImport({mode:'manual',filename:'standup.srt',content:'1\n00:00:01,000 --> 00:00:03,000\nSam will write the brief.'})
 assert.equal(record.provider,'plaud_import')
 assert.match(record.text,/Sam will write the brief/)
})

test('Linear HTTP 200 GraphQL errors are failures, not successful reads or mutations',()=>{
 assert.throws(()=>parseLinearGraphqlResponse({data:{issueCreate:{success:true}},errors:[{message:'Denied'}]}),/LINEAR_GRAPHQL_ERROR/)
 assert.throws(()=>parseLinearGraphqlResponse({data:{issueCreate:{success:false}}},{mutation:true}),/LINEAR_MUTATION_UNSUCCESSFUL/)
 assert.deepEqual(parseLinearGraphqlResponse({data:{issues:{nodes:[]}}}),{issues:{nodes:[]}})
})

test('Fireflies record preparation requires a supported source shape and preserves opaque provider revision',()=>{
 const record=prepareFirefliesRecord({id:'t1',title:'Standup',date:'2026-11-20T10:00:00Z',sentences:[{text:'Sam will write notes.'}],summary:{action_items:'Write notes'}})
 assert.equal(record.provider,'fireflies')
 assert.equal(record.providerRecordId,'t1')
 assert.match(record.revisionHash,/^[a-f0-9]{64}$/)
 assert.throws(()=>prepareFirefliesRecord({title:'Missing id'}),/FIREFLIES_RECORD_INVALID/)
})
