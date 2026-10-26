// Execute actual TSX state handlers with pure dependencies. No DOM/browser claims:
// effects, layout, real randomness, navigation defaults and media require browser QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceModule, jsx, nodes, text, denied} from './current-source-render.mjs';
import * as dao from '../../data/dao-hexagrams.mjs';
import * as guidance from '../../lib/ideas-guidance.mjs';
export {nodes, text};
export const readHolistic = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

export function mountHolistic(name, locale, {sourceOverride, variant = 'holistic-dao'} = {}) {
  const slots = []; let index = 0, tree, draws = 0;
  const hooks = {
    useState(initial) {
      const key = index++;
      if (!Object.hasOwn(slots, key)) slots[key] = typeof initial === 'function' ? initial() : initial;
      return [slots[key], next => {slots[key] = typeof next === 'function' ? next(slots[key]) : next;}];
    },
    useRef(initial) { const key = index++; return slots[key] ?? (slots[key] = {current:initial}); },
    useEffect() {},
  };
  const icons = Object.fromEntries(['ArrowRight','ArrowUpRight','BookOpen','ChevronDown','Compass','Flower2','Gift',
    'Paperclip','ClipboardCheck','HeartHandshake','Headphones','Quote','X','Sparkles','Sprout','Sun'].map(name => [name, 'icon-' + name]));
  const imports = {
    react:hooks, 'react/jsx-runtime':jsx, 'next/image':{default:'img'}, 'next/link':{default:'a'},
    'next/navigation':{useRouter:()=>({push:denied})}, 'lucide-react':icons,
    '@/components/ideas-discovery':{IdeasDiscovery:'ideas-engine'},
    '@/components/dao-hexagram-glyph':{DaoHexagramGlyph:'dao-glyph'},
    '@/components/compact-lead-capture':{CompactLeadCapture:'compact-lead'},
    '@/components/tests-coaching-switchboard':{TestsCoachingSwitchboard:'switchboard'},
    '@/data/dao-hexagrams.mjs':dao, '@/lib/ideas-guidance.mjs':guidance,
    '@/lib/dao-divination.mjs':{drawRandomHexagram:()=>{draws++; return 42;}},
    '@/lib/ideas-preview-rotation.mjs':{rotateIdeasPreviewAphorisms:denied},
    '@/lib/ideas-coaching-handoff':{stageIdeasCoachingQuestion:denied},
    '@/lib/practitioners/remote-energy-support':{stageRemoteSupportLandingIntention:denied},
    './ideas-discovery.module.css':{default:{}},
    '@/app/[locale]/holistic-support/holistic-support.module.css':{default:{}},
  };
  const path = name === 'choices' ? 'components/holistic-support-choices.tsx' : 'components/ideas-discovery.tsx';
  const exportName = name === 'choices' ? 'HolisticSupportChoices' : 'IdeasDiscovery';
  const component = sourceModule(sourceOverride ?? readHolistic(path), path, imports)[exportName];
  const flush = () => {index = 0; tree = component({locale, variant}); return tree;};
  flush();
  return {get tree(){return tree;}, get draws(){return draws;}, flush,
    find(predicate) { const found = nodes(tree).filter(predicate); assert.equal(found.length, 1, 'Exactly one source node'); return found[0]; },
  };
}

export function assertClosedHolisticChoices(tree, locale) {
  const list = nodes(tree), root = list.find(node => node.props['data-holistic-first-screen']);
  assert.ok(root && root.props['data-holistic-three-choices']);
  assert.equal(root.props.id, undefined);
  assert.equal(root.props['aria-labelledby'], 'holistic-journey-title');
  assert.equal(list.filter(node => node.props.id === 'holistic-journey-title').length, 1);
  const choices = list.filter(node => node.props['data-holistic-choose']);
  assert.deepEqual(choices.map(node => node.props['data-holistic-choose']), ['meditations','energy','dao']);
  assert.equal(choices[0].props.href, '#meditation-practices');
  assert.equal(choices[1].props.href, '/' + locale + '/services/remote-energy-support');
  assert.equal(choices[1].props.onClick, undefined, 'Energy selection does not secretly stage the Dao question');
  assert.equal(choices[2].type, 'button');
  assert.equal(choices[2].props.type, 'button');
  assert.equal(choices[2].props['aria-controls'], 'dao-guidance');
  assert.equal(choices[2].props['aria-expanded'], false);
  assert.equal(list.filter(node => node.props['data-holistic-dao-screen']).length, 0);
  assert.equal(list.filter(node => node.type === 'ideas-engine').length, 0);
}
