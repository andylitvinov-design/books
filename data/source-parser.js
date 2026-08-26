const localHrefPattern = /\s+href\s*=\s*(["'])(?:file:|(?:https?:)?\/\/(?:127\.0\.0\.1|localhost)(?=[:/?#]|["'])|\/Users(?=\/|["']))[^"']*\1/gi
const sourceImagePattern = /\bsrc\s*=\s*(["'])(?![a-z][a-z0-9+.-]*:|\/)(?:[^/"']+\/)*(?:media|photos)\/([^/"']+)\1/gi

export function normalizeSourceHtml(html, series) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html

  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(localHrefPattern, '')
    .replace(sourceImagePattern, (_, __, sourcePath) => {
      const filename = sourcePath.split('/').at(-1)
      return `src="/media/${series}/${filename}"`
    })
}
