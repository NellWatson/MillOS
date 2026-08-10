# MillOS v0.40 Performance Report

**Source baseline:** `0235c8985e67e91b7c4f9a90d1d696e9e8689d70`
**Measured:** 2026-08-10
**Status:** Green on the targeted local v0.40 preview and accepted full-view baseline

## Current acceptance baseline

| View | Average FPS | p95 frame time | Draw calls | Evidence | Result |
|---|---:|---:|---:|---|---|
| Overview | 78.0 | 15.0 ms | 1,232 | Current candidate | Pass |
| Interior | 101.9 | 11.5 ms | 822 | Accepted source baseline | Pass |
| Shipping | 85.4 | 13.6 ms | 1,078 | Accepted source baseline | Pass |
| Receiving | 91.4 | 12.2 ms | 1,021 | Accepted source baseline | Pass |
| Water | 71.8 | 15.8 ms | 1,269 | Current candidate | Pass |

All five views remain above 60 FPS and below the 16.7 ms p95 frame budget. The
water view dropped from 1,426 calls on the accepted source baseline to 1,269,
an 11.0 percent reduction. The factory machine bodies remain mounted and
visible through the windows. Only distant spouting, flow effects, and conveyor
detail are culled beyond 200 metres, with a 190-metre return threshold to avoid
visibility chatter.

Static exterior batching now orders compatible candidates before bounded
startup chunking. Two independent scene loads produced the same 2,126
candidates, 1,945 optimized originals, and 192 batches. This removes the lazy
module resolution order from steady-state batching results.

Interior, shipping, and receiving retain their last accepted source-baseline
samples in this report. Their declared camera positions are inside the
190-metre detail return threshold. Browser acceptance on the current candidate
passed separately; a host-saturated aggregate sample was excluded rather than
presented as comparable frame-time evidence.

## Startup

| Network profile | Overview first useful frame | Five-view range | Result |
|---|---:|---:|---|
| Native | 306.1 ms | 253.8 to 329.6 ms | Pass |
| Representative Fast 3G | 3,065.0 ms | 3,058.2 to 3,069.3 ms | Pass |

These measurements use the versioned Vite preview path. A bare Python static server is not a representative serving baseline because it does not reproduce Vite or deployment compression and routing.

## Delivery

- Initial JavaScript: 0.42 MiB gzip across five files.
- Production build: 3,588 transformed modules.
- Physics, WebGPU, SCADA, charts, and post-processing remain deferred chunks.
- The service worker isolates caches by deployment scope and build identity.
- Historical release payload size is tracked separately from current v0.40 startup transfer.

## Current optimization priorities

1. Keep the water view at or below 1,283 draw calls while preserving the authored machine silhouettes.
2. Preserve each view's p95 frame time while integrating visible geometry changes.
3. Keep native first useful frame at or below 350 ms and Fast 3G at or below 3.2 seconds.
4. Reject shader cache keys containing time, randomness, or other per-frame values.
5. Measure runtime, effective DPR, static-batch diagnostics, and visual output after every geometry or shader wave.

## Required commands

```bash
VERSION=v0.40 npm run build
npm run validate:bundle
npm run benchmark:runtime
npm run capture:art
```

A build proves compilation and packaging. Runtime, visual, deployment, and final aesthetic acceptance remain separate gates.
