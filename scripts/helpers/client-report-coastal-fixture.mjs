// Offline-only, synthetic visual acceptance of the ACTUAL signed ClientSessionPage
// and PrescriptionDocument JSX with production CSS. Never loads client records.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import selectorParser from 'postcss-selector-parser'

export const origin = 'http://127.0.0.1:3100'
export const widths = Object.freeze([320, 375, 390, 430, 1280])
export const scope = 'ACTUAL_PRIVATE_REPORT_JSX_SYNTHETIC_SSR_AND_PRODUCTION_CSS_NO_CLIENT_AUTH_OR_API'
const root = new URL('../../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const paths = Object.freeze({
  page: 'components/client-session-page.jsx',
  signed: 'components/prescription-document.jsx',
  module: 'components/client-session.module.css',
  report: 'components/consultation-report.css',
  art: 'public/images/holistic-house/report-lighthouse-coast.svg',
  botanical: 'public/images/holistic-house/homepage-botanical.svg',
})
const cssPrefix = 'coastal_fixture_'
const icon = () => React.createElement('span', { 'aria-hidden': true }, '✧')
const icons = new Proxy({}, { get: () => icon })
const Link = ({ href, children }) => React.createElement('a', { href }, children)
const specimenSvg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90"><rect width="90" height="90" fill="#d1dfd3"/><path d="M18 77Q38 20 64 10M36 48Q18 21 8 29q5 29 28 19M50 33q-2-25 23-24Q74 29 50 33" stroke="#4c7864" stroke-width="5" fill="#aec6ab"/></svg>')
const specimen = Object.freeze({
  canonical_latin_name: 'Synthetic botanical specimen',
  primary_image: specimenSvg,
  primary_image_alt: 'Synthetic botanical illustration',
  primary_source_url: '#synthetic-source',
})

function scopeModules(css) {
  const styles = Object.create(null)
  const ast = postcss.parse(css, { from: paths.module })
  ast.walkRules(rule => {
    rule.selector = selectorParser(selectors => {
      // Only local CSS Module classes are renamed; classes nested in :global
      // are the real signed report selectors and MUST retain their identities.
      selectors.walkClasses(node => {
        let ancestor = node.parent, isGlobal = false
        while (ancestor) {
          if (ancestor.type === 'pseudo' && ancestor.value === ':global') {
            isGlobal = true
            break
          }
          ancestor = ancestor.parent
        }
        if (!isGlobal) node.value = styles[node.value] = cssPrefix + node.value
      })
      selectors.walkPseudos(node => {
        if (node.value !== ':global') return
        assert.ok(node.nodes?.[0]?.nodes?.length, 'Unexpected :global selector')
        node.replaceWith(...node.nodes[0].nodes.map(child => child.clone()))
      })
    }).processSync(rule.selector)
  })
  return { css: ast.toString(), styles: new Proxy(styles, {
    get: (map, key) => key === '__esModule' ? false :
      (typeof key === 'string' ? (map[key] || cssPrefix + key) : undefined),
  }) }
}

function transpile(path, content, deps) {
  const transformed = ts.transpileModule(content, {
    fileName: path,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    },
    reportDiagnostics: true,
  })
  assert.deepEqual((transformed.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), [])
  const loaded = { exports: {} }
  runInNewContext(transformed.outputText, {
    exports: loaded.exports,
    require: key => {
      assert.ok(Object.hasOwn(deps, key), path + ' unexpected runtime import: ' + key)
      return deps[key]
    },
  })
  return loaded.exports
}

function copy(locale) {
  const ru = locale === 'ru'
  return {
    patient: ru ? 'Клиент' : 'Client',
    date: ru ? 'Дата' : 'Date',
    number: ru ? 'Номер' : 'Number',
    intro: ru ? 'Описание' : 'Description',
    analysis: ru ? 'Анализ состояния' : 'State analysis',
    purpose: ru ? 'Назначение' : 'Purpose',
    dosage: ru ? 'Дополнительно' : 'Details',
    frequency: ru ? 'Порядок' : 'Order',
    duration: ru ? 'Период' : 'Period',
    sequence: ru ? 'Последовательность' : 'Sequence',
    instructions: ru ? 'Наблюдение' : 'Observation',
    additionalNotes: ru ? 'Примечания и рекомендации' : 'Notes and recommendations',
    general: ru ? 'Общие указания' : 'General notes',
    followUp: ru ? 'Последующий контакт' : 'Follow up',
    disclaimer: ru ? 'Демонстрационный макет без медицинского содержания.' : 'Synthetic fixture without medical content.',
  }
}

export function syntheticCases() {
  return ['ru', 'en'].flatMap(locale => ['full', 'compact'].map(mode => ({
    locale, mode, path: '/__hh-visual-report/' + locale + '/' + mode,
  })))
}

