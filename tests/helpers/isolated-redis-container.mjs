import { execFileSync } from 'node:child_process'

// No Redis URL/host fallback and no new service. The standalone voice job owns
// the default named container; IA explicitly binds its existing service's full ID.
export function isolatedRedisContainer(env = process.env) {
  const value = env.HH_TEST_REDIS_CONTAINER
  if (value === undefined) return 'andrey-voice-redis-ci'
  if (env.CI !== 'true' || env.GITHUB_ACTIONS !== 'true' ||
      env.HH_TEST_REDIS_ISOLATED !== 'true' ||
      typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error('Explicit isolated GitHub CI Redis service ID required')
  }
  return value
}

export function isolatedRedisCommand(args, { env = process.env, execute = execFileSync } = {}) {
  const container = isolatedRedisContainer(env)
  if (!Array.isArray(args) || !['GET', 'EVAL'].includes(args[0]) ||
      !args.every(value => typeof value === 'string')) {
    throw new Error('Explicit synthetic Redis command arguments required')
  }
  // Do not inherit Docker contexts, TLS settings, config paths or credentials.
  // The only child environment is executable lookup and deterministic messages.
  const childEnv = { PATH: env.PATH || '/usr/local/bin:/usr/bin:/bin', LC_ALL: 'C' }
  return execute('docker', ['--host', 'unix:///var/run/docker.sock', 'exec', container, 'redis-cli', '--raw', ...args],
    { encoding: 'utf8', maxBuffer: 120000, timeout: 5000, env: childEnv }).trim()
}
