import test from 'node:test'
import assert from 'node:assert/strict'
import {requestOrigin,requireSameOrigin} from '../lib/app/config.js'
const cfg={origins:['https://preview.example','https://app.example','http://127.0.0.1:3100']}
const req=(url,headers)=>new Request(url,{headers})
test('normalized internal URL resolves only to the exact server-configured Host origin',()=>{
 assert.equal(requireSameOrigin(req('http://localhost:3100/api/app/runs',{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'}),cfg),'http://127.0.0.1:3100')
 assert.equal(requestOrigin(req('http://internal:3000/api/app/auth/callback',{host:'preview.example'}),cfg),'https://preview.example')
})
test('untrusted host and forwarded origin cannot select a redirect or bypass source origin',()=>{
 for(const host of ['app.example.evil.test','evil.test','app.example,evil.test','app.example/path','app.example@evil.test']) assert.throws(()=>requestOrigin(req('https://app.example/api/app/auth/callback',{host,'x-forwarded-host':'app.example'}),cfg),/ORIGIN_DENIED/)
 assert.throws(()=>requireSameOrigin(req('http://internal/api/app/runs',{host:'app.example',origin:'https://preview.example'}),cfg),/ORIGIN_DENIED/)
 assert.throws(()=>requireSameOrigin(req('http://internal/api/app/runs',{host:'app.example','x-forwarded-host':'app.example'}),cfg),/ORIGIN_DENIED/)
})
test('ambiguous configured protocols fail closed and valid direct requests still work',()=>{
 assert.throws(()=>requestOrigin(req('http://internal/x',{host:'app.example'}),{origins:['https://app.example','http://app.example']}),/ORIGIN_DENIED/)
 assert.equal(requireSameOrigin(req('https://app.example/x',{origin:'https://app.example'}),cfg),'https://app.example')
})
