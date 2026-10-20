// Editorial topic membership, shared by collection counts, matching and badges.
// Match the catalog's actual topic tags rather than the broad FOCUS_TOPICS
// aliases used by the general concerns filter (e.g. relationships -> personality).
// These are browsing affinities, not clinical constructs or assessment results.
export const TEST_COLLECTION_TOPIC_TAGS = Object.freeze({
  stress: Object.freeze(['stress', 'anxiety']),
  relationships: Object.freeze(['relationships', 'intimacy']),
  tantra: Object.freeze(['tantra']),
  sexuality: Object.freeze(['sexuality', 'boundaries']),
  sleep: Object.freeze(['sleep', 'recovery']),
  resources: Object.freeze(['resources', 'self-support', 'support']),
  personality: Object.freeze(['personality']),
  mood: Object.freeze(['mood']),
  attention: Object.freeze(['attention', 'function']),
  body: Object.freeze(['body', 'energy']),
  meaning: Object.freeze(['meaning']),
  wellbeing: Object.freeze(['health', 'body', 'recovery']),
})

export function testCollectionAffinity(entry, collectionId) {
  const tags = TEST_COLLECTION_TOPIC_TAGS[collectionId]
  if (!tags || !entry?.selectable || !Array.isArray(entry.topics)) return 0
  const matched = tags.filter((tag) => entry.topics.includes(tag)).length
  return matched ? Math.min(1, 0.7 + (matched - 1) * 0.15) : 0
}

export function testCollectionIds(entry) {
  if (!entry?.selectable) return []
  return Object.keys(TEST_COLLECTION_TOPIC_TAGS)
    .filter((id) => testCollectionAffinity(entry, id) > 0)
}
