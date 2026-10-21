// Test infrastructure only. No host, URL, credential or production endpoint.
export function isolatedNarrationRedisContainer(env = process.env) {
  const id = env.HH_TEST_REDIS_CONTAINER
  if (id === undefined) return 'andrey-voice-redis-ci'
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) {
    throw new Error('HH_TEST_REDIS_CONTAINER must be the full isolated service container ID')
  }
  return id
}
