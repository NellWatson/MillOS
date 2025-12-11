# Quick TypeScript Check

Run a quick TypeScript check without full build:

```bash
npx tsc --noEmit
```

Use this after individual file changes to catch type errors early, before running the full build.

Report:
- Number of errors (if any)
- File locations of errors
- Specific error messages

If errors are found, identify if this is a cascade (10+ errors from one root cause) and trace back to the source.
