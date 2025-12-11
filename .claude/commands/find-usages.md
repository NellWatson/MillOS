# Find All Usages

Before modifying types, interfaces, or exports, find all usages to prevent cascading errors.

For the provided symbol name: $ARGUMENTS

Search for:
1. Import statements: `from.*{symbol}` and `import.*{symbol}`
2. Direct usages: `{symbol}\.` and `{symbol}\(`
3. Type annotations: `: {symbol}` and `<{symbol}>`
4. Destructuring: `{ {symbol} }`

Report:
- Total number of usages
- List of files affected
- Line numbers for each usage

This information is critical before making any changes to shared code.
