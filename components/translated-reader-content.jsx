'use client'

import { useEffect, useState } from 'react'

const BATCH_SIZE = 20
const CONCURRENCY = 2
const SKIP_SELECTOR = 'script,style,code,pre,.meta'

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes = []
  let current = walker.nextNode()

  while (current) {
    const parent = current.parentElement
    const value = current.nodeValue?.trim() ?? ''

    if (
      value &&
      /[\u0400-\u04FF]/.test(value) &&
      parent &&
      !parent.closest(SKIP_SELECTOR)
    ) {
      nodes.push(current)
    }
    current = walker.nextNode()
  }

  return nodes
}

async function translateBatch(texts) {
  const response = await fetch('/api/public-translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  })

  if (!response.ok) throw new Error('Translation unavailable')
  const payload = await response.json()
  if (!Array.isArray(payload?.translations)) throw new Error('Invalid translation response')
  return payload.translations.map((value) => String(value ?? ''))
}

export function TranslatedReaderContent({ html, locale }) {
  const [content, setContent] = useState(locale === 'ru' ? html : '')
  const [status, setStatus] = useState(locale === 'ru' ? 'ready' : 'idle')

  useEffect(() => {
    if (locale !== 'en') {
      setContent(html)
      setStatus('ready')
      return
    }

    let cancelled = false

    async function run() {
      setStatus('translating')

      const container = document.createElement('div')
      container.innerHTML = html
      container.lang = 'en'

      const nodes = collectTextNodes(container)
      if (!nodes.length) {
        if (!cancelled) {
          setContent(container.innerHTML)
          setStatus('ready')
        }
        return
      }

      const jobs = []
      for (let index = 0; index < nodes.length; index += BATCH_SIZE) {
        const batchNodes = nodes.slice(index, index + BATCH_SIZE)
        jobs.push({
          nodes: batchNodes,
          texts: batchNodes.map((node) => node.nodeValue ?? ''),
        })
      }

      let cursor = 0

      async function worker() {
        while (!cancelled) {
          const jobIndex = cursor++
          const job = jobs[jobIndex]
          if (!job) return

          const translations = await translateBatch(job.texts)
          translations.forEach((translation, index) => {
            if (job.nodes[index]) job.nodes[index].nodeValue = translation
          })

          if (!cancelled) setContent(container.innerHTML)
        }
      }

      try {
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
        )
        if (!cancelled) {
          setContent(container.innerHTML)
          setStatus('ready')
        }
      } catch {
        if (!cancelled) {
          setContent('')
          setStatus('error')
        }
      }
    }

    void run()
    return () => { cancelled = true }
  }, [html, locale])

  if (locale === 'en' && status === 'error') {
    return (
      <div className="reader-translation-error" role="status">
        English translation could not be loaded. Please refresh the page.
      </div>
    )
  }

  if (locale === 'en' && !content) {
    return (
      <div className="reader-translation-loading" role="status">
        <span aria-hidden="true" />
        <strong>Preparing the English edition…</strong>
        <p>The book text is being translated from the original source.</p>
      </div>
    )
  }

  return (
    <>
      {locale === 'en' && status === 'translating' ? (
        <div className="reader-translation-progress" role="status">Translating the remaining sections…</div>
      ) : null}
      <div
        className="reader-content"
        id="reader-content"
        lang={locale}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  )
}
