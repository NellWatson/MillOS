# MillOS v0.40 Performance Report

**Baseline commit:** `dd414cf53fcb648908a5227cae7ac8d7a62c413d`
**Measured:** 2026-08-10
**Status:** Green on the versioned Vite preview baseline

## Current acceptance baseline

| View | Average FPS | p95 frame time | Draw calls | Result |
|---|---:|---:|---:|---|
| Overview | 84.0 | 13.8 ms | 1,245 | Pass |
| Interior | 107.2 | 10.8 ms | 822 | Pass |
| Shipping | 89.2 | 13.0 ms | 1,070 | Pass |
| Receiving | 92.5 | 12.1 ms | 1,021 | Pass |
| Water | 75.3 | 14.8 ms | 1,407 | Pass |

All five views remain above 60 FPS and below the 16.7 ms p95 frame budget. The water view is the next draw-call target, despite meeting the frame-time budget.

## Startup

| Network profile | Overview first useful frame | Five-view range | Result |
|---|---:|---:|---|
| Native | 306.1 ms | 253.8 to 329.6 ms | Pass |
| Representative Fast 3G | 3,065.0 ms | 3,058.2 to 3,069.3 ms | Pass |

These measurements use the versioned Vite preview path. A bare Python static server is not a representative serving baseline because it does not reproduce Vite or deployment compression and routing.

## Delivery

- Initial JavaScript: 0.42 MiB gzip across five files.
- Production build: 3,587 transformed modules.
- Physics, WebGPU, SCADA, charts, and post-processing remain deferred chunks.
- The service worker isolates caches by deployment scope and build identity.
- Historical release payload size is tracked separately from current v0.40 startup transfer.

## Current optimization priorities

1. Reduce the water-view draw calls by at least 10 percent without changing its authored appearance.
2. Preserve or improve each view's p95 frame time while integrating visible geometry changes.
3. Keep native first useful frame at or below 350 ms and Fast 3G at or below 3.2 seconds.
4. Reject shader cache keys containing time, randomness, or other per-frame values.
5. Measure runtime, effective DPR, and visual output after every geometry or shader wave.

## Required commands

```bash
VERSION=v0.40 npm run build
npm run validate:bundle
npm run benchmark:runtime
npm run capture:art
```

A build proves compilation and packaging. Runtime, visual, deployment, and final aesthetic acceptance remain separate gates.
