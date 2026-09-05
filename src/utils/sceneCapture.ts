/**
 * Screenshot bridge between DOM buttons and the R3F canvas.
 *
 * The WebGL context is created with `preserveDrawingBuffer: false`, so a
 * `canvas.toDataURL()` from a click handler reads an already-cleared buffer and
 * silently returns a blank frame. The renderer registers a capture function
 * that re-renders the scene and reads the pixels back in the same tick.
 */
export type SceneCapture = () => string | null;

let capture: SceneCapture | null = null;

export function registerSceneCapture(fn: SceneCapture | null): void {
  capture = fn;
}

/** Returns a PNG data URL of the current frame, or null when no renderer is mounted. */
export function captureScenePng(): string | null {
  try {
    return capture?.() ?? null;
  } catch {
    return null;
  }
}

export function downloadScenePng(filename: string): boolean {
  const dataUrl = captureScenePng();
  if (!dataUrl) return false;
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}
