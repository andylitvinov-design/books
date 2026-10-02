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
    if (current.nodeValue?.trim() && /[\u0400-\u04FF]/.test(current.nodeValue) && parent && !parent.closest(SKIP_SELECTOR)) nodes.push(current)
    current = walker.nextNode()
  }
  return nodes
}

async function translateBatch(texts, signal) {
  const request = new AbortController()
  const abort = () => request.abort()
  if (signal.aborted) abort()
  signal.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 20000)
  try {
    const response = await fetch('/api/public-translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }), signal: request.signal,
    })
    if (!response.ok) throw new Error('Translation unavailable')
    const payload = await response.json()
    if (!Array.isArray(payload?.translations) || payload.translations.length !== texts.length || payload.translations.some(value => typeof value !== 'string' || !value.trim())) throw new Error('Invalid translation response')
    return payload.translations
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}

export function TranslatedReaderContent({ html, locale }) {
  // The sanitized Russian source remains readable while translation is pending or unavailable.
  const [content, setContent] = useState(html)
  const [status, setStatus] = useState(locale === 'ru' ? 'ready' : 'idle')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setContent(html)
    if (locale !== 'en') { setStatus('ready'); return }
    let cancelled = false
    const controller = new AbortController()
    async function run() {
      setStatus('translating')
      const container = document.createElement('div')
      container.innerHTML = html
      const nodes = collectTextNodes(container)
      const jobs = []
      for (let index = 0; index < nodes.length; index += BATCH_SIZE) jobs.push(nodes.slice(index, index + BATCH_SIZE))
      let cursor = 0
      async function worker() {
        while (!cancelled && !controller.signal.aborted) {
          const batch = jobs[cursor++]
          if (!batch) return
          const translations = await translateBatch(batch.map(node => node.nodeValue ?? ''), controller.signal)
          translations.forEach((translation, index) => { batch[index].nodeValue = translation })
        }
      }
      try {
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()))
        if (!cancelled) { setContent(container.innerHTML); setStatus('ready') }
      } catch {
        controller.abort()
        if (!cancelled) { setContent(html); setStatus('error') }
      }
    }
    void run()
    return () => { cancelled = true; controller.abort() }
  }, [html, locale, attempt])
  const translated = locale === 'en' && status === 'ready'
  return <>
    {locale === 'en' && status !== 'ready' && <div className={status === 'error' ? 'reader-translation-error' : 'reader-translation-progress'} role="status" lang="en">
      {status === 'error' ? 'English translation is unavailable. The original Russian text remains available below.' : 'Preparing the English translation. You can read the original Russian text below.'}
      {status === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry English translation</button>}
      <a href="?lang=ru">Read the Russian original</a>
    </div>}
    <div className="reader-content" id="reader-content" lang={translated ? 'en' : 'ru'} dangerouslySetInnerHTML={{ __html: content }} />
  </>
}
