import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  coachingReportDate,createCoachingSessionPdf,downloadCoachingSessionPdf,encodeJpegPagesAsPdf,
} from '../lib/personal-coaching/session-pdf.js'

const tinyJpeg=Uint8Array.from([0xff,0xd8,0xff,0xd9])
const fakeJpegUrl='data:image/jpeg;base64,'+Buffer.from(tinyJpeg).toString('base64')
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function withCanvas(callback){
  const previousDocument=globalThis.document
  const previousUrl=globalThis.URL
  const previousWindow=globalThis.window
  const lines=[]
  let downloads=0
  let revokeDelay
  const ctx={
    fillStyle:'',font:'',textBaseline:'',
    fillRect(){},
    fillText(text){lines.push(text)},
    measureText(text){return {width:Array.from(String(text)).length*19}},
  }
  const anchor={click(){downloads++},remove(){},set href(v){this._href=v},set download(v){this._download=v},set rel(v){}}
  globalThis.document={
    createElement(tag){return tag==='canvas'?{
      width:0,height:0,getContext(){return ctx},toDataURL(){return fakeJpegUrl},
    }:anchor},
    body:{appendChild(){}},
  }
  Object.defineProperty(globalThis,'URL',{configurable:true,value:{
    createObjectURL(blob){assert.equal(blob.type,'application/pdf');return 'blob:private-coaching-pdf'},
    revokeObjectURL() {},
  }})
  globalThis.window={setTimeout(fn,ms){revokeDelay=ms;return 0}}
  try{return callback({lines,downloads:()=>downloads,revokeDelay:()=>revokeDelay})}
  finally{
    globalThis.document=previousDocument
    globalThis.URL=previousUrl
    globalThis.window=previousWindow
  }
}

test('PDF bytes include valid object references, image pages, xref and downloadable MIME',async()=>{
  const pdf=encodeJpegPagesAsPdf([tinyJpeg,tinyJpeg])
  assert.equal(pdf.type,'application/pdf')
  const raw=Buffer.from(await pdf.arrayBuffer())
  const data=raw.toString('latin1')
  assert.match(data,/^%PDF-1\.4/)
  assert.match(data,/\/Type \/Pages \/Kids \[3 0 R 6 0 R\] \/Count 2/)
  assert.equal((data.match(/\/Subtype \/Image/g)||[]).length,2)
  const xref=Number(data.match(/startxref\n(\d+)\n/)[1])
  assert.equal(data.slice(xref,xref+4),'xref')
  const objectOffsets=Array.from(data.matchAll(/^(\d+) 0 obj$/gm),m=>({id:Number(m[1]),index:m.index}))
  const xrefLines=data.slice(xref).split('\n').slice(3,3+8)
  for(const {id,index} of objectOffsets)assert.equal(Number(xrefLines[id-1].slice(0,10)),Buffer.byteLength(data.slice(0,index),'latin1'))
  assert.match(data,/%%EOF\n$/)
})

test('dated report uses true persisted date, paints EN/RU/ES Unicode and long answers on multiple A4 pages',async()=>{
  const snapshots=[]
  withCanvas(({lines})=>{
    const report=createCoachingSessionPdf({
      locale:'ru',title:'Греческое планирование цели',slug:'greek',
      sessionDate:'2026-10-24T16:18:00-04:00',topic:'Работа и бизнес',
      entries:[
        {question:'Что действительно привлекает меня к этой цели?',answer:'Важен спокойный собственный путь и любимое дело.',reflection:'Хочу обсудить мои ценности.'},
        ...Array.from({length:28},(_,i)=>({
          question:'Что я замечаю на шаге '+(i+1)+'?',
          answer:('Мой личный длинный ответ с примерами и планом. ').repeat(18),
        })),
      ],
    })
    assert.equal(report.filename,'holistic-house-greek-2026-10-24.pdf')
    assert.equal(report.blob.type,'application/pdf')
    assert.ok(report.pages>1,'long sessions should paginate')
    assert.ok(lines.some(s=>s.includes('Греческое')))
    assert.ok(lines.some(s=>s.includes('Что действительно')))
    assert.ok(lines.some(s=>s.includes('24 октября 2026')))
    snapshots.push(report.pages)
  })
  assert.ok(snapshots[0]>1)
})

test('dates never silently use download date when saved session timestamps are missing',()=>{
  assert.equal(coachingReportDate(null,'ru'),'Дата не указана')
  assert.equal(coachingReportDate('invalid','es'),'Fecha no disponible')
  assert.match(coachingReportDate('2026-10-24T15:00:00-04:00','en'),/2026/)
})

test('browser downloads a PDF Blob directly with no server/upload call',()=>{
  withCanvas(({downloads,revokeDelay})=>{
    const name=downloadCoachingSessionPdf({
      title:'Personal coaching',sessionDate:'2026-10-24T18:00:00-04:00',
      entries:[{question:'What matters most?',answer:'My own response.'}],
    })
    assert.equal(name,'holistic-house-session-2026-10-24.pdf')
    assert.equal(downloads(),1)
    assert.equal(revokeDelay(),60000)
  })
})

test('signed-in coaching and traditions show account-save notice and persisted/history PDF; guest is explicit about tab-only notes',()=>{
  const personal=read('components/app/personal-coaching.jsx')
  const tradition=read('components/app/tradition-coaching.jsx')
  const guest=read('components/public-coaching-discovery.jsx')
  for(const src of [personal,tradition,guest]){
    assert.match(src,/data-coaching-save-report-notice/)
    assert.match(src,/data-coaching-download-pdf/)
    assert.match(src,/coachingReportDate/)
    assert.match(src,/downloadCoachingSessionPdf/)
    assert.match(src,/pdfError/)
  }
  assert.match(personal,/session\.completedAt\|\|session\.startedAt/)
  assert.match(personal,/questionsFor\(\{current:target\},catalog\)/)
  assert.match(personal,/target\.reflections/)
  assert.match(personal,/old\.status==='completed'/)
  assert.match(tradition,/session\.completedAt\|\|session\.startedAt/)
  assert.match(tradition,/old\.status==='completed'/)
  assert.match(guest,/guest session, answers stay only in this tab/)
  assert.match(guest,/В гостевой сессии ответы не сохраняются/)
  assert.match(guest,/setFinishedAt\(new Date\(\)\.toISOString\(\)\)/)
  // No raw answers, report images or saved private records go into URLs/API calls.
  const pdf=read('lib/personal-coaching/session-pdf.js')
  assert.doesNotMatch(pdf,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/)
  assert.match(pdf,/createObjectURL\(blob\)/)
})
