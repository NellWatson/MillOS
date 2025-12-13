import { useState, useEffect } from 'react';

interface MobileDetectionResult {
  isMobile: boolean;
  isTouchDevice: boolean;
  isLandscape: boolean;
}

/**
 * Hook to detect if the user is on a mobile/touch device and orientation.
 * - isTouchDevice: true if device supports touch input
 * - isMobile: true if touch device AND screen width < 768px (in portrait)
 * - isLandscape: true if device is in landscape orientation
 */
export function useMobileDetection(): MobileDetectionResult {
  const [state, setState] = useState<MobileDetectionResult>(() => {
    // SSR-safe initial state
    if (typeof window === 'undefined') {
      return { isMobile: false, isTouchDevice: false, isLandscape: false };
    }
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLandscape = window.innerWidth > window.innerHeight;
    const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;
    return {
      isTouchDevice: hasTouchSupport,
      isMobile: hasTouchSupport && isSmallScreen,
      isLandscape: hasTouchSupport && isLandscape,
    };
  });

  useEffect(() => {
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleResize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      // Use the smaller dimension to determine if it's a mobile device
      const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;
      setState({
        isTouchDevice: hasTouchSupport,
        isMobile: hasTouchSupport && isSmallScreen,
        isLandscape: hasTouchSupport && isLandscape,
      });
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

/**
 * Non-hook version for use outside React components.
 * Returns current mobile detection state.
 */
export function getMobileDetection(): MobileDetectionResult {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTouchDevice: false, isLandscape: false };
  }
  const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isLandscape = window.innerWidth > window.innerHeight;
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;
  return {
    isTouchDevice: hasTouchSupport,
    isMobile: hasTouchSupport && isSmallScreen,
    isLandscape: hasTouchSupport && isLandscape,
  };
}
