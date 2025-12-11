/**
 * Type Guards and Type Utilities
 *
 * This module provides type-safe type guards and assertion functions
 * for runtime type checking and type narrowing in TypeScript.
 */

import * as THREE from 'three';
import type { SkillLevel } from '@/src/types';

/**
 * Type guard to check if a material is MeshStandardMaterial
 * @param material - The material to check
 * @returns True if the material is MeshStandardMaterial
 */
export function isMeshStandardMaterial(
  material: THREE.Material
): material is THREE.MeshStandardMaterial {
  return material.type === 'MeshStandardMaterial';
}

/**
 * Type guard to check if a material is MeshBasicMaterial
 * @param material - The material to check
 * @returns True if the material is MeshBasicMaterial
 */
export function isMeshBasicMaterial(material: THREE.Material): material is THREE.MeshBasicMaterial {
  return material.type === 'MeshBasicMaterial';
}

/**
 * Type guard to check if a material is MeshPhysicalMaterial
 * @param material - The material to check
 * @returns True if the material is MeshPhysicalMaterial
 */
export function isMeshPhysicalMaterial(
  material: THREE.Material
): material is THREE.MeshPhysicalMaterial {
  return material.type === 'MeshPhysicalMaterial';
}

/**
 * Assertion function to ensure a value is a Float32Array
 * @param arr - The value to check
 * @throws Error if the value is not a Float32Array
 */
export function assertFloat32Array(arr: unknown): asserts arr is Float32Array {
  if (!(arr instanceof Float32Array)) {
    throw new Error('Expected Float32Array');
  }
}

/**
 * Safely converts a number to a valid SkillLevel (1-5)
 * Clamps the value to the valid range and ensures type safety
 * @param value - The numeric value to convert
 * @returns A valid SkillLevel (1, 2, 3, 4, or 5)
 */
export function toSkillLevel(value: number): SkillLevel {
  const clamped = Math.max(1, Math.min(5, Math.floor(value)));
  return clamped as SkillLevel;
}

/**
 * Type guard to check if a value is a valid SkillLevel
 * @param value - The value to check
 * @returns True if the value is a valid SkillLevel
 */
export function isSkillLevel(value: unknown): value is SkillLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Type guard to check if a value is a non-null object
 * @param value - The value to check
 * @returns True if the value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a valid THREE.Vector3
 * @param value - The value to check
 * @returns True if the value is a THREE.Vector3
 */
export function isVector3(value: unknown): value is THREE.Vector3 {
  return value instanceof THREE.Vector3;
}

/**
 * Type guard to check if a value is a valid THREE.Mesh
 * @param value - The value to check
 * @returns True if the value is a THREE.Mesh
 */
export function isMesh(value: unknown): value is THREE.Mesh {
  return value instanceof THREE.Mesh;
}

/**
 * Type guard to check if a value is a valid THREE.Group
 * @param value - The value to check
 * @returns True if the value is a THREE.Group
 */
export function isGroup(value: unknown): value is THREE.Group {
  return value instanceof THREE.Group;
}

/**
 * Safely extracts a numeric value from unknown input
 * @param value - The value to extract
 * @param defaultValue - The default value if extraction fails
 * @returns The extracted number or default value
 */
export function toNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Safely extracts a string value from unknown input
 * @param value - The value to extract
 * @param defaultValue - The default value if extraction fails
 * @returns The extracted string or default value
 */
export function toString(value: unknown, defaultValue: string = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

/**
 * Type guard to check if a value is a string
 * @param value - The value to check
 * @returns True if the value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 * @param value - The value to check
 * @returns True if the value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 * @param value - The value to check
 * @returns True if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is an array
 * @param value - The value to check
 * @returns True if the value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is defined (not null or undefined)
 * @param value - The value to check
 * @returns True if the value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is null
 * @param value - The value to check
 * @returns True if the value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard to check if a value is undefined
 * @param value - The value to check
 * @returns True if the value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Type guard to check if a value is null or undefined
 * @param value - The value to check
 * @returns True if the value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if a value is a function
 * @param value - The value to check
 * @returns True if the value is a function
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Type guard to check if an object has a specific property
 * @param obj - The object to check
 * @param key - The property key to check for
 * @returns True if the object has the property
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Type guard to check if a value is a record (object with string keys)
 * @param value - The value to check
 * @returns True if the value is a record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}