export async function buildCoastalFixture() {
  const proofs = []
  const source = async path => {
    const bytes = await read(path)
    proofs.push({ path, sha256: createHash('sha256').update(bytes).digest('hex') })
    return bytes
  }
  const [pageSource, signedSource, moduleSource, reportCss, art, botanical] =
    await Promise.all(Object.values(paths).map(source))
  assert.match(pageSource, /data-hh-report-theme="coastal-v2"/)
  assert.match(signedSource, /canonical-report-cover/)
  assert.match(moduleSource, /Coastal v2 continuity/)
  assert.ok(!/https?:\/\//.test(art.replace('xmlns="http://www.w3.org/2000/svg"', '')) && !art.includes('<script'))
  const appStyles = await source('app/globals.css')
  const rootTailwindConfig = await source('tailwind.config.ts')
  assert.ok(rootTailwindConfig.includes('content'))
  const compiledGlobal = await postcss([
    tailwindcss({config:fileURLToPath(new URL('tailwind.config.ts',root))}),autoprefixer(),
  ]).process(appStyles,{from:fileURLToPath(new URL('app/globals.css',root))})
  assert.deepEqual(compiledGlobal.warnings().map(w=>w.toString()),[])
  const scoped = scopeModules(moduleSource)
  const deps = {
    'react/jsx-runtime': jsxRuntime,
    'next/link': { __esModule: true, default: Link },
    '@/data/remedies': { getRemedy: () => specimen },
    './remedy-content': { RemedyContent: () => React.createElement('p', null, 'Synthetic appendix description. No private source material.') },
    './distance-homeopathy-guide': { DistanceHomeopathyGuide: () => null },
    '@/lib/documents/recommendation': {
      recommendationCopy: copy, recommendationGuidance: () => undefined,
      recommendationItemType: () => 'homeopathy',
      remedySchedule: (item) => item.syntheticDescription,
      reportFollowUpDetails: () => undefined,
    },
    './document-auto-print': { DocumentAutoPrint: () => null },
    './report-appendix-print-expander': { ReportAppendixPrintExpander: () => null },
    './prescription-actions': { PrescriptionActions: () => null },
    // Match current production imports while keeping the browser fixture fully synthetic.
    './report-narration-player': { ReportNarrationPlayer: () => null },
    './dao-resource-stage': { DaoStageDisclosure: () => null },
    '@/lib/clients/report-narration-service': { narrationEnabled: () => false },
    './document-letterhead': {
      DocumentLetterhead: () => React.createElement('div', { className: 'canonical-letterhead canonical-letterhead--compact' },
        React.createElement('div', null,
          React.createElement('p', { className: 'canonical-practitioner' }, 'Synthetic therapist profile'),
          React.createElement('p', { className: 'canonical-credentials' }, 'Illustrative report · no client data'))),
      DocumentSignature: () => React.createElement('div', { className: 'canonical-signature canonical-signature--wide' }, 'Sample signature placeholder'),
    },
    '@/lib/documents/report-progress': {
      resolveReportProgress: document => document?.analysis?.includes('3/10') ? { before: 3, after: 6 } : null,
    },
    '@/lib/consultations/recommended-tests': { resolveRecommendedTests: () => [] },
    '@/lib/documents/report-heading': {
      clientReportHeading: locale => locale === 'ru' ? 'Гомеопатическая рекомендация' : 'Personal recommendation',
    },
    './consultation-report.css': {},
  }
  const Signed = transpile(paths.signed, signedSource, deps).PrescriptionDocument
  assert.equal(typeof Signed, 'function')
  const clientDeps = {
    'react/jsx-runtime': jsxRuntime,
    'react': React,
    'lucide-react': icons,
    './client-session-prescription': { SessionPrescriptionOverview: () => React.createElement('section', {className: scoped.styles.prescriptionSummary}, 'Synthetic concise note') },
    './dao-resource-stage': deps['./dao-resource-stage'],
    './client-session-voice-card.module.css': scoped.styles,
    './static-portrait': { StaticPortrait: () => null },
    './public-site-header': { PublicSiteHeader: () => React.createElement('div', {className:'house-header house-header--services'}, 'HOLISTIC HOUSE') },
    '@/lib/documents/recommendation': deps['@/lib/documents/recommendation'],
    '@/lib/clients/shared-education-model': { GRANULES_GUIDE_ID: 'synthetic-guide', GRANULES_GUIDE_TRANSCRIPT_RU: '' },
    './save-client-session-to-account': { SaveClientSessionToAccount: () =>
      React.createElement('a', {className: scoped.styles.sessionBottomPrimary, href:'#save-synthetic'}, 'Save selected report') },
    './session-exit-save-guard': { SessionExitSaveGuard: ({ children }) => children },
    './session-youtube-player': { SessionYouTubePlayer: ({ title }) =>
      React.createElement('article', {className: scoped.styles.youtubeLesson},
        React.createElement('div', {className: scoped.styles.youtubeLessonHeading}, title),
        React.createElement('div', {className: scoped.styles.youtubeLessonFrame}, 'Synthetic material preview')) },
    './session-private-video-poster': { SessionPrivateVideoPoster: () => null },
    './client-session.module.css': scoped.styles,
  }
  const Viewer = transpile(paths.page, pageSource, clientDeps).ClientSessionPage
  assert.equal(typeof Viewer, 'function')
  const css = (compiledGlobal.css + '\n' + reportCss + '\n' + scoped.css).replace(/<\/style/gi, '<\\/style')
  return {
    sourceProof:proofs,
    styleData: css,
    imageBytes: art,
    botanicalBytes: botanical,
    path: paths,
    document({locale, mode}) {
      assert.ok(['en','ru'].includes(locale))
      assert.ok(['full','compact'].includes(mode))
      const ru = locale === 'ru'
      const full = mode === 'full'
      const document = {
        patientName: ru ? 'Учебный образец' : 'Synthetic Example',
        dateIssued: '2026-10-13',
        recommendationType:'homeopathy',
        analysis: full ? (ru ?
          'Было: условная оценка 3/10, учебное наблюдение без личной истории.\n\nПосле сессии: условная оценка 6/10, пример описания перемены состояния.\n\nДальнейшее наблюдение: короткое пояснение без назначения.' :
          'Before: illustrative rating 3/10 with no client history.\n\nAfter session: illustrative rating 6/10.\n\nNext observation: short example, not advice.') : '',
        additionalNotes: full ? (ru ? 'Учебные примечания без назначений.' : 'Sample remarks without instructions.') : '',
        generalInstructions: '',
        items: full ? [{
          displayName: 'Synthetic Botanical Specimen – Long Sample Label',
          remedySlug: 'synthetic-demo-botanical',
          // Synthetic UI-only values: exercise title potency and regimen layout,
          // never a clinical/client prescription.
          potency: '30',
          syntheticDescription: ru ? 'потенция 30 · 6 гранул · 3×/день' : 'potency 30 · 6 granules · 3×/day',
          purpose: ru ? 'Пример вёрстки карточки' : 'Card layout demonstration',
          remedyPath: '#synthetic-remedy',
        }] : [],
        recommendedTests: full ? [{key:'synthetic-test', title:ru?'Демонстрационный тест':'Example test', href:'#synthetic-test', startLocale:locale}] : [],
      }
      const session = {
        id:'fixture-session', title:ru?'Демонстрационный отчёт':'Sample consultation report',
        occurredOn:'2026-10-13', summary:ru?'Личное сообщение в учебном примере.':'A synthetic personal note.',
        report:full ? {id:'synthetic-report'} : null,
        media:full ? [{kind:'audio',role:'personal',assetId:'synthetic-audio',title:ru?'Пример аудиосообщения':'Sample voice note'}] : [],
        plan:{
          nextStep:ru?'Прочитайте материалы демо-отчёта.':'Explore these illustrative notes.',
          focus:ru?'Небольшой бережный шаг.':'One small step.',
          resources:full ? [{kind:'youtube',placement:'materials',title:ru?'Учебное видео':'Sample video',url:'https://example.invalid/watch'}] : [],
          takeaways:[],practices:[],materials:[],
        },
      }
      const reportContent = full ? React.createElement(Signed, {document,locale,embedded:true}) : null
      const html = renderToStaticMarkup(React.createElement(Viewer,{
        session,selector:'synthetic-selector',locale,mode:'guest',clientName:document.patientName,
        appAvailable:true,reportContent,recommendation:document,sharedGuideReady:false,
      }))
      assert.ok(html.includes('data-hh-report-theme="coastal-v2"'))
      if(full)assert.ok(html.includes('canonical-report-cover'))
      else assert.ok(!html.includes('canonical-report-cover'))
      return '<!doctype html><html lang="' + locale + '"><head>'+
        '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
        '<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">'+
        '<link rel="icon" href="data:,">'+
        '<title>Synthetic Coastal Client Report QA</title>'+
        '<style>' + css + '</style></head><body>' + html + '</body></html>'
    },
  }
}

export function requireHosted(env) {
  assert.equal(env.CI,'true')
  assert.equal(env.GITHUB_ACTIONS,'true')
  assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted')
  assert.equal(env.HH_REPORT_QA_ISOLATED,'true')
  assert.ok(!env.VERCEL,'Browser fixture never runs on a deployment')
}
