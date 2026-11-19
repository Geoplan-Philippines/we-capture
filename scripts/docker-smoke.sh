#!/usr/bin/env bash
# Builds the image with docker compose, runs it against a local S3 stand-in,
# and walks the photo flow: upload, download page, lead row, download, unknown
# id. Then recreates the container and checks the link and the CSV survived.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -p we-capture-smoke -f docker-compose.yml -f scripts/docker-compose.smoke.yml)
BASE=http://localhost:3000
TMP=$(mktemp -d)

cleanup() {
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  "${COMPOSE[@]}" logs --tail 80 we-capture >&2 || true
  exit 1
}

expect_status() { # label expected url
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' "$3")
  [ "$got" = "$2" ] || fail "$1: expected $2, got $got ($3)"
  echo "ok   $1 ($got)"
}

echo "== docker compose up"
"${COMPOSE[@]}" up -d --build --wait

echo "== create bucket"
for _ in $(seq 1 30); do
  curl -sf -X PUT http://localhost:5000/we-capture >/dev/null && break
  sleep 1
done

expect_status "health" 200 "$BASE/api/health"
expect_status "booth page" 200 "$BASE/"

echo "== upload"
# 1×1 PNG
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" | base64 -d >"$TMP/photo.png"
resp=$(curl -sf -F "photo=@$TMP/photo.png;type=image/png" "$BASE/api/upload") || fail "upload request failed"
id=$(echo "$resp" | sed -nE 's/.*"id":"([A-Za-z0-9_-]{22})".*/\1/p')
[ -n "$id" ] || fail "upload response had no id: $resp"
echo "$resp" | grep -q "\"url\":\"http://localhost:3000/d/$id\"" || fail "unexpected url: $resp"
echo "ok   upload ($id)"

printf 'not a png' >"$TMP/fake.png"
got=$(curl -s -o /dev/null -w '%{http_code}' -F "photo=@$TMP/fake.png;type=image/png" "$BASE/api/upload")
[ "$got" = 415 ] || fail "non-PNG upload: expected 415, got $got"
echo "ok   non-PNG rejected (415)"

expect_status "download page" 200 "$BASE/d/$id"
expect_status "unknown id" 404 "$BASE/d/AAAAAAAAAAAAAAAAAAAAAA"

echo "== lead"
got=$(curl -s -o /dev/null -w '%{http_code}' -H 'content-type: application/json' \
  -d "{\"photoId\":\"$id\",\"name\":\"Smoke Test\",\"email\":\"bad\"}" "$BASE/api/leads")
[ "$got" = 422 ] || fail "invalid email: expected 422, got $got"
echo "ok   invalid email rejected (422)"
got=$(curl -s -o /dev/null -w '%{http_code}' -H 'content-type: application/json' \
  -d "{\"photoId\":\"$id\",\"name\":\"Smoke Test\",\"email\":\"smoke@example.com\"}" "$BASE/api/leads")
[ "$got" = 201 ] || fail "lead: expected 201, got $got"
"${COMPOSE[@]}" exec -T we-capture cat /data/leads.csv | grep -q ",$id,Smoke Test,smoke@example.com" ||
  fail "lead row missing from /data/leads.csv"
echo "ok   lead row written"

curl -sf -D "$TMP/headers" "$BASE/api/photos/$id?download=1" -o "$TMP/download.png" || fail "download failed"
grep -qi "content-disposition: attachment; filename=\"we-capture-$id.png\"" "$TMP/headers" || fail "missing attachment header"
cmp -s "$TMP/photo.png" "$TMP/download.png" || fail "downloaded PNG differs from upload"
echo "ok   download matches upload"

echo "== recreate container"
"${COMPOSE[@]}" up -d --force-recreate --no-deps --wait we-capture
expect_status "download page after restart" 200 "$BASE/d/$id"
"${COMPOSE[@]}" exec -T we-capture cat /data/leads.csv | grep -q ",$id,Smoke Test,smoke@example.com" ||
  fail "lead row lost after restart"
echo "ok   leads CSV kept after restart"

echo "All smoke checks passed."
