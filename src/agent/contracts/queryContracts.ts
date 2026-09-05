import type { AgentCapabilityDescriptor, AgentDomainId, AgentRuntimeMode } from './systemManifest';

export type AgentJsonPrimitive = string | number | boolean | null;
export type AgentJsonValue =
  | AgentJsonPrimitive
  | AgentJsonValue[]
  | { [key: string]: AgentJsonValue };

export type AgentObservationCompleteness = 'complete' | 'partial' | 'degraded';
export type AgentFreshnessQuality = 'good' | 'uncertain' | 'bad' | 'unknown';
export type AgentProblemSeverity = 'info' | 'warning' | 'blocking';

export interface AgentStructuredProblem {
  code: string;
  severity: AgentProblemSeverity;
  message: string;
  scope?: string;
  remediation?: string;
}

export interface AgentLink {
  rel: 'self' | 'domain' | 'entity' | 'relationship' | 'trace' | 'capabilities' | 'raw';
  href: string;
  title: string;
}

export interface AgentFreshness {
  source: string;
  observedAt: string;
  staleAfterMs: number;
  quality: AgentFreshnessQuality;
}

export interface AgentSimulationTime {
  day: number;
  hour: number;
}

export interface AgentObservationEnvelope<T = AgentJsonValue> {
  schemaVersion: 1;
  snapshotId: string;
  scope: string[];
  revision: string;
  previousRevision?: string;
  domainRevisions: Partial<Record<AgentDomainId, string>>;
  wallTime: string;
  simulationTime: AgentSimulationTime;
  mode: AgentRuntimeMode;
  build: string;
  seed: string;
  completeness: AgentObservationCompleteness;
  freshness: AgentFreshness[];
  data: T;
  warnings: AgentStructuredProblem[];
  links: AgentLink[];
}

export interface AgentDomainCapture {
  domains: Record<AgentDomainId, AgentJsonValue>;
  simulationTime: AgentSimulationTime;
  mode: AgentRuntimeMode;
  build: string;
  seed: string;
  completeness: AgentObservationCompleteness;
  freshness: AgentFreshness[];
  warnings: AgentStructuredProblem[];
}

export interface AgentQueryRequest {
  view: 'domain' | 'entity' | 'relationship' | 'causal';
  domainId?: AgentDomainId;
  uri?: string;
  fields?: string[];
  collection?: string;
  cursor?: string;
  limit?: number;
  sinceRevision?: string;
}

export interface AgentBriefRequest {
  sinceRevision?: string;
}

export interface AgentTraceRequest {
  uri?: string;
  correlationId?: string;
  cursor?: string;
  limit?: number;
}

export interface AgentRuntimeReadApi {
  readonly version: 1;
  brief: (request?: AgentBriefRequest) => AgentObservationEnvelope;
  query: (request: AgentQueryRequest) => AgentObservationEnvelope;
  capabilities: () => AgentObservationEnvelope<{
    authority: {
      observationOnly: true;
      commandExecution: false;
      externalWrites: false;
    };
    items: AgentCapabilityDescriptor[];
  }>;
  trace: (request?: AgentTraceRequest) => AgentObservationEnvelope;
}
