# Geoffrey Pattern Validation

Run the full validation suite as required by the Geoffrey Pattern workflow.

Execute these commands in sequence and report results:

1. `npm run typecheck` - TypeScript validation
2. `npm run lint` - ESLint checks
3. `npm run format:check` - Prettier formatting
4. `npm run build` - Full production build

**Requirements:**
- All commands must pass
- Show actual terminal output for each
- If any fail, identify the specific errors
- Do NOT mark tasks complete until all pass

This is the deterministic validation step - external verification that doesn't rely on self-reporting.
