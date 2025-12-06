/**
 * Performance Monitoring Utility for MillOS
 * Tracks execution time of key functions to identify bottlenecks
 */

const timings: Map<string, number[]> = new Map();
const frameCounts: Map<string, number> = new Map();
const MAX_SAMPLES = 100;

let frameStartTime = 0;
let frameCount = 0;
let frameBudget: { useFrame: number; render: number; store: number; idle: number } = {
  useFrame: 0,
  render: 0,
  store: 0,
  idle: 0,
};

export function perfStart(label: string) {
  performance.mark(`${label}-start`);
}

export function perfEnd(label: string) {
  performance.mark(`${label}-end`);
  try {
    performance.measure(label, `${label}-start`, `${label}-end`);
    const measure = performance.getEntriesByName(label).pop();
    if (measure) {
      const samples = timings.get(label) || [];
      samples.push(measure.duration);
      if (samples.length > MAX_SAMPLES) samples.shift();
      timings.set(label, samples);
    }
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(`${label}-end`);
    performance.clearMeasures(label);
  } catch {
    // Ignore measurement errors
  }
}

export function perfCount(label: string) {
  const count = frameCounts.get(label) || 0;
  frameCounts.set(label, count + 1);
}

export function perfFrameStart() {
  frameStartTime = performance.now();
  frameCount++;
}

export function perfFrameEnd() {
  // Returns frame duration for external use
  return performance.now() - frameStartTime;
}

export function perfReport() {
  const report: Record<string, { avg: number; max: number; min: number; total: number; samples: number }> = {};

  timings.forEach((samples, label) => {
    if (samples.length === 0) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const max = Math.max(...samples);
    const min = Math.min(...samples);
    const total = samples.reduce((a, b) => a + b, 0);
    report[label] = {
      avg: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      total: Math.round(total),
      samples: samples.length,
    };
  });

  // Sort by avg time descending
  const sorted = Object.entries(report).sort((a, b) => b[1].avg - a[1].avg);

  console.log('%c=== PERFORMANCE REPORT ===', 'color: #ff6b6b; font-weight: bold; font-size: 14px');
  console.log(`Samples per metric: up to ${MAX_SAMPLES}`);
  console.table(Object.fromEntries(sorted));

  return report;
}

export function perfCountReport() {
  console.log('%c=== CALL COUNT REPORT ===', 'color: #4ecdc4; font-weight: bold; font-size: 14px');
  const sorted = Array.from(frameCounts.entries()).sort((a, b) => b[1] - a[1]);
  console.table(Object.fromEntries(sorted));
  return Object.fromEntries(sorted);
}

export function perfReset() {
  timings.clear();
  frameCounts.clear();
  frameCount = 0;
  console.log('%cPerformance data reset', 'color: #95e1d3');
}

// Heavy operation detector - logs if operation takes more than threshold
export function perfWarn(label: string, thresholdMs: number = 1) {
  return {
    start: () => performance.mark(`${label}-warn-start`),
    end: () => {
      performance.mark(`${label}-warn-end`);
      try {
        performance.measure(`${label}-warn`, `${label}-warn-start`, `${label}-warn-end`);
        const measure = performance.getEntriesByName(`${label}-warn`).pop();
        if (measure && measure.duration > thresholdMs) {
          console.warn(`[SLOW] ${label}: ${measure.duration.toFixed(2)}ms (threshold: ${thresholdMs}ms)`);
        }
        performance.clearMarks(`${label}-warn-start`);
        performance.clearMarks(`${label}-warn-end`);
        performance.clearMeasures(`${label}-warn`);
      } catch {
        // Ignore
      }
    },
  };
}

// Frame budget tracker
export function updateFrameBudget(category: 'useFrame' | 'render' | 'store', duration: number) {
  frameBudget[category] += duration;
}

export function getFrameBudget() {
  const total = frameBudget.useFrame + frameBudget.render + frameBudget.store;
  const targetFrameTime = 16.67; // 60fps target
  frameBudget.idle = Math.max(0, targetFrameTime - total);
  return { ...frameBudget, total };
}

export function resetFrameBudget() {
  frameBudget = { useFrame: 0, render: 0, store: 0, idle: 0 };
}

// Expose globally for console access
if (typeof window !== 'undefined') {
  (window as any).perfReport = perfReport;
  (window as any).perfCountReport = perfCountReport;
  (window as any).perfReset = perfReset;
  (window as any).perfTimings = timings;
  (window as any).perfCounts = frameCounts;
}

// Auto-report every 10 seconds in development
let autoReportInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoReport(intervalMs: number = 10000) {
  if (autoReportInterval) clearInterval(autoReportInterval);
  autoReportInterval = setInterval(() => {
    console.log('\n');
    perfReport();
    perfCountReport();
  }, intervalMs);
  console.log(`%cAuto-report started (every ${intervalMs / 1000}s). Call perfReport() manually anytime.`, 'color: #95e1d3');
}

export function stopAutoReport() {
  if (autoReportInterval) {
    clearInterval(autoReportInterval);
    autoReportInterval = null;
  }
}

// Start auto-report in dev mode
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  // Don't auto-start, let user control it
  (window as any).startAutoReport = startAutoReport;
  (window as any).stopAutoReport = stopAutoReport;
  console.log('%c[PerfMonitor] Ready. Use perfReport(), startAutoReport(), stopAutoReport()', 'color: #95e1d3');
}
