import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingGuide, type OnboardingStep } from './OnboardingGuide';

const step: OnboardingStep = {
  title: 'Follow the process',
  content: 'Inspect the grain route before changing production.',
  icon: 'factory',
};

describe('OnboardingGuide', () => {
  it('exposes progress and keeps Back disabled on the first step', () => {
    render(
      <OnboardingGuide
        step={step}
        stepIndex={0}
        stepCount={3}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('region', { name: 'Getting started, step 1 of 3' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('routes Back, Next, Skip tour, and true Close independently', () => {
    const onNext = vi.fn();
    const onBack = vi.fn();
    const onSkip = vi.fn();
    const onClose = vi.fn();

    render(
      <OnboardingGuide
        step={step}
        stepIndex={1}
        stepCount={3}
        onNext={onNext}
        onBack={onBack}
        onSkip={onSkip}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close getting started for this session' }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
    expect(onSkip).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('labels the final action as Start operating', () => {
    render(
      <OnboardingGuide
        step={step}
        stepIndex={2}
        stepCount={3}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Start operating' })).toBeEnabled();
  });
});
