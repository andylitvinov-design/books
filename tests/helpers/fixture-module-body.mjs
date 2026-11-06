import ts from 'typescript'

// Test fixtures supply explicit dependencies to Function. Parse module boundaries
// instead of deleting text: aliases, multiline imports and strings are valid JS.
export function fixtureModuleBody(source) {
  const file = ts.createSourceFile('fixture.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  if (file.parseDiagnostics.length) throw new SyntaxError('Invalid fixture module source')
  const statements = []
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) continue
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) || [] : []
    if (ts.isExportAssignment(statement) || modifiers.some(item => item.kind === ts.SyntaxKind.DefaultKeyword))
      throw new SyntaxError('Default fixture exports require an explicit adapter')
    statements.push(modifiers.length
      ? ts.factory.replaceModifiers(statement, modifiers.filter(item => item.kind !== ts.SyntaxKind.ExportKeyword))
      : statement)
  }
  return ts.createPrinter().printFile(ts.factory.updateSourceFile(file, statements))
}
