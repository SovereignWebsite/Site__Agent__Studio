import os, sys, json, urllib.request, time
model, promptfile, outfile = sys.argv[1:4]
body = {"model": model, "messages": [{"role":"user","content": open(promptfile).read()}], "usage": {"include": True}, "max_tokens": 1500}
req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(body).encode(),
  headers={"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
j = json.load(urllib.request.urlopen(req, timeout=300))
txt = j["choices"][0]["message"]["content"]; open(outfile, "w").write(txt)
rec = {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "model": model, "out": os.path.basename(outfile), "generation_id": j.get("id"), "usage": j.get("usage")}
open("out/calls.jsonl", "a").write(json.dumps(rec) + "\n")
print("cost:", (j.get("usage") or {}).get("cost")); print(txt)
