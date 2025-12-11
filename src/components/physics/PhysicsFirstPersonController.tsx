/**
 * Physics-based first-person controller
 *
 * Uses Rapier rigid body for player movement and collision.
 * Camera follows the physics body position.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useUIStore } from '../../stores/uiStore';
import {
  PHYSICS_CONFIG,
  COLLISION_FILTERS,
  createCollisionGroups,
} from '../../physics/PhysicsConfig';

// Movement configuration
const FPS_FOV = 105;
const ORBIT_FOV = 65;
const MOUSE_SENSITIVITY = 1.5;

// Track pressed keys (module level to persist across renders)
const pressedKeys = new Set<string>();

interface PhysicsFirstPersonControllerProps {
  onLockChange?: (locked: boolean) => void;
}

// Helper to clamp velocity magnitude
function clampVelocity(rb: RapierRigidBody, maxSpeed: number): void {
  const vel = rb.linvel();
  const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    rb.setLinvel({ x: vel.x * scale, y: vel.y, z: vel.z * scale }, true);
  }
}

export const PhysicsFirstPersonController: React.FC<PhysicsFirstPersonControllerProps> = ({
  onLockChange,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<typeof PointerLockControls.prototype>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const isLocked = useRef(false);

  // Reusable vectors for calculations
  const directionRef = useRef(new THREE.Vector3());
  const forwardRef = useRef(new THREE.Vector3());
  const rightRef = useRef(new THREE.Vector3());
  const moveVecRef = useRef(new THREE.Vector3());

  // Collision groups
  const collisionGroups = useMemo(
    () =>
      createCollisionGroups(
        COLLISION_FILTERS.player.memberships,
        COLLISION_FILTERS.player.filter
      ),
    []
  );

  // Set initial camera FOV
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = FPS_FOV;
      camera.updateProjectionMatrix();
    }

    return () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = ORBIT_FOV;
        camera.updateProjectionMatrix();
      }
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };
  }, [camera]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      pressedKeys.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      pressedKeys.clear();
    };
  }, []);

  // Movement update
  useFrame((_state, delta) => {
    if (!rigidBodyRef.current || !isLocked.current) return;

    const rb = rigidBodyRef.current;
    const cappedDelta = Math.min(delta, 0.1);

    // Get movement input
    const dir = directionRef.current.set(0, 0, 0);

    if (pressedKeys.has('w')) dir.z -= 1;
    if (pressedKeys.has('s')) dir.z += 1;
    if (pressedKeys.has('a')) dir.x -= 1;
    if (pressedKeys.has('d')) dir.x += 1;

    // Normalize diagonal movement
    if (dir.lengthSq() > 0) {
      dir.normalize();
    }

    // Calculate world-space movement based on camera direction
    const forward = forwardRef.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = rightRef.current.set(1, 0, 0).applyQuaternion(camera.quaternion);

    // Keep movement horizontal
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    // Calculate movement direction
    const moveVec = moveVecRef.current.set(0, 0, 0);
    moveVec.addScaledVector(forward, -dir.z);
    moveVec.addScaledVector(right, dir.x);

    // Determine force and max speed
    const isSprinting = pressedKeys.has('shift');
    const force = isSprinting
      ? PHYSICS_CONFIG.player.sprintForce
      : PHYSICS_CONFIG.player.moveForce;
    const maxSpeed = isSprinting
      ? PHYSICS_CONFIG.player.maxSprintVelocity
      : PHYSICS_CONFIG.player.maxLinearVelocity;

    // Apply movement force
    if (moveVec.lengthSq() > 0) {
      rb.applyImpulse(
        {
          x: moveVec.x * force * cappedDelta,
          y: 0,
          z: moveVec.z * force * cappedDelta,
        },
        true
      );
    }

    // Clamp velocity
    clampVelocity(rb, maxSpeed);

    // Sync camera to physics body position
    const pos = rb.translation();
    camera.position.set(pos.x, pos.y + PHYSICS_CONFIG.player.height, pos.z);
  });

  // Handle lock state changes
  const handleLock = useCallback(() => {
    isLocked.current = true;
    onLockChange?.(true);
  }, [onLockChange]);

  const handleUnlock = useCallback(() => {
    isLocked.current = false;
    pressedKeys.clear();
    onLockChange?.(false);
    useUIStore.getState().setFpsMode(false);
  }, [onLockChange]);

  return (
    <>
      {/* Physics body for player collision */}
      <RigidBody
        ref={rigidBodyRef}
        type="dynamic"
        position={[30, 2, 40]}
        collisionGroups={collisionGroups}
        linearDamping={PHYSICS_CONFIG.player.linearDamping}
        angularDamping={PHYSICS_CONFIG.player.angularDamping}
        lockRotations
        enabledRotations={[false, false, false]}
        userData={{ type: 'player' }}
        gravityScale={0}
      >
        <CapsuleCollider
          args={[
            PHYSICS_CONFIG.player.capsuleHalfHeight,
            PHYSICS_CONFIG.player.capsuleRadius,
          ]}
          position={[0, PHYSICS_CONFIG.player.capsuleHalfHeight + PHYSICS_CONFIG.player.capsuleRadius, 0]}
        />
      </RigidBody>

      {/* Pointer lock controls for mouse look */}
      <PointerLockControls
        ref={controlsRef}
        pointerSpeed={MOUSE_SENSITIVITY}
        onLock={handleLock}
        onUnlock={handleUnlock}
      />
    </>
  );
};

export default PhysicsFirstPersonController;
