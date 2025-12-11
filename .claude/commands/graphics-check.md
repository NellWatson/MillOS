# Graphics Quality Check

Audit 3D components for potential flickering or performance issues.

Search for known problematic patterns:

1. **Transparent materials with BackSide**:
   - `side.*BackSide` combined with `transparent`
   - Missing `depthWrite: false`

2. **Z-fighting risks**:
   - Floor overlays with y < 0.03
   - Overlapping geometry at same position

3. **Shadow issues**:
   - Multiple shadow-casting lights
   - Shadow bias values < -0.001

4. **Post-processing on medium quality**:
   - EffectComposer without quality guards

5. **Camera depth precision**:
   - near < 0.5 or far > 300

Report:
- Potential issues found
- File and line locations
- Recommended fixes

Reference CLAUDE.md "Known Graphics Issues" for context.
