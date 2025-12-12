import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';

// Suppress harmless font warnings from troika-three-text (used by drei's Text component)
// These warnings about GPOS/GSUB tables don't affect text rendering
const originalWarn = console.warn;
console.warn = (...args: unknown[]): void => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('unsupported GPOS table') || message.includes('unsupported GSUB table'))
  ) {
    return; // Suppress these specific warnings
  }
  originalWarn.apply(console, args);
};

// StrictMode disabled for 3D app - causes double-renders that tank performance in dev
// Production builds are unaffected (StrictMode only runs in development)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Register service worker for offline caching (production only by default)
// Set VITE_ENABLE_SW=true in .env to enable during development
registerServiceWorker({
  onSuccess: () => {
    console.log('[MillOS] Service worker installed, assets cached for offline use');
  },
  onUpdate: () => {
    console.log('[MillOS] New version available! Refresh to update.');
  },
  onError: (error) => {
    console.warn('[MillOS] Service worker registration failed:', error);
  },
});
