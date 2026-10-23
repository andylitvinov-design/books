// Only a local Docker container identifier; never a Redis URL or host fallback.
export function isolatedRedisContainer(env = process.env) {
  const value = env.HH_TEST_REDIS_CONTAINER
  if (value === undefined) return 'andrey-voice-redis-ci'
  if (env.CI !== 'true' || typeof value !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value)) {
    throw new Error('Explicit isolated CI Redis container ID required')
  }
  return value
}
