/**
 * Unit tests for SCADA message validation
 */

import { describe, it, expect } from 'vitest';
import {
  isTagValueCompatible,
  isValidWSMessage,
  isValidMQTTPayload,
  MessageValidationError,
} from '../messageValidation';

describe('WebSocket Message Validation', () => {
  describe('isValidWSMessage', () => {
    it('should accept valid update message', () => {
      const msg = {
        type: 'update',
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidWSMessage(msg)).toBe(true);
    });

    it('should accept valid batch message', () => {
      const msg = {
        type: 'batch',
        tags: [
          {
            tagId: 'SILO_A_LEVEL',
            value: 75.5,
            quality: 'GOOD',
            timestamp: Date.now(),
          },
          {
            tagId: 'SILO_B_LEVEL',
            value: 42.0,
            quality: 'GOOD',
            timestamp: Date.now(),
          },
        ],
      };

      expect(isValidWSMessage(msg)).toBe(true);
    });

    it('should accept valid write message', () => {
      const msg = {
        type: 'write',
        tagId: 'MILL_101_SPEED',
        value: 1500,
      };

      expect(isValidWSMessage(msg)).toBe(true);
    });

    it('should accept valid subscribe message', () => {
      const msg = {
        type: 'subscribe',
        tagIds: ['SILO_A_LEVEL', 'SILO_B_LEVEL', 'MILL_101_SPEED'],
      };

      expect(isValidWSMessage(msg)).toBe(true);
    });

    it('should accept valid error message', () => {
      const msg = {
        type: 'error',
        error: 'Connection timeout',
      };

      expect(isValidWSMessage(msg)).toBe(true);
    });

    it('should accept ping/pong messages', () => {
      expect(isValidWSMessage({ type: 'ping' })).toBe(true);
      expect(isValidWSMessage({ type: 'pong' })).toBe(true);
    });

    it('should reject null input', () => {
      expect(isValidWSMessage(null)).toBe(false);
    });

    it('should reject non-object input', () => {
      expect(isValidWSMessage('invalid')).toBe(false);
      expect(isValidWSMessage(123)).toBe(false);
      expect(isValidWSMessage(true)).toBe(false);
    });

    it('should reject message without type field', () => {
      const msg = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject message with invalid type', () => {
      const msg = {
        type: 'invalid_type',
        tagId: 'SILO_A_LEVEL',
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it.each([
      ['tagId', { type: 'update', value: 75.5, quality: 'GOOD', timestamp: 1 }],
      ['nonempty tagId', { type: 'update', tagId: '', value: 75.5, quality: 'GOOD', timestamp: 1 }],
      ['value', { type: 'update', tagId: 'SILO_A_LEVEL', quality: 'GOOD', timestamp: 1 }],
      ['quality', { type: 'update', tagId: 'SILO_A_LEVEL', value: 75.5, timestamp: 1 }],
      ['timestamp', { type: 'update', tagId: 'SILO_A_LEVEL', value: 75.5, quality: 'GOOD' }],
    ])('rejects an update without a valid required %s', (_field, msg) => {
      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject write message without value', () => {
      const msg = {
        type: 'write',
        tagId: 'MILL_101_SPEED',
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject write message with invalid value type', () => {
      const msg = {
        type: 'write',
        tagId: 'MILL_101_SPEED',
        value: { invalid: 'object' },
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject subscribe message with non-array tagIds', () => {
      const msg = {
        type: 'subscribe',
        tagIds: 'not-an-array',
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject subscribe message with invalid tagId in array', () => {
      const msg = {
        type: 'subscribe',
        tagIds: ['VALID_TAG', 123, 'ANOTHER_TAG'],
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject batch message without tags array', () => {
      const msg = {
        type: 'batch',
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject batch message with invalid tag structure', () => {
      const msg = {
        type: 'batch',
        tags: [
          {
            tagId: 'SILO_A_LEVEL',
            value: 75.5,
            quality: 'GOOD',
            // Missing timestamp
          },
        ],
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject message with invalid quality type', () => {
      const msg = {
        type: 'update',
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 123,
        timestamp: Date.now(),
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should reject message with invalid timestamp type', () => {
      const msg = {
        type: 'update',
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 'GOOD',
        timestamp: 'not-a-number',
      };

      expect(isValidWSMessage(msg)).toBe(false);
    });

    it('should accept update message with boolean value', () => {
      const msg = {
        type: 'update',
        tagId: 'MILL_101_RUNNING',
        value: true,
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidWSMessage(msg)).toBe(true);
    });

    it('should accept update message with string value', () => {
      const msg = {
        type: 'update',
        tagId: 'MILL_101_STATUS',
        value: 'RUNNING',
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidWSMessage(msg)).toBe(true);
    });
  });
});

describe('tag data type compatibility', () => {
  it.each([
    ['BOOL', true, true],
    ['BOOL', 1, false],
    ['STRING', '', true],
    ['STRING', 1, false],
    ['INT16', -32_768, true],
    ['INT16', 32_767, true],
    ['INT16', -32_769, false],
    ['INT16', 32_768, false],
    ['INT16', 1.5, false],
    ['INT32', -2_147_483_648, true],
    ['INT32', 2_147_483_647, true],
    ['INT32', -2_147_483_649, false],
    ['INT32', 2_147_483_648, false],
    ['FLOAT32', 1.5, true],
    ['FLOAT32', -3.4028234663852886e38, true],
    ['FLOAT32', 3.4028234663852886e38, true],
    ['FLOAT32', -6.805646932770577e38, false],
    ['FLOAT32', 6.805646932770577e38, false],
    ['FLOAT32', Number.MAX_VALUE, false],
    ['FLOAT32', Number.NaN, false],
    ['FLOAT32', Number.POSITIVE_INFINITY, false],
    ['FLOAT64', Number.NaN, false],
    ['FLOAT64', Number.POSITIVE_INFINITY, false],
  ] as const)('%s classifies %s as compatible=%s', (dataType, value, expected) => {
    expect(isTagValueCompatible({ dataType }, value)).toBe(expected);
  });
});

describe('MQTT Payload Validation', () => {
  describe('isValidMQTTPayload', () => {
    it('should accept valid MQTT payload', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(true);
    });

    it('should accept valid MQTT payload with sourceTimestamp', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 'GOOD',
        timestamp: Date.now(),
        sourceTimestamp: Date.now() - 1000,
      };

      expect(isValidMQTTPayload(payload)).toBe(true);
    });

    it('should accept payload with boolean value', () => {
      const payload = {
        tagId: 'MILL_101_RUNNING',
        value: true,
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(true);
    });

    it('should accept payload with string value', () => {
      const payload = {
        tagId: 'MILL_101_STATUS',
        value: 'RUNNING',
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(true);
    });

    it('should reject null input', () => {
      expect(isValidMQTTPayload(null)).toBe(false);
    });

    it('should reject non-object input', () => {
      expect(isValidMQTTPayload('invalid')).toBe(false);
      expect(isValidMQTTPayload(123)).toBe(false);
      expect(isValidMQTTPayload(true)).toBe(false);
    });

    it('should reject payload without tagId', () => {
      const payload = {
        value: 75.5,
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload with empty tagId', () => {
      const payload = {
        tagId: '',
        value: 75.5,
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload without value', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload with invalid value type', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: { invalid: 'object' },
        quality: 'GOOD',
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload without quality', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload with non-string quality', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 123,
        timestamp: Date.now(),
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload without timestamp', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 'GOOD',
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload with non-number timestamp', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 'GOOD',
        timestamp: 'not-a-number',
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });

    it('should reject payload with invalid sourceTimestamp type', () => {
      const payload = {
        tagId: 'SILO_A_LEVEL',
        value: 75.5,
        quality: 'GOOD',
        timestamp: Date.now(),
        sourceTimestamp: 'not-a-number',
      };

      expect(isValidMQTTPayload(payload)).toBe(false);
    });
  });
});

describe('Adversarial message boundaries', () => {
  const validTag = {
    tagId: 'RM101.TT001.PV',
    value: 42,
    quality: 'GOOD',
    timestamp: 1_700_000_000_000,
  };

  const invalidMessages: Array<[string, unknown, (value: unknown) => boolean]> = [
    [
      'WebSocket update with NaN value',
      { type: 'update', ...validTag, value: Number.NaN },
      isValidWSMessage,
    ],
    [
      'WebSocket write with positive-infinite value',
      { type: 'write', tagId: validTag.tagId, value: Number.POSITIVE_INFINITY },
      isValidWSMessage,
    ],
    [
      'WebSocket update with negative-infinite timestamp',
      { type: 'update', ...validTag, timestamp: Number.NEGATIVE_INFINITY },
      isValidWSMessage,
    ],
    [
      'WebSocket update with unsupported quality',
      { type: 'update', ...validTag, quality: 'EXCELLENT' },
      isValidWSMessage,
    ],
    [
      'WebSocket batch with a malformed nested value',
      { type: 'batch', tags: [validTag, { ...validTag, value: Number.NaN }] },
      isValidWSMessage,
    ],
    [
      'WebSocket snapshot with a malformed nested quality',
      { type: 'snapshot', tags: [validTag, { ...validTag, quality: 'UNKNOWN' }] },
      isValidWSMessage,
    ],
    [
      'WebSocket snapshot with a malformed nested timestamp',
      { type: 'snapshot', tags: [validTag, { ...validTag, timestamp: Number.POSITIVE_INFINITY }] },
      isValidWSMessage,
    ],
    [
      'WebSocket snapshot with a null nested tag',
      { type: 'snapshot', tags: [validTag, null] },
      isValidWSMessage,
    ],
    ['MQTT payload with NaN value', { ...validTag, value: Number.NaN }, isValidMQTTPayload],
    [
      'MQTT payload with positive-infinite timestamp',
      { ...validTag, timestamp: Number.POSITIVE_INFINITY },
      isValidMQTTPayload,
    ],
    [
      'MQTT payload with negative-infinite source timestamp',
      { ...validTag, sourceTimestamp: Number.NEGATIVE_INFINITY },
      isValidMQTTPayload,
    ],
    [
      'MQTT payload with unsupported quality',
      { ...validTag, quality: 'UNKNOWN' },
      isValidMQTTPayload,
    ],
  ];

  it.each(invalidMessages)('rejects %s', (_name, message, validate) => {
    expect(validate(message)).toBe(false);
  });

  const validQualityMessages: Array<[string, unknown, (value: unknown) => boolean]> = [
    ['WebSocket', { type: 'update', ...validTag, quality: 'good' }, isValidWSMessage],
    ['MQTT', { ...validTag, quality: 'uncertain' }, isValidMQTTPayload],
  ];

  it.each(validQualityMessages)(
    'accepts a supported %s quality case-insensitively',
    (_name, message, validate) => {
      expect(validate(message)).toBe(true);
    }
  );

  const collectionCases: Array<[string, (length: number) => unknown]> = [
    [
      'subscribe tag IDs',
      (length) => ({ type: 'subscribe', tagIds: Array.from({ length }, (_, i) => `TAG.${i}`) }),
    ],
    [
      'unsubscribe tag IDs',
      (length) => ({ type: 'unsubscribe', tagIds: Array.from({ length }, (_, i) => `TAG.${i}`) }),
    ],
    [
      'batch tags',
      (length) => ({
        type: 'batch',
        tags: Array.from({ length }, (_, i) => ({ ...validTag, tagId: `TAG.${i}` })),
      }),
    ],
    [
      'snapshot tags',
      (length) => ({
        type: 'snapshot',
        tags: Array.from({ length }, (_, i) => ({ ...validTag, tagId: `TAG.${i}` })),
      }),
    ],
  ];

  it.each(collectionCases)('bounds %s at 1,000 items', (_name, buildMessage) => {
    expect(isValidWSMessage(buildMessage(1_000))).toBe(true);
    expect(isValidWSMessage(buildMessage(1_001))).toBe(false);
  });

  it('rejects an oversized snapshot before traversing attacker-controlled entries', () => {
    const oversized = new Array<unknown>(1_001);
    Object.defineProperty(oversized, 0, {
      get: () => {
        throw new Error('oversized snapshot was traversed');
      },
    });
    let result: boolean | undefined;

    expect(() => {
      result = isValidWSMessage({ type: 'snapshot', tags: oversized });
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it('revalidates an accepted snapshot without mutating or retaining its state', () => {
    const snapshot = {
      type: 'snapshot',
      tags: [{ ...validTag }],
    };
    const original = structuredClone(snapshot);

    expect(isValidWSMessage(snapshot)).toBe(true);
    expect(snapshot).toEqual(original);

    snapshot.tags[0].value = Number.NaN;
    expect(isValidWSMessage(snapshot)).toBe(false);
    expect(original.tags[0].value).toBe(42);
  });
});

describe('MessageValidationError', () => {
  it('should create error with correct properties', () => {
    const invalidData = { invalid: 'data' };
    const error = new MessageValidationError('Test error message', invalidData, 'WebSocket');

    expect(error.message).toBe('Test error message');
    expect(error.receivedData).toEqual(invalidData);
    expect(error.protocol).toBe('WebSocket');
    expect(error.name).toBe('MessageValidationError');
  });

  it('should work with MQTT protocol', () => {
    const error = new MessageValidationError('MQTT validation failed', { bad: 'payload' }, 'MQTT');

    expect(error.protocol).toBe('MQTT');
  });
});
