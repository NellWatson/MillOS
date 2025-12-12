/**
 * Fire drill exit zone sensors
 *
 * Sensor colliders at exit positions that detect when workers evacuate.
 * Uses Rapier intersection events to trigger evacuation tracking.
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { CollisionPayload } from '@react-three/rapier';
import { useMemo, useCallback } from 'react';
import { useGameSimulationStore, FIRE_DRILL_EXITS } from '../../stores/gameSimulationStore';
import { COLLISION_FILTERS, createCollisionGroups } from '../../physics/PhysicsConfig';

/**
 * Exit zone sensors for fire drill evacuation
 *
 * When a worker enters an exit zone during a fire drill,
 * markWorkerEvacuated is called to track evacuation progress.
 */
export const ExitZoneSensors: React.FC = () => {
  const markWorkerEvacuated = useGameSimulationStore((s) => s.markWorkerEvacuated);
  const drillActive = useGameSimulationStore((s) => s.drillMetrics.active);

  // Sensor collision groups - detects workers only
  const sensorCollisionGroups = useMemo(
    () =>
      createCollisionGroups(COLLISION_FILTERS.sensor.memberships, COLLISION_FILTERS.sensor.filter),
    []
  );

  // Handle worker entering exit zone
  const handleIntersectionEnter = useCallback(
    (_exitId: string) => (payload: CollisionPayload) => {
      if (!drillActive) return;

      // Get worker ID from rigid body userData
      const workerId = payload.other.rigidBodyObject?.userData?.workerId as string | undefined;
      if (workerId) {
        markWorkerEvacuated(workerId);
      }
    },
    [drillActive, markWorkerEvacuated]
  );

  return (
    <>
      {FIRE_DRILL_EXITS.map((exit) => (
        <RigidBody
          key={exit.id}
          type="fixed"
          sensor
          collisionGroups={sensorCollisionGroups}
          position={[exit.position.x, 1, exit.position.z]}
          onIntersectionEnter={handleIntersectionEnter(exit.id)}
          userData={{ exitId: exit.id, type: 'exit-sensor' }}
        >
          {/* Exit zone is a 6x4x6 box centered at exit position */}
          <CuboidCollider args={[3, 2, 3]} />
        </RigidBody>
      ))}
    </>
  );
};

export default ExitZoneSensors;
