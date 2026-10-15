import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
const source=readFileSync(new URL('../lib/clients/session-delivery-storage.js',import.meta.url),'utf8')
const createStorageClient=new Function('createClient','fetch',source.replace(/^import .*\n/gm,'').replace(/export /g,'')+';return client')

test('private Storage normalizes modern secret key to apikey rather than user Bearer JWT',async()=>{
  const key='sb_secret_synthetic_not_a_real_key';let captured
  const get=createStorageClient(createClient,async(url,options)=>{
    captured={url:String(url),headers:new Headers(options.headers),redirect:options.redirect}
    return new Response(JSON.stringify({url:'/object/upload/sign/hh-client-private-media/synthetic?token=synthetic'}),{status:200,headers:{'content-type':'application/json'}})
  })
  const client=get({supabaseUrl:'https://synthetic.invalid',secretKey:key})
  const result=await client.storage.from('hh-client-private-media').createSignedUploadUrl('synthetic')
  assert.equal(result.error,null)
  assert.equal(captured.headers.get('apikey'),key)
  assert.equal(captured.headers.has('authorization'),false)
  assert.equal(captured.redirect,'error')
  assert.ok(captured.url.startsWith('https://synthetic.invalid/storage/v1/'))
})
