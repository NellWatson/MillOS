import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TruckAnimState } from './useTruckPhysics';
import { ExhaustSmoke } from './TruckAudio';
import {
  LicensePlate,
  HeadlightBeam,
  FuelTank,
  DEFTank,
  CBAntennaComponent,
  SunVisor,
  FifthWheelCoupling,
  AirTank,
  GladHands,
  DOTMarkerLights,
  ICCReflectiveTape,
  HazmatPlacard,
  SlidingTandemAxles,
  LandingGear,
  MudflapWithLogo,
  GrainCoLogo,
  FlourExpressLogo,
} from './TruckParts';

interface TruckModelProps {
  color: string;
  company: string;
  plateNumber: string;
  wheelRotation: React.MutableRefObject<number>;
  throttle: React.MutableRefObject<number>;
  trailerAngle: React.MutableRefObject<number>;
  getTruckState: () => TruckAnimState;
}

export const TruckModel: React.FC<TruckModelProps> = ({
  color,
  company,
  plateNumber,
  wheelRotation,
  throttle,
  trailerAngle,
  getTruckState,
}) => {
  const frontLeftWheelRef = useRef<THREE.Mesh>(null);
  const frontRightWheelRef = useRef<THREE.Mesh>(null);
  const rearWheelsRef = useRef<THREE.Group>(null);
  const trailerRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Mesh>(null);
  const rightDoorRef = useRef<THREE.Mesh>(null);
  const brakeLightLeftRef = useRef<THREE.MeshStandardMaterial>(null);
  const brakeLightRightRef = useRef<THREE.MeshStandardMaterial>(null);
  const reverseLightLeftRef = useRef<THREE.MeshStandardMaterial>(null);
  const reverseLightRightRef = useRef<THREE.MeshStandardMaterial>(null);
  const leftSignalRef = useRef<THREE.MeshStandardMaterial>(null);
  const rightSignalRef = useRef<THREE.MeshStandardMaterial>(null);
  const markerLightsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  useFrame((state) => {
    const truckState = getTruckState();
    const time = state.clock.elapsedTime;

    // Rotate wheels
    if (frontLeftWheelRef.current) {
      frontLeftWheelRef.current.rotation.x = wheelRotation.current;
    }
    if (frontRightWheelRef.current) {
      frontRightWheelRef.current.rotation.x = wheelRotation.current;
    }
    if (rearWheelsRef.current) {
      rearWheelsRef.current.children.forEach((child) => {
        if (child instanceof THREE.Group) {
          child.children.forEach((wheel) => {
            if (wheel instanceof THREE.Mesh) {
              wheel.rotation.x = wheelRotation.current;
            }
          });
        }
      });
    }

    // Trailer articulation
    if (trailerRef.current) {
      trailerRef.current.rotation.y = THREE.MathUtils.lerp(
        trailerRef.current.rotation.y,
        trailerAngle.current,
        0.1
      );
    }

    // Animated trailer doors
    if (leftDoorRef.current && rightDoorRef.current) {
      const targetAngle = truckState.doorsOpen ? -Math.PI * 0.45 : 0;
      leftDoorRef.current.rotation.y = THREE.MathUtils.lerp(
        leftDoorRef.current.rotation.y,
        -targetAngle,
        0.08
      );
      rightDoorRef.current.rotation.y = THREE.MathUtils.lerp(
        rightDoorRef.current.rotation.y,
        targetAngle,
        0.08
      );
    }

    // Update lights
    if (brakeLightLeftRef.current) {
      brakeLightLeftRef.current.emissiveIntensity = truckState.brakeLights ? 1.5 : 0.2;
    }
    if (brakeLightRightRef.current) {
      brakeLightRightRef.current.emissiveIntensity = truckState.brakeLights ? 1.5 : 0.2;
    }
    if (reverseLightLeftRef.current) {
      reverseLightLeftRef.current.emissiveIntensity = truckState.reverseLights ? 1.2 : 0;
    }
    if (reverseLightRightRef.current) {
      reverseLightRightRef.current.emissiveIntensity = truckState.reverseLights ? 1.2 : 0;
    }
    if (leftSignalRef.current) {
      leftSignalRef.current.emissiveIntensity = truckState.leftSignal ? 1.5 : 0.1;
    }
    if (rightSignalRef.current) {
      rightSignalRef.current.emissiveIntensity = truckState.rightSignal ? 1.5 : 0.1;
    }

    // Marker lights pulsing when engine running
    markerLightsRef.current.forEach((mat) => {
      if (mat) {
        mat.emissiveIntensity = 0.4 + Math.sin(time * 2) * 0.1;
      }
    });
  });

  const isEngineRunning = getTruckState().phase !== 'docked' || throttle.current > 0.05;

  return (
    <group>
      {/* === CAB === */}
      <group position={[0, 0, 2]}>
        {/* Main cab body */}
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[2.8, 2.4, 2.2]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
        </mesh>

        {/* Hood */}
        <mesh position={[0, 1.2, 1.5]} castShadow>
          <boxGeometry args={[2.6, 1, 1.2]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
        </mesh>

        {/* Windshield */}
        <mesh position={[0, 2.6, 1.2]} rotation={[0.3, 0, 0]}>
          <planeGeometry args={[2.4, 1.4]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.95} roughness={0.05} />
        </mesh>

        {/* Side windows */}
        {[-1.41, 1.41].map((x, i) => (
          <mesh key={i} position={[x, 2.4, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[1.8, 1.2]} />
            <meshStandardMaterial
              color="#1e3a5f"
              metalness={0.9}
              roughness={0.1}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}

        {/* === DRIVER === */}
        <group position={[0.4, 2.2, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#d4a574" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.35, 0.5, 0.25]} />
            <meshStandardMaterial color="#1e40af" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.3]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.5, 0.12, 0.12]} />
            <meshStandardMaterial color="#1e40af" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.65, 0.05]}>
            <cylinderGeometry args={[0.12, 0.15, 0.08, 12]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} />
          </mesh>
        </group>

        {/* Roof fairing */}
        <mesh position={[0, 3.5, -0.3]} castShadow>
          <boxGeometry args={[2.6, 0.8, 1.8]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
        </mesh>

        {/* === CAB MARKER LIGHTS === */}
        {[-1.1, -0.55, 0, 0.55, 1.1].map((x, i) => (
          <mesh key={i} position={[x, 3.95, 0.5]}>
            <boxGeometry args={[0.15, 0.08, 0.1]} />
            <meshStandardMaterial
              ref={(el) => {
                if (el) markerLightsRef.current[i] = el;
              }}
              color="#f97316"
              emissive="#f97316"
              emissiveIntensity={0.4}
            />
          </mesh>
        ))}

        {/* Exhaust stacks */}
        <mesh position={[-1.2, 2.8, -0.8]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 1.5, 12]} />
          <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[1.2, 2.8, -0.8]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 1.5, 12]} />
          <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Exhaust smoke */}
        <ExhaustSmoke
          position={[-1.2, 3.6, -0.8]}
          throttle={throttle.current}
          isRunning={isEngineRunning}
        />
        <ExhaustSmoke
          position={[1.2, 3.6, -0.8]}
          throttle={throttle.current}
          isRunning={isEngineRunning}
        />

        {/* Side mirrors */}
        {[-1.6, 1.6].map((x, i) => (
          <group key={i} position={[x, 2.2, 1]}>
            <mesh>
              <boxGeometry args={[0.1, 0.4, 0.3]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
            <mesh position={[x > 0 ? 0.15 : -0.15, 0, 0]}>
              <boxGeometry args={[0.05, 0.3, 0.25]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))}

        {/* Headlights */}
        {[-0.9, 0.9].map((x, i) => (
          <mesh key={i} position={[x, 1.4, 2.1]}>
            <circleGeometry args={[0.2, 16]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.5} />
          </mesh>
        ))}

        {/* Turn signals (front) */}
        <mesh position={[-1.3, 1.2, 2.1]}>
          <circleGeometry args={[0.1, 12]} />
          <meshStandardMaterial
            ref={leftSignalRef}
            color="#f97316"
            emissive="#f97316"
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh position={[1.3, 1.2, 2.1]}>
          <circleGeometry args={[0.1, 12]} />
          <meshStandardMaterial
            ref={rightSignalRef}
            color="#f97316"
            emissive="#f97316"
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* Grille */}
        <mesh position={[0, 1.2, 2.11]}>
          <planeGeometry args={[1.8, 0.8]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Front bumper */}
        <mesh position={[0, 0.5, 2]} castShadow>
          <boxGeometry args={[2.8, 0.4, 0.3]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Front license plate */}
        <LicensePlate position={[0, 0.5, 2.16]} plateNumber={plateNumber} />

        {/* Headlight beams */}
        <HeadlightBeam position={[-0.9, 1.4, 2.1]} rotation={[-0.1, 0, 0]} isOn={isEngineRunning} />
        <HeadlightBeam position={[0.9, 1.4, 2.1]} rotation={[-0.1, 0, 0]} isOn={isEngineRunning} />

        {/* Fuel and DEF tanks */}
        <FuelTank position={[-1.6, 0.8, -0.3]} side="left" />
        <FuelTank position={[1.6, 0.8, -0.3]} side="right" />
        <DEFTank position={[-1.6, 0.5, 0.5]} side="left" />
        <DEFTank position={[1.6, 0.5, 0.5]} side="right" />

        {/* CB Antenna and Sun Visor */}
        <CBAntennaComponent position={[1, 4, -0.2]} />
        <SunVisor position={[0, 3.3, 1.4]} color={color} />
      </group>

      {/* Fifth wheel coupling */}
      <FifthWheelCoupling position={[0, 1.1, 0]} />

      {/* === TRAILER === */}
      <group ref={trailerRef} position={[0, 0, -5]}>
        {/* Main trailer body */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[3.2, 3.8, 11]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.4} />
        </mesh>

        {/* Trailer roof ribs */}
        {[-4, -2, 0, 2, 4].map((z, i) => (
          <mesh key={i} position={[0, 4.45, z]}>
            <boxGeometry args={[3.3, 0.1, 0.3]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.3} />
          </mesh>
        ))}

        {/* Trailer undercarriage */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[2.8, 0.4, 10]} />
          <meshStandardMaterial color="#1f2937" roughness={0.8} />
        </mesh>

        {/* Air tanks, glad hands, lights */}
        <AirTank position={[-0.8, 0.25, 2]} />
        <AirTank position={[0.8, 0.25, 2]} />
        <AirTank position={[-0.8, 0.25, 0]} />
        <AirTank position={[0.8, 0.25, 0]} />
        <GladHands position={[0, 1.2, 5.3]} />
        <DOTMarkerLights side="left" />
        <DOTMarkerLights side="right" />
        <ICCReflectiveTape side="left" />
        <ICCReflectiveTape side="right" />

        {/* Hazmat placards */}
        <HazmatPlacard position={[0, 3.5, 5.51]} rotation={[0, 0, 0]} type="non-hazardous" />
        <HazmatPlacard position={[0, 3.5, -5.51]} rotation={[0, Math.PI, 0]} type="non-hazardous" />
        <HazmatPlacard
          position={[-1.61, 3.5, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          type="non-hazardous"
        />
        <HazmatPlacard
          position={[1.61, 3.5, 0]}
          rotation={[0, Math.PI / 2, 0]}
          type="non-hazardous"
        />

        {/* Sliding tandem axles and landing gear */}
        <SlidingTandemAxles position={[0, 0, -3.25]} />
        <LandingGear position={[0, 0, 4.5]} />

        {/* Mud flaps */}
        <MudflapWithLogo position={[-1.7, 0.35, -4.8]} company={company} />
        <MudflapWithLogo position={[1.7, 0.35, -4.8]} company={company} />

        {/* Company logos */}
        {company === 'GRAIN CO' ? (
          <>
            <GrainCoLogo side="right" />
            <GrainCoLogo side="left" />
          </>
        ) : (
          <>
            <FlourExpressLogo side="right" />
            <FlourExpressLogo side="left" />
          </>
        )}

        {/* Animated trailer doors */}
        <group position={[-1.55, 2.2, -5.5]}>
          <mesh ref={leftDoorRef} position={[0.75, 0, 0]}>
            <boxGeometry args={[1.5, 3.4, 0.1]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
        <group position={[1.55, 2.2, -5.5]}>
          <mesh ref={rightDoorRef} position={[-0.75, 0, 0]}>
            <boxGeometry args={[1.5, 3.4, 0.1]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>

        {/* Door hinges */}
        {[-1.6, 1.6].map((x, i) => (
          <group key={i}>
            <mesh position={[x, 1.5, -5.5]}>
              <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
              <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[x, 3, -5.5]}>
              <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
              <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        ))}

        {/* Rear lights */}
        <mesh position={[-1.4, 1.8, -5.56]}>
          <boxGeometry args={[0.4, 0.6, 0.05]} />
          <meshStandardMaterial
            ref={brakeLightLeftRef}
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.2}
          />
        </mesh>
        <mesh position={[1.4, 1.8, -5.56]}>
          <boxGeometry args={[0.4, 0.6, 0.05]} />
          <meshStandardMaterial
            ref={brakeLightRightRef}
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.2}
          />
        </mesh>
        <mesh position={[-1.4, 1.1, -5.56]}>
          <boxGeometry args={[0.3, 0.3, 0.05]} />
          <meshStandardMaterial
            ref={reverseLightLeftRef}
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0}
          />
        </mesh>
        <mesh position={[1.4, 1.1, -5.56]}>
          <boxGeometry args={[0.3, 0.3, 0.05]} />
          <meshStandardMaterial
            ref={reverseLightRightRef}
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0}
          />
        </mesh>

        {/* Reflectors and bumper */}
        <mesh position={[0, 0.8, -5.56]}>
          <boxGeometry args={[2, 0.15, 0.05]} />
          <meshStandardMaterial color="#ef4444" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.4, -5.4]} castShadow>
          <boxGeometry args={[3, 0.3, 0.15]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>

        {/* Rear license plate */}
        <LicensePlate
          position={[0, 0.6, -5.58]}
          rotation={[0, Math.PI, 0]}
          plateNumber={plateNumber}
        />

        {/* Rear wheels (dual) */}
        <group ref={rearWheelsRef}>
          {[-1.3, -1.55, 1.3, 1.55].map((x, i) => (
            <group key={i}>
              <mesh position={[x, 0.55, -2.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.55, 0.55, 0.3, 24]} />
                <meshStandardMaterial color="#1f2937" roughness={0.7} />
              </mesh>
              <mesh position={[x, 0.55, -4]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.55, 0.55, 0.3, 24]} />
                <meshStandardMaterial color="#1f2937" roughness={0.7} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* Front wheels */}
      <mesh
        ref={frontLeftWheelRef}
        position={[-1.4, 0.55, 2.5]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.55, 0.55, 0.35, 24]} />
        <meshStandardMaterial color="#1f2937" roughness={0.7} />
      </mesh>
      <mesh
        ref={frontRightWheelRef}
        position={[1.4, 0.55, 2.5]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.55, 0.55, 0.35, 24]} />
        <meshStandardMaterial color="#1f2937" roughness={0.7} />
      </mesh>

      {/* Wheel hubs */}
      {[
        [-1.4, 2.5],
        [1.4, 2.5],
      ].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x > 0 ? x + 0.18 : x - 0.18, 0.55, z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.05, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
};
