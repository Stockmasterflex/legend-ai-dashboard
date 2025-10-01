ROLE: Code reviewer committee (GPT-5-Codex + Claude-4.5-Sonnet).
INPUTS: diff, failing tests, spec excerpt.
TASK:
1) Codex: minimal patch to satisfy spec & tests.
2) Claude: critique patch; list edge cases; propose improvements.
OUTPUT: final patch + test additions.


