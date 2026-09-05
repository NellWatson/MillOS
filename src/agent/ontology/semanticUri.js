// @ts-check

/** @typedef {import('../contracts/systemManifest').AgentEntityKind} AgentEntityKind */

export const SEMANTIC_URI_SCHEME = 'millos';
export const MAX_SEMANTIC_LOCAL_ID_LENGTH = 256;

/** @type {readonly AgentEntityKind[]} */
export const SEMANTIC_ENTITY_KINDS = Object.freeze([
  'machine',
  'order',
  'batch',
  'manifest',
  'incident',
  'alarm',
  'tag',
  'decision',
  'breakdown',
  'simulation',
  'dispatch',
  'actor',
  'grant',
  'receipt',
  'event',
  'lesson',
  'capability',
  'invariant',
]);

const kindSet = new Set(SEMANTIC_ENTITY_KINDS);

/**
 * @param {unknown} value
 * @returns {value is AgentEntityKind}
 */
export function isSemanticEntityKind(value) {
  return typeof value === 'string' && kindSet.has(/** @type {AgentEntityKind} */ (value));
}

/**
 * @param {AgentEntityKind} kind
 * @param {string} localId
 * @returns {string}
 */
export function formatSemanticUri(kind, localId) {
  if (!isSemanticEntityKind(kind)) throw new TypeError(`Unknown MillOS entity kind: ${kind}`);
  assertLocalId(localId);
  return `${SEMANTIC_URI_SCHEME}://${kind}/${encodeURIComponent(localId)}`;
}

/**
 * @param {unknown} value
 * @returns {{ uri: string, kind: AgentEntityKind, localId: string }}
 */
export function parseSemanticUri(value) {
  if (typeof value !== 'string') throw new TypeError('Semantic URI must be a string');
  let url;
  try {
    url = new globalThis.URL(value);
  } catch {
    throw new TypeError(`Invalid MillOS semantic URI: ${value}`);
  }
  if (url.protocol !== `${SEMANTIC_URI_SCHEME}:`) {
    throw new TypeError(`Semantic URI must use ${SEMANTIC_URI_SCHEME}://`);
  }
  const kind = url.hostname;
  if (!isSemanticEntityKind(kind)) throw new TypeError(`Unknown MillOS entity kind: ${kind}`);
  if (url.search || url.hash || url.username || url.password || url.port) {
    throw new TypeError('Semantic URI cannot contain credentials, ports, queries, or fragments');
  }
  const encodedLocalId = url.pathname.slice(1);
  if (!encodedLocalId || encodedLocalId.includes('/')) {
    throw new TypeError('Semantic URI must contain exactly one local ID segment');
  }
  let localId;
  try {
    localId = decodeURIComponent(encodedLocalId);
  } catch {
    throw new TypeError('Semantic URI contains invalid percent encoding');
  }
  assertLocalId(localId);
  const uri = formatSemanticUri(kind, localId);
  if (uri !== value) throw new TypeError(`Semantic URI is not canonical: ${value}`);
  return Object.freeze({ uri, kind, localId });
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSemanticUri(value) {
  try {
    parseSemanticUri(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} value
 * @param {ReadonlyMap<string, string> | Readonly<Record<string, string>>} aliases
 * @returns {string}
 */
export function resolveSemanticAlias(value, aliases) {
  const resolved =
    aliases instanceof Map
      ? aliases.get(value)
      : /** @type {Readonly<Record<string, string>>} */ (aliases)[value];
  const candidate = resolved ?? value;
  return parseSemanticUri(candidate).uri;
}

/**
 * @param {string} left
 * @param {string} right
 * @param {ReadonlyMap<string, string> | Readonly<Record<string, string>>} [aliases]
 * @returns {boolean}
 */
export function semanticUriEquals(left, right, aliases = Object.freeze({})) {
  return resolveSemanticAlias(left, aliases) === resolveSemanticAlias(right, aliases);
}

/** @param {unknown} value */
function assertLocalId(value) {
  if (typeof value !== 'string') throw new TypeError('Semantic local ID must be a string');
  if (value.length === 0) throw new TypeError('Semantic local ID cannot be empty');
  if (value.length > MAX_SEMANTIC_LOCAL_ID_LENGTH) {
    throw new RangeError(`Semantic local ID exceeds ${MAX_SEMANTIC_LOCAL_ID_LENGTH} characters`);
  }
  if (value.trim() !== value) throw new TypeError('Semantic local ID cannot have outer whitespace');
  if (
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    })
  ) {
    throw new TypeError('Semantic local ID cannot contain control characters');
  }
}
