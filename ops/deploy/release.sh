#!/usr/bin/env bash
set -Eeuo pipefail

# Immutable-image release for the 知几 workbench.
#
# Run on the production host from the release checkout:
#   RELEASE_ID=20261009-abcdef0 QMDJ_RELEASE_COMMIT=abcdef0 bash ops/deploy/release.sh
#
# Contract, modelled on the platform's deploy-shadow-release.sh:
#   build once -> tag by release id -> recreate the compose service -> health gate
#   -> automatic rollback to the previous image on any failure.
#
# The first cutover (systemd -> container) is a one-off: stop and disable the
# old qmdj.service, then run this. After that, rollback is an image swap.

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_ID="${RELEASE_ID:?RELEASE_ID is required}"
[[ "$RELEASE_ID" =~ ^[0-9A-Za-z][0-9A-Za-z._-]+$ ]] || { echo "invalid release id" >&2; exit 2; }

IMAGE="${QMDJ_IMAGE:-qmdj:${RELEASE_ID}}"
SDK_SRC="${QMDJ_SDK_SRC:-$(dirname "$SRC")/singularity-sequence-consumer-platform/packages/web-sdk}"
ENV_FILE="${QMDJ_ENV_FILE:-/srv/qmdj/.env.local}"
NPM_REGISTRY="${QMDJ_NPM_REGISTRY:-https://mirrors.tencentyun.com/npm}"
HEALTH_URL="${QMDJ_HEALTH_URL:-http://127.0.0.1:3002/api/version}"
HEALTH_EXPECT="${QMDJ_HEALTH_EXPECT:-$RELEASE_ID}"
PROJECT="${QMDJ_COMPOSE_PROJECT:-qmdj}"
COMPOSE=(docker compose -p "$PROJECT" -f "$SRC/docker-compose.qmdj.yml")
LOCK="${QMDJ_LOCK:-/var/lock/qmdj-release.lock}"

exec 9>"$LOCK"
flock -n 9 || { echo "release lock is held" >&2; exit 20; }

test -d "$SDK_SRC" || { echo "missing web-sdk at $SDK_SRC" >&2; exit 3; }
test -f "$ENV_FILE" || { echo "missing env file $ENV_FILE" >&2; exit 4; }
df -Pk "$SRC" | awk 'NR==2 { if ($4 < 3145728) exit 41 }' || { echo "low disk (<3GB free)" >&2; exit 41; }

PREVIOUS_IMAGE="$(docker inspect -f '{{.Config.Image}}' qmdj 2>/dev/null || true)"
echo "previous_image=${PREVIOUS_IMAGE:-none}"

# Assemble the build context: this checkout plus the file: SDK at the path the
# Dockerfile expects it under.
CTX="$(mktemp -d /tmp/qmdj-release-XXXXXX)"
cleanup() { rm -rf "$CTX"; }
trap cleanup EXIT
cp -a "$SRC/." "$CTX/"
rm -rf "$CTX/.git" "$CTX/node_modules" "$CTX/.next"
mkdir -p "$CTX/singularity-sequence-consumer-platform/packages"
cp -a "$SDK_SRC" "$CTX/singularity-sequence-consumer-platform/packages/web-sdk"

cat > "$SRC/release-manifest.json" <<EOF
{
  "release_id": "$RELEASE_ID",
  "image": "$IMAGE",
  "previous_image": "${PREVIOUS_IMAGE:-}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
}
EOF

rollback() {
  trap - ERR
  echo "release failed; rolling back to ${PREVIOUS_IMAGE:-none}" >&2
  if [ -n "$PREVIOUS_IMAGE" ]; then
    QMDJ_IMAGE="$PREVIOUS_IMAGE" \
    QMDJ_RELEASE_ID="$RELEASE_ID" \
    QMDJ_RELEASE_COMMIT="${QMDJ_RELEASE_COMMIT:-}" \
    QMDJ_ENV_FILE="$ENV_FILE" \
      "${COMPOSE[@]}" up -d --no-build || true
  fi
}
trap rollback ERR

echo "building $IMAGE"
docker build \
  --build-arg NPM_REGISTRY="$NPM_REGISTRY" \
  -t "$IMAGE" -f "$CTX/Dockerfile" "$CTX"
IMAGE_ID="$(docker image inspect -f '{{.Id}}' "$IMAGE")"

# Lets the cutover pre-build the image while the old service still owns the port.
if [ "${QMDJ_BUILD_ONLY:-false}" = "true" ]; then
  echo "BUILD_OK=$RELEASE_ID IMAGE=$IMAGE"
  exit 0
fi

echo "recreating $PROJECT"
QMDJ_IMAGE="$IMAGE" \
QMDJ_RELEASE_ID="$RELEASE_ID" \
QMDJ_RELEASE_COMMIT="${QMDJ_RELEASE_COMMIT:-}" \
QMDJ_ENV_FILE="$ENV_FILE" \
  "${COMPOSE[@]}" up -d

body=""
for attempt in $(seq 1 30); do
  body="$(curl -fsS "$HEALTH_URL" 2>/dev/null || true)"
  [ -n "$body" ] && break
  [ "$attempt" = 30 ] && { echo "qmdj did not become healthy at $HEALTH_URL" >&2; exit 42; }
  sleep 2
done
echo "$body" | grep -q "$HEALTH_EXPECT" || { echo "health payload missing $HEALTH_EXPECT: $body" >&2; exit 43; }

trap - ERR
cat > "$SRC/release-manifest.json" <<EOF
{
  "release_id": "$RELEASE_ID",
  "image": "$IMAGE",
  "image_id": "$IMAGE_ID",
  "previous_image": "${PREVIOUS_IMAGE:-}",
  "health": $(printf '%s' "$body" | tr -d '\n'),
  "status": "healthy",
  "finished_at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
}
EOF
echo "image_id=$IMAGE_ID"
echo "RELEASE_OK=$RELEASE_ID IMAGE=$IMAGE"
