/**
 * Type Guards Tests
 *
 * Tests for type guard functions and type conversion utilities.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isDefined,
  isNull,
  isUndefined,
  isNullOrUndefined,
  isFunction,
  isObject,
  isRecord,
  hasProperty,
  isSkillLevel,
  toSkillLevel,
  toNumber,
  toString,
  isVector3,
  isMesh,
  isGroup,
  isMeshStandardMaterial,
  isMeshBasicMaterial,
  isMeshPhysicalMaterial,
  assertFloat32Array,
} from '../typeGuards';

describe('Type Guards', () => {
  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
      expect(isString('123')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-456)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should return true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it('should return false for non-booleans', () => {
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(new Array(3))).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray({ length: 3 })).toBe(false); // Array-like
    });
  });

  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined({})).toBe(true);
    });

    it('should return false for null and undefined', () => {
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('isNull', () => {
    it('should return true for null', () => {
      expect(isNull(null)).toBe(true);
    });

    it('should return false for non-null values', () => {
      expect(isNull(undefined)).toBe(false);
      expect(isNull(0)).toBe(false);
      expect(isNull('')).toBe(false);
    });
  });

  describe('isUndefined', () => {
    it('should return true for undefined', () => {
      expect(isUndefined(undefined)).toBe(true);
    });

    it('should return false for defined values', () => {
      expect(isUndefined(null)).toBe(false);
      expect(isUndefined(0)).toBe(false);
      expect(isUndefined('')).toBe(false);
    });
  });

  describe('isNullOrUndefined', () => {
    it('should return true for null or undefined', () => {
      expect(isNullOrUndefined(null)).toBe(true);
      expect(isNullOrUndefined(undefined)).toBe(true);
    });

    it('should return false for other values', () => {
      expect(isNullOrUndefined(0)).toBe(false);
      expect(isNullOrUndefined('')).toBe(false);
      expect(isNullOrUndefined(false)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(Math.max)).toBe(true);
      expect(isFunction(class {})).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction(null)).toBe(false);
      expect(isFunction('function')).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject(new Object())).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe('isRecord', () => {
    it('should return true for records (objects)', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
    });

    it('should return false for non-records', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord([])).toBe(false);
    });
  });

  describe('hasProperty', () => {
    it('should return true if object has property', () => {
      const obj = { name: 'test', value: 42 };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'value')).toBe(true);
    });

    it('should return false if object lacks property', () => {
      const obj = { name: 'test' };
      expect(hasProperty(obj, 'missing')).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasProperty(null, 'key')).toBe(false);
      expect(hasProperty('string', 'length')).toBe(false); // strings are not objects
    });
  });
});

describe('Skill Level Guards', () => {
  describe('isSkillLevel', () => {
    it('should return true for valid skill levels 1-5', () => {
      expect(isSkillLevel(1)).toBe(true);
      expect(isSkillLevel(2)).toBe(true);
      expect(isSkillLevel(3)).toBe(true);
      expect(isSkillLevel(4)).toBe(true);
      expect(isSkillLevel(5)).toBe(true);
    });

    it('should return false for invalid numbers', () => {
      expect(isSkillLevel(0)).toBe(false);
      expect(isSkillLevel(6)).toBe(false);
      expect(isSkillLevel(-1)).toBe(false);
      expect(isSkillLevel(3.5)).toBe(false); // Must be integer
    });

    it('should return false for non-numbers', () => {
      expect(isSkillLevel('3')).toBe(false);
      expect(isSkillLevel(null)).toBe(false);
      expect(isSkillLevel(undefined)).toBe(false);
    });
  });

  describe('toSkillLevel', () => {
    it('should return valid skill levels unchanged', () => {
      expect(toSkillLevel(1)).toBe(1);
      expect(toSkillLevel(3)).toBe(3);
      expect(toSkillLevel(5)).toBe(5);
    });

    it('should clamp values below 1 to 1', () => {
      expect(toSkillLevel(0)).toBe(1);
      expect(toSkillLevel(-5)).toBe(1);
    });

    it('should clamp values above 5 to 5', () => {
      expect(toSkillLevel(6)).toBe(5);
      expect(toSkillLevel(100)).toBe(5);
    });

    it('should floor decimal values', () => {
      expect(toSkillLevel(3.7)).toBe(3);
      expect(toSkillLevel(2.1)).toBe(2);
    });
  });
});

describe('Type Conversions', () => {
  describe('toNumber', () => {
    it('should return numbers unchanged', () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber(3.14)).toBe(3.14);
      expect(toNumber(-10)).toBe(-10);
    });

    it('should parse numeric strings', () => {
      expect(toNumber('42')).toBe(42);
      expect(toNumber('3.14')).toBe(3.14);
      expect(toNumber('-10')).toBe(-10);
    });

    it('should return default for NaN', () => {
      expect(toNumber(NaN)).toBe(0);
      expect(toNumber(NaN, 99)).toBe(99);
    });

    it('should return default for non-numeric values', () => {
      expect(toNumber('hello')).toBe(0);
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber({})).toBe(0);
    });

    it('should use custom default value', () => {
      expect(toNumber('invalid', -1)).toBe(-1);
      expect(toNumber(null, 100)).toBe(100);
    });
  });

  describe('toString', () => {
    it('should return strings unchanged', () => {
      expect(toString('hello')).toBe('hello');
      expect(toString('')).toBe('');
    });

    it('should convert values to strings', () => {
      expect(toString(42)).toBe('42');
      expect(toString(true)).toBe('true');
      expect(toString({})).toBe('[object Object]');
    });

    it('should return default for null and undefined', () => {
      expect(toString(null)).toBe('');
      expect(toString(undefined)).toBe('');
      expect(toString(null, 'default')).toBe('default');
      expect(toString(undefined, 'default')).toBe('default');
    });
  });
});

describe('THREE.js Type Guards', () => {
  describe('isVector3', () => {
    it('should return true for Vector3 instances', () => {
      const vec = new THREE.Vector3(1, 2, 3);
      expect(isVector3(vec)).toBe(true);
    });

    it('should return false for non-Vector3 values', () => {
      expect(isVector3([1, 2, 3])).toBe(false);
      expect(isVector3({ x: 1, y: 2, z: 3 })).toBe(false);
      expect(isVector3(null)).toBe(false);
    });
  });

  describe('isMesh', () => {
    it('should return true for Mesh instances', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      expect(isMesh(mesh)).toBe(true);
    });

    it('should return false for non-Mesh values', () => {
      expect(isMesh(new THREE.Group())).toBe(false);
      expect(isMesh({})).toBe(false);
      expect(isMesh(null)).toBe(false);
    });
  });

  describe('isGroup', () => {
    it('should return true for Group instances', () => {
      const group = new THREE.Group();
      expect(isGroup(group)).toBe(true);
    });

    it('should return false for non-Group values', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      expect(isGroup(mesh)).toBe(false);
      expect(isGroup({})).toBe(false);
    });
  });

  describe('Material Type Guards', () => {
    it('isMeshStandardMaterial should identify correct material', () => {
      const standard = new THREE.MeshStandardMaterial();
      const basic = new THREE.MeshBasicMaterial();

      expect(isMeshStandardMaterial(standard)).toBe(true);
      expect(isMeshStandardMaterial(basic)).toBe(false);
    });

    it('isMeshBasicMaterial should identify correct material', () => {
      const standard = new THREE.MeshStandardMaterial();
      const basic = new THREE.MeshBasicMaterial();

      expect(isMeshBasicMaterial(basic)).toBe(true);
      expect(isMeshBasicMaterial(standard)).toBe(false);
    });

    it('isMeshPhysicalMaterial should identify correct material', () => {
      const physical = new THREE.MeshPhysicalMaterial();
      const standard = new THREE.MeshStandardMaterial();

      expect(isMeshPhysicalMaterial(physical)).toBe(true);
      expect(isMeshPhysicalMaterial(standard)).toBe(false);
    });
  });
});

describe('Assertions', () => {
  describe('assertFloat32Array', () => {
    it('should not throw for Float32Array', () => {
      const arr = new Float32Array([1, 2, 3]);
      expect(() => assertFloat32Array(arr)).not.toThrow();
    });

    it('should throw for non-Float32Array', () => {
      expect(() => assertFloat32Array([1, 2, 3])).toThrow('Expected Float32Array');
      expect(() => assertFloat32Array(new Uint8Array([1, 2, 3]))).toThrow('Expected Float32Array');
      expect(() => assertFloat32Array(null)).toThrow('Expected Float32Array');
    });
  });
});
