# Review Recent Changes

Review the most recent code changes for MillOS quality standards.

1. Run `git diff HEAD~1` to see changes
2. Check each modified file against these criteria:

**TypeScript**:
- [ ] No new type errors introduced
- [ ] Types defined in `src/types.ts` (not inline)
- [ ] Proper null checks (`?.` and `??` guards)

**React Three Fiber**:
- [ ] Proper cleanup in useEffect
- [ ] useFrame uses delta for animations
- [ ] No DOM manipulation in 3D components

**Architecture**:
- [ ] State in correct location (local vs Zustand)
- [ ] 3D/UI concerns properly separated
- [ ] Using `@/` path aliases

**Code Style**:
- [ ] No emojis (except approved locations)
- [ ] No unnecessary refactoring
- [ ] Minimal, surgical changes

**Graphics**:
- [ ] No flickering-prone patterns added
- [ ] Quality level guards if needed

Report findings and recommend fixes for any violations.
