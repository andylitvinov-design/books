// Ordinary React SSR in a child process also works when test:app uses
// --conditions=react-server. Everything is synthetic; no account, DB or network.
import { readFileSync } from 'node:fs'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as recommendation from '../../lib/documents/recommendation.js'
import * as progress from '../../lib/documents/report-progress.js'
import * as heading from '../../lib/documents/report-heading.js'
import { sourceModule } from './source-contract-runtime.mjs'

const { document, locale } = JSON.parse(readFileSync(0, 'utf8'))
const remedy={canonical_latin_name:'Synthetic source title',primary_image:'/synthetic-source.jpg',
  primary_image_alt:'Synthetic source image',primary_source_url:'https://example.invalid/source',
  description:'SYNTHETIC_COMPLETE_LIBRARY_DESCRIPTION'}
const calls=[]
const empty=()=>null
const unexpectedNarration=()=>{throw new Error('Narration is outside this synthetic saved-document fixture')}
const { PrescriptionDocument }=sourceModule('components/prescription-document.jsx',{
  'react/jsx-runtime':jsx,
  'next/link':({children,href})=>React.createElement('a',{href},children),
  '@/data/remedies':{getRemedy:(requestedLocale,slug)=>requestedLocale===locale&&slug==='synthetic-remedy'?remedy:undefined},
  './remedy-content':{RemedyContent:props=>{
    calls.push({locale:props.locale,fullSource:props.fullSource,expandSupplementary:props.expandSupplementary,
      variant:props.variant,showEssence:props.showEssence,sourceUrl:props.sourceUrl,remedy:props.remedy})
    return React.createElement('p',{'data-synthetic-remedy-source':true},props.remedy.description)
  }},
  './remedy-report-thumbnail':{RemedyReportThumbnail:empty},
  './distance-homeopathy-guide':{DistanceHomeopathyGuide:props=>React.createElement('aside',{
    'data-distance-embedded':String(props.embedded),'data-distance-report':String(props.report)},'SYNTHETIC_DISTANCE_GUIDE')},
  '@/lib/documents/recommendation':recommendation,
  './document-auto-print':{DocumentAutoPrint:empty},
  './report-appendix-print-expander':{ReportAppendixPrintExpander:empty},
  './prescription-actions':{PrescriptionActions:empty},
  './report-narration-player':{ReportNarrationPlayer:empty},
  './local-report-narration-player':{LocalReportNarrationPlayer:unexpectedNarration},
  '@/lib/clients/local-narration-service':{localNarrationEnabled:unexpectedNarration},
  './dao-resource-stage':{DaoStageDisclosure:empty},
  '@/lib/clients/report-narration-service':{narrationEnabled:()=>false},
  './document-letterhead':{DocumentLetterhead:empty,DocumentSignature:empty},
  '@/lib/documents/report-progress':progress,
  '@/lib/consultations/recommended-tests':{resolveRecommendedTests:()=>[]},
  '@/lib/documents/report-heading':heading,
  './consultation-report.css':{},
})
const html=renderToStaticMarkup(React.createElement(PrescriptionDocument,{document,locale,embedded:true}))
process.stdout.write(JSON.stringify({html,calls}))
