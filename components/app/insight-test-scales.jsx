'use client'
import {useState} from 'react'
import Link from 'next/link'
import {ScoreGauge,ScoreTrend} from './assessment-gauge'
import {insightScaleOrder} from '@/lib/assessments/insight-scale-order'
export function InsightTestScales({result,report,previous,title,date,locale='en'}) {
 const ru=locale==='ru',ordered=insightScaleOrder(result.dimensions),[selectedKey,setSelectedKey]=useState(null)
 const index=Math.max(0,ordered.findIndex(d=>d.key===selectedKey)),dimension=ordered[index]
 const section=report.sections.find(s=>s.key===dimension?.key),available=report.status==='available'&&Boolean(section)
 const display=available?(section.bandBasis==='screening'?dimension:{...dimension,direction:'non-normative'}):null
 const change=delta=>setSelectedKey(ordered[(index+delta+ordered.length)%ordered.length].key)
 return <div data-insights-scales={result.definitionKey}>
   <Link href={`/${locale}/app/results/${encodeURIComponent(result.id)}`} className="hh-insights-test-link" prefetch={false}>
     <div className="hh-insights-test-gauge"><ScoreGauge dimension={display} locale={locale} compact/></div>
     <div className="hh-insights-test-body"><time dateTime={result.measurementAt}>{date}</time><h2>{title}</h2>
       {available&&<p className="hh-insights-test-summary"><strong>{section.construct}</strong><br/>{section.compact.status}</p>}
       <strong className="hh-insights-open">{ru?'Открыть отчёт и рекомендации':'Open analysis & recommendations'} →</strong>
     </div>
   </Link>
   {available&&ordered.length>1&&<div className="hh-insights-scale-switch" role="group" aria-label={ru?'Шкалы этого теста':'Scales in this test'}>
     <button type="button" onClick={()=>change(-1)} aria-label={ru?'Предыдущая шкала':'Previous scale'}>←</button>
     <span aria-live="polite" data-scale-counter>{index+1} {ru?'из':'of'} {ordered.length} · {section.construct}</span>
     <button type="button" onClick={()=>change(1)} aria-label={ru?'Следующая шкала':'Next scale'}>→</button>
   </div>}
   {available?<div className="hh-insights-explanation" data-insights-explanation={result.definitionKey} data-selected-scale={section.key}>
     <p>{section.compact.meaning}</p><p><strong>{ru?'Что может поддержать:':'Something you could try:'}</strong> {section.compact.recommendation||section.compact.recommendations[0]}</p>
     <ScoreTrend descriptive={section.bandBasis!=='screening'} current={result} previous={previous} dimensionKey={section.key} locale={locale}/>
     {ordered.length>1&&<small>{ru?'Сначала — минимальное положение внутри своей шкалы; это не означает «худший результат».':'Initially shows the lowest position within its own range; this does not mean the worst result.'}</small>}
   </div>:<p role="status">{report.note}</p>}
 </div>
}
