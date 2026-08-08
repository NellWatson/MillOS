# Art Fidelity Loop

Run one round of the adversarial visual-fidelity loop documented in
`docs/VISUAL_FIDELITY_LOOP.md`. Read that document before starting; it holds the
rules this command assumes.

Arguments (all optional): `$ARGUMENTS`
- a label for this round (default `iter-<date>`)
- `--set=<art|full|quick|exterior|interior>`
- `--time=<hour> --weather=<name>` to review a non-noon condition
- `--baseline=<label>` to blind-A/B against a previous round

## Round

1. **Capture.**
   ```bash
   npm run capture:art -- --label=<label> --headed
   ```
   Add `--perf-gate` on the first and last round of a session. `--headed` is not
   optional for real review: headless renders in software and does not match the
   shipping image. Warn the user that browser windows will open, and that the
   run takes roughly a minute and a half per scene.

2. **Judge.** Spawn the `visual-fidelity-judge` agent on the capture directory.
   Give it the directory and nothing else — not what changed, not which
   iteration this is, not what you hope it concludes. It writes `verdict.md`
   into the capture directory and returns it.

3. **Report before fixing.** Show the user the verdict's scores, blocking
   defects, and provisos. If the verdict is PASS, stop — the round is done.

4. **Fix** the blocking defects in the judge's order, routing each by kind per
   the table in `docs/VISUAL_FIDELITY_LOOP.md` §2. Do not touch anything the
   judge did not raise.

5. **Prove it.** Re-capture, then:
   - stage a blind pair with `npm run review:stage-ab` and judge it with the
     `blind-ab-judge` agent, which must not be told which side is new;
   - run the non-art budget gate: `npm run benchmark:runtime -- --scenes=<touched> --headed`
     (the budgets are real-GPU numbers; a headless run measures SwiftShader and
     fails meaninglessly);
   - run `npm run typecheck && npm run lint && npm run build && npm test`.

   A fix that wins the blind comparison but misses budget is not accepted.

## Rules

- **The rubric in `.claude/agents/visual-fidelity-judge.md` is fixed.** Do not
  edit it to turn a FAIL into a PASS, and do not paraphrase it into the judge's
  prompt in softened form. Changing the standard is the user's decision.
- **Bounded.** Five rounds maximum per session unless the user extends it. On
  exhaustion, write the judge's remaining findings up as accepted debt and stop.
  The loop terminating without a PASS is a legitimate outcome; running overnight
  chasing a critic's approval is not.
- Report honestly which axes still fail and by how much.
