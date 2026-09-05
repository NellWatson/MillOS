/**
 * OSIsoft PI Web API Adapter for MillOS SCADA
 *
 * Connects to OSIsoft PI Data Archive via PI Web API.
 * Supports:
 * - Basic, Kerberos, and Bearer token authentication
 * - Recorded, interpolated, and plot data retrieval
 * - WebId caching for efficient tag lookups
 *
 * @see https://docs.osisoft.com/bundle/pi-web-api-reference/page/help.html
 */

import type { Quality, TagHistoryPoint } from '../types';
import type {
  IHistorian,
  PIConnectionConfig,
  HistorianQueryOptions,
  HistorianStatistics,
  InterpolationMode,
} from '../HistorianInterface';
import { logger } from '../../utils/logger';

// ============================================================================
// PI Web API Response Types
// ============================================================================

interface PIValue {
  Timestamp: string;
  Value: number | string | boolean | { Value: number; Name: string };
  UnitsAbbreviation?: string;
  Good: boolean;
  Questionable: boolean;
  Substituted: boolean;
}

interface PIStreamValuesResponse {
  Links: Record<string, string>;
  Items: PIValue[];
}

interface PIPointResponse {
  WebId: string;
  Id: number;
  Name: string;
  Path: string;
  Descriptor: string;
  PointClass: string;
  PointType: string;
  DigitalSetName?: string;
  EngineeringUnits: string;
  Zero: number;
  Span: number;
  Step: boolean;
  Future: boolean;
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
  const error = new Error('PI Web API request aborted');
  error.name = 'AbortError';
  return error;
}

