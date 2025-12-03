// Shared position registry for collision avoidance
// Workers and forklifts register their positions for mutual awareness

interface EntityPosition {
  id: string;
  x: number;
  z: number;
  type: 'worker' | 'forklift';
  dirX?: number; // Direction vector for forklifts
  dirZ?: number;
}

class PositionRegistry {
  private positions: Map<string, EntityPosition> = new Map();

  register(id: string, x: number, z: number, type: 'worker' | 'forklift', dirX?: number, dirZ?: number) {
    this.positions.set(id, { id, x, z, type, dirX, dirZ });
  }

  unregister(id: string) {
    this.positions.delete(id);
  }

  // Get all entities of a specific type within a radius
  getEntitiesNearby(x: number, z: number, radius: number, type: 'worker' | 'forklift', excludeId?: string): EntityPosition[] {
    const nearby: EntityPosition[] = [];
    this.positions.forEach(pos => {
      if (pos.type === type && pos.id !== excludeId) {
        const dx = pos.x - x;
        const dz = pos.z - z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < radius) {
          nearby.push(pos);
        }
      }
    });
    return nearby;
  }

  // Get all workers within a certain radius of a point
  getWorkersNearby(x: number, z: number, radius: number): EntityPosition[] {
    return this.getEntitiesNearby(x, z, radius, 'worker');
  }

  // Get all forklifts within a certain radius (excluding self)
  getForkliftsNearby(x: number, z: number, radius: number, excludeId: string): EntityPosition[] {
    return this.getEntitiesNearby(x, z, radius, 'forklift', excludeId);
  }

  // Check if there's any worker or forklift in the path ahead
  isPathClear(x: number, z: number, dirX: number, dirZ: number, checkDistance: number, safetyRadius: number, forkliftId?: string): boolean {
    // Check points along the path ahead
    for (let d = 1; d <= checkDistance; d += 0.5) {
      const checkX = x + dirX * d;
      const checkZ = z + dirZ * d;
      const workersNearby = this.getWorkersNearby(checkX, checkZ, safetyRadius);
      if (workersNearby.length > 0) {
        return false;
      }
      // Also check for other forklifts if forkliftId is provided
      if (forkliftId) {
        const forkliftsNearby = this.getForkliftsNearby(checkX, checkZ, safetyRadius, forkliftId);
        if (forkliftsNearby.length > 0) {
          return false;
        }
      }
    }
    return true;
  }

  // Get the nearest forklift to a position (for workers to detect approaching forklifts)
  getNearestForklift(x: number, z: number, maxDistance: number): EntityPosition | null {
    let nearest: EntityPosition | null = null;
    let nearestDist = maxDistance;

    this.positions.forEach(pos => {
      if (pos.type === 'forklift') {
        const dx = pos.x - x;
        const dz = pos.z - z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < nearestDist) {
          nearestDist = distance;
          nearest = pos;
        }
      }
    });
    return nearest;
  }

  // Check if a forklift is approaching a position (heading towards it)
  isForkliftApproaching(workerX: number, workerZ: number, forklift: EntityPosition): boolean {
    if (forklift.dirX === undefined || forklift.dirZ === undefined) return false;

    // Vector from forklift to worker
    const toWorkerX = workerX - forklift.x;
    const toWorkerZ = workerZ - forklift.z;

    // Dot product to check if forklift is heading towards worker
    const dot = toWorkerX * forklift.dirX + toWorkerZ * forklift.dirZ;
    return dot > 0; // Positive means forklift is heading towards worker
  }
}

export const positionRegistry = new PositionRegistry();
