import { useState, useEffect } from 'react';

interface MobileDetectionResult {
  isMobile: boolean;
  isSmallScreen: boolean;
  isCompactLayout: boolean;
  isTouchDevice: boolean;
  isLandscape: boolean;
}

/**
 * Hook to detect if the user is on a mobile/touch device and orientation.
 * - isTouchDevice: true if device supports touch input
 * - isSmallScreen: true when the viewport width is below 768px
 * - isMobile: true when touch is present and either dimension is below 768px
 * - isCompactLayout: true for a narrow viewport or handheld landscape device
 * - isLandscape: true if device is in landscape orientation
 */
export function useMobileDetection(): MobileDetectionResult {
  const [state, setState] = useState<MobileDetectionResult>(() => {
    // SSR-safe initial state
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isSmallScreen: false,
        isCompactLayout: false,
        isTouchDevice: false,
        isLandscape: false,
      };
    }
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLandscape = window.innerWidth > window.innerHeight;
    const isSmallScreen = window.innerWidth < 768;
    const isMobile = hasTouchSupport && Math.min(window.innerWidth, window.innerHeight) < 768;
    return {
      isTouchDevice: hasTouchSupport,
      isMobile,
      isSmallScreen,
      isCompactLayout: isSmallScreen || isMobile,
      isLandscape: hasTouchSupport && isLandscape,
    };
  });

  useEffect(() => {
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleResize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isSmallScreen = window.innerWidth < 768;
      const isMobile = hasTouchSupport && Math.min(window.innerWidth, window.innerHeight) < 768;
      setState({
        isTouchDevice: hasTouchSupport,
        isMobile,
        isSmallScreen,
        isCompactLayout: isSmallScreen || isMobile,
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
    return {
      isMobile: false,
      isSmallScreen: false,
      isCompactLayout: false,
      isTouchDevice: false,
      isLandscape: false,
    };
  }
  const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isLandscape = window.innerWidth > window.innerHeight;
  const isSmallScreen = window.innerWidth < 768;
  const isMobile = hasTouchSupport && Math.min(window.innerWidth, window.innerHeight) < 768;
  return {
    isTouchDevice: hasTouchSupport,
    isMobile,
    isSmallScreen,
    isCompactLayout: isSmallScreen || isMobile,
    isLandscape: hasTouchSupport && isLandscape,
  };
}
