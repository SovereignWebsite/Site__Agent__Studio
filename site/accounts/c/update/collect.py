# studio.c update pipeline, step 1: what happened in the SovereignWebsite repositories in a time window.
# Read only: shallow, blob-less clones of public repositories. Writes events.json. Apache-2.0.
# Usage: python3 collect.py <since ISO UTC> <until ISO UTC> <workdir> <out.json>
import json, subprocess, sys, os, re, urllib.request, datetime
since, until, work, out = sys.argv[1:5]
os.makedirs(work, exist_ok=True)
def repos():
    names, page = [], 1
    while True:
        u = f"https://api.github.com/orgs/SovereignWebsite/repos?per_page=100&page={page}&type=public"
        try: d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"Accept": "application/vnd.github+json"}), timeout=30))
        except Exception:
            r = subprocess.run(["gh","api","-X","GET","search/repositories","-f","q=org:SovereignWebsite","-f","per_page=100","--jq",".items[].name"],capture_output=True,text=True)
            return [x for x in r.stdout.split() if x]
        if not d: break
        names += [x["name"] for x in d if not x.get("private")]; page += 1
    return names
def git(*a, cwd=None): return subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True, timeout=600)
events, touched = [], []
for name in sorted(repos()):
    d = os.path.join(work, name)
    if not os.path.isdir(d):
        r = git("clone", "-q", "--bare", "--filter=blob:none", f"--shallow-since={since}", f"https://github.com/SovereignWebsite/{name}", d)
        if r.returncode: continue
    else:
        git("fetch", "-q", "--filter=blob:none", f"--shallow-since={since}", "origin", "+refs/heads/*:refs/heads/*", cwd=d)
    fmt = "%x1e%H%x1f%cI%x1f%an%x1f%s%x1f%(trailers:key=Agent,valueonly,separator=%x2c)%x1f"
    r = git("log", "--all", f"--since={since}", f"--until={until}", f"--format={fmt}", "--shortstat", cwd=d)
    n = 0
    for chunk in r.stdout.split("\x1e"):
        chunk = chunk.strip()
        if not chunk: continue
        parts = chunk.split("\x1f")
        if len(parts) < 6: continue
        sha, when, author, subject, agent, stat = parts[:6]
        m = re.search(r"(\d+) files? changed", stat)
        events.append({"repo": name, "sha": sha[:7], "at": when, "agent": agent.strip() or author, "subject": subject, "files": int(m.group(1)) if m else None,
                       "url": f"https://github.com/SovereignWebsite/{name}/commit/{sha}"}); n += 1
    if n: touched.append({"repo": name, "commits": n})
events.sort(key=lambda e: e["at"])
agents = {}
for e in events: agents[e["agent"]] = agents.get(e["agent"], 0) + 1
json.dump({"since": since, "until": until, "made": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
           "totals": {"commits": len(events), "repos": len(touched), "agents": len(agents)},
           "repos": sorted(touched, key=lambda x: -x["commits"]), "agents": dict(sorted(agents.items(), key=lambda x: -x[1])), "events": events},
          open(out, "w"), indent=1)
print(f"{len(events)} commits in {len(touched)} repositories by {len(agents)} authors")
