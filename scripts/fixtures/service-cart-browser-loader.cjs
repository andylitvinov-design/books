// Test-only TSX transform. Runtime application files are read without editing.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Webpack loads this test-only CommonJS loader.
const { createRequire } = require('node:module')
module.exports = function transform(source) {
  const projectRequire = createRequire(this.getOptions().projectPackage)
  const ts = projectRequire('typescript')
  const result = ts.transpileModule(source, {
    fileName: this.resourcePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  })
  const errors = result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error) ?? []
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => this.rootContext,
    getNewLine: () => '\n',
  }))
  return result.outputText
}
