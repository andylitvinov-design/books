import test from 'node:test'
import assert from 'node:assert/strict'
import {readUploadedDetails,readUploadedVisibility} from '../lib/youtube/browser-upload.js'

const ID='Y4K4piEwwA8'
const CHANNEL='UCjWq6NHZTQkUr3bC3WbXXcw'

test('YouTube video readback returns exact video ID, owner channel and actual privacy', async () => {
  const original = globalThis.fetch
  let requested = ''
  globalThis.fetch = async (url,options) => {
    requested = url
    assert.equal(options.headers.Authorization,'Bearer test-token')
    return {ok:true,json:async () => ({items:[{id:ID, snippet:{channelId:CHANNEL}, status:{privacyStatus:'unlisted'}}]})}
  }
  try {
    const result = await readUploadedDetails(ID,'test-token')
    assert.deepEqual(result,{privacyStatus:'unlisted',channelId:CHANNEL})
    assert.match(requested,/part=snippet,status/)
    assert.equal(await readUploadedVisibility(ID,'test-token'),'unlisted')
  } finally {globalThis.fetch=original}
})

test('readback exposes wrong-channel placement and actual Private status without masking them', async () => {
  const original=globalThis.fetch
  globalThis.fetch=async () => ({ok:true,json:async () => ({items:[{id:ID,
    snippet:{channelId:'UCaaaaaaaaaaaaaaaaaaaaaa'},status:{privacyStatus:'private'}}]})})
  try {
    const result=await readUploadedDetails(ID,'token')
    assert.equal(result.privacyStatus,'private')
    assert.notEqual(result.channelId,CHANNEL)
  } finally {globalThis.fetch=original}
})

test('missing video, malformed channel, network errors and failed API response fail as unknown', async () => {
  const original=globalThis.fetch
  try {
    globalThis.fetch=async () => ({ok:true,json:async () => ({items:[]})})
    assert.equal(await readUploadedDetails(ID,'token'),null)
    globalThis.fetch=async () => ({ok:true,json:async () => ({items:[{id:ID,
      snippet:{channelId:'bad'}, status:{privacyStatus:'unknown'}}]})})
    assert.deepEqual(await readUploadedDetails(ID,'token'),{privacyStatus:null,channelId:null})
    globalThis.fetch=async () => {throw new Error('network')}
    assert.equal(await readUploadedDetails(ID,'token'),null)
    globalThis.fetch=async () => ({ok:false})
    assert.equal(await readUploadedVisibility(ID,'token'),null)
  } finally {globalThis.fetch=original}
})
