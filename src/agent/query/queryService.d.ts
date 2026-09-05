import type { AgentDomainCapture, AgentRuntimeReadApi } from '../contracts/queryContracts';
import type { AgentSystemRegistrySource } from '../contracts/systemManifest';

export const AGENT_QUERY_SCHEMA_VERSION: 1;
export const AGENT_LEVEL0_MAXIMUM_BYTES: 4096;
export const AGENT_LEVEL1_MAXIMUM_BYTES: 12288;
export const AGENT_MAXIMUM_PAGE_SIZE: 100;
export const AGENT_SNAPSHOT_HISTORY_SIZE: 16;

export function createAgentQueryService(dependencies: {
  capture: () => AgentDomainCapture;
  now?: () => Date;
  registry: AgentSystemRegistrySource;
}): AgentRuntimeReadApi;

export function revisionFor(value: unknown): string;
export function byteLength(value: unknown): number;
