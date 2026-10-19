'use client'

import { useState } from 'react'

// The thumbnail is decorative: the adjacent heading provides the remedy name.
// A missing/broken library image receives a neutral icon, never an invented photo.
export function RemedyReportThumbnail({ src, number }) {
  const source = typeof src === 'string' ? src.trim() : ''
  const [failedSource, setFailedSource] = useState(null)
  const showImage = source && failedSource !== source

  return <span className="canonical-remedy-unified-thumb" aria-hidden="true">
    {showImage
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={source} alt="" loading="lazy" decoding="async" onError={() => setFailedSource(source)} />
      : <span className="canonical-remedy-unified-photo-fallback">✧</span>}
    <span className="canonical-remedy-number canonical-remedy-unified-index">{String(number).padStart(2, '0')}</span>
  </span>
}
