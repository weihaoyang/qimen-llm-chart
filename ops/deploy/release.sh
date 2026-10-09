#!/usr/bin/env bash
set -Eeuo pipefail

# Immutable-image release for the 知几 workbench.
#
#   RELEASE_ID=20261009-abcdef0 QMDJ_RELEASE_COMMIT=abcdef0 bash ops/deploy/release.sh
#
# Shape (chosen for this host, where disk is tight and Docker layer caching is
# unreliable): build the Next standalone on the host against a *persistent*
# node_modules and npm cache, then wrap that output in a thin image. A release
# is therefore one `next build` (~minutes) instead of a full `npm ci` inside a
# container (~15 min), and the image step is seconds.
#
# Contract, mirroring the platform's deploy-shadow-release.sh:
#   lock -> build -> tag by release id -> recreate the compose service -> health
#   gate -> roll back to the previous image on failure.
#
# QMDJ_BUILD_ONLY=true stops after the image is built (lets a cutover pre-build
# while the old container still holds the port).

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_ID="${RELEASE_ID:?RELEASE_ID is required}"
[[ "$RELEASE_ID" =~ ^[0-9A-Za-z][0-9A-Za-z._-]+$ ]] || { echo "invalid release id" >&2; exit 2; }

IMAGE="${QMDJ_IMAGE:-qmdj:${RELEASE_ID}}"
BUILD_DIR="${QMDJ_BUILD_DIR:-$(dirname "$SRC")/qmdj-build}"
SDK_SRC="${QMDJ_SDK_SRC:-$(dirname "$SRC")/singularity-sequence-consumer-platform/packages/web-sdk}"
NPM_CACHE="${QMDJ_NPM_CACHE:-/srv/qmdj-npm-cache}"
NODE_BIN="${QMDJ_NODE_BIN:-/home/ubuntu/.nvm/versions/node/v24.16.0/bin}"
ENV_FILE="${QMDJ_ENV_FILE:-/srv/qmdj/.env.local}"
HEALTH_URL="${QMDJ_HEALTH_URL:-http://127.0.0.1:3002/api/version}"
HEALTH_EXPECT="${QMDJ_HEALTH_EXPECT:-$RELEASE_ID}"
PROJECT="${QMDJ_COMPOSE_PROJECT:-qmdj}"
COMPOSE=(docker compose -p "$PROJECT" -f "$SRC/docker-compose.qmdj.yml")
LOCK="${QMDJ_LOCK:-/var/lock/qmdj-release.lock}"

exec 9>"$LOCK"
flock -n 9 || { echo "release lock is held" >&2; exit 20; }

test -d "$SDK_SRC" || { echo "missing web-sdk at $SDK_SRC" >&2; exit 3; }
test -f "$ENV_FILE" || { echo "missing env file $ENV_FILE" >&2; exit 4; }
command -v rsync >/dev/null || { echo "rsync is required" >&2; exit 5; }
mkdir -p "$BUILD_DIR"
df -Pk "$BUILD_DIR" | awk 'NR==2 { if ($4 < 2097152) exit 41 }' || { echo "low disk (<2GB free)" >&2; exit 41; }

PREVIOUS_IMAGE="$(docker inspect -f '{{.Config.Image}}' qmdj 2>/dev/null || true)"
echo "previous_image=${PREVIOUS_IMAGE:-none}"

# 1. Sync the release source into the persistent build dir (keeping node_modules
#    and .next so the build is incremental).
mkdir -p "$BUILD_DIR"
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude release-manifest.json --exclude .env.local \
  "$SRC/" "$BUILD_DIR/"

# 2. Dependencies: only when the lock changes.
LOCK_HASH="$(sha256sum "$BUILD_DIR/package-lock.json" | awk '{print $1}')"
if [ ! -d "$BUILD_DIR/node_modules" ] || [ "$(cat "$BUILD_DIR/.qmdj-lock-hash" 2>/dev/null || true)" != "$LOCK_HASH" ]; then
  echo "installing dependencies ($LOCK_HASH)"
  mkdir -p "$NPM_CACHE"
  ( export PATH="$NODE_BIN:$PATH"; cd "$BUILD_DIR"; npm ci --ignore-scripts --cache "$NPM_CACHE" )
  echo "$LOCK_HASH" > "$BUILD_DIR/.qmdj-lock-hash"
fi

# 3. Build the standalone on the host.
echo "building standalone"
( export PATH="$NODE_BIN:$PATH"; cd "$BUILD_DIR"; npm run build )

# 4. Wrap the output in a thin image.
PKG="$(mktemp -d /tmp/qmdj-pkg-XXXXXX)"
cleanup() { rm -rf "$PKG"; }
trap cleanup EXIT
cp -a "$BUILD_DIR/.next/standalone" "$PKG/standalone"
mkdir -p "$PKG/static"
cp -a "$BUILD_DIR/.next/static/." "$PKG/static/"

echo "packaging $IMAGE"
docker build -f "$SRC/ops/deploy/Dockerfile.release" -t "$IMAGE" "$PKG"
IMAGE_ID="$(docker image inspect -f '{{.Id}}' "$IMAGE")"

if [ "${QMDJ_BUILD_ONLY:-false}" = "true" ]; then
  echo "BUILD_OK=$RELEASE_ID IMAGE=$IMAGE"
  exit 0
fi

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
