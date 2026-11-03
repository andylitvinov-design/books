import test from 'node:test'
import assert from 'node:assert/strict'
import {ASSESSMENT_DEFINITIONS} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {gaugeModel} from '../lib/assessments/dashboard-gauges.js'
for(const key of ['cbi-personal','cbi-work','cbi-client'])for(const locale of ['en','ru'])test(key+' '+locale+' labels arithmetic positions without inventing response frequency',()=>{
 const d=ASSESSMENT_DEFINITIONS.find(d=>d.key===key&&d.instrumentLocale==='en')
 const r=scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,q.min??d.answerScale.min])))
 const m=gaugeModel(r.dimensions[0],r,locale),g=m.scoreLevelGuide
 assert.equal(g.bands.length,5);assert.equal(m.bands.length,0)
 assert.deepEqual(g.bands.map(b=>b.label),locale==='ru'?['Ближе к минимуму','Ниже середины','Средняя часть','Выше середины','Ближе к максимуму']:['Near the minimum','Below the midpoint','Middle range','Above the midpoint','Near the maximum'])
 for(const b of g.bands)assert.doesNotMatch(b.label,/rarely|often|редко|часто/i)
 assert.match(g.caveat,locale==='ru'?/не.*норм|не.*порог/:/not published norms|not.*cutoff/i)
 assert.equal(g.bands.filter(b=>b.current).length,1)
})
