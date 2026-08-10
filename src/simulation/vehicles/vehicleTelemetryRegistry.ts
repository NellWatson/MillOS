export type VehicleTelemetryType = 'forklift' | 'truck';

export interface VehicleTelemetrySnapshot {
  readonly id: string;
  readonly type: VehicleTelemetryType;
  readonly speedMps: number;
  readonly steeringRadians: number;
  readonly phase: string;
  readonly stopReason: string;
  readonly articulationRadians: number;
  readonly transferReady: boolean;
}

class VehicleTelemetryRegistry {
  private readonly vehicles = new Map<string, VehicleTelemetrySnapshot>();

  publish(snapshot: VehicleTelemetrySnapshot): void {
    if (
      !snapshot.id ||
      !Number.isFinite(snapshot.speedMps) ||
      !Number.isFinite(snapshot.steeringRadians) ||
      !Number.isFinite(snapshot.articulationRadians)
    ) {
      return;
    }
    this.vehicles.set(snapshot.id, { ...snapshot });
  }

  unregister(id: string): void {
    this.vehicles.delete(id);
  }

  get(id: string): VehicleTelemetrySnapshot | undefined {
    return this.vehicles.get(id);
  }

  getAll(): VehicleTelemetrySnapshot[] {
    return Array.from(this.vehicles.values());
  }

  clear(): void {
    this.vehicles.clear();
  }
}

export const vehicleTelemetryRegistry = new VehicleTelemetryRegistry();
