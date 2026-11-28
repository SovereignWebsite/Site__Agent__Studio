# How we refresh a session: script, v0.1

1. **hook** (8 s): This agent wrote three quarters of a million tokens. To do it, it re-read ninety-five million.
2. **why** (10 s): Every turn, a chat re-reads itself from the top. So each message costs a little more than the last. That is a straight line. Add the lines up, and you get a curve.
3. **moment** (9 s): The rule says: hand over before three hundred thousand tokens. Every hand-over we can evidence came later. The latest, at eight hundred and forty-five thousand.
4. **writes** (12 s): So the old session writes down what the next one needs. What is open. What it learnt. What to do first. A few pages, in the repository. Nothing may live only in the session.
5. **reads** (9 s): A person starts a new session with one line. It reads the rules, its role, its state. It never opens the old transcript.
6. **keys** (14 s): Some things are lost on purpose. The old key is retired; the new session cuts its own. Secrets sealed to the old key are sealed again, and checked to open.
7. **test** (7 s): The test: does the fresh session reach the same next step as the old one? If not, a file is missing. Fix the file.
8. **saving** (14 s): One measured hand-over. Before: eight hundred and sixty thousand tokens of context. After: one hundred and nineteen thousand. Eighty-six per cent less to re-read, on every turn. About seventy-five thousand is a floor that stays.
9. **lesson** (5 s): Write it early. Keep state in files. Load only what you need.
10. **credits** (8 s): Every number here has a source, listed below the player. There is no presenter, and the voice you hear is made by AI.
