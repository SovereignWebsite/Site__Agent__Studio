#!/usr/bin/env bash
# Upload a file to SG/Send for a handover, encrypted here first, and check it by downloading it again.
#   tools/sg-upload.sh <file> [service]      service: dev.send.sgraph.ai (default) or send.sgraph.ai
# Prints the transfer's short token (word-word-NNNN): it alone opens the file at https://<service>/en-gb/download/#<token>.
# The SG/Send access token comes from SG_SEND_ACCESS_TOKEN in the environment and is only ever sent to SG/Send in the
# x-sgraph-access-token header: never printed, logged or written to a file (rule granted by Dinis Cruz, see CLAUDE.md).
# Needs node 20+, curl, python3, split, sha256sum. Works in a scratch directory and removes its own temporary files.
set -euo pipefail
F="$1"; SVC="${2:-dev.send.sgraph.ai}"; API="https://$SVC"; HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$F" ] || { echo "No such file: $F" >&2; exit 1; }
[ -n "${SG_SEND_ACCESS_TOKEN:-}" ] || { echo "SG_SEND_ACCESS_TOKEN is not set" >&2; exit 1; }
W="$(mktemp -d)"; trap 'rm -rf -- "$W"' EXIT
hdr() { printf 'x-sgraph-access-token: %s' "$SG_SEND_ACCESS_TOKEN"; }
node "$HERE/sg-encrypt.mjs" "$F" "$W" > "$W/meta.json"
j() { python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$W/meta.json" "$1"; }
TOKEN="$(j token)"; ID="$(j id)"; PS="$(j plainSize)"; ES="$(stat -c %s "$W/enc.bin")"
TYPE="$(python3 -I -c "import mimetypes,sys;print(mimetypes.guess_type(sys.argv[1])[0] or 'application/octet-stream')" "$F")"
curl -sSf -X POST "$API/api/transfers/create" -H "$(hdr)" -H "Content-Type: application/json" \
  -d "{\"file_size_bytes\":$PS,\"content_type_hint\":\"$TYPE\",\"transfer_id\":\"$ID\"}" > /dev/null
PART=10485760
if [ "$ES" -le 5242880 ]; then
  curl -sSf -X POST "$API/api/transfers/upload/$ID" -H "$(hdr)" -H "Content-Type: application/octet-stream" --data-binary "@$W/enc.bin" > /dev/null
else
  N=$(( (ES + PART - 1) / PART ))
  curl -sSf -X POST "$API/api/presigned/initiate" -H "$(hdr)" -H "Content-Type: application/json" \
    -d "{\"transfer_id\":\"$ID\",\"file_size_bytes\":$ES,\"num_parts\":$N}" > "$W/init.json"
  (cd "$W" && split -b $PART -d -a 4 enc.bin part.)
  python3 -I - "$W" "$ID" <<'PY'
import json, subprocess, sys
w, tid = sys.argv[1], sys.argv[2]; init = json.load(open(f"{w}/init.json")); parts = []
for i, p in enumerate(init["part_urls"]):
    r = subprocess.run(["curl", "-sSf", "-D", "-", "-o", "/dev/null", "-X", "PUT", "--data-binary", f"@{w}/part.{i:04d}", p["upload_url"]], capture_output=True, text=True)
    et = [l.split(":", 1)[1].strip() for l in r.stdout.splitlines() if l.lower().startswith("etag:")]
    if r.returncode or not et: sys.exit(f"part {i + 1} failed")
    parts.append({"part_number": p["part_number"], "etag": et[0]})
json.dump({"transfer_id": tid, "upload_id": init["upload_id"], "parts": parts}, open(f"{w}/complete.json", "w"))
PY
  curl -sSf -X POST "$API/api/presigned/complete" -H "$(hdr)" -H "Content-Type: application/json" -d "@$W/complete.json" > /dev/null
fi
curl -sSf -X POST "$API/api/transfers/complete/$ID" -H "$(hdr)" > /dev/null
# check: download as a receiver would (no access token), decrypt, compare
URL="$(curl -sSf "$API/api/presigned/download-url/$ID" | python3 -I -c "import json,sys;d=json.load(sys.stdin);print(d.get('download_url') or d.get('url'))")"
curl -sSf -o "$W/back.bin" "$URL"; mkdir "$W/out"; node "$HERE/sg-decrypt.mjs" "$TOKEN" "$W/back.bin" "$W/out" > /dev/null
A="$(sha256sum < "$F" | cut -c1-64)"; B="$(sha256sum < "$W/out/$(ls "$W/out")" | cut -c1-64)"
[ "$A" = "$B" ] || { echo "Uploaded, but the downloaded copy does not match" >&2; exit 2; }
echo "token:  $TOKEN"; echo "link:   $API/en-gb/download/#$TOKEN"; echo "sha256: $A (checked by downloading it again)"
