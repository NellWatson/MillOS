import { describe, expect, it } from 'vitest';
import { getDispatchQualityStatus, type QCLabState } from './qcLabStore';

const baseline = (): QCLabState => ({
  isRunning: false,
  currentTest: null,
  testHistory: [],
  certificationStatus: 'valid',
  certificationExpiry: new Date('2027-01-01T00:00:00Z'),
  contaminationAlerts: [],
});

describe('getDispatchQualityStatus', () => {
  it('releases startup stock before an adverse result exists', () => {
    expect(getDispatchQualityStatus(baseline())).toEqual({ released: true, reason: null });
  });

  it('holds dispatch for expired certification', () => {
    const qcLab = baseline();
    qcLab.certificationStatus = 'expired';
    expect(getDispatchQualityStatus(qcLab)).toEqual({
      released: false,
      reason: 'certification_expired',
    });
  });

  it('holds dispatch for unresolved contamination', () => {
    const qcLab = baseline();
    qcLab.contaminationAlerts.push({
      id: 'alert-1',
      type: 'foreign_material',
      severity: 'medium',
      timestamp: new Date('2026-08-03T00:00:00Z'),
      resolved: false,
    });
    expect(getDispatchQualityStatus(qcLab)).toEqual({
      released: false,
      reason: 'unresolved_contamination',
    });
  });

  it('holds a failed result and releases a later passing result', () => {
    const qcLab = baseline();
    qcLab.testHistory.push(
      {
        id: 'failed',
        timestamp: new Date('2026-08-03T00:00:00Z'),
        machineId: 'packer-0',
        grade: 'FAIL',
        moistureContent: 18,
        proteinLevel: 9,
        ashContent: 2,
        particleSize: 400,
        passed: false,
      },
      {
        id: 'passed',
        timestamp: new Date('2026-08-03T00:10:00Z'),
        machineId: 'packer-0',
        grade: 'A',
        moistureContent: 13,
        proteinLevel: 12,
        ashContent: 0.6,
        particleSize: 180,
        passed: true,
      }
    );
    expect(getDispatchQualityStatus({ ...qcLab, testHistory: [qcLab.testHistory[0]] })).toEqual({
      released: false,
      reason: 'failed_quality_test',
    });
    expect(getDispatchQualityStatus(qcLab)).toEqual({ released: true, reason: null });
  });
});
