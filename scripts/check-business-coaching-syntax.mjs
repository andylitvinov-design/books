// Syntax-only gate for new JSX/TSX surfaces: no app runtime, database or secrets.
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const paths = [
  'components/app/business-coaching.jsx',
  'components/app/development-program.jsx',
  'components/app/my-courses-dashboard.jsx',
  'components/app/app-workspace.jsx',
  'app/[locale]/explore/[theme]/page.tsx',
  'app/[locale]/app/[[...path]]/page.jsx',
  'app/api/app/[...path]/route.js',
]
let bad = false
for (const path of paths) {
  const src = readFileSync(new URL('../'+path, import.meta.url), 'utf8')
  const isTsx = path.endsWith('.tsx')
  const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, isTsx?ts.ScriptKind.TSX:ts.ScriptKind.JSX)
  const problems = sf.parseDiagnostics
  if (problems.length) {
    bad = true
    for (const d of problems) {
      const where = sf.getLineAndCharacterOfPosition(d.start)
      console.error(path+':'+(where.line+1)+':'+(where.character+1)+' '+ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    }
  } else console.log('syntax PASS '+path)
}
if (bad) process.exitCode=1
