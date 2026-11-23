# Speak a script through OpenRouter (openai/gpt-audio*). Key read from env, never printed.
import os, sys, json, base64, urllib.request, time
model, voice, infile, outfile = sys.argv[1:5]
direction = open(sys.argv[5]).read() if len(sys.argv) > 5 else ""
text = open(infile).read().strip()
body = {"model": model, "modalities": ["text","audio"], "audio": {"voice": voice, "format": "pcm16"}, "stream": True, "usage": {"include": True},
  "messages": [{"role":"system","content":"You are a voice actor. Read the user's script aloud exactly as written, word for word, adding nothing and leaving nothing out. " + direction},
               {"role":"user","content":"Script:\n\n" + text}]}
req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(body).encode(),
  headers={"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
pcm = bytearray(); transcript = []; usage = None; gen = None
try:
  with urllib.request.urlopen(req, timeout=300) as r:
    for line in r:
      line = line.decode().strip()
      if not line.startswith("data:"): continue
      d = line[5:].strip()
      if d == "[DONE]": break
      j = json.loads(d); gen = j.get("id", gen)
      if j.get("usage"): usage = j["usage"]
      for c in j.get("choices", []):
        a = (c.get("delta") or {}).get("audio") or {}
        if a.get("data"): pcm += base64.b64decode(a["data"])
        if a.get("transcript"): transcript.append(a["transcript"])
except urllib.error.HTTPError as e:
  print("HTTP", e.code, e.read().decode()[:500]); sys.exit(1)
import wave
with wave.open(outfile, "wb") as w:
  w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(bytes(pcm))
rec = {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "model": model, "voice": voice, "out": os.path.basename(outfile),
  "seconds": round(len(pcm)/48000, 2), "generation_id": gen, "usage": usage, "transcript": "".join(transcript)}
open(os.path.join(os.path.dirname(outfile), "calls.jsonl"), "a").write(json.dumps(rec) + "\n")
print(json.dumps({k: rec[k] for k in ("model","voice","seconds","generation_id")}), "cost:", (usage or {}).get("cost"))
print("transcript:", rec["transcript"][:300])
