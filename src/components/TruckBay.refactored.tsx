/**
 * TruckBay.refactored.tsx
 *
 * Refactored version demonstrating modular component architecture.
 * This is a simplified/partial implementation showing the structure.
 *
 * To use this version:
 * 1. Rename the original TruckBay.tsx to TruckBay.tsx.backup
 * 2. Rename this file to TruckBay.tsx
 *
 * NOTE: This is a demonstration of the refactored architecture.
 * The full implementation would require:
 * - Extracting all 100+ utility components from the original file
 * - Moving them to separate files in the truckbay/ directory
 * - Completing all dock equipment and yard elements
 */

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { audioManager } from '../utils/audioManager';
import { useMillStore } from '../store';
import {
  TruckPhase,
  calculateShippingTruckState,
  calculateReceivingTruckState,
} from './truckbay/useTruckPhysics';
import { TruckModel } from './truckbay/TruckModel';
import { DockBay } from './truckbay/DockBay';
import { LoadingAnimation } from './truckbay/LoadingAnimation';

interface TruckBayProps {
  productionSpeed: number;
}

export const TruckBay: React.FC<TruckBayProps> = ({ productionSpeed }) => {
  // Truck refs
  const shippingTruckRef = useRef<THREE.Group>(null);
  const receivingTruckRef = useRef<THREE.Group>(null);

  // State tracking refs
  const shippingStateRef = useRef<TruckPhase>('entering');
  const receivingStateRef = useRef<TruckPhase>('entering');
  const shippingDockedRef = useRef(false);
  const receivingDockedRef = useRef(false);
  const shippingDoorsOpenRef = useRef(false);
  const receivingDoorsOpenRef = useRef(false);
  const backupBeeperRef = useRef<{ shipping: boolean; receiving: boolean }>({
    shipping: false,
    receiving: false,
  });

  // Animation state refs
  const shippingWheelRotation = useRef(0);
  const receivingWheelRotation = useRef(0);
  const shippingThrottleRef = useRef(0);
  const receivingThrottleRef = useRef(0);
  const shippingTrailerAngleRef = useRef(0);
  const receivingTrailerAngleRef = useRef(0);

  // Dock status updates
  const updateDockStatus = useMillStore((state) => state.updateDockStatus);
  const lastDockUpdateRef = useRef({ receiving: '', shipping: '' });

  // Audio initialization
  useEffect(() => {
    audioManager.startTruckEngine('shipping-truck', true);
    audioManager.startTruckEngine('receiving-truck', true);

    return () => {
      audioManager.stopTruckEngine('shipping-truck');
      audioManager.stopTruckEngine('receiving-truck');
    };
  }, []);

  // Main animation loop
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const adjustedTime = time * (productionSpeed * 0.25 + 0.12);
    const CYCLE_LENGTH = 60;

    // ========== SHIPPING TRUCK ANIMATION ==========
    if (shippingTruckRef.current) {
      const cycle = adjustedTime % CYCLE_LENGTH;
      const truckState = calculateShippingTruckState(cycle, time);

      // Update truck position and rotation
      shippingTruckRef.current.position.x = truckState.x;
      shippingTruckRef.current.position.z = truckState.z;
      shippingTruckRef.current.rotation.y = truckState.rotation;

      // Update wheel rotation
      shippingWheelRotation.current += truckState.speed * delta * 5;
      shippingThrottleRef.current = truckState.throttle;
      shippingTrailerAngleRef.current = truckState.trailerAngle;

      // Update dock status
      shippingDockedRef.current =
        truckState.phase === 'docked' ||
        truckState.phase === 'final_adjustment' ||
        truckState.phase === 'preparing_to_leave';
      shippingDoorsOpenRef.current = truckState.doorsOpen;

      // Handle audio for backup beeper
      const shouldBeep = truckState.reverseLights;
      if (shouldBeep !== backupBeeperRef.current.shipping) {
        backupBeeperRef.current.shipping = shouldBeep;
        if (shouldBeep) {
          audioManager.startBackupBeeper?.('shipping-truck');
        } else {
          audioManager.stopBackupBeeper?.('shipping-truck');
        }
      }

      // Phase transition audio
      if (truckState.phase !== shippingStateRef.current) {
        handleShippingPhaseTransition(truckState.phase, shippingStateRef.current);
        shippingStateRef.current = truckState.phase;
      }

      // Update holographic display status
      updateShippingDockStatus(cycle);
    }

    // ========== RECEIVING TRUCK ANIMATION ==========
    if (receivingTruckRef.current) {
      const cycle = (adjustedTime + CYCLE_LENGTH / 2) % CYCLE_LENGTH;
      const truckState = calculateReceivingTruckState(cycle, time);

      // Update truck position and rotation
      receivingTruckRef.current.position.x = truckState.x;
      receivingTruckRef.current.position.z = truckState.z;
      receivingTruckRef.current.rotation.y = truckState.rotation;

      // Update wheel rotation
      receivingWheelRotation.current += truckState.speed * delta * 5;
      receivingThrottleRef.current = truckState.throttle;
      receivingTrailerAngleRef.current = truckState.trailerAngle;

      // Update dock status
      receivingDockedRef.current =
        truckState.phase === 'docked' ||
        truckState.phase === 'final_adjustment' ||
        truckState.phase === 'preparing_to_leave';
      receivingDoorsOpenRef.current = truckState.doorsOpen;

      // Handle audio for backup beeper
      const shouldBeep = truckState.reverseLights;
      if (shouldBeep !== backupBeeperRef.current.receiving) {
        backupBeeperRef.current.receiving = shouldBeep;
        if (shouldBeep) {
          audioManager.startBackupBeeper?.('receiving-truck');
        } else {
          audioManager.stopBackupBeeper?.('receiving-truck');
        }
      }

      // Phase transition audio
      if (truckState.phase !== receivingStateRef.current) {
        handleReceivingPhaseTransition(truckState.phase, receivingStateRef.current);
        receivingStateRef.current = truckState.phase;
      }

      // Update holographic display status
      updateReceivingDockStatus(cycle);
    }
  });

  // Helper functions for audio transitions
  const handleShippingPhaseTransition = (newPhase: TruckPhase, oldPhase: TruckPhase) => {
    if (newPhase === 'docked' && oldPhase === 'final_adjustment') {
      audioManager.playDoorOpen();
      audioManager.playTruckArrival();
      audioManager.updateTruckEngine('shipping-truck', false);
      audioManager.playAirBrake?.();
    } else if (newPhase === 'preparing_to_leave' && oldPhase === 'docked') {
      audioManager.playTruckHorn?.('shipping-truck', false);
    } else if (newPhase === 'pulling_out' && oldPhase === 'preparing_to_leave') {
      audioManager.playDoorClose();
      audioManager.playTruckDeparture();
      audioManager.updateTruckEngine('shipping-truck', true);
    } else if (newPhase === 'stopping_to_back') {
      audioManager.playAirBrake?.();
    } else if (newPhase === 'slowing' && oldPhase === 'entering') {
      audioManager.playJakeBrake?.('shipping-truck', 1.5);
    } else if (newPhase === 'turning_in' && oldPhase === 'slowing') {
      audioManager.playTireSqueal?.('shipping-truck', 0.3);
    }
  };

  const handleReceivingPhaseTransition = (newPhase: TruckPhase, oldPhase: TruckPhase) => {
    if (newPhase === 'docked' && oldPhase === 'final_adjustment') {
      audioManager.playDoorOpen();
      audioManager.playTruckArrival();
      audioManager.updateTruckEngine('receiving-truck', false);
      audioManager.playAirBrake?.();
    } else if (newPhase === 'preparing_to_leave' && oldPhase === 'docked') {
      audioManager.playTruckHorn?.('receiving-truck', false);
    } else if (newPhase === 'pulling_out' && oldPhase === 'preparing_to_leave') {
      audioManager.playDoorClose();
      audioManager.playTruckDeparture();
      audioManager.updateTruckEngine('receiving-truck', true);
    } else if (newPhase === 'stopping_to_back') {
      audioManager.playAirBrake?.();
    } else if (newPhase === 'slowing' && oldPhase === 'entering') {
      audioManager.playJakeBrake?.('receiving-truck', 1.5);
    } else if (newPhase === 'turning_in' && oldPhase === 'slowing') {
      audioManager.playTireSqueal?.('receiving-truck', 0.3);
    }
  };

  const updateShippingDockStatus = (cycle: number) => {
    let status: 'arriving' | 'loading' | 'departing' | 'clear';
    let eta: number;

    if (cycle < 34) {
      status = 'arriving';
      eta = Math.ceil((34 - cycle) / 3);
    } else if (cycle < 50) {
      status = 'loading';
      eta = Math.ceil((50 - cycle) / 3);
    } else {
      status = 'departing';
      eta = 0;
    }

    const key = `${status}-${eta}`;
    if (key !== lastDockUpdateRef.current.shipping) {
      lastDockUpdateRef.current.shipping = key;
      updateDockStatus('shipping', { status, etaMinutes: eta });
    }
  };

  const updateReceivingDockStatus = (cycle: number) => {
    let status: 'arriving' | 'loading' | 'departing' | 'clear';
    let eta: number;

    if (cycle < 34) {
      status = 'arriving';
      eta = Math.ceil((34 - cycle) / 3);
    } else if (cycle < 50) {
      status = 'loading';
      eta = Math.ceil((50 - cycle) / 3);
    } else {
      status = 'departing';
      eta = 0;
    }

    const key = `${status}-${eta}`;
    if (key !== lastDockUpdateRef.current.receiving) {
      lastDockUpdateRef.current.receiving = key;
      updateDockStatus('receiving', { status, etaMinutes: eta });
    }
  };

  // Helper functions to get truck state for TruckModel components
  const getShippingState = (time: number) => {
    const adjustedTime = time * (productionSpeed * 0.25 + 0.12);
    return calculateShippingTruckState(adjustedTime % 60, time);
  };

  const getReceivingState = (time: number) => {
    const adjustedTime = time * (productionSpeed * 0.25 + 0.12);
    return calculateReceivingTruckState((adjustedTime + 30) % 60, time);
  };

  return (
    <group>
      {/* ========== SHIPPING DOCK (Front of building, z=50) ========== */}
      <DockBay
        position={[0, 0, 50]}
        label="SHIPPING"
        sublabel="DOCK 1 - OUTBOUND"
        isDocked={shippingDockedRef.current}
        doorsOpen={shippingDoorsOpenRef.current}
      />

      {/* Shipping dock loading animation */}
      <LoadingAnimation
        dockPosition={[0, 0, 52]}
        isActive={shippingDoorsOpenRef.current}
        cycleOffset={0}
      />

      {/* ========== FRONT TRUCK YARD ========== */}
      <group position={[0, 0, 50]}>
        {/* Yard pavement */}
        <mesh position={[0, 0.02, 30]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.95} />
        </mesh>

        {/* Dock approach pavement */}
        <mesh position={[0, 0.03, 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.85} />
        </mesh>
      </group>

      {/* Shipping truck */}
      <group ref={shippingTruckRef} position={[20, 0, 160]}>
        <TruckModel
          color="#1e40af"
          company="FLOUR EXPRESS"
          plateNumber="FLR 4387"
          wheelRotation={shippingWheelRotation}
          throttle={shippingThrottleRef}
          trailerAngle={shippingTrailerAngleRef}
          getTruckState={() => getShippingState(performance.now() / 1000)}
        />
      </group>

      {/* ========== RECEIVING DOCK (Back of building, z=-50) ========== */}
      <DockBay
        position={[0, 0, -50]}
        label="RECEIVING"
        sublabel="DOCK 2 - INBOUND"
        isDocked={receivingDockedRef.current}
        doorsOpen={receivingDoorsOpenRef.current}
      />

      {/* Receiving dock loading animation */}
      <LoadingAnimation
        dockPosition={[0, 0, -52]}
        isActive={receivingDoorsOpenRef.current}
        cycleOffset={5}
      />

      {/* ========== BACK TRUCK YARD ========== */}
      <group position={[0, 0, -50]}>
        {/* Yard pavement */}
        <mesh position={[0, 0.02, -30]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.95} />
        </mesh>

        {/* Dock approach pavement */}
        <mesh position={[0, 0.03, -8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 16]} />
          <meshStandardMaterial color="#374151" roughness={0.85} />
        </mesh>
      </group>

      {/* Receiving truck */}
      <group ref={receivingTruckRef} position={[-20, 0, -160]}>
        <TruckModel
          color="#991b1b"
          company="GRAIN CO"
          plateNumber="GRN 5921"
          wheelRotation={receivingWheelRotation}
          throttle={receivingThrottleRef}
          trailerAngle={receivingTrailerAngleRef}
          getTruckState={() => getReceivingState(performance.now() / 1000)}
        />
      </group>
    </group>
  );
};
