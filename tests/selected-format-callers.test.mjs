import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as enquiries from '../lib/whatsapp-enquiry.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jsx = (type, props) => ({type,props:props || {}});
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree,...nodes(tree.props.children)];
function compile(path, modules, transform = x => x) {
  const exports = {};
  runInNewContext(ts.transpileModule(transform(read(path)), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText, {
    exports, require(name) { assert.ok(Object.hasOwn(modules,name), 'Explicit safe dependency: ' + name); return modules[name]; },
  });
  return exports;
}
const businessCopy = compile('data/business-consulting-copy.ts',{}).businessConsultingCopy;
function mount(file, component, props, transform) {
  const values = []; let cursor = 0;
  const modules = {
    'react/jsx-runtime':{jsx,jsxs:jsx},
    react:{useId:()=> 'synthetic',useEffect(){},useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],value=>{values[i]=value;}];}},
    'next/link':{default:'a'}, 'next/image':{default:'img'},
    'lucide-react':Object.fromEntries(['ArrowRight','ArrowUpRight','Check','ChevronDown','ClipboardCheck','Compass','Lightbulb','ShieldCheck','FileText','HeartHandshake','Send'].map(name=>[name,'svg'])),
    '@/components/contact-channel-chooser':{ContactChannelChooser:'Chooser'},
    '@/components/acquisition-event-link':{AcquisitionEventLink:'a'},
    '@/components/public-site-header':{PublicSiteHeader:'Header'},
    '@/components/business-website-enquiry':{BusinessWebsiteEnquiry:'WebsiteEnquiry'},
    '@/lib/whatsapp-enquiry':enquiries,
    '@/lib/commerce/zen-transfer-inquiry':{buildZenTransferInquiry:()=>null},
    '@/data/business-consulting-copy':{businessConsultingCopy:businessCopy},
    './alchemy-soul-landing.module.css':{default:{}},
    './consultation-choice-capture.module.css':{default:{}},
    './business-consulting-landing.module.css':{default:{}},
  };
  const exports=compile('components/'+file+'.tsx',modules,transform);
  return () => {cursor=0;return exports[component](props);};
}
const alchemy = {
  en:{'60':'Personal session · 60 min · €100','30':'Express review · 30 min · €50',month:'Four-week support · discuss details'},
  ru:{'60':'Личная сессия · 60 минут · €100','30':'Экспресс · 30 минут · €50',month:'4 недели сопровождения · обсудить условия'},
  es:{'60':'Sesión personal · 60 minutos · €100','30':'Revisión exprés · 30 minutos · €50',month:'Acompañamiento de cuatro semanas · consultar condiciones'},
};
const consultation = {
  en:{session:'60-minute personal session · €100',questions:'30-minute express consultation · €50'},
  ru:{session:'Личная сессия 60 минут · €100',questions:'Экспресс-консультация 30 минут · €50'},
  es:{session:'Sesión personal de 60 minutos · €100',questions:'Consulta exprés de 30 minutos · €50'},
};
const alchemyTitle={en:'Alchemy of the Soul / Psycho-homeopathy',ru:'Алхимия души / Психогомеопатия',es:'Alquimia del Alma / Psicohomeopatía'};
function verify(chooser, expected, title, locale) {
  assert.equal(chooser.props.selectedFormat,expected);
  assert.ok(expected.length < 120);
  assert.doesNotMatch(expected,/https?:|Hello|Здравствуйте|Hola|private-marker/);
  const url=new URL(chooser.props.whatsappUrl);
  assert.equal(url.hostname,'wa.me');
  const message=url.searchParams.get('text');
  assert.ok(message.includes(expected),'Original approved messenger option is preserved');
  assert.ok(message.includes(title),'Canonical service identity is preserved');
  assert.equal(message.split(expected).length-1,1,'No duplicated option text');
}
for(const locale of ['en','ru','es']) {
  for(const component of ['AlchemySoulLeadForm','AlchemySoulFormatSelector']) test(locale+' '+component+' forwards every real selected option',()=>{
    const render=mount('alchemy-soul-lead-form',component,{locale});
    for(const format of ['60','30','month','60']) {
      let tree=render();
      if(component==='AlchemySoulLeadForm') nodes(tree).find(n=>n.type==='select').props.onChange({target:{value:format}});
      else nodes(tree).find(n=>n.props['data-alchemy-format']===format).props.onClick();
      tree=render();const choosers=nodes(tree).filter(n=>n.type==='Chooser');assert.equal(choosers.length,1);
      verify(choosers[0],alchemy[locale][format],alchemyTitle[locale],locale);
    }
  });
  test(locale+' consultation paid choices preserve selected format and free choice stays internal',()=>{
    const render=mount('consultation-choice-capture','ConsultationChoiceCapture',{locale,variant:'service',service:'Approved public service'});
    for(const choice of ['session','questions','free','session']) {
      let tree=render();const buttons=nodes(tree).filter(n=>n.type==='button'&&n.props['aria-pressed']!==undefined);
      buttons[['session','questions','free'].indexOf(choice)].props.onClick();
      const found=nodes(render()).filter(n=>n.type==='Chooser');
      assert.equal(found.length,choice==='free'?0:1);
      if(choice!=='free')verify(found[0],consultation[locale][choice],'Approved public service',locale);
    }
  });
  for(const variant of ['free','personal','reading']) test(locale+' '+variant+' does not introduce a paid chooser',()=>{
    assert.equal(nodes(mount('consultation-choice-capture','ConsultationChoiceCapture',{locale,variant})()).filter(n=>n.type==='Chooser').length,0);
  });
  test(locale+' every business paid placement preserves its approved option',()=>{
    const tree=mount('business-consulting-landing','BusinessConsultingLanding',{locale})();
    const choosers=nodes(tree).filter(n=>n.type==='Chooser');
    assert.equal(choosers.length,6);
    assert.deepEqual(choosers.map(n=>n.props.attributes['data-business-format']),['express','full','mentoring','express-bottom','full-bottom','mentoring-bottom']);
    for(const chooser of choosers) {
      const kind=chooser.props.attributes['data-business-format'].replace('-bottom','');
      const expected={express:'30 min · €50',full:'60 min · €100',mentoring:'Goals Mentoring · details by agreement'}[kind];
      verify(chooser,expected,businessCopy[locale].title,locale);
    }
  });
}
test('rendered prop proof rejects missing selected format',()=>{
  const render=mount('alchemy-soul-lead-form','AlchemySoulLeadForm',{locale:'en'},s=>s.replace('selectedFormat={t.formatNames[format]}',''));
  assert.throws(()=>verify(nodes(render()).find(n=>n.type==='Chooser'),alchemy.en['60'],alchemyTitle.en,'en'));
});
test('rendered prop proof rejects full messenger URL copied into format',()=>{
  const render=mount('consultation-choice-capture','ConsultationChoiceCapture',{locale:'en',variant:'service'},s=>s.replace('selectedFormat={t.serviceOptions[serviceChoice]}','selectedFormat={whatsappUrl}'));
  assert.throws(()=>verify(nodes(render()).find(n=>n.type==='Chooser'),consultation.en.session,'Personal consultation','en'));
});
