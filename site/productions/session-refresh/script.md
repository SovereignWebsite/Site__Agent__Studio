# How we refresh a session: script, v0.2

1. **hook** (8 s): This agent wrote three quarters of a million tokens. To do it, it re-read ninety-five million.
2. **why** (9 s): Every turn, a chat re-reads itself from the top. So each message costs a little more than the last. Add them up, and you get a curve.
3. **moment** (9 s): The rule says: hand over before three hundred thousand tokens. Every hand-over we can evidence came later. The latest, at eight hundred and forty-five thousand.
4. **writes** (10 s): So the old session writes down what the next one needs. What is open. What it learnt. What to do first. Nothing may live only in the session.
5. **reads** (9 s): A person starts a new session with one line. It reads the rules, its role, its state. It never opens the old transcript.
6. **test** (7 s): The test: does the fresh session reach the same next step as the old one? If not, a file is missing. Fix the file.
7. **saving** (12 s): One measured hand-over. Before: eight hundred and sixty thousand tokens of context. After: one hundred and nineteen thousand. Eighty-six per cent less to re-read, on every turn.
8. **lesson** (8 s): Write it early. Keep state in files. Load only what you need.
9. **credits** (5 s): Every number here has a source, listed below the player.
