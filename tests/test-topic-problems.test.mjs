import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
 PUBLIC_TEST_PROBLEMS, problemsForTopics, normalizeProblemsForTopics,
 testProblemRelevance, relevanceForSelectedProblems, matchesSelectedProblems,
} from '../lib/assessments/test-problems.js'
import {
 buildExplorerEntries, filterExplorerEntries,
 rankPublicTestMatches, estimatedTestMatchPercent,
} from '../lib/assessments/test-explorer.js'
import { normalizeTestPreferences, makeTestSelectionIntent, readTestSelectionIntent } from '../lib/app/test-selection-intent.js'
const read = name => readFileSync(new URL('../'+name,import.meta.url),'utf8')

test('problem choices are subordinate to selected topics and all labels are translated',()=>{
 assert.equal(problemsForTopics([]).length,0)
 assert.equal(PUBLIC_TEST_PROBLEMS.length,new Set(PUBLIC_TEST_PROBLEMS.map(p=>p.key)).size)
 for(const problem of PUBLIC_TEST_PROBLEMS){
  assert.ok(problem.topics.length>0&&problem.signals.length>0&&problem.axes.length>0)
  for(const language of ['en','ru','es']) assert.ok(problem.label[language].length>3)
 }
 const stress=problemsForTopics(['stress']).map(p=>p.key)
 const relations=problemsForTopics(['relationships']).map(p=>p.key)
 assert.ok(stress.includes('work-overload'))
 assert.ok(!stress.includes('loneliness'))
 assert.ok(relations.includes('loneliness'))
 assert.ok(!relations.includes('work-overload'))
 assert.deepEqual(normalizeProblemsForTopics(['work-overload','loneliness'],['stress']),['work-overload'])
 assert.deepEqual(normalizeProblemsForTopics(['work-overload','loneliness'],[]),[])
})

test('selected concerns actually narrow runnable tests and update deterministic fit percentage',()=>{
 const entries=buildExplorerEntries({locale:'en',audience:'guest'})
 const base=filterExplorerEntries(entries,{availability:'available',focus:['stress']})
 const selected={focus:['stress'],problems:['work-overload'],depth:'balanced'}
 const refined=filterExplorerEntries(entries,{availability:'available',...selected})
 assert.ok(refined.length>0&&refined.length<=base.length)
 assert.ok(refined.every(entry=>entry.selectable&&matchesSelectedProblems(entry,selected.problems)))
 assert.ok(refined.some(entry=>testProblemRelevance(entry,'work-overload')>0))
 const initial=rankPublicTestMatches(base,{focus:['stress'],depth:'balanced'})
 const ranked=rankPublicTestMatches(refined,selected)
 assert.equal(ranked.length,refined.filter(entry=>entry.explicitOptIn !== true).length)
 assert.ok(ranked.every(x=>Number.isInteger(x.matchPercent)&&x.matchPercent>=0&&x.matchPercent<=99))
 assert.ok(ranked.every((x,i)=>i===0||ranked[i-1].matchPercent>=x.matchPercent))
 assert.ok(ranked.some(x=>initial.find(y=>y.key===x.key)?.matchPercent!==x.matchPercent))
 assert.equal(estimatedTestMatchPercent(ranked[0],selected),ranked[0].matchPercent)
 const fake={selectable:false,topics:['stress'],analysisAxes:[]}
 assert.equal(testProblemRelevance(fake,'work-overload'),0)
 assert.equal(relevanceForSelectedProblems(fake,['work-overload']),0)
})

test('the same-tab OAuth handoff stores only whitelisted topic-specific problem keys',()=>{
 const data={focus:['stress','sleep'],problems:['work-overload','unrested'],depth:'balanced'}
 assert.deepEqual(normalizeTestPreferences(data),data)
 const raw=makeTestSelectionIntent(['phq-4'],1000000,data)
 assert.deepEqual(readTestSelectionIntent(raw,1000500)?.preferences,data)
 assert.equal(normalizeTestPreferences({focus:['stress'],problems:['loneliness']}),null)
 assert.equal(normalizeTestPreferences({focus:[],problems:['work-overload']}),null)
 assert.equal(normalizeTestPreferences({focus:['stress'],problems:['unknown-diagnosis']}),null)
 assert.equal(normalizeTestPreferences({focus:['stress'],problems:['work-overload','work-overload']}),null)
 assert.equal(normalizeTestPreferences({focus:['stress'],problems:Array(13).fill('work-overload')}),null)
})

test('public selector displays conditional second step before optional depth and recommended test list',()=>{
 const picker=read('components/app/simple-test-picker.jsx')
 const explorer=read('components/app/test-explorer.jsx')
 const css=read('components/app/simple-test-picker.module.css')
 const one=picker.indexOf('id="hh-simple-topic-title"')
 const two=picker.indexOf('id="hh-simple-problems-title"')
 const advanced=picker.indexOf('<details className={styles.advanced} id="hh-more-test-filters">')
 const three=picker.indexOf('id="hh-simple-recommendations-title"')
 assert.ok(one>=0&&two>one&&advanced>two&&three>advanced)
 assert.match(picker,/data-topic-problem-filter/)
 assert.match(picker,/concernFocus\.length === 0/)
 assert.match(picker,/problem\.label\[locale\] \|\| problem\.label\.en/)
 assert.match(picker,/aria-pressed=\{checked\} data-problem-key=\{problem\.key\}/)
 assert.match(explorer,/onToggleProblem=\{\(key\) =>/)
 assert.match(explorer,/focus: selectionFocus, problems,/)
 assert.match(explorer,/setProblems\(\[\]\)/)
 assert.match(css,/\.problemChip\[aria-pressed='true'\]/)
})
