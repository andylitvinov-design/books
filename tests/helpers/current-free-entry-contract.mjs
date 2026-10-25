import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sourceModule,jsx,nodes,text} from './current-source-render.mjs'
import * as videoModel from '../../lib/site-videos/model.js'
const read = path => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
const css = {default:new Proxy({}, {get:(_,name)=>String(name)})}
export function assertCurrentFreeEntry({locale='en',source=read('components/free-entry-landing.tsx')}={}) {
  const videos=sourceModule(read('data/service-video-library.ts'),'data/service-video-library.ts',{'@/lib/site-videos/model':videoModel})
  const imported={
    'react/jsx-runtime':jsx,'next/image':{default:'img'},'next/link':{default:'a'},
    'lucide-react':Object.fromEntries('ArrowLeft ArrowRight CheckCircle2 ExternalLink ShieldCheck Sparkles'.split(' ').map(name=>[name,'icon-'+name])),
    '@/components/public-site-header':{PublicSiteHeader:'public-header'},
    '@/components/compact-lead-capture':{CompactLeadCapture:'compact-capture'},
    '@/components/free-situation-review-form':{FreeSituationReviewForm:'optional-review'},
    '@/components/site-video-player':{SiteVideoPlayer:'video'},
    '@/data/service-video-library':videos,'@/lib/site-videos/model':videoModel,
    '@/components/personal-testimonials':{PersonalTestimonials:'testimonials'},
    './free-entry-landing.module.css':css,
  }
  const {FreeEntryLanding}=sourceModule(source,'components/free-entry-landing.tsx',imported)
  for(const [kind,id,service] of [['dao','request-free-wu-xing','Free symbolic Wu Xing Resource Profile'],['situation','request-free-review','Free written Situation Review']]){
    const tree=FreeEntryLanding({locale,kind}), rendered=nodes(tree)
    assert.equal(tree.type,'main');assert.equal(tree.props.lang,locale)
    assert.equal(tree.props['data-free-entry-landing'],kind)
    const capture=rendered.filter(node=>node.type==='compact-capture')
    assert.equal(capture.length,1,'One live compact capture per independent free service')
    assert.equal(capture[0].props.locale,locale,'Capture keeps selected locale')
    assert.equal(capture[0].props.id,id,'Capture keeps service-specific target')
    assert.equal(capture[0].props.serviceTitle,service,'Capture keeps distinct truthful service identity')
    assert.ok(capture[0].props.title&&capture[0].props.lead,'Localized explanation remains present')
    assert.equal(typeof capture[0].props.disclaimer,'string','Capture must receive the actual limitations')
    const limitation = {
      en:'These self-reflection approaches are educational and symbolic. They do not diagnose or treat health conditions and do not replace qualified medical or mental-health care.',
      ru:'Эти методики предназначены для самоисследования и символической рефлексии. Они не диагностируют и не лечат заболевания и не заменяют медицинскую или психиатрическую помощь.',
      es:'Estas prácticas simbólicas y de autoobservación son educativas. No diagnostican ni tratan enfermedades y no sustituyen la atención médica o psicológica profesional.',
    }
    assert.equal(capture[0].props.disclaimer,limitation[locale],'Preserve the full non-diagnosis/non-treatment/non-replacement limitation')
    assert.doesNotMatch(text(tree)+' '+capture[0].props.disclaimer,/€50|€100|guaranteed cure|medical diagnosis provided/i)
    const review=rendered.filter(node=>node.type==='optional-review')
    assert.equal(review.length,kind==='situation'?1:0,'DAO never inherits the optional drawing questionnaire')
    if(kind==='situation'){
      const disclosure=rendered.filter(node=>node.type==='details'&&Object.hasOwn(node.props,'data-optional-written-review'))
      assert.equal(disclosure.length,1,'Written review remains a separate optional disclosure')
      assert.equal(disclosure[0].props.open,undefined,'Long questionnaire is initially closed')
      assert.ok(nodes(disclosure[0]).includes(review[0]))
      assert.equal(review[0].props.locale,locale)
    }
  }
}
