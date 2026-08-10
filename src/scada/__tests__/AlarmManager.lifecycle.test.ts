import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlarmManager } from '../AlarmManager';
import type { TagDefinition } from '../types';

const tag: TagDefinition = {
  id: 'RM101.TT001.PV',
  name: 'Mill bearing temperature',
  description: 'Drive-end bearing temperature',
  dataType: 'FLOAT32',
  accessMode: 'READ',
  engUnit: 'C',
  engLow: 0,
  engHigh: 120,
  alarmHi: 70,
  deadband: 2,
  machineId: 'rm-101',
  group: 'TEMPERATURE',
};
const secondTag: TagDefinition = {
  ...tag,
  id: 'RM102.TT001.PV',
  name: 'Second mill bearing temperature',
  machineId: 'rm-102',
};

describe('AlarmManager control lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records source context, acknowledgement note, and recurrence metadata', () => {
    const manager = new AlarmManager([tag]);
    vi.advanceTimersByTime(5_001);
    manager.evaluate({
      tagId: tag.id,
      value: 75,
      quality: 'GOOD',
      timestamp: Date.now(),
    });

    const alarm = manager.getActiveAlarms()[0];
    expect(alarm).toMatchObject({
      unit: 'C',
      quality: 'GOOD',
      condition: 'HI threshold 70 C',
      occurrenceCount: 1,
      disposition: 'IN_SERVICE',
    });

    expect(manager.acknowledge(alarm.id, 'Nell', 'Bearing inspected')).toBe(true);
    expect(manager.getActiveAlarms()[0]).toMatchObject({
      state: 'ACKED',
      acknowledgedBy: 'Nell',
      acknowledgementNote: 'Bearing inspected',
    });
  });

  it('shelves with an expiry and restores evaluation to service', () => {
    const manager = new AlarmManager([tag]);
    vi.advanceTimersByTime(5_001);
    manager.evaluate({
      tagId: tag.id,
      value: 75,
      quality: 'GOOD',
      timestamp: Date.now(),
    });

    manager.shelve(tag.id, 'Nell', 'Maintenance inspection', 60_000);
    expect(manager.getSuppressedTags()[0]).toMatchObject({
      disposition: 'SHELVED',
      reason: 'Maintenance inspection',
    });
    expect(manager.getActiveAlarms()[0].disposition).toBe('SHELVED');

    vi.advanceTimersByTime(60_001);
    expect(manager.getSuppressedTags()).toEqual([]);
    expect(manager.getActiveAlarms()[0].disposition).toBe('IN_SERVICE');
  });

  it('keeps an unacknowledged alarm above a newer acknowledged peer', () => {
    const manager = new AlarmManager([tag, secondTag]);
    vi.advanceTimersByTime(5_001);
    manager.evaluate({
      tagId: tag.id,
      value: 75,
      quality: 'GOOD',
      timestamp: Date.now(),
    });
    vi.advanceTimersByTime(100);
    manager.evaluate({
      tagId: secondTag.id,
      value: 76,
      quality: 'GOOD',
      timestamp: Date.now(),
    });

    const newerAlarm = manager.getActiveAlarms().find((alarm) => alarm.tagId === secondTag.id);
    expect(newerAlarm).toBeDefined();
    manager.acknowledge(newerAlarm!.id, 'Autonomous controller');

    expect(manager.getActiveAlarms().map((alarm) => alarm.tagId)).toEqual([tag.id, secondTag.id]);
  });
});
