/**
 * Message Validation Utilities for SCADA Protocol Adapters
 *
 * Provides type-safe validation for incoming protocol messages to prevent
 * runtime errors from malformed or malicious data.
 */

/** Valid WebSocket message types */
import type { TagDefinition } from '../types';

type WSMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'write'
  | 'update'
  | 'batch'
  | 'snapshot'
  | 'error'
  | 'ping'
  | 'pong';

/** Valid MQTT message payload structure */
interface MQTTTagPayload {
  tagId: string;
  value: number | boolean | string;
  quality: string;
  timestamp: number;
  sourceTimestamp?: number;
}

/** WebSocket message structure */
interface WSMessage {
  type: WSMessageType;
  tagId?: string;
  tagIds?: string[];
  value?: number | boolean | string;
  quality?: string;
  timestamp?: number;
  tags?: Array<{
    tagId: string;
    value: number | boolean | string;
    quality: string;
    timestamp: number;
  }>;
  error?: string;
}

// Bound traversal of untrusted arrays while leaving ample headroom above the
// current plant-wide tag catalogue.
const MAX_COLLECTION_ITEMS = 1_000;
// Matches trendProcessing's tag id cap; error text is bounded so a hostile
// proxy cannot amplify memory through retained validation errors.
const MAX_TAG_ID_LENGTH = 256;
const MAX_ERROR_LENGTH = 1_024;
const VALID_QUALITIES = new Set(['GOOD', 'UNCERTAIN', 'BAD', 'STALE']);
const FLOAT32_MAX = 3.4028234663852886e38;

function isValidTagValue(value: unknown): value is number | boolean | string {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return typeof value === 'boolean' || typeof value === 'string';
}

/**
 * Validate a control or telemetry value against the PLC type declared by a tag.
 * Keeping this contract shared prevents protocol adapters from accepting
 * different wire values for the same tag definition.
 */
export function isTagValueCompatible(
  tag: Pick<TagDefinition, 'dataType'>,
  value: unknown
): value is number | boolean | string {
  switch (tag.dataType) {
    case 'BOOL':
      return typeof value === 'boolean';
    case 'STRING':
      return typeof value === 'string';
    case 'INT16':
      return (
        typeof value === 'number' && Number.isInteger(value) && value >= -32_768 && value <= 32_767
      );
    case 'INT32':
      return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= -2_147_483_648 &&
        value <= 2_147_483_647
      );
    case 'FLOAT32':
      return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= FLOAT32_MAX;
    case 'FLOAT64':
      return typeof value === 'number' && Number.isFinite(value);
  }
}

function isValidQuality(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 9 && VALID_QUALITIES.has(value.toUpperCase());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Type guard: Validates WebSocket message structure
 *
 * @param data - Unknown data from JSON.parse
 * @returns True if data conforms to WSMessage interface
 */
export function isValidWSMessage(data: unknown): data is WSMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const msg = data as Record<string, unknown>;

  // Validate required 'type' field
  if (typeof msg.type !== 'string') {
    return false;
  }

  const validTypes: WSMessageType[] = [
    'subscribe',
    'unsubscribe',
    'write',
    'update',
    'batch',
    'snapshot',
    'error',
    'ping',
    'pong',
  ];

  if (!validTypes.includes(msg.type as WSMessageType)) {
    return false;
  }

  // Validate type-specific required fields
  switch (msg.type) {
    case 'update':
      // Updates are complete telemetry samples. Missing fields must not be
      // fabricated into GOOD zeroes by a downstream adapter.
      if (
        typeof msg.tagId !== 'string' ||
        msg.tagId.length === 0 ||
        msg.tagId.length > MAX_TAG_ID_LENGTH
      ) {
        return false;
      }
      if (!isValidTagValue(msg.value)) {
        return false;
      }
      if (!isValidQuality(msg.quality)) {
        return false;
      }
      if (!isFiniteNumber(msg.timestamp)) {
        return false;
      }
      break;

    case 'write': {
      // 'write' requires tagId and value
      if (
        typeof msg.tagId !== 'string' ||
        msg.tagId.length === 0 ||
        msg.tagId.length > MAX_TAG_ID_LENGTH
      ) {
        return false;
      }
      if (msg.value === undefined) {
        return false;
      }
      if (!isValidTagValue(msg.value)) {
        return false;
      }
      break;
    }

    case 'subscribe':
    case 'unsubscribe':
      // Requires tagIds array
      if (!Array.isArray(msg.tagIds)) {
        return false;
      }
      if (msg.tagIds.length > MAX_COLLECTION_ITEMS) {
        return false;
      }
      for (const id of msg.tagIds) {
        if (typeof id !== 'string' || id.length === 0) {
          return false;
        }
      }
      break;

    case 'batch':
    case 'snapshot':
      // Requires a bounded tags array
      if (!Array.isArray(msg.tags) || msg.tags.length > MAX_COLLECTION_ITEMS) {
        return false;
      }
      // Validate each tag in the batch
      for (const tag of msg.tags) {
        if (!isValidBatchTag(tag)) {
          return false;
        }
      }
      break;

    case 'error':
      // Optional error message
      if (
        msg.error !== undefined &&
        (typeof msg.error !== 'string' || msg.error.length > MAX_ERROR_LENGTH)
      ) {
        return false;
      }
      break;

    case 'ping':
    case 'pong':
      // No additional validation needed
      break;
  }

  // Validate optional fields if present
  if (msg.quality !== undefined && !isValidQuality(msg.quality)) {
    return false;
  }

  if (msg.timestamp !== undefined && !isFiniteNumber(msg.timestamp)) {
    return false;
  }

  return true;
}

/**
 * Type guard: Validates individual tag in batch message
 *
 * @param tag - Unknown tag data from batch
 * @returns True if tag has valid structure
 */
function isValidBatchTag(tag: unknown): boolean {
  if (typeof tag !== 'object' || tag === null) {
    return false;
  }

  const t = tag as Record<string, unknown>;

  // Required fields
  if (typeof t.tagId !== 'string' || t.tagId.length === 0 || t.tagId.length > MAX_TAG_ID_LENGTH) {
    return false;
  }

  if (!isValidTagValue(t.value)) {
    return false;
  }

  if (!isValidQuality(t.quality)) {
    return false;
  }

  if (!isFiniteNumber(t.timestamp)) {
    return false;
  }

  return true;
}

/**
 * Type guard: Validates MQTT tag payload structure
 *
 * @param data - Unknown data from JSON.parse
 * @returns True if data conforms to MQTTTagPayload interface
 */
export function isValidMQTTPayload(data: unknown): data is MQTTTagPayload {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const payload = data as Record<string, unknown>;

  // Validate required fields
  if (
    typeof payload.tagId !== 'string' ||
    payload.tagId.length === 0 ||
    payload.tagId.length > MAX_TAG_ID_LENGTH
  ) {
    return false;
  }

  if (!isValidTagValue(payload.value)) {
    return false;
  }

  if (!isValidQuality(payload.quality)) {
    return false;
  }

  if (!isFiniteNumber(payload.timestamp)) {
    return false;
  }

  // Validate optional sourceTimestamp
  if (payload.sourceTimestamp !== undefined && !isFiniteNumber(payload.sourceTimestamp)) {
    return false;
  }

  return true;
}

/**
 * Validation error class for protocol message validation failures
 */
export class MessageValidationError extends Error {
  constructor(
    message: string,
    public readonly receivedData: unknown,
    public readonly protocol: 'WebSocket' | 'MQTT'
  ) {
    super(message);
    this.name = 'MessageValidationError';
  }
}
