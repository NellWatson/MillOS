# SCADA High-Priority Integrity Status

**Baseline commit:** `dd414cf53fcb648908a5227cae7ac8d7a62c413d`
**Status:** Implemented and covered in the MillOS repository

This file previously referenced `/Users/nellwatson/Documents/GitHub/Experiments`, which was not the MillOS source tree. The authoritative implementations are under `src/scada/` in this repository.

## Implemented protections

### Historian write integrity

`src/scada/HistoryStore.ts` retains buffered records until the IndexedDB transaction succeeds, then removes only the records confirmed as flushed. Query operations use explicit ten-second timeouts.

### Alarm listener isolation

`src/scada/AlarmManager.ts` notifies a snapshot of its listener set. A listener that unsubscribes during notification cannot skip or corrupt later callbacks.

### Adapter validation and cleanup

Protocol adapters validate inbound messages before dispatch. Subscription errors are isolated so one faulty consumer cannot stop other subscribers or prevent cleanup.

### Alarm lifecycle and archive

Alarm activation, acknowledgement, shelving, out-of-service state, clearance, and archive behavior are exercised by focused SCADA tests.

## Focused verification

```bash
npx vitest run src/scada
npm run typecheck
npm run lint
npm run build
```

## Remaining operational gates

- Exercise disconnect, stale-data, malformed-frame, retry, and backpressure scenarios in a real browser session.
- Confirm scene animation, SCADA tag values, alarm state, and historian output remain synchronized.
- Validate the optional SCADA proxy separately from simulation mode.
- Treat a passing source suite as machine evidence, not as live controller or production-network acceptance.
