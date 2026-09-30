// Preserve the approved introductions already published for the About pages.
// These are public display fields only. Admin edits override these initial records.
export const existingAboutIntroVideo = Object.freeze({
  youtubeId: '',
  heygenId: 'fd5fcead9b067f9a0649862675a38771',
  title: 'Psychic Alchemy with Andy',
  description: 'A short introduction to my approach: homeopathy, systemic constellations and hypnotherapy.',
  transcript: [
    'Hi, I’m Andy Li and welcome to a personal session in Psychic Alchemy.',
    'My approach brings together homeopathy with systemic constellations and hypnotherapy so we can explore deeper patterns in emotions and relationships and find new solutions.',
    'You’re welcome to read the testimonials and leave a request on the website.',
    'I’m looking forward to exploring your situation together and finding new resources and solutions.',
  ].join('\n\n'),
  language: 'en',
  durationSeconds: 27,
})

export const existingAboutIntroVideoRu = Object.freeze({
  youtubeId: '',
  heygenId: 'd4e55c984e54b40fbeb8a21f81d27694',
  title: 'Психическая алхимия с Андреем',
  description: 'Короткое знакомство с моим подходом: гомеопатия, системные расстановки и гипнотерапия.',
  transcript: [
    'Привет, я Андрей Ли, и добро пожаловать на личную сессию «Психическая алхимия».',
    'Мой подход объединяет гомеопатию, системные расстановки и гипнотерапию, чтобы мы могли исследовать более глубокие паттерны в эмоциях и отношениях и находить новые решения.',
    'Вы можете почитать отзывы и оставить заявку на сайте.',
    'Буду рад вместе исследовать вашу ситуацию и найти новые ресурсы и решения.',
  ].join('\n\n'),
  language: 'ru',
  durationSeconds: 26,
})

function aboutIntroRecord(locale, video, updatedAt) {
  return {
    key: `about-intro:${locale}`,
    slot: 'about-intro',
    locale,
    entityId: '',
    // Revision zero means this existing publication has not yet been edited in KV.
    // The first real edit uses the normal atomic absent -> revision 1 write.
    revision: 0,
    updatedAt,
    draft: {
      ...video,
      youtubeUrl: `https://app.heygen.com/share/${video.heygenId}`,
      youtubeVisibility: 'unlisted',
    },
    published: {
      ...video,
      scope: 'public',
      status: 'published',
      visibility: 'public',
    },
  }
}

export function builtInSiteVideoRecords() {
  return [
    aboutIntroRecord('en', existingAboutIntroVideo, '2026-09-30T00:02:16.000Z'),
    aboutIntroRecord('ru', existingAboutIntroVideoRu, '2026-09-30T19:26:59.000Z'),
  ]
}
