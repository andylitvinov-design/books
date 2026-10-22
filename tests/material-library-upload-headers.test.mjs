import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../components/practitioner-materials-cabinet.jsx',import.meta.url),'utf8')
const start=source.indexOf('function uploadFile(')
const end=source.indexOf('\nexport ',start)
const fragment='async '+source.slice(start,end) // preserve the real async function with Safari proxy branch
async function exercise(code,mime='video/quicktime'){
 const calls=[]
 class XHR {
  constructor(){this.upload={};this.headers={};this.status=200}
  open(method,url){assert.equal(method,'PUT');assert.equal(url,'https://storage.example.invalid/signed')}
  setRequestHeader(key,value){assert.equal(Object.hasOwn(this.headers,key),false);this.headers[key]=value}
  send(file){calls.push({headers:this.headers,file});this.onload()}
 }
 const upload=new Function('XMLHttpRequest',code+'\n;return uploadFile')(XHR)
 const file={name:'synthetic.mov'}
 await upload({provider:'external',uploadUrl:'https://storage.example.invalid/signed'},file,mime)
 assert.deepEqual(calls,[{headers:{'Content-Type':mime,'If-None-Match':'*'},file}])
}
test('actual external library PUT matches signed MIME and create-only headers',async()=>{
 await exercise(fragment)
 await exercise(fragment,'video/mp4')
})
test('missing or wrong signed upload headers are rejected by regression contract',async()=>{
 for(const header of ['Content-Type','If-None-Match']){
  const line=fragment.split('\n').find(line=>line.includes("setRequestHeader('"+header+"'"))
  assert.ok(line)
  await assert.rejects(exercise(fragment.replace(line,'')))
  await assert.rejects(exercise(fragment.replace(line,"    xhr.setRequestHeader('"+header+"','wrong')")))
 }
})
