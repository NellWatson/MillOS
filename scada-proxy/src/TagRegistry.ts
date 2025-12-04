/**
 * Tag Registry for SCADA Proxy
 *
 * Manages tag definitions and current values.
 * Supports loading tags from JSON configuration.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TagDefinition {
  id: string;
  name: string;
  protocol: 'opcua' | 'modbus';
  address: string; // OPC-UA NodeId or Modbus address
  dataType: 'FLOAT32' | 'INT16' | 'INT32' | 'BOOL' | 'STRING';
  accessMode: 'READ' | 'WRITE' | 'READ_WRITE';
  engineeringUnits?: string;
  engLow?: number;
  engHigh?: number;
  // Modbus-specific
  modbusRegister?: 'holding' | 'input' | 'coil' | 'discrete';
  modbusOffset?: number;
  modbusSlave?: number;
}

export interface TagValue {
  tagId: string;
  value: unknown;
  quality: string;
  timestamp: number;
}

export class TagRegistry {
  private tags = new Map<string, TagDefinition>();
  private values = new Map<string, TagValue>();

  /**
   * Load tag definitions from tags.json
   */
  async loadTags(): Promise<void> {
    const tagsPath = join(__dirname, '..', 'tags.json');

    if (!existsSync(tagsPath)) {
      console.log('[TagRegistry] No tags.json found, using default tags');
      this.loadDefaultTags();
      return;
    }

    try {
      const content = readFileSync(tagsPath, 'utf-8');
      const tagList: TagDefinition[] = JSON.parse(content);

      tagList.forEach((tag) => {
        this.tags.set(tag.id, tag);
        // Initialize with BAD quality
        this.values.set(tag.id, {
          tagId: tag.id,
          value: 0,
          quality: 'BAD',
          timestamp: Date.now()
        });
      });

      console.log(`[TagRegistry] Loaded ${this.tags.size} tags from tags.json`);
    } catch (err) {
      console.error('[TagRegistry] Failed to load tags.json:', err);
      this.loadDefaultTags();
    }
  }

  /**
   * Load default demo tags
   */
  private loadDefaultTags(): void {
    const defaultTags: TagDefinition[] = [
      // Roller Mills - OPC-UA
      {
        id: 'RM101.ST001.PV',
        name: 'Roller Mill 101 Speed',
        protocol: 'opcua',
        address: 'ns=2;s=RM101.Speed',
        dataType: 'FLOAT32',
        accessMode: 'READ',
        engineeringUnits: 'RPM',
        engLow: 0,
        engHigh: 2000
      },
      {
        id: 'RM101.TT001.PV',
        name: 'Roller Mill 101 Temperature',
        protocol: 'opcua',
        address: 'ns=2;s=RM101.Temperature',
        dataType: 'FLOAT32',
        accessMode: 'READ',
        engineeringUnits: 'C',
        engLow: 0,
        engHigh: 100
      },
      {
        id: 'RM101.VT001.PV',
        name: 'Roller Mill 101 Vibration',
        protocol: 'opcua',
        address: 'ns=2;s=RM101.Vibration',
        dataType: 'FLOAT32',
        accessMode: 'READ',
        engineeringUnits: 'mm/s',
        engLow: 0,
        engHigh: 10
      },

      // Silos - Modbus
      {
        id: 'SILO_ALPHA.LT001.PV',
        name: 'Silo Alpha Level',
        protocol: 'modbus',
        address: '40001',
        dataType: 'FLOAT32',
        accessMode: 'READ',
        engineeringUnits: '%',
        engLow: 0,
        engHigh: 100,
        modbusRegister: 'holding',
        modbusOffset: 0,
        modbusSlave: 1
      },
      {
        id: 'SILO_ALPHA.TT001.PV',
        name: 'Silo Alpha Temperature',
        protocol: 'modbus',
        address: '40003',
        dataType: 'FLOAT32',
        accessMode: 'READ',
        engineeringUnits: 'C',
        engLow: -20,
        engHigh: 60,
        modbusRegister: 'holding',
        modbusOffset: 2,
        modbusSlave: 1
      },

      // Packers - Modbus
      {
        id: 'PACKER_1.CT001.PV',
        name: 'Packer 1 Bag Count',
        protocol: 'modbus',
        address: '40101',
        dataType: 'INT32',
        accessMode: 'READ',
        engineeringUnits: 'bags',
        engLow: 0,
        engHigh: 10000,
        modbusRegister: 'holding',
        modbusOffset: 100,
        modbusSlave: 2
      }
    ];

    defaultTags.forEach((tag) => {
      this.tags.set(tag.id, tag);
      this.values.set(tag.id, {
        tagId: tag.id,
        value: 0,
        quality: 'BAD',
        timestamp: Date.now()
      });
    });

    console.log(`[TagRegistry] Loaded ${this.tags.size} default tags`);
  }

  /**
   * Get tag definition by ID
   */
  getTagDefinition(tagId: string): TagDefinition | null {
    return this.tags.get(tagId) ?? null;
  }

  /**
   * Get all tags for a specific protocol
   */
  getTagsByProtocol(protocol: 'opcua' | 'modbus'): TagDefinition[] {
    return Array.from(this.tags.values()).filter((t) => t.protocol === protocol);
  }

  /**
   * Get current value for a tag
   */
  getValue(tagId: string): TagValue | null {
    return this.values.get(tagId) ?? null;
  }

  /**
   * Get all current values
   */
  getAllValues(): TagValue[] {
    return Array.from(this.values.values());
  }

  /**
   * Update a tag value
   */
  updateValue(tagId: string, value: unknown, quality: string): void {
    const existing = this.values.get(tagId);
    if (existing) {
      this.values.set(tagId, {
        tagId,
        value,
        quality,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get total tag count
   */
  getTagCount(): number {
    return this.tags.size;
  }
}
