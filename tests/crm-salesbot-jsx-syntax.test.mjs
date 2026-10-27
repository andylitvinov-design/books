import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Fail in the focused CRM source job before a full Next.js build. A missing
// separator in a translated copy object previously escaped regex-only checks.
test('SalesBot EN/RU/ES owner editor and saved drafts are valid JSX syntax', () => {
  for (const path of [
    'components/app/crm-salesbot.jsx',
    'components/app/crm-telegram-diagnostic-script.jsx',
    'components/app/crm-salesbot-drafts.jsx',
    'components/app/crm-manager.jsx',
  ]) {
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
    const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
    assert.deepEqual(tree.parseDiagnostics.map(error => ({
      code: error.code,
      line: tree.getLineAndCharacterOfPosition(error.start || 0).line + 1,
      message: ts.flattenDiagnosticMessageText(error.messageText, ' '),
    })), [], path + ' contains invalid JSX/JavaScript source')
  }
})
