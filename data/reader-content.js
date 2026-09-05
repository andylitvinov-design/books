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

export async function loadReaderDocument(book) {
  const source = await readFile(path.join(process.cwd(), book.originalSourceFile), 'utf8')

  return {
    type: 'html',
    content: addChapterAnchors(normalizeSourceHtml(source, book.mediaSeries, book.id), book.chapters),
  }
}
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { normalizeSourceHtml } from './source-parser.js'
