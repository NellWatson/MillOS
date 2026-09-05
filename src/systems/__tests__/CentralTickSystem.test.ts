import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { centralTick, TICK_PRIORITY } from '../CentralTickSystem';

describe('CentralTickSystem lifecycle and backlog control', () => {
  beforeEach(() => centralTick.reset());
  afterEach(() => {
    centralTick.reset();
    vi.restoreAllMocks();
  });

  it('drops queued work when its callback is disabled', () => {
    const callback = vi.fn();
    centralTick.register('lazy', callback, TICK_PRIORITY.NORMAL);
    centralTick.tick(0.5, 10, 180);

    centralTick.setEnabled('lazy', false);
    centralTick.processLazyQueue();

    expect(callback).not.toHaveBeenCalled();
    expect(centralTick.getLazyQueueLength()).toBe(0);
  });

  it('drops an old queued callback when the same id is replaced', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const oldCallback = vi.fn();
    const replacement = vi.fn();
    centralTick.register('lazy', oldCallback, TICK_PRIORITY.NORMAL);
    centralTick.tick(0.5, 10, 180);

    centralTick.register('lazy', replacement, TICK_PRIORITY.NORMAL);
    centralTick.processLazyQueue();
    centralTick.tick(1, 10, 180);
    centralTick.processLazyQueue();

    expect(oldCallback).not.toHaveBeenCalled();
    expect(replacement).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(
      "[CentralTick] Callback 'lazy' already registered, replacing"
    );
  });

  it('clears stale queued work when ticking is paused', () => {
    const callback = vi.fn();
    centralTick.register('lazy', callback, TICK_PRIORITY.NORMAL);
    centralTick.tick(0.5, 10, 180);

    centralTick.setPaused(true);
    centralTick.processLazyQueue();

    expect(callback).not.toHaveBeenCalled();
    expect(centralTick.getLazyQueueLength()).toBe(0);
  });

  it('coalesces backlog per callback and delivers the latest context fairly', () => {
    const first = vi.fn();
    const second = vi.fn();
    centralTick.register('first', first, TICK_PRIORITY.NORMAL);
    centralTick.register('second', second, TICK_PRIORITY.LOW);

    for (let tick = 1; tick <= 100; tick += 1) {
      centralTick.tick(tick * 0.5, 10, 180);
    }

    expect(centralTick.getLazyQueueLength()).toBe(2);
    centralTick.processLazyQueue();
    centralTick.processLazyQueue();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(first.mock.calls[0][0].tickCount).toBe(100);
    expect(second.mock.calls[0][0].tickCount).toBe(100);
  });

  it.each([
    ['current time', Number.NaN, 10, 180],
    ['game time', 0.5, Number.NaN, 180],
    ['game speed', 0.5, 10, Number.POSITIVE_INFINITY],
  ])(
    'rejects a non-finite %s without advancing state',
    (_field, currentTime, gameTime, gameSpeed) => {
      const callback = vi.fn();
      centralTick.register('critical', callback, TICK_PRIORITY.CRITICAL);

      expect(centralTick.tick(currentTime, gameTime, gameSpeed)).toBe(false);
      expect(callback).not.toHaveBeenCalled();
      expect(centralTick.getStats()).toMatchObject({ tickCount: 0, elapsedTime: 0 });
    }
  );

  it('normalizes invalid scheduler settings and purges backlog when lazy mode is disabled', () => {
    const callback = vi.fn();
    centralTick.register('lazy', callback, TICK_PRIORITY.NORMAL);
    centralTick.setInterval(Number.NaN);
    centralTick.setLazyItemsPerFrame(Number.POSITIVE_INFINITY);

    expect(centralTick.getStats()).toMatchObject({
      tickInterval: 0.5,
      lazyItemsPerFrame: 1,
    });
    centralTick.tick(0.5, 10, 180);
    expect(centralTick.getLazyQueueLength()).toBe(1);

    centralTick.setLazyEnabled(false);
    expect(centralTick.getLazyQueueLength()).toBe(0);
    centralTick.tick(1, 10, 180);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('reset restores defaults after valid scheduler reconfiguration', () => {
    centralTick.register('lazy', vi.fn(), TICK_PRIORITY.NORMAL);
    centralTick.setInterval(2);
    centralTick.setLazyItemsPerFrame(4);
    centralTick.setLazyEnabled(false);
    centralTick.setPaused(true);

    centralTick.reset();

    expect(centralTick.getStats()).toMatchObject({
      callbackCount: 0,
      tickCount: 0,
      tickInterval: 0.5,
      lazyEnabled: true,
      lazyItemsPerFrame: 1,
      isPaused: false,
    });
  });
});
