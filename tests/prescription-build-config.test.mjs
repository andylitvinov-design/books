import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('permits JavaScript App Router modules used by the prescription server boundary', async () => {
  const config = JSON.parse(await readFile('tsconfig.json', 'utf8'))
  assert.equal(config.compilerOptions.allowJs, true)
})

test('scans JavaScript and JSX prescription modules for Tailwind classes', async () => {
  const config = await readFile('tailwind.config.ts', 'utf8')
  assert.match(config, /\{js,jsx,ts,tsx\}/)
})
