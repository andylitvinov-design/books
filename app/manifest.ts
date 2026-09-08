import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PsiAlchemy',
    short_name: 'PsiAlchemy',
    description: 'PsiAlchemy — bilingual source-backed book and remedy library.',
    start_url: '/ru/homeopathy',
    display: 'standalone',
    background_color: '#f3ecdf',
    theme_color: '#f3ecdf',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
