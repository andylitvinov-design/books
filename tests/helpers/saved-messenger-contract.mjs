// Parsed production JSX guards, not a browser or network simulation.
import assert from 'node:assert/strict'
import ts from 'typescript'
import vm from 'node:vm'
const unwrap = node => node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) ? unwrap(node.expression) : node
const descendants = node => {
  const nodes = []
  function walk(value) { nodes.push(value); ts.forEachChild(value, walk) }
  if (node) walk(node)
  return nodes
}
const tag = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
const attribute = (node, name) => tag(node)?.attributes.properties.find(value => value.name?.text === name)?.initializer
const value = (node, name, file) => {
  const init = attribute(node, name)
  return init && (ts.isJsxExpression(init) ? init.expression?.getText(file) : init.text)
}
function parsed(source) {
  const file = ts.createSourceFile('contact-channel-chooser.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(file.parseDiagnostics.length, 0)
  const functions = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ContactChannelChooser')
  assert.equal(functions.length, 1)
  const statements = functions[0].body.statements
  const normal = statements.filter(ts.isReturnStatement)
  assert.equal(normal.length, 1, 'One genuine normal chooser return')
  const compactIf = statements.filter(node => ts.isIfStatement(node) && node.expression.getText(file) === 'compactPhone')
  assert.equal(compactIf.length, 1, 'One genuine compact chooser branch')
  assert.ok(ts.isBlock(compactIf[0].thenStatement))
  const compact = compactIf[0].thenStatement.statements.filter(ts.isReturnStatement)
  assert.equal(compact.length, 1, 'One genuine compact chooser return')
  return {file, component: functions[0], branches: {normal: normal[0].expression, compact: compact[0].expression}}
}

// Mutate one AST node in one selected genuine return, never a first textual
// occurrence in an unrelated branch. Cardinality failures are test errors.
export function mutateSavedMessengerBranch(source, branch, target, replacement) {
  const {file, branches} = parsed(source)
  assert.ok(Object.hasOwn(branches, branch), 'Unknown chooser branch: ' + branch)
  const nodes = descendants(branches[branch])
  const targets = nodes.filter(node => {
    if (target === 'receiptGate') return ts.isConditionalExpression(node) && node.condition.getText(file) === '!saved'
    if (target === 'reference') return ts.isJsxExpression(node) && node.expression?.getText(file) === 'saved.referenceCode'
    if (target === 'whatsapp') return tag(node)?.tagName.getText(file) === 'AcquisitionEventLink' && value(node, 'href', file) === 'preparedWhatsApp'
    if (target === 'telegram') return tag(node)?.tagName.getText(file) === 'AcquisitionEventLink' && value(node, 'href', file) === 'telegramEnquiryUrlFromWhatsApp(preparedWhatsApp)'
    if (target === 'submitDisabled') return tag(node)?.tagName.getText(file) === 'button' && value(node, 'type', file) === 'submit'
    throw new Error('Unknown mutation target: ' + target)
  })
  assert.equal(targets.length, 1, branch + ': exact mutation target cardinality for ' + target)
  const selected = targets[0]
  const node = target === 'receiptGate' ? selected.condition : target === 'reference' ? selected.expression
    : attribute(selected, target === 'submitDisabled' ? 'disabled' : 'href').expression
  return source.slice(0, node.getStart(file)) + replacement + source.slice(node.end)
}

export function assertSavedMessengerContract(source) {
  const {file, component, branches} = parsed(source)
  for (const [branch, returnedNode] of Object.entries(branches)) {
    const returned = descendants(returnedNode)
    const gates = returned.filter(node => ts.isConditionalExpression(node) && node.condition.getText(file) === '!saved')
    assert.equal(gates.length, 1, branch + ': one saved-receipt gate in the actual returned chooser')
    const gate = gates[0], form = unwrap(gate.whenTrue)
    assert.equal(tag(form)?.tagName.getText(file), 'form', 'Unsaved branch is the actual intake form')
    assert.equal(value(form, 'onSubmit', file), branch === 'normal' ? 'submit' : 'event => event.preventDefault()')
    const after = descendants(gate.whenFalse)
    const links = returned.filter(node => tag(node)?.tagName.getText(file) === 'AcquisitionEventLink')
    assert.equal(links.length, 2, branch + ': exactly two messenger links in the actual returned chooser')
    for (const node of links) assert.ok(after.includes(node), 'Messenger links must remain inside the saved branch')
    assert.deepEqual(links.map(node => value(node, 'href', file)), ['preparedWhatsApp', 'telegramEnquiryUrlFromWhatsApp(preparedWhatsApp)'])
    for (const node of links) {
      assert.equal(value(node, 'target', file), '_blank')
      assert.equal(value(node, 'rel', file), 'noopener noreferrer')
    }
    assert.ok(after.some(node => ts.isJsxExpression(node) && node.expression?.getText(file) === 'saved.referenceCode'), branch + ': saved branch displays the verified reference')
    assert.ok(after.some(node => ts.isJsxExpression(node) && node.expression?.getText(file) === (branch === 'normal' ? 'c.next' : 'c.compactSaved')), 'Post-save messenger explanation is rendered')
    const consents = descendants(form).filter(node => tag(node)?.tagName.getText(file) === 'input' && value(node, 'type', file) === 'checkbox')
    assert.equal(consents.length, 1)
    assert.equal(value(consents[0], 'checked', file), 'consent')
    assert.ok(tag(consents[0]).attributes.properties.some(node => node.name?.text === 'required'))
    if (branch === 'compact') {
      const buttons = descendants(form).filter(node => tag(node)?.tagName.getText(file) === 'button')
      assert.equal(buttons.length, 2)
      assert.deepEqual(buttons.map(node => value(node, 'data-contact-channel-submit', file)), ['whatsapp', 'telegram'])
      for (const channel of ['whatsapp', 'telegram']) assert.ok(buttons.some(node => value(node, 'onClick', file) === '() => { void saveEnquiry("' + channel + '"); }'))
      continue // Compact consent is validated in saveEnquiry, executed by component tests.
    }
    const submits = descendants(form).filter(node => tag(node)?.tagName.getText(file) === 'button' && value(node, 'type', file) === 'submit')
    assert.equal(submits.length, 1)
    const disabled = attribute(submits[0], 'disabled')?.expression
    assert.ok(descendants(disabled).some(node => ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken && node.operand.getText(file) === 'consent'), 'Intake submit keeps the explicit consent gate')
    const actualDisabled = values => vm.runInNewContext('Boolean(' + disabled.getText(file) + ')', values, {timeout: 1000})
    for (const method of ['email','phone']) {
      const ready = {busy:false, googleBusy:false, method, email:'fictional@example.test', phone:'+15555550123', consent:true}
      assert.equal(actualDisabled({...ready, consent:false}), true, 'Missing consent must enforce an effective consent gate')
      assert.equal(actualDisabled(ready), false, 'Valid consenting contact must remain enabled')
      assert.equal(actualDisabled({...ready, [method]:''}), true, 'Missing selected contact remains disabled')
      assert.equal(actualDisabled({...ready, busy:true}), true, 'Pending enquiry remains disabled')
      assert.equal(actualDisabled({...ready, googleBusy:true}), true, 'Pending Google handoff remains disabled')
    }
  }
  const save = component.body.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'saveEnquiry')
  assert.equal(save.length, 1)
  const payload = descendants(save[0]).filter(node => ts.isVariableDeclaration(node) && node.name.getText(file) === 'payload')
  assert.equal(payload.length, 1)
  const consent = payload[0].initializer.properties.filter(node => node.name?.getText(file) === 'contactConsent')
  assert.equal(consent.length, 1)
  assert.equal(consent[0].initializer.getText(file), 'consent', 'Both branch handlers must validate actual consent, not a fabricated value')
  assert.ok(descendants(save[0]).some(node => ts.isCallExpression(node) && node.expression.getText(file) === 'normalizePublicServiceEnquiry' && node.arguments[0]?.getText(file) === 'payload'))

  const declarations = file.statements.flatMap(node => ts.isVariableStatement(node) ? [...node.declarationList.declarations] : [])
  const copy = unwrap(declarations.find(node => node.name.getText(file) === 'copy')?.initializer)
  assert.ok(copy && ts.isObjectLiteralExpression(copy))
  const en = copy.properties.find(node => node.name?.getText(file) === 'en')?.initializer
  const next = en?.properties.find(node => node.name?.getText(file) === 'next')?.initializer
  assert.ok(next && ts.isStringLiteral(next))
  assert.match(next.text, /A date or place is confirmed separately\./)
  assert.match(next.text, /WhatsApp or Telegram is optional\./)
}
