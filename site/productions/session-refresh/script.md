# How we refresh a session: script, v0.4

1. **cover** (9 s): Burning too many tokens with Claude? A long session gets more expensive with every turn. This is why, and how we recycle our sessions.
2. **hook** (7 s): This Claude agent wrote three quarters of a million tokens. To do it, it re-read ninety-five million.
3. **why** (9 s): Every turn, a chat re-reads itself from the top. So each message costs a little more than the last. Add them up, and you get a curve.
4. **moment** (9 s): The rule says: hand over before three hundred thousand tokens. Every hand-over we can evidence came later. The latest, at eight hundred and forty-five thousand.
5. **writes** (10 s): So here is what we do. Step one: the old session writes a short note in its repository. What is open. What it learnt. What to do first.
6. **reads** (10 s): Step two: a person starts a new session with one line, pointing at the note. It reads the rules, its role, its state. It never opens the old transcript.
7. **test** (8 s): Step three: test it. Does the fresh session reach the same next step as the old one? If not, a file is missing. Fix the file.
8. **saving** (12 s): One measured hand-over. Before: eight hundred and sixty thousand tokens of context. After: one hundred and nineteen thousand. Eighty-six per cent less to re-read, on every turn.
9. **lesson** (7 s): Write it early. Keep state in files. Load only what you need.
10. **team** (9 s): This was made by one person and a small team of AI agents. The team, the script and every source are on the page below.
