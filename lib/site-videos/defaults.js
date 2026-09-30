// Preserve the approved introduction already published in production at d32285c.
// These are public display fields only. Admin edits override this initial record.
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

export function builtInSiteVideoRecords() {
  return [{
    key: 'about-intro:en',
    slot: 'about-intro',
    locale: 'en',
    entityId: '',
    // Revision zero means this existing publication has not yet been edited in KV.
    // The first real edit uses the normal atomic absent -> revision 1 write.
    revision: 0,
    updatedAt: '2026-09-30T00:02:16.000Z',
    draft: {
      ...existingAboutIntroVideo,
      youtubeUrl: `https://app.heygen.com/share/${existingAboutIntroVideo.heygenId}`,
      youtubeVisibility: 'unlisted',
    },
    published: {
      ...existingAboutIntroVideo,
      scope: 'public',
      status: 'published',
      visibility: 'public',
    },
  }]
}
