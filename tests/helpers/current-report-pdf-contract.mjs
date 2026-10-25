import assert from 'node:assert/strict'
import {returnedSource, opening, attributeText, expression, descendants, ts, text, nodes} from './current-source-render.mjs'
export function assertCurrentReportPdfActions(source) {
  const {file, owner, returned} = returnedSource(source, 'ClientSessionPage')
  const declaration = name => {
    const found = descendants(owner.body).filter(node => ts.isVariableDeclaration(node) && node.name.getText(file) === name)
    assert.equal(found.length, 1, 'Exactly one actual ' + name)
    return found[0].initializer
  }
  const content = declaration('content'), reportView = declaration('reportView')
  const view = expression(reportView, file, {content:'actual-content-marker', styles:{sessionSiteShell:'shell'}, locale:'en', PublicSiteHeader:'public-header'})
  assert.equal(text(view), 'actual-content-marker', 'The report wrapper includes actual content')
  for (const mode of ['owner','saved','guest','cabinet']) {
    const result = expression(returned.expression, file, {mode, reportView:view, locale:'en', selector:'synthetic', session:{id:'synthetic'}, appAvailable:true, SessionExitSaveGuard:'save-guard'})
    assert.ok(nodes(result).includes(view), 'Actual final return includes the report view in '+mode+' mode')
  }
  const anchors = descendants(content).filter(node => opening(node)?.tagName.getText(file) === 'a' &&
    ['pdf_preview','pdf_download'].includes(attributeText(node, 'data-hh-engagement-action', file)))
  assert.equal(anchors.length, 2, 'Exactly one preview and one download in the actual returned report')
  const pdfPathExpression = declaration('pdfPath')
  for (const locale of ['en','ru']) for (const [mode, base] of [
    ['owner','/admin/api/documents/synthetic-report/pdf'], ['saved','/api/app/saved-sessions/synthetic-saved/pdf'],
    ['guest','/api/client-session-viewer/synthetic-selector/pdf'], ['cabinet','/api/client/synthetic-selector/documents/synthetic-report/pdf'],
  ]) {
    const expected = base + '?locale=' + locale
    const pdfPath = expression(pdfPathExpression, file, {mode, locale, session:{report:{id:'synthetic-report'}}, savedId:'synthetic-saved', selector:'synthetic-selector'})
    assert.equal(pdfPath, expected, 'Preserve the actual mode-specific private PDF endpoint')
    const bindings = {pdfPath, ru:locale==='ru', styles:{reportPdfPreviewButton:'preview',downloadButton:'download'}, FileText:'icon-text',FileDown:'icon-down'}
    const [preview, download] = anchors.map(node => expression(node, file, bindings))
    assert.equal(preview.props.href, expected + '&preview=1&layout=a4', 'Preview keeps inline A4 query')
    assert.equal(preview.props.target, '_blank')
    assert.equal(preview.props.rel, 'noopener noreferrer')
    assert.equal(download.props.href, expected, 'Download never requests inline preview')
    assert.equal(download.props.download, true, 'Download retains native attachment intent')
    assert.equal(download.props.className, 'download')
    assert.equal(text(preview), locale==='ru'?'Просмотреть PDF-отчёт':'Preview PDF report')
    assert.equal(text(download), locale==='ru'?'Скачать отчёт':'Download report')
  }
}
