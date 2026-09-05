import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MillOSMusicPlayer } from '../MillOSMusicPlayer';

const { controls, currentTrack } = vi.hoisted(() => ({
  controls: {
    setMusicEnabled: vi.fn(),
    setStation: vi.fn(),
    setShuffle: vi.fn(),
    togglePlayback: vi.fn(),
    nextTrack: vi.fn(),
    prevTrack: vi.fn(),
    selectTrack: vi.fn(),
    seek: vi.fn(),
  },
  currentTrack: {
    id: 'millos_the_mill_wakes',
    name: 'The Mill Wakes',
    file: '/audio/millos-originals/01-the-mill-wakes.mp3',
    artist: 'Nell Watson with Suno',
    station: 'original' as const,
    trackNumber: 1,
    artwork: '/audio/millos-originals/artwork/01-the-mill-wakes.jpeg',
    durationSeconds: 289.560979,
  },
}));

vi.mock('../../../hooks/useAudioState', () => ({
  useMusicPlayerState: () => ({
    muted: false,
    volume: 0.5,
    musicEnabled: true,
    musicVolume: 0.3,
    machineVolume: 0.5,
    currentTrack,
    availableTracks: [currentTrack],
    trackIndex: 0,
    trackCount: 1,
    station: 'original',
    shuffle: false,
    playing: false,
    positionSeconds: 15,
    durationSeconds: currentTrack.durationSeconds,
    ...controls,
  }),
}));

describe('MillOSMusicPlayer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes the current song and direct playback controls without starting audio', () => {
    render(<MillOSMusicPlayer />);

    expect(screen.getByText('The Mill Wakes')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Music collection' })).toHaveValue('original');
    fireEvent.click(screen.getByRole('button', { name: 'Play music' }));
    expect(controls.togglePlayback).toHaveBeenCalledOnce();
  });

  it('opens synchronized lyrics with the machine-review disclosure', () => {
    render(<MillOSMusicPlayer />);
    fireEvent.click(screen.getByRole('button', { name: 'Open synchronized lyrics' }));

    expect(screen.getByRole('dialog', { name: 'The Mill Wakes' })).toBeInTheDocument();
    expect(
      screen.getByText(/locally machine aligned and awaits human synchronization review/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Before the road begins to shine/i })
    ).toBeInTheDocument();
  });
});
