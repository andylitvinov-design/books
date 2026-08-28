function plainMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^\*([^*]+)\*$/, '$1')
    .trim()
}

function plainHtml(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizedTitle(text) {
  return plainHtml(text).toLocaleLowerCase()
}

function addChapterAnchors(html, chapters) {
  const availableChapters = new Map(chapters.map((chapter) => [normalizedTitle(chapter.title), chapter.id]))

  return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (heading, level, attributes, title) => {
    if (/\bid\s*=/i.test(attributes)) return heading

    const chapterId = availableChapters.get(normalizedTitle(title))
    return chapterId ? `<h${level}${attributes} id="${chapterId}">${title}</h${level}>` : heading
  })
}

export function parseMayaManuscript(markdown) {
  const blocks = []
  let paragraph = []

  const flushParagraph = () => {
    if (!paragraph.length) return

    const text = plainMarkdown(paragraph.join('\n'))
    if (text) {
      blocks.push({
        type: 'paragraph',
        text,
        sourceLabel: /^(Источник|Источники):/i.test(text),
      })
    }
    paragraph = []
  }

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s*(.+)$/)
    if (heading) {
      flushParagraph()
      const text = plainMarkdown(heading[2])
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text,
        supplemental: /^TempleTherapy\b/i.test(text),
      })
    } else if (line.trim()) {
      paragraph.push(line)
    } else {
      flushParagraph()
    }
  }

  flushParagraph()
  return blocks
}

export async function loadReaderDocument(book) {
  const source = await readFile(path.join(process.cwd(), book.originalSourceFile), 'utf8')

  if (book.mediaSeries === 'maya') {
    return { type: 'maya', blocks: parseMayaManuscript(source) }
  }

  return {
    type: 'html',
    content: addChapterAnchors(normalizeSourceHtml(source, book.mediaSeries), book.chapters),
  }
}
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { normalizeSourceHtml } from './source-parser.js'
