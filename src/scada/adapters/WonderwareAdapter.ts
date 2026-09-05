/**
 * Wonderware/AVEVA Historian Adapter for MillOS SCADA
 *
 * Connects to AVEVA Historian (formerly Wonderware InSQL/Historian).
 * Supports:
 * - REST API (modern deployments)
 * - SQL queries via AAHD provider (legacy)
 * - Windows and SQL authentication
 *
 * @see https://docs.aveva.com/
 */

import type { Quality, TagHistoryPoint } from '../types';
import type {
  IHistorian,
  WonderwareConnectionConfig,
  HistorianQueryOptions,
  HistorianStatistics,
  InterpolationMode,
} from '../HistorianInterface';
import { logger } from '../../utils/logger';

// ============================================================================
// Wonderware REST API Response Types
// ============================================================================

interface WWHistoryValue {
  TimeStamp: string;
  Value: number | string | boolean;
  Quality: number; // OPC quality code
  QualityDetail?: string;
}

interface WWHistoryResponse {
  Data: WWHistoryValue[];
  TagName: string;
  StartTime: string;
  EndTime: string;
  Count: number;
}

interface WWTagInfo {
  TagName: string;
  Description: string;
  EngUnits: string;
  MinValue: number;
  MaxValue: number;
  DataType: string;
}

interface ActiveRequest {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_REQUEST_TIMEOUT_MS = 300000;
const DEFAULT_MAX_POINTS = 10000;
const DEFAULT_PLOT_INTERVALS = 100;
const MAX_QUERY_POINTS = 100000;
const MAX_BATCH_TAGS = 256;
const MAX_BATCH_CONCURRENCY = 8;

function positiveIntegerOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.floor(value))
    : fallback;
}

function boundedPositiveIntegerOr(
  value: number | undefined,
  fallback: number,
  maximum: number
): number {
  return Math.min(positiveIntegerOr(value, fallback), maximum);
}

async function forEachWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      if (item !== undefined) await worker(item);
    }
  });
  await Promise.all(workers);
}

function isValidRange(startTime: Date, endTime: Date): boolean {
  const start = startTime instanceof Date ? startTime.getTime() : Number.NaN;
  const end = endTime instanceof Date ? endTime.getTime() : Number.NaN;
  return Number.isFinite(start) && Number.isFinite(end) && end >= start;
}

