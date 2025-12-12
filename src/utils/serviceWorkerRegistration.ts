/**
 * Service Worker Registration Utility
 *
 * Handles registering, updating, and communicating with the service worker.
 *
 * Usage:
 *   import { registerServiceWorker, unregisterServiceWorker } from './serviceWorkerRegistration';
 *
 *   // In your app initialization:
 *   registerServiceWorker();
 *
 *   // To force update:
 *   updateServiceWorker();
 *
 *   // To clear all caches:
 *   clearServiceWorkerCache();
 */

type ServiceWorkerCallback = (registration: ServiceWorkerRegistration) => void;

interface ServiceWorkerConfig {
  onSuccess?: ServiceWorkerCallback;
  onUpdate?: ServiceWorkerCallback;
  onError?: (error: Error) => void;
}

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(config?: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.log('[SW Registration] Service workers not supported');
    return null;
  }

  // Only register in production or when explicitly enabled
  const isDev = import.meta.env?.DEV;
  const forceEnable = import.meta.env?.VITE_ENABLE_SW === 'true';

  if (isDev && !forceEnable) {
    console.log('[SW Registration] Skipping in development (set VITE_ENABLE_SW=true to enable)');
    return null;
  }

  try {
    // Determine SW path based on base URL
    const swUrl = `${import.meta.env?.BASE_URL || '/'}sw.js`;

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: import.meta.env?.BASE_URL || '/',
    });

    console.log('[SW Registration] Service worker registered:', registration.scope);

    // Handle updates
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            console.log('[SW Registration] New service worker available');
            config?.onUpdate?.(registration);
          } else {
            // First-time install
            console.log('[SW Registration] Service worker installed successfully');
            config?.onSuccess?.(registration);
          }
        }
      };
    };

    return registration;
  } catch (error) {
    console.error('[SW Registration] Registration failed:', error);
    config?.onError?.(error as Error);
    return null;
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    for (const registration of registrations) {
      await registration.unregister();
      console.log('[SW Registration] Unregistered:', registration.scope);
    }

    return true;
  } catch (error) {
    console.error('[SW Registration] Unregister failed:', error);
    return false;
  }
}

/**
 * Force update the service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('[SW Registration] Update check triggered');
    }
  } catch (error) {
    console.error('[SW Registration] Update check failed:', error);
  }
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCache(): Promise<boolean> {
  const controller = navigator.serviceWorker?.controller;

  if (!isServiceWorkerSupported() || !controller) {
    // Fallback: clear caches directly
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((name) => name.startsWith('millos-')).map((name) => caches.delete(name))
      );
      console.log('[SW Registration] Caches cleared via Cache API');
      return true;
    }
    return false;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data?.success) {
        console.log('[SW Registration] Caches cleared via service worker');
        resolve(true);
      } else {
        resolve(false);
      }
    };

    controller.postMessage(
      { type: 'CLEAR_CACHE' },
      [messageChannel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Get cache statistics from the service worker
 */
export async function getServiceWorkerCacheStats(): Promise<Record<string, { entries: number; urls: string[] }> | null> {
  if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_CACHE_SIZE' },
      [messageChannel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Check if the app is running from service worker cache (offline)
 */
export function isRunningOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Add listener for online/offline status changes
 */
export function addConnectivityListener(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
