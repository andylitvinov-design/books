import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()
const rendererPath = path.join(projectRoot, 'components', 'remedy-content.tsx')
const stylesPath = path.join(projectRoot, 'app', 'globals.css')

test('uses one source-preserving compact renderer for standalone cards and Book 02', () => {
  assert.equal(existsSync(rendererPath), true, 'shared compact remedy renderer must exist')
  const renderer = readFileSync(rendererPath, 'utf8')
  const standalone = readFileSync(path.join(projectRoot, 'components', 'remedy-page.tsx'), 'utf8')
  const book = readFileSync(path.join(projectRoot, 'components', 'book-02-reference.tsx'), 'utf8')

  assert.match(renderer, /export function RemedyContent/)
  assert.match(renderer, /supplementary/i)
  assert.match(renderer, /<details/)
  assert.match(renderer, /remedy-content-pair/)
  assert.match(renderer, /export function RemedyEssence/)
  assert.match(standalone, /RemedyContent/)
  assert.ok(standalone.lastIndexOf('<RemedyEssence') < standalone.lastIndexOf('<RemedyPrimaryImage'), 'essence precedes the standalone primary image')
  assert.match(book, /RemedyContent/)
  assert.ok(book.indexOf('<RemedyEssence') < book.indexOf('<figure className="book-remedy-primary-image"'), 'essence precedes the Book 02 primary image')
})

test('keeps the compact section grid desktop-only and restores a readable one-column mobile flow', () => {
  const styles = readFileSync(stylesPath, 'utf8')

  assert.match(styles, /@media \(min-width: 900px\)[\s\S]*?\.remedy-content-pair\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(styles, /@media \(max-width: 899px\)[\s\S]*?\.remedy-content-pair[\s\S]*?grid-template-columns:\s*1fr/)
  assert.match(styles, /\.remedy-content-body\s*\{[^}]*font-size:\s*18px[^}]*line-height:\s*1\.5/)
  assert.match(styles, /\.remedy-content-body li\s*\{[^}]*margin-bottom:\s*0\.28em/)
  assert.match(styles, /\.remedy-content-pair \.remedy-content-section h2,[\s\S]*?font-size:\s*19px/)
  assert.match(styles, /\.remedy-page\s*\{[^}]*max-width:\s*56rem/)
  assert.match(styles, /\.book-reference-layout\s*\{[^}]*minmax\(0,56rem\)/)
})

test('makes source and supplementary material secondary without dropping canonical body content', () => {
  const renderer = readFileSync(rendererPath, 'utf8')
  const styles = readFileSync(stylesPath, 'utf8')

  assert.match(renderer, /Дополнительные материалы и наблюдения/)
  assert.match(renderer, /Additional materials and observations/)
  assert.match(renderer, /open=\{false\}/)
  assert.match(styles, /\.remedy-supplementary\s*\{[^}]*margin-top:\s*1\.25rem/)
  assert.match(styles, /\.remedy-source-reference\s*\{[^}]*font-size:\s*13px/)
})
