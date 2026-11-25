#!/usr/bin/env bash
# Fails closed if neither the host CLI nor exactly one real isolated Redis
# service can handle commands. Avoids a DNS-dependent apt-get install.
set -euo pipefail
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -h 127.0.0.1 -p 6379 ping | grep -Fxq PONG
  echo 'HH_REDIS_CLI_REAL_PING_OK:host'
  exit 0
fi
: "${RUNNER_TEMP:?}" "${GITHUB_PATH:?}"
command -v docker >/dev/null 2>&1
mapfile -t ids < <(docker ps --filter ancestor=redis:7-alpine --format '{{.ID}}')
if [[ ${#ids[@]} -ne 1 ]]; then
  echo "Expected one isolated redis:7-alpine service; got ${#ids[@]}" >&2
  exit 1
fi
docker exec "${ids[0]}" redis-cli ping | grep -Fxq PONG
mkdir -p "$RUNNER_TEMP/hh-ci-redis"
printf '#!/usr/bin/env bash\nset -euo pipefail\nexec docker exec %q redis-cli "$@"\n' "${ids[0]}" > "$RUNNER_TEMP/hh-ci-redis/redis-cli"
chmod 0700 "$RUNNER_TEMP/hh-ci-redis/redis-cli"
printf '%s\n' "$RUNNER_TEMP/hh-ci-redis" >> "$GITHUB_PATH"
echo 'HH_REDIS_CLI_REAL_PING_OK:service-container'
