import { useRef, useEffect } from 'react';

/**
 * Custom hook for managing disposable Three.js resources
 * Automatically disposes resources when dependencies change or component unmounts
 *
 * @param factory - Function that creates the disposable resource
 * @param deps - Dependency array (like useEffect)
 * @returns The created resource
 *
 * @example
 * const texture = useDisposable(() => {
 *   const canvas = document.createElement('canvas');
 *   // ... create texture
 *   return new THREE.CanvasTexture(canvas);
 * }, []);
 */
export function useDisposable<T extends { dispose: () => void }>(
  factory: () => T,
  deps: React.DependencyList
): T | null {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    // Create the resource
    ref.current = factory();

    // Cleanup: dispose the resource
    return () => {
      if (ref.current) {
        ref.current.dispose();
        ref.current = null;
      }
    };
  }, deps);

  return ref.current;
}

/**
 * Custom hook for managing multiple disposable Three.js resources
 * Automatically disposes all resources when dependencies change or component unmounts
 *
 * @param factory - Function that creates an array of disposable resources
 * @param deps - Dependency array (like useEffect)
 * @returns Array of created resources
 *
 * @example
 * const [geometry, material] = useDisposableArray(() => {
 *   const geom = new THREE.BoxGeometry(1, 1, 1);
 *   const mat = new THREE.MeshStandardMaterial({ color: 'red' });
 *   return [geom, mat];
 * }, []);
 */
export function useDisposableArray<T extends { dispose: () => void }>(
  factory: () => T[],
  deps: React.DependencyList
): T[] {
  const ref = useRef<T[]>([]);

  useEffect(() => {
    // Create the resources
    ref.current = factory();

    // Cleanup: dispose all resources
    return () => {
      ref.current.forEach((resource) => {
        if (resource) {
          resource.dispose();
        }
      });
      ref.current = [];
    };
  }, deps);

  return ref.current;
}
