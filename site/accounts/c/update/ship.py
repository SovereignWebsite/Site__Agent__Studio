# studio.c update pipeline, step 4: finish a post folder (post.json, notes.md) and commit it to Site__Platform__Instagram.
# Usage: python3 ship.py <storyboard.json> <workdir> <post-folder> <instagram-clone> <post-id> [--push]
# No approved line is ever written: that is the owner's yes, recorded by instagram.c. Apache-2.0.
import json, sys, os, shutil, subprocess, hashlib, datetime
sb_path, work, post, ig, pid = sys.argv[1:6]; push = "--push" in sys.argv
sb = json.load(open(sb_path)); made = json.load(open(f"{work}/made.json"))
calls = [json.loads(l) for l in open(f"{work}/calls.jsonl")] if os.path.exists(f"{work}/calls.jsonl") else []
cost = sum((c.get("usage") or {}).get("cost", 0) for c in calls)
src = (f"Presenter: {sb['presenter_name']} ({sb['presenter']}), a synthetic presenter from the PrompTugal.news presenters library v0.1.0 by bulletins.b@PrompTugal.dinis "
       "(PrompTugal/PrompTugal__News__Bulletins at 418b723; code Apache-2.0, data CC BY 4.0, three.js MIT), made by code, not any real person, labelled synthetic on screen. "
       "Story, scenes and captions: studio.c@SovereignWebsite.dinis with its researcher and journalist sub-agents, from public commits and pages (sources in storyboard.json); text CC BY 4.0; font Inter (SIL OFL 1.1). "
       f"Voice: AI-generated with {sb.get('voice_model','openai/gpt-audio')}, stock voice '{sb['voice']}', through OpenRouter; disclosed on screen and in the caption. No music. "
       + ("Look: RiskMandate's brand from riskmandate.ai. " if sb.get("theme") else ""))
alt = f"An animated Reel: {sb['presenter_name']}, a synthetic presenter, tells it while animated panels above show: " + "; ".join(
    (b["visual"].get("text") or b["visual"].get("label") or b["visual"].get("caption") or b["visual"]["kind"]) for b in sb["beats"])[:900]
pj = {"kind": "reel", "media": ["video.mp4"], "cover": "cover.jpg", "thumbnail_offset_ms": 600, "alt": [alt], "caption": sb["caption"], "source": src,
      "audio": {"file": "(voice only, mixed into video.mp4)", "made_by": "studio.c@SovereignWebsite.dinis", "prompt": "script.txt read word for word, with voice-direction.txt",
                "date": datetime.date.today().isoformat(), "plan": f"OpenRouter pay-as-you-go on Dinis Cruz's key; {sb.get('voice_model','openai/gpt-audio')}, voice {sb['voice']}; no music track"}}
assert len(pj["caption"]) <= 2200 and not any(ch in json.dumps(pj, ensure_ascii=False) for ch in ("\u2014", "\u2013")) and "approved" not in pj
json.dump(pj, open(f"{post}/post.json", "w"), indent=2, ensure_ascii=False); open(f"{post}/post.json", "a").write("\n")
rows = "".join(f"| {c['at']} | {c['model']} | {c.get('voice','-')} | {c.get('seconds','-')} | {(c.get('usage') or {}).get('cost',0):.4f} |\n" for c in calls)
open(f"{post}/notes.md", "w").write(f"""# {pid}

Made by studio.c@SovereignWebsite.dinis (https://claude.ai/code/session_01Kw9UwC3pdjxjDeK5WaZYUD). Not approved: post.json has no approved line; the owner's yes is recorded by instagram.c.

- Presenter: {sb['presenter_name']} ({sb['presenter']}), synthetic. Voice: {sb['voice']} (AI-generated).
- Length {made['duration']:.1f} s; rendered in {made['render_seconds']:.0f} s with Playwright and headless Chromium (software GL), encoded with ffmpeg.
- Pipeline: Site__Agent__Studio, site/accounts/c/update (RUNBOOK.md). Every fact's source is in storyboard.json.
- Licences: {src}

## OpenRouter calls for the voice
| UTC | Model | Voice | Seconds | Cost (USD) |
|---|---|---|---|---|
{rows}| | | | total | {cost:.4f} |
""")
dst = f"{ig}/site/posts/{pid}"
if os.path.exists(dst): shutil.rmtree(dst)
shutil.copytree(post, dst)
h = {f: hashlib.sha256(open(f"{dst}/{f}", "rb").read()).hexdigest() for f in sorted(os.listdir(dst))}
json.dump(h, open(f"{work}/sha256.json", "w"), indent=1)
r = subprocess.run(["node", "tools/ig-post.mjs", pid, "--dry-run"], cwd=ig, capture_output=True, text=True)
print("dry run:", (r.stdout + r.stderr).strip())
if push:
    msg = f"{pid}: a Reel by studio.c, {sb['presenter_name']} presents (no approval line)\n\nAgent: studio.c@SovereignWebsite.dinis\nClaude-Session: https://claude.ai/code/session_01Kw9UwC3pdjxjDeK5WaZYUD\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"
    subprocess.run(["git", "add", f"site/posts/{pid}"], cwd=ig, check=True)
    subprocess.run(["git", "commit", "-q", "-m", msg], cwd=ig, check=True)
print(json.dumps({"post": pid, "voice_cost_usd": round(cost, 4), "sha256": h}, indent=1))
