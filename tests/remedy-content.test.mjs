import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()
const ruDirectory = path.join(projectRoot, 'content', 'remedies', 'ru')
const enDirectory = path.join(projectRoot, 'content', 'remedies', 'en')
const inventoryPath = path.join(projectRoot, 'data', 'remedy-source-inventory.csv')

function parseCsvLine(line) {
  const cells = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else {
      value += character
    }
  }

  cells.push(value)
  return cells
}

function confirmedInventory() {
  const [headerLine, ...lines] = readFileSync(inventoryPath, 'utf8').trim().split('\n')
  const header = parseCsvLine(headerLine)
  return lines
    .map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? ''])))
    .filter(({ candidate_status: status }) => status === 'confirmed')
}

function markdownFiles(directory) {
  return readdirSync(directory).filter((file) => file.endsWith('.md')).sort()
}

function frontmatter(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/)
  assert.ok(match, `${filePath} must have frontmatter and a non-empty body`)
  return Object.fromEntries(
    match[1]
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':')
        return [line.slice(0, separator), line.slice(separator + 1).trim()]
      }),
  )
}

test('contains exactly one source-backed Russian and translated English file for each confirmed remedy', () => {
  assert.equal(existsSync(ruDirectory), true, 'Russian remedy content directory must exist')
  assert.equal(existsSync(enDirectory), true, 'English remedy content directory must exist')
  if (!existsSync(ruDirectory) || !existsSync(enDirectory)) return

  const confirmed = confirmedInventory()
  const expectedSlugs = confirmed.map(({ slug }) => slug).sort()
  const ruFiles = markdownFiles(ruDirectory)
  const enFiles = markdownFiles(enDirectory)

  assert.deepEqual(ruFiles, expectedSlugs.map((slug) => `${slug}.md`))
  assert.deepEqual(enFiles, expectedSlugs.map((slug) => `${slug}.md`))

  for (const remedy of confirmed) {
    const ruPath = path.join(ruDirectory, `${remedy.slug}.md`)
    const enPath = path.join(enDirectory, `${remedy.slug}.md`)
    const ru = frontmatter(ruPath)
    const en = frontmatter(enPath)
    const sourcePath = path.join(projectRoot, remedy.source_file)

    assert.equal(ru.slug, remedy.slug)
    assert.equal(ru.source_file, remedy.source_file)
    assert.equal(ru.source_heading, remedy.source_section_heading)
    assert.equal(readFileSync(sourcePath, 'utf8').includes(remedy.source_section_heading), true)
    assert.equal(en.slug, remedy.slug)
    assert.equal(en.translation_provenance, 'translated-from-ru')
    assert.equal(en.translation_source, `content/remedies/ru/${remedy.slug}.md`)
    assert.equal(en.en_source_exists, 'no')
  }
})

test('remedy content validator reports paired 38/38 source-backed pages', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-remedy-content.mjs'], {
    cwd: projectRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /ru=38 en=38 pairs=38 source_refs=38/)
})
