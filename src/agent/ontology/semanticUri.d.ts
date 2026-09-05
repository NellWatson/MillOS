import type { AgentEntityKind } from '../contracts/systemManifest';

export const SEMANTIC_URI_SCHEME: 'millos';
export const MAX_SEMANTIC_LOCAL_ID_LENGTH: 256;
export const SEMANTIC_ENTITY_KINDS: readonly AgentEntityKind[];
export function isSemanticEntityKind(value: unknown): value is AgentEntityKind;
export function formatSemanticUri(kind: AgentEntityKind, localId: string): string;
export function parseSemanticUri(value: unknown): {
  readonly uri: string;
  readonly kind: AgentEntityKind;
  readonly localId: string;
};
export function isSemanticUri(value: unknown): boolean;
export function resolveSemanticAlias(
  uriOrAlias: string,
  aliases: ReadonlyMap<string, string> | Readonly<Record<string, string>>
): string;
export function semanticUriEquals(
  left: string,
  right: string,
  aliases?: ReadonlyMap<string, string> | Readonly<Record<string, string>>
): boolean;
