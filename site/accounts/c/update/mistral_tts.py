# Speak a script with Mistral Voxtral TTS (whole WAV, not a stream). Key from MISTRAL_API_KEY, never printed. Apache-2.0.
# Usage: mistral_tts.py <model> <voice slug> <text file> <out.wav>   (James: voxtral-mini-tts-3 voice_3150, chosen by Dinis 23 Nov 2026)
import os, sys, json, base64, urllib.request, time
model, vid, tf, out = sys.argv[1:5]
text = open(tf).read().replace("\n\nThank you.", "").strip()   # Mistral reads exactly; no decoy line needed
body = {"model": model, "input": text, "voice": vid, "response_format": "wav"}
req = urllib.request.Request("https://api.mistral.ai/v1/audio/speech", data=json.dumps(body).encode(),
      headers={"Authorization": "Bearer " + os.environ["MISTRAL_API_KEY"], "Content-Type": "application/json"})
try: r = urllib.request.urlopen(req, timeout=300); raw = r.read(); ct = r.headers.get("content-type", "")
except urllib.error.HTTPError as e: print("HTTP", e.code, e.read(600).decode(errors="replace")); sys.exit(1)
if "json" in ct:
    j = json.loads(raw); data = j.get("audio_data") or j.get("audio") or j.get("data")
    if isinstance(data, dict): data = data.get("data")
    if not data: print("json without audio:", json.dumps(j)[:400]); sys.exit(1)
    raw = base64.b64decode(data); usage = j.get("usage")
else: usage = None
open(out, "wb").write(raw)
open(os.path.join(os.path.dirname(os.path.abspath(out)), "calls.jsonl"), "a").write(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "model": model, "voice": vid, "out": os.path.basename(out), "chars": len(text), "usage": usage}) + "\n")
print("ok", out, len(raw), "bytes", ct, "usage", usage)
