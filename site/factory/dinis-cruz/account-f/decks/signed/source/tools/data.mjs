// Snapshot this repository's own facts into src/data.json: every commit on dev (time, the Agent: trailer, whether it
// carries an SSH signature, how many files it changed) and the files in site/ by kind. Run in the repository.
//   node tools/data.mjs <path to the repository> > src/data.json
import { execFileSync } from "node:child_process";
const repo = process.argv[2] || ".", git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 1 << 26 });
const SEP = "\u001f";
const commits = git("log", "--reverse", `--format=%H${SEP}%aI${SEP}%(trailers:key=Agent,valueonly,separator=;)`, "origin/dev").trim().split("\n").map((l) => {
  const [h, t, agent] = l.split(SEP);
  const signed = /BEGIN SSH SIGNATURE/.test(git("cat-file", "-p", h));
  const files = git("show", "--name-only", "--format=", h).trim().split("\n").filter(Boolean).length;
  return { t, agent: (agent || "").trim() || null, signed, files };
});
const kinds = { page: /\.html?$/, code: /\.(m?js|cjs|py|sh)$/, style: /\.css$/, data: /\.(json|txt|md|tpl)$/, picture: /\.(webp|png|jpe?g|svg|gif)$/, sound: /\.(flac|wav|mp3|ogg)$/, font: /\.(woff2?|otf|ttf)$/ };
const files = git("ls-files", "site").trim().split("\n"), byKind = {};
for (const f of files) { const k = Object.keys(kinds).find((k) => kinds[k].test(f)) || "other"; byKind[k] = (byKind[k] || 0) + 1; }
const agents = {}; for (const c of commits) if (c.agent) agents[c.agent] = (agents[c.agent] || 0) + 1;
console.log(JSON.stringify({ taken: new Date().toISOString().slice(0, 16) + "Z", repository: "SovereignWebsite/Site__Agent__Studio", branch: "dev",
  commits, signed: commits.filter((c) => c.signed).length, agents, files: files.length, byKind }, null, 1));
