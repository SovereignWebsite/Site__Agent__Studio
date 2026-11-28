# How we refresh a session: script, v0.7

1. **cover** (13 s): Burning too many tokens with Claude? When a session gets long, Claude compacts it for you, and you do not choose what is lost. We compact our own sessions, on purpose. Here is the problem, our rule, and the three steps.
2. **hook** (7 s): This Claude agent wrote three quarters of a million tokens. To do it, it re-read ninety-five million.
3. **why** (9 s): Every turn, a chat re-reads itself from the top. So each message costs a little more than the last. Add them up, and you get a curve.
4. **moment** (11 s): Our conductors and maestros watch every session. The rule: hand over before three hundred thousand tokens. Every hand-over we can evidence came later. The latest, at eight hundred and forty-five thousand.
5. **writes** (12 s): So we compact on purpose. Step one: the old session writes its own summary into its repository, as plain Markdown. What happened. What is open. What to do next.
6. **reads** (11 s): Step two: a conductor starts a new session with one line, pointing at the note. It loads the rules, the agent behaviour policies, its role, its state. It never opens the old transcript.
7. **keys** (11 s): Underneath it all: every agent has its own pair of keys, and they last for one session only. The old key is retired. The new session makes its own, and signs everything it does.
8. **test** (8 s): Step three: check it. Does the fresh session reach the same next step as the old one? If not, a file is missing. Fix the file.
9. **saving** (12 s): One measured hand-over. Before: eight hundred and sixty thousand tokens of context. After: one hundred and nineteen thousand. Eighty-six per cent less to re-read, on every turn.
10. **lesson** (7 s): Write it early. Keep state in files. Load only what you need.
11. **team** (16 s): This film was made by an agile cell: one person, two maestros on two accounts, a conductor, a lead agent and its helpers. It was set up for this one film, and it will be archived when the film is done.
