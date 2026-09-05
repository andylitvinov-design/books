import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()
const component = readFileSync(path.join(projectRoot, 'components/remedy-page.tsx'), 'utf8')
const styles = readFileSync(path.join(projectRoot, 'app/globals.css'), 'utf8')

test('keeps the primary remedy image in the reading flow and defers supporting images', () => {
  assert.match(component, /function RemedyPrimaryImage/)
  assert.match(component, /function RemedySupportingGallery/)
  assert.ok(component.indexOf('<RemedyPrimaryImage') < component.indexOf('<AuthorDescription'), 'primary image precedes author text')
  assert.ok(component.indexOf('<RemedySupportingGallery') > component.indexOf('<AuthorDescription'), 'supporting gallery follows reading text')
})

test('uses an editorial float on desktop and a stacked image on mobile', () => {
  assert.match(styles, /@media \(min-width: 768px\)[\s\S]*?\.remedy-primary-image[\s\S]*?float:\s*right/)
  assert.match(styles, /@media \(min-width: 768px\)[\s\S]*?\.remedy-primary-image[\s\S]*?width:\s*clamp\(16\.25rem, 28vw, 21\.25rem\)/)
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.remedy-primary-image[\s\S]*?float:\s*none/)
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.remedy-primary-image img[\s\S]*?max-height:\s*22rem/)
})

test('keeps reading typography comfortably sized and compactly spaced', () => {
  assert.match(styles, /\.remedy-page h1\s*\{[^}]*text-\[30px\][^}]*sm:text-\[34px\][^}]*lg:text-\[36px\]/)
  assert.match(styles, /\.remedy-author-description\s*\{[^}]*text-\[18px\][^}]*leading-\[1\.62\][^}]*sm:text-\[19px\]/)
  assert.match(styles, /\.remedy-author-description p\s*\{[^}]*mt-\[0\.75em\]/)
  assert.match(styles, /\.remedy-source-reference\s*\{[^}]*clear:\s*both/)
})
