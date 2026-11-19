import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getInstagramManualHandoff} from '../lib/growth-studio/instagram-manual-handoff.mjs'

const approved={status:'approved',brand:'holistic_house',channel:'instagram',
  socialAccountId:'wizards_secrets',placement:'story',
  mediaUrl:'https://holistichouse.vercel.app/media/test-public.jpg'}

test('owner-approved public Story can be handed off without Meta credentials',()=>{
  const value=getInstagramManualHandoff(approved)
  assert.equal(value?.accountLabel,'@wizards.secrets')
  assert.equal(value?.placement,'story')
  assert.equal(value?.mediaUrl,approved.mediaUrl)
  assert.equal(getInstagramManualHandoff({...approved,status:'planned_manual'})?.accountId,'wizards_secrets')
  assert.equal(getInstagramManualHandoff({...approved,mediaUrl:'https://holistichouse.vercel.app/media/public.mp4'})?.placement,'story')
})

test('manual path never accepts draft, uncertain, wrong-account, private or outside media',()=>{
  for(const post of [
    {...approved,status:'draft'},
    {...approved,status:'sending'},
    {...approved,status:'delivery_unknown'},
    {...approved,socialAccountId:'an_unknown_account'},
    {...approved,mediaUrl:'https://elsewhere.example/post.jpg'},
    {...approved,mediaUrl:'https://holistichouse.vercel.app/en/client/photo.jpg'},
    {...approved,mediaUrl:'https://holistichouse.vercel.app/media/photo.jpg?token=private'},
    {...approved,mediaUrl:'https://holistichouse.vercel.app/media/photo.webp'},
    {...approved,placement:'feed',mediaUrl:'https://holistichouse.vercel.app/media/movie.mp4'},
  ])assert.equal(getInstagramManualHandoff(post),null)
})

test('Growth Studio offers explicit manual handoff but never fakes provider publication',()=>{
  const ui=readFileSync(new URL('../components/growth-studio.jsx',import.meta.url),'utf8')
  const server=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  assert.match(ui,/data-instagram-practitioner-start/)
  assert.match(ui,/onClick=\{startInstagramPost\}/)
  assert.match(ui,/data-instagram-manual-handoff/)
  assert.match(ui,/onClick=\{\(\)=>copyPost\(post\)\}/)
  assert.match(ui,/href="https:\/\/www\.instagram\.com\/"/)
  assert.match(ui,/getInstagramManualHandoff\(post\)/)
  assert.match(server,/if\(!await requireAdminRequest\(\)\)return \{ok:false,error:'unauthorized'\}/)
  assert.match(server,/if\(!isInstagramPublisherEnabled\(\)\)/)
})