function abortError(): Error {
  const error = new Error('Wonderware historian request aborted');
  error.name = 'AbortError';
  return error;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ============================================================================
// Quality Code Mapping
// ============================================================================

/**
 * Map OPC quality codes to our Quality type.
 *
 * This handles the standard 8-bit OPC DA quality byte, where the top two
 * bits (>>6 & 0x3) are the major quality field (Good/Uncertain/Bad) and the
 * lower bits are substatus. If a deployment's REST API ever returns the full
 * 16-bit OPC quality word, the Quality field would need normalising first.
 */
function mapOpcQuality(opcQuality: unknown): Quality {
  if (
    typeof opcQuality !== 'number' ||
    !Number.isInteger(opcQuality) ||
    opcQuality < 0 ||
    opcQuality > 0xff
  ) {
    return 'BAD';
  }
  const major = (opcQuality >> 6) & 0x3;
  switch (major) {
    case 3: // Good (0xC0-0xFF)
      return 'GOOD';
    case 1: // Uncertain (0x40-0x7F)
      return 'UNCERTAIN';
    case 0: // Bad (0x00-0x3F)
    default:
      return 'BAD';
  }
}

// ============================================================================
// Wonderware Adapter Implementation
// ============================================================================

export class WonderwareAdapter implements IHistorian {
  private serverHost: string;
  private serverPort: number;
  private protocol: 'rest' | 'sql';
  private authHeader: string = '';
  private connected: boolean = false;
  private timeout: number;
  private baseUrl: string;
  private activeRequests: Set<ActiveRequest> = new Set();
  private lifecycleGeneration = 0;
  private connectPromise: Promise<void> | null = null;

  constructor(config: WonderwareConnectionConfig) {
    this.serverHost = config.serverHost;
    this.serverPort = config.serverPort ?? (config.protocol === 'rest' ? 32568 : 1433);
    this.protocol = config.protocol;
    this.timeout = boundedPositiveIntegerOr(
      config.timeout,
      DEFAULT_TIMEOUT_MS,
      MAX_REQUEST_TIMEOUT_MS
    );

    // Build base URL for REST API.
    // Default to https:// so Basic-auth credentials (potentially Windows
    // domain creds) are sent over TLS, not in cleartext. http:// requests
    // are also blocked as mixed content when MillOS is served over https.
    this.baseUrl = `https://${this.serverHost}:${this.serverPort}/Historian/v1`;

    // Build authorization header
    if (config.authMode === 'windows' && config.domain && config.username && config.password) {
      // NTLM auth (browser may handle automatically)
      const credentials = btoa(`${config.domain}\\${config.username}:${config.password}`);
      this.authHeader = `Basic ${credentials}`;
    } else if (config.authMode === 'sql' && config.username && config.password) {
      const credentials = btoa(`${config.username}:${config.password}`);
      this.authHeader = `Basic ${credentials}`;
    }
  }

  // === Lifecycle ===

  connect(): Promise<void> {
    if (this.protocol === 'sql') {
      logger.warn(
        '[WonderwareAdapter] SQL protocol requires server-side proxy - not yet implemented'
      );
      return Promise.reject(new Error('SQL protocol not supported in browser environment'));
    }

    if (this.connectPromise) return this.connectPromise;

    const generation = ++this.lifecycleGeneration;
    const pending = this.performConnect(generation);
    this.connectPromise = pending;
    const clearPending = () => {
      if (this.connectPromise === pending) this.connectPromise = null;
    };
    void pending.then(clearPending, clearPending);
    return pending;
  }

  private async performConnect(generation: number): Promise<void> {
    try {
      // Test connection by fetching tag list
      const response = await this.requestStatus(`${this.baseUrl}/Tags?maxCount=1`);
      if (!response.ok) {
        throw new Error(`Wonderware connection failed: ${response.status} ${response.statusText}`);
      }
      if (generation !== this.lifecycleGeneration) {
        throw abortError();
      }
      this.connected = true;
      logger.info('[WonderwareAdapter] Connected to AVEVA Historian');
    } catch (error) {
      if (generation === this.lifecycleGeneration) {
        this.connected = false;
      }
      logger.error('[WonderwareAdapter] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.lifecycleGeneration += 1;
    this.connected = false;
    this.connectPromise = null;
    this.abortActiveRequests();
    logger.info('[WonderwareAdapter] Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getName(): string {
    return `AVEVA Historian (${this.serverHost})`;
  }

  // === Read Operations ===

  async getRecordedValues(
    tagId: string,
    startTime: Date,
    endTime: Date,
    options?: HistorianQueryOptions
  ): Promise<TagHistoryPoint[]> {
    if (!tagId || !isValidRange(startTime, endTime)) return [];
    const maxCount = boundedPositiveIntegerOr(
      options?.maxPoints,
      DEFAULT_MAX_POINTS,
      MAX_QUERY_POINTS
    );
    const url =
      `${this.baseUrl}/Tags/${encodeURIComponent(tagId)}/RawData?` +
      `startTime=${startTime.toISOString()}&` +
      `endTime=${endTime.toISOString()}&` +
      `maxCount=${maxCount}`;

    try {
      const { response, data } = await this.requestJson<WWHistoryResponse>(url);
      if (!response.ok) {
        logger.warn(
          `[WonderwareAdapter] Failed to get recorded values for ${tagId}: ${response.status}`
        );
        return [];
      }

      const rows = Array.isArray(data?.Data) ? data.Data : [];
      return this.mapWWValuesToHistoryPoints(rows);
    } catch (error) {
      logger.warn(`[WonderwareAdapter] Error getting recorded values for ${tagId}:`, error);
      return [];
    }
  }

  async getInterpolatedValues(
    tagId: string,
    startTime: Date,
    endTime: Date,
    intervalMs: number,
    _options?: HistorianQueryOptions
  ): Promise<TagHistoryPoint[]> {
    if (!tagId || !isValidRange(startTime, endTime)) return [];
    const minimumIntervalMs = Math.max(
      1,
      Math.ceil((endTime.getTime() - startTime.getTime()) / MAX_QUERY_POINTS)
    );
    const safeIntervalMs = Math.max(positiveIntegerOr(intervalMs, 1000), minimumIntervalMs);
    const url =
      `${this.baseUrl}/Tags/${encodeURIComponent(tagId)}/InterpolatedData?` +
      `startTime=${startTime.toISOString()}&` +
      `endTime=${endTime.toISOString()}&` +
      `resolutionMS=${safeIntervalMs}`;

    try {
      const { response, data } = await this.requestJson<WWHistoryResponse>(url);
      if (!response.ok) {
        logger.warn(
          `[WonderwareAdapter] Failed to get interpolated values for ${tagId}: ${response.status}`
        );
        return [];
      }

      const rows = Array.isArray(data?.Data) ? data.Data : [];
      return this.mapWWValuesToHistoryPoints(rows);
    } catch (error) {
      logger.warn(`[WonderwareAdapter] Error getting interpolated values for ${tagId}:`, error);
      return [];
    }
  }

  async getPlotValues(
    tagId: string,
    startTime: Date,
    endTime: Date,
    intervals: number,
    _options?: HistorianQueryOptions
  ): Promise<TagHistoryPoint[]> {
    if (!tagId || !isValidRange(startTime, endTime)) return [];
    const safeIntervals = boundedPositiveIntegerOr(
      intervals,
      DEFAULT_PLOT_INTERVALS,
      MAX_QUERY_POINTS
    );
    // Wonderware uses "TrendData" with numberOfIntervals
    const url =
      `${this.baseUrl}/Tags/${encodeURIComponent(tagId)}/TrendData?` +
      `startTime=${startTime.toISOString()}&` +
      `endTime=${endTime.toISOString()}&` +
      `numberOfIntervals=${safeIntervals}`;

    try {
      const { response, data } = await this.requestJson<WWHistoryResponse>(url);
      if (!response.ok) {
        // Fall back to interpolated if TrendData is unavailable.
        const durationMs = endTime.getTime() - startTime.getTime();
        const intervalMs = Math.max(1, Math.floor(durationMs / safeIntervals));
        return this.getInterpolatedValues(tagId, startTime, endTime, intervalMs);
      }

      const rows = Array.isArray(data?.Data) ? data.Data : [];
      return this.mapWWValuesToHistoryPoints(rows);
    } catch (error) {
      logger.warn(`[WonderwareAdapter] Error getting plot values for ${tagId}:`, error);
      return [];
    }
  }

  async getLatestValue(tagId: string): Promise<TagHistoryPoint | null> {
    if (!tagId) return null;
    const url = `${this.baseUrl}/Tags/${encodeURIComponent(tagId)}/CurrentValue`;
    try {
      const { response, data } = await this.requestJson<WWHistoryValue>(url);
      if (!response.ok) {
        return null;
      }

      if (!data || data.TimeStamp === undefined) {
        return null;
      }
      const points = this.mapWWValuesToHistoryPoints([data]);
      return points[0] ?? null;
    } catch (error) {
      logger.warn(`[WonderwareAdapter] Error getting latest value for ${tagId}:`, error);
      return null;
    }
  }

  async getMultipleTagHistory(
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    mode: InterpolationMode = 'recorded',
    options?: HistorianQueryOptions
  ): Promise<Record<string, TagHistoryPoint[]>> {
    if (!Array.isArray(tagIds)) {
      throw new TypeError('Wonderware historian tagIds must be an array');
    }
    if (tagIds.length > MAX_BATCH_TAGS) {
      throw new RangeError(`Wonderware historian batches are limited to ${MAX_BATCH_TAGS} tags`);
    }

    const uniqueTagIds = [...new Set(tagIds)];
    if (uniqueTagIds.some((tagId) => typeof tagId !== 'string' || tagId.length === 0)) {
      throw new TypeError('Wonderware historian tagIds must be non-empty strings');
    }
    const result: Record<string, TagHistoryPoint[]> = {};

    await forEachWithConcurrency(uniqueTagIds, MAX_BATCH_CONCURRENCY, async (tagId) => {
      try {
        let points: TagHistoryPoint[];
        switch (mode) {
          case 'interpolated':
            points = await this.getInterpolatedValues(
              tagId,
              startTime,
              endTime,
              options?.intervalMs ?? 60000,
              options
            );
            break;
          case 'plot':
            points = await this.getPlotValues(
              tagId,
              startTime,
              endTime,
              options?.intervals ?? 100,
              options
            );
            break;
          default:
            points = await this.getRecordedValues(tagId, startTime, endTime, options);
        }
        Object.defineProperty(result, tagId, {
          value: points,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      } catch (error) {
        logger.warn(`[WonderwareAdapter] Failed to get history for ${tagId}:`, error);
        Object.defineProperty(result, tagId, {
          value: [],
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    });
    return result;
  }

  // === Metadata ===

  async getAvailableRange(tagId: string): Promise<{ start: Date; end: Date } | null> {
    if (!tagId) return null;
    try {
      const url = `${this.baseUrl}/Tags/${encodeURIComponent(tagId)}`;
      const { response, data: tagInfo } = await this.requestJson<
        WWTagInfo & { FirstTime?: string; LastTime?: string }
      >(url);
      if (!response.ok) return null;

      if (!tagInfo) return null;

      if (tagInfo.FirstTime && tagInfo.LastTime) {
        const start = new Date(tagInfo.FirstTime);
        const end = new Date(tagInfo.LastTime);
        if (!isValidRange(start, end)) return null;
        return {
          start,
          end,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  async getStatistics(): Promise<HistorianStatistics> {
    // Wonderware doesn't provide aggregate stats easily
    return {
      totalPoints: -1,
      oldestTimestamp: null,
      newestTimestamp: null,
      tagCount: -1,
    };
  }

  // === Private Helpers ===

  private requestStatus(url: string): Promise<Response> {
    return this.runRequest(url, async (response) => response);
  }

  private requestJson<T>(url: string): Promise<{ response: Response; data: T | null }> {
    return this.runRequest(url, async (response) => ({
      response,
      data: response.ok ? ((await response.json()) as T) : null,
    }));
  }

  private async runRequest<T>(
    url: string,
    consume: (response: Response) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController();
    let onAbort = (): void => undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(abortError());
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const request: ActiveRequest = { controller, timeoutId };
    this.activeRequests.add(request);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.authHeader) {
        headers['Authorization'] = this.authHeader;
      }

      const operation = (async () => {
        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });
        if (controller.signal.aborted) throw abortError();
        const result = await consume(response);
        if (controller.signal.aborted) throw abortError();
        return result;
      })();
      return await Promise.race([operation, aborted]);
    } finally {
      clearTimeout(timeoutId);
      controller.signal.removeEventListener('abort', onAbort);
      this.activeRequests.delete(request);
    }
  }

  private abortActiveRequests(): void {
    for (const request of this.activeRequests) {
      clearTimeout(request.timeoutId);
      request.controller.abort();
    }
    this.activeRequests.clear();
  }

  private mapWWValuesToHistoryPoints(items: unknown[]): TagHistoryPoint[] {
    const points: TagHistoryPoint[] = [];
    for (const candidate of items) {
      if (candidate === null || typeof candidate !== 'object') continue;
      const item = candidate as Record<string, unknown>;
      const timestamp = new Date(item.TimeStamp as string).getTime();
      const value = toFiniteNumber(item.Value);
      if (!Number.isFinite(timestamp) || value === null) continue;

      points.push({
        timestamp,
        value,
        quality: mapOpcQuality(item.Quality),
      });
    }
    return points;
  }
}

export default WonderwareAdapter;
