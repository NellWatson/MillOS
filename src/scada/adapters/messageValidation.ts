/**
 * Message Validation Utilities for SCADA Protocol Adapters
 *
 * Provides type-safe validation for incoming protocol messages to prevent
 * runtime errors from malformed or malicious data.
 */

/** Valid WebSocket message types */
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
      // 'update' requires tagId
      if (typeof msg.tagId !== 'string' || msg.tagId.length === 0) {
        return false;
      }
      // value can be number, boolean, or string
      if (msg.value !== undefined) {
        const valueType = typeof msg.value;
        if (valueType !== 'number' && valueType !== 'boolean' && valueType !== 'string') {
          return false;
        }
      }
      break;

    case 'write': {
      // 'write' requires tagId and value
      if (typeof msg.tagId !== 'string' || msg.tagId.length === 0) {
        return false;
      }
      if (msg.value === undefined) {
        return false;
      }
      const valueType = typeof msg.value;
      if (valueType !== 'number' && valueType !== 'boolean' && valueType !== 'string') {
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
      if (!msg.tagIds.every((id) => typeof id === 'string' && id.length > 0)) {
        return false;
      }
      break;

    case 'batch':
    case 'snapshot':
      // Requires tags array
      if (!Array.isArray(msg.tags)) {
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
      if (msg.error !== undefined && typeof msg.error !== 'string') {
        return false;
      }
      break;

    case 'ping':
    case 'pong':
      // No additional validation needed
      break;
  }

  // Validate optional fields if present
  if (msg.quality !== undefined && typeof msg.quality !== 'string') {
    return false;
  }

  if (msg.timestamp !== undefined && typeof msg.timestamp !== 'number') {
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
  if (typeof t.tagId !== 'string' || t.tagId.length === 0) {
    return false;
  }

  const valueType = typeof t.value;
  if (valueType !== 'number' && valueType !== 'boolean' && valueType !== 'string') {
    return false;
  }

  if (typeof t.quality !== 'string') {
    return false;
  }

  if (typeof t.timestamp !== 'number') {
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
  if (typeof payload.tagId !== 'string' || payload.tagId.length === 0) {
    return false;
  }

  const valueType = typeof payload.value;
  if (valueType !== 'number' && valueType !== 'boolean' && valueType !== 'string') {
    return false;
  }

  if (typeof payload.quality !== 'string') {
    return false;
  }

  if (typeof payload.timestamp !== 'number') {
    return false;
  }

  // Validate optional sourceTimestamp
  if (payload.sourceTimestamp !== undefined && typeof payload.sourceTimestamp !== 'number') {
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
