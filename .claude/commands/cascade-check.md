# Cascade Risk Assessment

Before modifying a type, interface, or shared export, assess the cascade risk.

For the file or symbol: $ARGUMENTS

1. **Find all importers**:
   ```bash
   grep -r "from.*filename" src/
   ```

2. **Count total usages** across codebase

3. **Assess risk level**:
   - **Low** (1-3 files): Safe to modify with care
   - **Medium** (4-10 files): Plan updates for all files before changing
   - **High** (10+ files): Consider if change is necessary, plan carefully

4. **Identify critical paths**:
   - Which files are most affected?
   - Are there deeply nested dependencies?

5. **Recommend approach**:
   - For Low: Proceed with validation after each file
   - For Medium: List all files to update in order
   - For High: Consider alternative approaches or break into smaller changes

This prevents the scenario where one type change causes 50+ downstream errors.
