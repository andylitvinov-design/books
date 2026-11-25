import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { generateClientPdf } from '../lib/profile/client-report-pdf.js'

// Synthetic canvas capture checks the actual renderer without reading records,
// uploading data, or depending on fonts/browser/network availability.
for (const language of ['en', 'ru']) test(`PDF retains every shared scale explanation and action (${language})`, async () => {
  const printed=[]
  const ctx={beginPath(){},rect(){},roundRect(){},fill(){},
    measureText(text){return {width:String(text).length*10}},
    fillText(text){printed.push(String(text))}}
  const previous=globalThis.document
  globalThis.document={createElement(){return {getContext(){return ctx},toDataURL(){return 'data:image/jpeg;base64,/9j/2Q=='}}}}
  const sections=['alpha','beta'].map(key=>({key,domain:'same-domain',title:'Generic domain',construct:`Construct-${key}`,
    meaning:`Meaning-${key}`,band:`Band-${key}`,steps:[`Action-${key}-1`,`Action-${key}-2`,`Action-${key}-3`],
    followUp:`FollowUp-${key}`,limitations:[`Limitation-${key}-1`,`Limitation-${key}-2`],source:`https://example.org/${key}`}))
  const dimensions=sections.map(s=>({key:s.key,label:s.construct,value:8,min:2,max:12}))
  const report={language,title:'Synthetic report',accountName:'Synthetic',generatedAt:'2026-10-16',measuredRange:'2026-10-16',
    disclaimer:'Synthetic disclaimer',counts:{tests:1,attempts:1,scales:2,covered:1},overall:[],recommendations:[],latestScales:dimensions,
    tests:[{title:'Synthetic instrument',description:'Synthetic',date:'2026-10-16',source:'Synthetic',dimensions,conclusion:'Synthetic conclusion',
      interpretation:{sections,note:'Shared limitations'},attempts:[]}]}
  try {
    const pdf=await generateClientPdf(report)
    assert.equal(pdf.type,'application/pdf')
    const output=printed.join('\n')
    for(const s of sections) for(const expected of [s.construct,s.meaning,s.band,...s.steps,s.followUp,...s.limitations,s.source])
      assert.ok(output.includes(expected),`Missing ${expected}`)
    assert.match(output,language==='ru'?/Диапазон шкалы: 2–12/:/Scale range: 2–12/)
    assert.ok(!output.includes('Generic domain:'),'construct label must survive PDF export')
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
})

test('PDF never manufactures independent colored score meters or domain-deduplicates advice',async()=>{
  const source=await readFile(new URL('../lib/profile/client-report-pdf.js',import.meta.url),'utf8')
  assert.doesNotMatch(source,/function meter\(|shownDomains|section\.steps\.slice|\(value-min\)\/\(max-min\)/)
  assert.match(source,/for \(const section of test\.interpretation\.sections\)/)
})

for(const language of ['en','ru']) test(`oversized PDF meaning and paragraphs retain all ordered lines within page bounds (${language})`,async()=>{
  const captured=[];let page=0
  const previous=globalThis.document
  globalThis.document={createElement(){
    const pageNumber=++page
    const ctx={beginPath(){},rect(){},roundRect(){},fill(){},
      measureText(text){return {width:String(text).length*10}},
      fillText(text,x,y){captured.push({text:String(text),x,y,page:pageNumber,font:this.font})}}
    return {getContext(){return ctx},toDataURL(){return 'data:image/jpeg;base64,/9j/2Q=='}}
  }}
  const words=(prefix)=>Array.from({length:1600},(_,i)=>`${prefix}${String(i).padStart(4,'0')}`)
  const meaningWords=words(language==='ru'?'Смысл':'Meaning'), paragraphWords=words(language==='ru'?'Обзор':'Overview')
  const report={language,title:'Synthetic report',accountName:'Synthetic',generatedAt:'2026-10-16',measuredRange:'2026-10-16',
    disclaimer:'Synthetic disclaimer',counts:{tests:1,attempts:1,scales:0,covered:0},overall:[paragraphWords.join(' ')],
    recommendations:[],latestScales:[],tests:[{title:'Synthetic instrument',description:'Synthetic',date:'2026-10-16',source:'Synthetic',
      dimensions:[],conclusion:'Synthetic conclusion',attempts:[],interpretation:{note:'End of shared report',sections:[{
        key:'synthetic',construct:'Synthetic construct',meaning:meaningWords.join(' '),steps:['Final advice after long meaning'],limitations:[],
      }]}}]}
  try {
    await generateClientPdf(report)
    for(const expected of [paragraphWords,meaningWords]){
      const prefix=expected[0].replace(/\d+$/,'')
      // Page category labels can quote the paragraph beginning: exclude headers.
      const lines=captured.filter(row=>row.y>=158 && row.y<=1615 && row.text.includes(prefix))
      assert.ok(new Set(lines.map(row=>row.page)).size>1,'Long block must continue across pages')
      const actual=lines.flatMap(row=>row.text.split(' ').filter(word=>word.startsWith(prefix)&&/^\d{4}$/.test(word.slice(prefix.length))))
      assert.deepEqual(actual,expected,'Every word must appear exactly once and in original order')
    }
    const body=captured.filter(row=>row.page>1 && row.y>=158 && row.y!==1680)
    for(const row of body){
      const size=Number(row.font.match(/(\d+)px/)[1])
      assert.ok(row.y+size<=1615,`Body line overflows page ${row.page}: ${row.y}+${size}`)
    }
    assert.ok(captured.findIndex(row=>row.text==='Final advice after long meaning')>
      captured.findIndex(row=>row.text.includes(meaningWords.at(-1))),'Advice follows full meaning')
    for(let index=2;index<=page;index++){
      assert.ok(captured.some(row=>row.page===index&&row.y===61&&row.text==='HOLISTIC HOUSE'),'Continuation header')
      assert.ok(captured.some(row=>row.page===index&&row.y===1680),'Continuation footer')
    }
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
})
