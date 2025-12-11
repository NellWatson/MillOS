/**
 * Comprehensive Tests for ErrorBoundary Component
 *
 * Tests cover:
 * - Error catching and rendering fallback UI
 * - Custom fallback rendering
 * - Error logging via onError callback
 * - Reload functionality
 * - Children rendering when no error
 * - getDerivedStateFromError lifecycle
 * - componentDidCatch lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child component</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    vi.restoreAllMocks();
  });

  describe('Normal Rendering', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test child content')).toBeInTheDocument();
    });

    it('should render multiple children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('should catch errors and render fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should display error message in fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorMessage = screen.getByText('Test error message');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should render alert triangle icon in fallback UI', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check for SVG icon (AlertTriangle from lucide-react)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render reload button in fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload/i });
      expect(reloadButton).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should use custom fallback instead of default UI', () => {
      const customFallback = (
        <div>
          <h1>Custom Error</h1>
          <p>Please contact support</p>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Please contact support')).toBeInTheDocument();
    });
  });

  describe('Error Callback', () => {
    it('should call onError callback when error is caught', () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalled();
    });

    it('should pass error and errorInfo to onError callback', () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error message' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should not throw if onError is not provided', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('Reload Functionality', () => {
    it('should reload page when reload button is clicked', () => {
      // Mock window.location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload/i });
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log with ErrorBoundary prefix', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ErrorBoundary]',
        expect.objectContaining({ message: 'Test error message' }),
        expect.any(Object)
      );
    });
  });

  describe('Error State Management', () => {
    it('should set hasError state to true when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // If fallback UI is showing, hasError must be true
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should store error object in state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error message is displayed, so error object must be in state
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('getDerivedStateFromError', () => {
    it('should return correct state when error is thrown', () => {
      const error = new Error('Derived state test');
      const state = ErrorBoundary.getDerivedStateFromError(error);

      expect(state).toEqual({
        hasError: true,
        error: error,
      });
    });

    it('should preserve error object in returned state', () => {
      const error = new Error('Preserve test');
      const state = ErrorBoundary.getDerivedStateFromError(error);

      expect(state.error?.message).toBe('Preserve test');
    });
  });

  describe('UI Styling', () => {
    it('should apply correct CSS classes to fallback container', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const fallbackDiv = container.querySelector('.fixed.inset-0');
      expect(fallbackDiv).toBeInTheDocument();
      expect(fallbackDiv).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should apply error styling to error box', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorBox = container.querySelector('.border-red-500\\/50');
      expect(errorBox).toBeInTheDocument();
    });

    it('should style reload button correctly', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload/i });
      expect(reloadButton).toHaveClass('bg-red-500', 'hover:bg-red-600');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button semantics for reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button');
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveAccessibleName(/reload/i);
    });

    it('should render icon with proper accessibility', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error message gracefully', () => {
      const ThrowNullError = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ThrowNullError />
        </ErrorBoundary>
      );

      // Should still render fallback UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'A'.repeat(500);
      const ThrowLongError = () => {
        throw new Error(longMessage);
      };

      render(
        <ErrorBoundary>
          <ThrowLongError />
        </ErrorBoundary>
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should work with nested error boundaries', () => {
      const outerOnError = vi.fn();
      const innerOnError = vi.fn();

      render(
        <ErrorBoundary onError={outerOnError}>
          <div>Outer boundary</div>
          <ErrorBoundary onError={innerOnError}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(innerOnError).toHaveBeenCalled();
      expect(outerOnError).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should maintain error state across re-renders', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Re-render
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not catch errors from children when no error is thrown', () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(onErrorMock).not.toHaveBeenCalled();
      expect(screen.getByText('Child component')).toBeInTheDocument();
    });
  });

  describe('Reload Button Interaction', () => {
    it('should have clickable reload button', () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload/i });

      expect(reloadButton).not.toBeDisabled();
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it('should display reload icon in button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /reload/i });
      const icon = button.querySelector('svg');

      expect(icon).toBeInTheDocument();
    });
  });
});
