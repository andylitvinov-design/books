// Parsed production JSX guards, not a browser or network simulation.
import assert from 'node:assert/strict'
import ts from 'typescript'
import vm from 'node:vm'
const unwrap = node => node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) ? unwrap(node.expression) : node
const descendants = node => {
  const nodes = []
  function walk(value) { nodes.push(value); ts.forEachChild(value, walk) }
  walk(node)
  return nodes
}
const tag = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
const attribute = (node, name) => tag(node)?.attributes.properties.find(value => value.name?.text === name)?.initializer
const value = (node, name, file) => {
  const init = attribute(node, name)
  return init && (ts.isJsxExpression(init) ? init.expression?.getText(file) : init.text)
}
export function assertSavedMessengerContract(source) {
  const file = ts.createSourceFile('contact-channel-chooser.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(file.parseDiagnostics.length, 0)
  const functions = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ContactChannelChooser')
  assert.equal(functions.length, 1)
  const returns = functions[0].body.statements.filter(ts.isReturnStatement)
  assert.equal(returns.length, 1, 'One genuine chooser return')
  const returned = descendants(returns[0].expression)
  const gates = returned.filter(node => ts.isConditionalExpression(node) && node.condition.getText(file) === '!saved')
  assert.equal(gates.length, 1, 'One saved-receipt gate in the actual returned chooser')
  const gate = gates[0]
  const form = unwrap(gate.whenTrue)
  assert.equal(tag(form)?.tagName.getText(file), 'form', 'Unsaved branch is the actual intake form')
  assert.equal(value(form, 'onSubmit', file), 'submit')
  const after = descendants(gate.whenFalse)
  const links = returned.filter(node => tag(node)?.tagName.getText(file) === 'AcquisitionEventLink')
  assert.equal(links.length, 2, 'Exactly two messenger links in the actual returned chooser')
  for (const node of links) assert.ok(after.includes(node), 'Messenger links must remain inside the saved branch')
  assert.deepEqual(links.map(node => value(node, 'href', file)), ['preparedWhatsApp', 'telegramEnquiryUrlFromWhatsApp(preparedWhatsApp)'])
  for (const node of links) {
    assert.equal(value(node, 'target', file), '_blank')
    assert.equal(value(node, 'rel', file), 'noopener noreferrer')
  }
  assert.ok(after.some(node => ts.isJsxExpression(node) && node.expression?.getText(file) === 'saved.referenceCode'), 'Saved branch displays the verified reference')
  assert.ok(after.some(node => ts.isJsxExpression(node) && node.expression?.getText(file) === 'c.next'), 'Optional messenger explanation is rendered after saving')
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

  const declarations = file.statements.flatMap(node => ts.isVariableStatement(node) ? [...node.declarationList.declarations] : [])
  const copy = unwrap(declarations.find(node => node.name.getText(file) === 'copy')?.initializer)
  assert.ok(copy && ts.isObjectLiteralExpression(copy))
  const en = copy.properties.find(node => node.name?.getText(file) === 'en')?.initializer
  const next = en?.properties.find(node => node.name?.getText(file) === 'next')?.initializer
  assert.ok(next && ts.isStringLiteral(next))
  assert.match(next.text, /A date or place is confirmed separately\./)
  assert.match(next.text, /WhatsApp or Telegram is optional\./)
}