function toFiniteNumber(value: unknown): number | null {
  let candidate = value;
  if (candidate !== null && typeof candidate === 'object') {
    candidate = (candidate as Record<string, unknown>).Value;
  }
  if (typeof candidate === 'boolean') return candidate ? 1 : 0;
  if (typeof candidate === 'number') return Number.isFinite(candidate) ? candidate : null;
  if (typeof candidate !== 'string' || candidate.trim() === '') return null;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

// ============================================================================
// PI Adapter Implementation
// ============================================================================

export class PIAdapter implements IHistorian {
  private baseUrl: string;
  private serverPath: string;
  private authHeader: string = '';
  private connected: boolean = false;
  private timeout: number;
  private webIdCache: Map<string, string> = new Map();
  // Negative cache: a tag the server does not know is otherwise re-requested
  // (and re-warned about) on every poll cycle.
  private missingWebIds: Set<string> = new Set();
  private webIdInFlight: Map<string, Promise<string | null>> = new Map();
  private activeRequests: Set<ActiveRequest> = new Set();
  private lifecycleGeneration = 0;
  private connectPromise: Promise<void> | null = null;

  constructor(config: PIConnectionConfig) {
    this.baseUrl = config.baseUrl;
    this.serverPath = config.serverPath;
    this.timeout = boundedPositiveIntegerOr(
      config.timeout,
      DEFAULT_TIMEOUT_MS,
      MAX_REQUEST_TIMEOUT_MS
    );

    // Build authorization header based on auth method
    switch (config.authMethod) {
      case 'basic':
        if (config.username && config.password) {
          const credentials = btoa(`${config.username}:${config.password}`);
          this.authHeader = `Basic ${credentials}`;
        }
        break;
      case 'bearer':
        if (config.bearerToken) {
          this.authHeader = `Bearer ${config.bearerToken}`;
        }
        break;
      case 'kerberos':
        // Kerberos requires negotiate, browser handles automatically
        // For Node.js, would need additional configuration
        this.authHeader = 'Negotiate';
        break;
    }
  }

  // === Lifecycle ===

  connect(): Promise<void> {
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
      // Test connection by fetching system info
      const response = await this.requestStatus(`${this.baseUrl}/system`);
      if (!response.ok) {
        throw new Error(`PI Web API connection failed: ${response.status} ${response.statusText}`);
      }
      if (generation !== this.lifecycleGeneration) {
        throw abortError();
      }
      this.connected = true;
      logger.info('[PIAdapter] Connected to PI Web API');
    } catch (error) {
      if (generation === this.lifecycleGeneration) {
        this.connected = false;
      }
      logger.error('[PIAdapter] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.lifecycleGeneration += 1;
    this.connected = false;
    this.connectPromise = null;
    this.abortActiveRequests();
    this.webIdCache.clear();
    this.missingWebIds.clear();
    this.webIdInFlight.clear();
    logger.info('[PIAdapter] Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getName(): string {
    return `PI Web API (${this.serverPath})`;
  }

  // === Read Operations ===

  async getRecordedValues(
    tagId: string,
    startTime: Date,
    endTime: Date,
    options?: HistorianQueryOptions
  ): Promise<TagHistoryPoint[]> {
    if (!tagId || !isValidRange(startTime, endTime)) return [];

    try {
      const webId = await this.getWebId(tagId);
      if (!webId) return [];

      const maxCount = boundedPositiveIntegerOr(
        options?.maxPoints,
        DEFAULT_MAX_POINTS,
        MAX_QUERY_POINTS
      );
      const url =
        `${this.baseUrl}/streams/${webId}/recorded?` +
        `startTime=${startTime.toISOString()}&` +
        `endTime=${endTime.toISOString()}&` +
        `maxCount=${maxCount}`;

      const { response, data } = await this.requestJson<PIStreamValuesResponse>(url);
      if (!response.ok) {
        logger.warn(`[PIAdapter] Failed to get recorded values for ${tagId}: ${response.status}`);
        return [];
      }

      const items = Array.isArray(data?.Items) ? data.Items : [];
      return this.mapPIValuesToHistoryPoints(items);
    } catch (error) {
      logger.warn(`[PIAdapter] Error getting recorded values for ${tagId}:`, error);
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

    try {
      const webId = await this.getWebId(tagId);
      if (!webId) return [];

      // PI Web API expects interval as ISO 8601 duration
      const minimumIntervalMs = Math.max(
        1,
        Math.ceil((endTime.getTime() - startTime.getTime()) / MAX_QUERY_POINTS)
      );
      const intervalStr = this.msToIsoDuration(
        Math.max(positiveIntegerOr(intervalMs, 1000), minimumIntervalMs)
      );
      const url =
        `${this.baseUrl}/streams/${webId}/interpolated?` +
        `startTime=${startTime.toISOString()}&` +
        `endTime=${endTime.toISOString()}&` +
        `interval=${intervalStr}`;

      const { response, data } = await this.requestJson<PIStreamValuesResponse>(url);
      if (!response.ok) {
        logger.warn(
          `[PIAdapter] Failed to get interpolated values for ${tagId}: ${response.status}`
        );
        return [];
      }

      const items = Array.isArray(data?.Items) ? data.Items : [];
      return this.mapPIValuesToHistoryPoints(items);
    } catch (error) {
      logger.warn(`[PIAdapter] Error getting interpolated values for ${tagId}:`, error);
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

    try {
      const webId = await this.getWebId(tagId);
      if (!webId) return [];

      const safeIntervals = boundedPositiveIntegerOr(
        intervals,
        DEFAULT_PLOT_INTERVALS,
        MAX_QUERY_POINTS
      );
      const url =
        `${this.baseUrl}/streams/${webId}/plot?` +
        `startTime=${startTime.toISOString()}&` +
        `endTime=${endTime.toISOString()}&` +
        `intervals=${safeIntervals}`;

      const { response, data } = await this.requestJson<PIStreamValuesResponse>(url);
      if (!response.ok) {
        logger.warn(`[PIAdapter] Failed to get plot values for ${tagId}: ${response.status}`);
        return [];
      }

      const items = Array.isArray(data?.Items) ? data.Items : [];
      return this.mapPIValuesToHistoryPoints(items);
    } catch (error) {
      logger.warn(`[PIAdapter] Error getting plot values for ${tagId}:`, error);
      return [];
    }
  }

  async getLatestValue(tagId: string): Promise<TagHistoryPoint | null> {
    if (!tagId) return null;

    try {
      const webId = await this.getWebId(tagId);
      if (!webId) return null;

      const url = `${this.baseUrl}/streams/${webId}/value`;
      const { response, data } = await this.requestJson<PIValue>(url);
      if (!response.ok) {
        return null;
      }

      if (!data || typeof data !== 'object' || data.Timestamp === undefined) {
        return null;
      }
      const points = this.mapPIValuesToHistoryPoints([data]);
      return points[0] ?? null;
    } catch (error) {
      logger.warn(`[PIAdapter] Error getting latest value for ${tagId}:`, error);
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
      throw new TypeError('PI historian tagIds must be an array');
    }
    if (tagIds.length > MAX_BATCH_TAGS) {
      throw new RangeError(`PI historian batches are limited to ${MAX_BATCH_TAGS} tags`);
    }

    const uniqueTagIds = [...new Set(tagIds)];
    if (uniqueTagIds.some((tagId) => typeof tagId !== 'string' || tagId.length === 0)) {
      throw new TypeError('PI historian tagIds must be non-empty strings');
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
        logger.warn(`[PIAdapter] Failed to get history for ${tagId}:`, error);
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
    // PI doesn't have a direct API for this, use summary endpoint
    if (!tagId) return null;
    const webId = await this.getWebId(tagId);
    if (!webId) return null;

    // Get first and last recorded values
    try {
      const [first, last] = await Promise.all([
        this.requestJson<PIStreamValuesResponse>(
          `${this.baseUrl}/streams/${webId}/recorded?maxCount=1&startTime=*-100y`
        ),
        this.requestJson<PIStreamValuesResponse>(
          `${this.baseUrl}/streams/${webId}/recorded?maxCount=1&startTime=*&endTime=*&reversed=true`
        ),
      ]);

      if (!first.response.ok || !last.response.ok) return null;

      const firstData = first.data;
      const lastData = last.data;

      if (
        !Array.isArray(firstData?.Items) ||
        !Array.isArray(lastData?.Items) ||
        firstData.Items.length === 0 ||
        lastData.Items.length === 0
      ) {
        return null;
      }

      const start = new Date(firstData.Items[0]?.Timestamp);
      const end = new Date(lastData.Items[0]?.Timestamp);
      if (!isValidRange(start, end)) return null;

      return {
        start,
        end,
      };
    } catch {
      return null;
    }
  }

  async getStatistics(): Promise<HistorianStatistics> {
    // PI Web API doesn't provide aggregate stats easily
    // Return minimal info
    return {
      totalPoints: -1, // Unknown
      oldestTimestamp: null,
      newestTimestamp: null,
      tagCount: this.webIdCache.size,
    };
  }

  // === Private Helpers ===

  private async getWebId(tagId: string): Promise<string | null> {
    if (!tagId) return null;

    // Check cache first
    const cachedWebId = this.webIdCache.get(tagId);
    if (cachedWebId !== undefined) {
      return cachedWebId;
    }
    if (this.missingWebIds.has(tagId)) return null;

    const existingLookup = this.webIdInFlight.get(tagId);
    if (existingLookup) return existingLookup;

    const lookup = this.lookupWebId(tagId);
    this.webIdInFlight.set(tagId, lookup);
    try {
      return await lookup;
    } finally {
      if (this.webIdInFlight.get(tagId) === lookup) {
        this.webIdInFlight.delete(tagId);
      }
    }
  }

  private async lookupWebId(tagId: string): Promise<string | null> {
    const path = `${this.serverPath}\\${tagId}`;
    const encodedPath = encodeURIComponent(path);
    const url = `${this.baseUrl}/points?path=${encodedPath}`;

    try {
      const { response, data } = await this.requestJson<PIPointResponse>(url);
      if (!response.ok) {
        logger.warn(`[PIAdapter] Tag not found: ${tagId}`);
        this.missingWebIds.add(tagId);
        return null;
      }

      if (!data || typeof data.WebId !== 'string' || data.WebId.length === 0) {
        this.missingWebIds.add(tagId);
        return null;
      }
      this.webIdCache.set(tagId, data.WebId);
      return data.WebId;
    } catch (error) {
      logger.error(`[PIAdapter] Failed to get WebId for ${tagId}:`, error);
      return null;
    }
  }

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
          // Note: SSL verification is browser-controlled
          // In Node.js, would need additional configuration
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

  private mapPIValuesToHistoryPoints(items: unknown[]): TagHistoryPoint[] {
    const points: TagHistoryPoint[] = [];
    for (const candidate of items) {
      if (candidate === null || typeof candidate !== 'object') continue;
      const item = candidate as Record<string, unknown>;
      const timestamp = new Date(item.Timestamp as string).getTime();
      const value = toFiniteNumber(item.Value);
      if (!Number.isFinite(timestamp) || value === null) continue;

      let quality: Quality = 'GOOD';
      if (item.Good !== true) {
        quality = 'BAD';
      } else if (item.Questionable === true || item.Substituted === true) {
        quality = 'UNCERTAIN';
      }

      points.push({ timestamp, value, quality });
    }
    return points;
  }

  private msToIsoDuration(ms: number): string {
    // Convert milliseconds to ISO 8601 duration.
    // Guard against sub-second/negative/NaN input: PI Web API rejects PT0S and
    // malformed durations, so clamp to a minimum valid interval of 1 second.
    const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 1000;
    const seconds = Math.max(1, Math.floor(safeMs / 1000));
    if (seconds < 60) return `PT${seconds}S`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `PT${minutes}M`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `PT${hours}H`;
    const days = Math.floor(hours / 24);
    return `P${days}D`;
  }
}

export default PIAdapter;
