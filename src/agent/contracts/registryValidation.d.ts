import type { AgentRegistryValidationResult, AgentSystemRegistrySource } from './systemManifest';

export function validateSystemRegistry(value: unknown): AgentRegistryValidationResult;
export function canonicalStringify(value: unknown, space?: number): string;
export function cloneSystemRegistry(value: AgentSystemRegistrySource): AgentSystemRegistrySource;
