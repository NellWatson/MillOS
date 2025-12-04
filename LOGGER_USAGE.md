# Centralized Logger Usage Guide

## Overview

The MillOS codebase now has a centralized logging utility at `/src/utils/logger.ts` that replaces scattered `console.log/warn/error` statements throughout the codebase.

## Features

- **Log Levels**: `debug`, `info`, `warn`, `error`
- **Development/Production Modes**: `debug` logs only appear in development
- **Namespaced Loggers**: Separate loggers for different subsystems
- **Automatic Timestamps**: All logs include timestamps
- **Enable/Disable**: Loggers can be toggled on/off
- **Child Loggers**: Create scoped loggers with custom prefixes

## Basic Usage

### Import the Logger

```typescript
import { logger } from './utils/logger';
```

### Log Messages

```typescript
// General logging
logger.debug('This only shows in development', { someData: 123 });
logger.info('Important information');
logger.warn('Warning message', someObject);
logger.error('Error occurred', error);
```

## Namespaced Loggers

Use subsystem-specific loggers for better organization:

### SCADA Subsystem

```typescript
import { logger } from './utils/logger';

logger.scada.info('SCADA connection established');
logger.scada.warn('Tag read timeout', { tagId: 'RM101.ST001' });
logger.scada.error('MQTT connection failed', error);
```

### Audio Subsystem

```typescript
import { logger } from './utils/logger';

logger.audio.info('Audio context initialized');
logger.audio.warn('Failed to load sound file', { file: 'beep.mp3' });
logger.audio.error('Web Audio API not supported', error);
```

### AI Engine

```typescript
import { logger } from './utils/logger';

logger.ai.debug('Generating decision for machine', { machineId: 'RM-101' });
logger.ai.info('AI decision completed', { decisionId: 'dec-123' });
logger.ai.warn('Low confidence prediction', { confidence: 0.3 });
```

### Worker System

```typescript
import { logger } from './utils/logger';

logger.worker.debug('Worker pathfinding started', { workerId: 'W001' });
logger.worker.info('Worker assigned to machine', { workerId: 'W001', machineId: 'RM-101' });
```

### Store/State Management

```typescript
import { logger } from './utils/logger';

logger.store.info('Store rehydrated from localStorage');
logger.store.warn('Invalid graphics quality, resetting to default');
logger.store.error('Failed to persist state', error);
```

### Performance Logging

```typescript
import { logger } from './utils/logger';

logger.perf.debug('Frame render took 16.7ms');
logger.perf.warn('Slow component render detected', { component: 'WorkerSystem', time: 45 });
```

## Creating Custom Loggers

### Create a Child Logger

```typescript
import { logger } from './utils/logger';

// Create a scoped logger for a specific component
const forkliftLogger = logger.child('Forklift');

forkliftLogger.debug('Path calculated', { waypoints: 5 });
forkliftLogger.info('Safety stop triggered');

// Output: "12:34:56 [DEBUG][Forklift] Path calculated { waypoints: 5 }"
```

### Create a Standalone Logger

```typescript
import { Logger } from './utils/logger';

const myLogger = new Logger({
  prefix: 'MyComponent',
  level: 'debug',
  enabled: true
});

myLogger.info('Component initialized');
```

## Configuration

### Enable/Disable Logging

```typescript
import { logger } from './utils/logger';

// Disable all default logging
logger.setEnabled(false);

// Disable specific subsystem
logger.scada.setEnabled(false);
```

### Change Log Level

```typescript
import { logger } from './utils/logger';

// Only show warnings and errors
logger.setLevel('warn');

// Set level for specific subsystem
logger.ai.setLevel('info');
```

## Migration Examples

### Before (Old Code)

```typescript
console.log('[SCADA Sync] Initializing...');
console.error('[SCADA Sync] Failed to connect:', error);
console.warn('[Audio] Failed to load sound file');
```

### After (New Code)

```typescript
import { logger } from './utils/logger';

logger.scada.info('Initializing SCADA sync');
logger.scada.error('Failed to connect', error);
logger.audio.warn('Failed to load sound file');
```

## Log Output Format

All logs include timestamps and prefixes:

```
12:34:56 [INFO][SCADA] Initializing SCADA sync
12:34:57 [WARN][Audio] Failed to load sound file
12:34:58 [ERROR][Store] Failed to persist state Error: ...
12:35:00 [DEBUG][AI] Shift changed from morning to afternoon
```

## Available Namespaced Loggers

- `logger.scada` - SCADA system operations
- `logger.audio` - Audio manager and sound system
- `logger.ai` - AI engine and decision generation
- `logger.worker` - Worker system and pathfinding
- `logger.store` - Zustand store and state management
- `logger.perf` - Performance metrics and optimization

## Production Behavior

In production builds:
- `debug` logs are suppressed by default
- `info`, `warn`, and `error` logs are still output
- Log levels can be adjusted at runtime if needed

## Migration Status

### Completed
- `/src/utils/logger.ts` - Logger utility created
- `/src/store.ts` - Updated to use logger.store
- `/src/utils/audioManager.ts` - Updated to use logger.audio
- `/src/utils/aiEngine.ts` - Updated to use logger.ai

### Remaining
- 120+ console statements in other files can be migrated incrementally
- Use search pattern: `console\.(log|warn|error|info|debug)` to find remaining statements

## Best Practices

1. **Use appropriate log levels**:
   - `debug`: Development-only, verbose information
   - `info`: Important state changes, initialization
   - `warn`: Recoverable errors, deprecation warnings
   - `error`: Critical failures, exceptions

2. **Use namespaced loggers**:
   - Always use subsystem loggers (scada, audio, ai, etc.) instead of the default logger
   - This improves log organization and filtering

3. **Include context**:
   - Pass relevant objects/data as additional arguments
   - Don't construct complex log strings manually

4. **Avoid sensitive data**:
   - Don't log passwords, API keys, or personal information
   - Sanitize data before logging in production

## TypeScript Support

The logger is fully typed:

```typescript
import { Logger, LogLevel, LoggerConfig } from './utils/logger';

const config: LoggerConfig = {
  level: 'debug',
  prefix: 'MyComponent',
  enabled: true
};

const myLogger = new Logger(config);
```

## File Locations

- **Logger Utility**: `/src/utils/logger.ts`
- **Usage Examples**: This file and updated source files
- **Migration Guide**: See sections above

---

For questions or issues, refer to the source code at `/src/utils/logger.ts`
