import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { audioManager } from '../utils/audioManager';

interface TruckBayProps {
  productionSpeed: number;
}

export const TruckBay: React.FC<TruckBayProps> = ({ productionSpeed }) => {
  const truck1Ref = useRef<THREE.Group>(null);
  const truck2Ref = useRef<THREE.Group>(null);
  const truck1StateRef = useRef<'arriving' | 'docked' | 'leaving'>('arriving');
  const truck2StateRef = useRef<'arriving' | 'docked' | 'leaving'>('arriving');
  const lastTruck1State = useRef<string>('');
  const lastTruck2State = useRef<string>('');

  // Start truck engines on mount
  useEffect(() => {
    audioManager.startTruckEngine('truck-1', true);
    audioManager.startTruckEngine('truck-2', true);

    return () => {
      audioManager.stopTruckEngine('truck-1');
      audioManager.stopTruckEngine('truck-2');
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime * (productionSpeed * 0.5 + 0.2);

    // Truck 1 - Delivery cycle
    if (truck1Ref.current) {
      const cycle = time % 25;
      let z: number;
      let newState: 'arriving' | 'docked' | 'leaving';

      if (cycle < 10) {
        z = THREE.MathUtils.lerp(-80, -30, cycle / 10);
        newState = 'arriving';
      } else if (cycle < 18) {
        z = -30;
        newState = 'docked';
      } else {
        z = THREE.MathUtils.lerp(-30, 80, (cycle - 18) / 7);
        newState = 'leaving';
      }
      truck1Ref.current.position.z = z;

      // Handle state transitions for sounds
      if (newState !== truck1StateRef.current) {
        if (newState === 'docked' && truck1StateRef.current === 'arriving') {
          audioManager.playDoorOpen();      // Loading bay door opens
          audioManager.playTruckArrival();  // Horn + air brake fanfare
          audioManager.updateTruckEngine('truck-1', false);
        } else if (newState === 'leaving' && truck1StateRef.current === 'docked') {
          audioManager.playDoorClose();     // Loading bay door closes
          audioManager.playTruckDeparture(); // Engine rev up
          audioManager.updateTruckEngine('truck-1', true);
        } else if (newState === 'arriving') {
          audioManager.updateTruckEngine('truck-1', true);
        }
        truck1StateRef.current = newState;
      }
    }

    // Truck 2 - Offset cycle
    if (truck2Ref.current) {
      const cycle = (time + 12) % 25;
      let z: number;
      let newState: 'arriving' | 'docked' | 'leaving';

      if (cycle < 10) {
        z = THREE.MathUtils.lerp(-80, -30, cycle / 10);
        newState = 'arriving';
      } else if (cycle < 18) {
        z = -30;
        newState = 'docked';
      } else {
        z = THREE.MathUtils.lerp(-30, 80, (cycle - 18) / 7);
        newState = 'leaving';
      }
      truck2Ref.current.position.z = z;

      // Handle state transitions for sounds
      if (newState !== truck2StateRef.current) {
        if (newState === 'docked' && truck2StateRef.current === 'arriving') {
          audioManager.playDoorOpen();      // Loading bay door opens
          audioManager.playTruckArrival();  // Horn + air brake fanfare
          audioManager.updateTruckEngine('truck-2', false);
        } else if (newState === 'leaving' && truck2StateRef.current === 'docked') {
          audioManager.playDoorClose();     // Loading bay door closes
          audioManager.playTruckDeparture(); // Engine rev up
          audioManager.updateTruckEngine('truck-2', true);
        } else if (newState === 'arriving') {
          audioManager.updateTruckEngine('truck-2', true);
        }
        truck2StateRef.current = newState;
      }
    }
  });

  return (
    <group position={[35, 0, 0]}>
      {/* Loading dock platform - split into 3 sections with channels through */}
      {/* Left platform section */}
      <mesh position={[-7.5, 1, -28]} receiveShadow castShadow>
        <boxGeometry args={[3, 2, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>
      {/* Center platform section */}
      <mesh position={[0, 1, -28]} receiveShadow castShadow>
        <boxGeometry args={[4, 2, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>
      {/* Right platform section */}
      <mesh position={[7.5, 1, -28]} receiveShadow castShadow>
        <boxGeometry args={[3, 2, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* Dock bumpers - repositioned for split platform */}
      {[-7.5, 0, 7.5].map((x, i) => (
        <mesh key={i} position={[x, 1, -24]} castShadow>
          <boxGeometry args={[1, 1.5, 0.5]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}

      {/* ===== TRUCK GROOVES - Two sunken channels for truck positioning ===== */}
      {/* Left truck groove at x=-4 */}
      <group position={[-4, 0, -35]}>
        {/* Sunken groove floor - darker asphalt */}
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4, 25]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
        </mesh>
        {/* Groove side walls - raised curbs */}
        <mesh position={[-2.1, 0.1, 0]}>
          <boxGeometry args={[0.2, 0.5, 25]} />
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </mesh>
        <mesh position={[2.1, 0.1, 0]}>
          <boxGeometry args={[0.2, 0.5, 25]} />
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </mesh>
        {/* Yellow warning stripes on curb tops */}
        <mesh position={[-2.1, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 25]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[2.1, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 25]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>

      {/* Right truck groove at x=4 */}
      <group position={[4, 0, -35]}>
        {/* Sunken groove floor - darker asphalt */}
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4, 25]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
        </mesh>
        {/* Groove side walls - raised curbs */}
        <mesh position={[-2.1, 0.1, 0]}>
          <boxGeometry args={[0.2, 0.5, 25]} />
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </mesh>
        <mesh position={[2.1, 0.1, 0]}>
          <boxGeometry args={[0.2, 0.5, 25]} />
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </mesh>
        {/* Yellow warning stripes on curb tops */}
        <mesh position={[-2.1, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 25]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[2.1, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 25]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>

      {/* Lane center lines */}
      <mesh position={[-4, 0.07, -35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 20]} />
        <meshBasicMaterial color="#fef3c7" />
      </mesh>
      <mesh position={[4, 0.07, -35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 20]} />
        <meshBasicMaterial color="#fef3c7" />
      </mesh>

      {/* Truck 1 */}
      <group ref={truck1Ref} position={[-4, 0, -50]}>
        <Truck color="#dc2626" company="GRAIN CO" />
      </group>

      {/* Truck 2 */}
      <group ref={truck2Ref} position={[4, 0, -50]}>
        <Truck color="#2563eb" company="FLOUR EXPRESS" />
      </group>

      {/* Dock signage */}
      <Text
        position={[0, 4, -24]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        LOADING BAY A
      </Text>
    </group>
  );
};

const Truck: React.FC<{ color: string; company: string }> = ({ color, company }) => {
  return (
    <group>
      {/* Cab */}
      <mesh position={[0, 1.8, 2.5]} castShadow>
        <boxGeometry args={[3, 2.8, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 2.2, 3.8]}>
        <boxGeometry args={[2.5, 1.5, 0.1]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Trailer */}
      <mesh position={[0, 2.5, -4]} castShadow>
        <boxGeometry args={[3.5, 3.5, 10]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Company Logos on trailer sides */}
      {company === 'GRAIN CO' ? (
        <>
          {/* Right side logo */}
          <group position={[1.76, 2.5, -4]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[8.5, 2.8, 0.05]} />
              <meshStandardMaterial color="#991b1b" metalness={0.35} roughness={0.55} />
            </mesh>
            <Text
              position={[0, 0.4, 0.06]}
              fontSize={0.7}
              color="#fbbf24"
              anchorX="center"
              anchorY="middle"
            >
              GRAIN CO
            </Text>
            <Text
              position={[0, -0.35, 0.06]}
              fontSize={0.3}
              color="#fef3c7"
              anchorX="center"
              anchorY="middle"
            >
              Premium Grain Transport
            </Text>
          </group>
          {/* Left side logo */}
          <group position={[-1.76, 2.5, -4]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[8.5, 2.8, 0.05]} />
              <meshStandardMaterial color="#991b1b" metalness={0.35} roughness={0.55} />
            </mesh>
            <Text
              position={[0, 0.4, 0.06]}
              fontSize={0.7}
              color="#fbbf24"
              anchorX="center"
              anchorY="middle"
            >
              GRAIN CO
            </Text>
            <Text
              position={[0, -0.35, 0.06]}
              fontSize={0.3}
              color="#fef3c7"
              anchorX="center"
              anchorY="middle"
            >
              Premium Grain Transport
            </Text>
          </group>
        </>
      ) : (
        <>
          {/* Right side logo - FLOUR EXPRESS */}
          <group position={[1.76, 2.5, -4]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[8.5, 2.8, 0.05]} />
              <meshStandardMaterial color="#1e40af" metalness={0.35} roughness={0.55} />
            </mesh>
            <Text
              position={[0, 0.4, 0.06]}
              fontSize={0.6}
              color="#fef3c7"
              anchorX="center"
              anchorY="middle"
            >
              FLOUR EXPRESS
            </Text>
            <Text
              position={[0, -0.35, 0.06]}
              fontSize={0.25}
              color="#93c5fd"
              anchorX="center"
              anchorY="middle"
            >
              Fast & Fresh Delivery
            </Text>
          </group>
          {/* Left side logo - FLOUR EXPRESS */}
          <group position={[-1.76, 2.5, -4]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[8.5, 2.8, 0.05]} />
              <meshStandardMaterial color="#1e40af" metalness={0.35} roughness={0.55} />
            </mesh>
            <Text
              position={[0, 0.4, 0.06]}
              fontSize={0.6}
              color="#fef3c7"
              anchorX="center"
              anchorY="middle"
            >
              FLOUR EXPRESS
            </Text>
            <Text
              position={[0, -0.35, 0.06]}
              fontSize={0.25}
              color="#93c5fd"
              anchorX="center"
              anchorY="middle"
            >
              Fast & Fresh Delivery
            </Text>
          </group>
        </>
      )}

      {/* Wheels - Front */}
      {[-1.3, 1.3].map((x, i) => (
        <mesh key={`front-${i}`} position={[x, 0.6, 2.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.4, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.8} />
        </mesh>
      ))}

      {/* Wheels - Rear (double) */}
      {[-1.3, 1.3].map((x, i) => (
        <group key={`rear-${i}`}>
          <mesh position={[x, 0.6, -7]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.4, 16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
          <mesh position={[x, 0.6, -8]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.4, 16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Headlights */}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.2, 3.8]}>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#fef3c7"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};
