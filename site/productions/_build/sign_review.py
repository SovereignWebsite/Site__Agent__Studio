#!/usr/bin/env python3
# An agent signs a review of one version with its own session key (the one tools/setup-signing.sh made for git):
#   python3 sign_review.py <production> <version> <agent name> <decision: comment|changes|approve> <comments.txt>
# The key file is used to sign and is never printed or copied. Writes <production>/<version>/reviews/<agent>.json.
import base64, datetime, json, os, sys
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
pid, ver, agent, decision, cfile = sys.argv[1:6]
root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
m = json.load(open(os.path.join(root, pid, ver, "manifest.json")))
comments = []
for l in open(cfile).read().splitlines():
    l = l.strip()
    if not l: continue
    a, _, b = l.partition(": ")
    comments.append({"scene": a, "text": b} if b and " " not in a else {"text": l})
payload = json.dumps({"type": "review", "production": pid, "version": ver, "digest": m["digest"], "decision": decision, "comments": comments, "reviewer": agent, "role": "agent", "signed_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, ensure_ascii=False)
key = serialization.load_ssh_private_key(open(os.path.expanduser("~/.sw-secret/signing"), "rb").read(), password=None)
r, s = decode_dss_signature(key.sign(payload.encode(), ec.ECDSA(hashes.SHA256())))
name = agent.split("@")[0]
rec = {"payload": payload, "alg": "ECDSA-P256-SHA256", "signature": base64.b64encode(r.to_bytes(32, "big") + s.to_bytes(32, "big")).decode(), "key": f"/keys/{name}.json"}
out = os.path.join(root, pid, ver, "reviews", f"{name}.json"); os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w").write(json.dumps(rec, indent=1, ensure_ascii=False) + "\n"); print("signed", os.path.relpath(out, root), m["digest"][:16])
