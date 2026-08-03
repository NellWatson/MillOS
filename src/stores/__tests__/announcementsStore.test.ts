import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnouncementsStore } from '../announcementsStore';

describe('announcementsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T08:00:00Z'));
    useAnnouncementsStore.setState({
      announcements: [],
      lastAnnouncementTime: {},
      mode: 'focused',
      captionsEnabled: true,
      context: {
        onboarding: false,
        scadaFocus: false,
        userInput: false,
        safetyCritical: false,
      },
    });
  });

  it('suppresses flavor in Focused Operations and retains literal operations', () => {
    const store = useAnnouncementsStore.getState();
    store.addAnnouncement({
      type: 'info',
      message: 'Comic flavor',
      priority: 1,
      channel: 'flavor',
      tone: 'characterful',
    });
    store.addAnnouncement({
      type: 'info',
      message: 'Check the active process constraint.',
      priority: 2,
      channel: 'operational',
      tone: 'literal',
    });

    expect(useAnnouncementsStore.getState().announcements).toHaveLength(1);
    expect(useAnnouncementsStore.getState().announcements[0].message).toContain(
      'process constraint'
    );
  });

  it('allows characterful messages only when the selected mode and context permit them', () => {
    const store = useAnnouncementsStore.getState();
    store.setMode('characterful');
    store.addAnnouncement({
      type: 'info',
      message: 'Characterful line',
      priority: 1,
      channel: 'flavor',
      tone: 'characterful',
    });
    store.setContext({ scadaFocus: true });
    store.addAnnouncement({
      type: 'info',
      message: 'Suppressed during focused SCADA work',
      priority: 1,
      channel: 'flavor',
      tone: 'characterful',
    });

    expect(useAnnouncementsStore.getState().announcements.map((item) => item.message)).toEqual([
      'Characterful line',
    ]);
  });

  it('keeps critical safety messages available when PA mode is off', () => {
    const store = useAnnouncementsStore.getState();
    store.setMode('off');
    store.addAnnouncement({
      type: 'info',
      message: 'Routine update',
      priority: 1,
    });
    store.addAnnouncement({
      type: 'emergency',
      message: 'Evacuate by the nearest marked exit.',
      priority: 4,
      channel: 'safety',
      cooldownMs: 0,
    });

    expect(useAnnouncementsStore.getState().announcements).toHaveLength(1);
    expect(useAnnouncementsStore.getState().announcements[0].type).toBe('emergency');
  });

  it('uses per-message cooldowns and keeps a bounded searchable transcript', () => {
    const store = useAnnouncementsStore.getState();
    const input = {
      type: 'success' as const,
      message: 'Dispatch complete',
      priority: 2,
      channel: 'logistics' as const,
      cooldownMs: 30000,
    };
    store.addAnnouncement(input);
    store.addAnnouncement(input);
    expect(useAnnouncementsStore.getState().announcements).toHaveLength(1);

    vi.advanceTimersByTime(30001);
    useAnnouncementsStore.getState().addAnnouncement(input);
    expect(useAnnouncementsStore.getState().announcements).toHaveLength(2);

    useAnnouncementsStore.getState().clearTranscript();
    expect(useAnnouncementsStore.getState().announcements).toEqual([]);
  });
});
