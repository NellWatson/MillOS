import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DockForkliftProps {
    position: [number, number, number];
    rotation: [number, number, number];
    cycleOffset?: number;
}

export const DockForklift: React.FC<DockForkliftProps> = ({
    position,
    rotation,
    cycleOffset = 0,
}) => {
    const forkliftRef = useRef<THREE.Group>(null);
    const forkRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!forkliftRef.current || !forkRef.current) return;

        const time = state.clock.elapsedTime + cycleOffset;
        // Slower cycle for background ambiance
        const loadCycle = (time * 0.2) % 1;
        let zPos: number;
        let forkHeight: number;

        // Animation cycle: Move Forward -> Lift -> Move Back -> Lower
        // Relative Z movement in local space
        if (loadCycle < 0.3) {
            // Move forward to dock (from -8 to 2)
            const t = loadCycle / 0.3;
            zPos = THREE.MathUtils.lerp(-8, 2, t);
            forkHeight = 0;
        } else if (loadCycle < 0.4) {
            // Lift forks
            const t = (loadCycle - 0.3) / 0.1;
            zPos = 2;
            forkHeight = t * 0.8;
        } else if (loadCycle < 0.7) {
            // Move back (carry)
            const t = (loadCycle - 0.4) / 0.3;
            zPos = THREE.MathUtils.lerp(2, -8, t);
            forkHeight = 0.8;
        } else if (loadCycle < 0.8) {
            // Lower forks
            const t = (loadCycle - 0.7) / 0.1;
            zPos = -8;
            forkHeight = (1 - t) * 0.8;
        } else {
            // Idle at back
            zPos = -8;
            forkHeight = 0;
        }

        forkliftRef.current.position.z = zPos;
        forkRef.current.position.y = forkHeight;
    });

    return (
        <group position={position} rotation={rotation}>
            <group ref={forkliftRef} position={[0, 0, -10]}>
                {/* Forklift body */}
                <mesh position={[0, 0.6, 0]}>
                    <boxGeometry args={[1.5, 1, 2]} />
                    <meshStandardMaterial color="#f59e0b" metalness={0.4} roughness={0.6} />
                </mesh>

                {/* Driver cage */}
                <mesh position={[0, 1.4, -0.2]}>
                    <boxGeometry args={[1.3, 1.2, 1.2]} />
                    <meshStandardMaterial color="#374151" metalness={0.3} roughness={0.7} />
                </mesh>

                {/* Cage frame */}
                {[
                    [-0.6, -0.6],
                    [-0.6, 0.6],
                    [0.6, -0.6],
                    [0.6, 0.6],
                ].map(([x, z], i) => (
                    <mesh key={i} position={[x * 0.9, 1.6, -0.2 + z * 0.4]}>
                        <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
                        <meshStandardMaterial color="#1f2937" />
                    </mesh>
                ))}

                {/* Mast */}
                <mesh position={[0, 1.2, 0.9]}>
                    <boxGeometry args={[0.15, 2, 0.15]} />
                    <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0.4, 1.2, 0.9]}>
                    <boxGeometry args={[0.15, 2, 0.15]} />
                    <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.3} />
                </mesh>

                {/* Forks */}
                <group ref={forkRef} position={[0, 0.3, 1.2]}>
                    <mesh position={[-0.3, 0, 0.4]}>
                        <boxGeometry args={[0.1, 0.08, 1.2]} />
                        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.3, 0, 0.4]}>
                        <boxGeometry args={[0.1, 0.08, 1.2]} />
                        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
                    </mesh>
                    {/* Fork backrest */}
                    <mesh position={[0, 0.4, -0.1]}>
                        <boxGeometry args={[0.9, 0.8, 0.05]} />
                        <meshStandardMaterial color="#374151" />
                    </mesh>

                    {/* Pallet with sacks (simulated load) */}
                    <group position={[0, 0.1, 0.6]}>
                        <mesh position={[0, 0, 0]}>
                            <boxGeometry args={[1, 0.1, 1]} />
                            <meshStandardMaterial color="#d4a373" />
                        </mesh>
                        <mesh position={[0, 0.3, 0]}>
                            <boxGeometry args={[0.9, 0.5, 0.9]} />
                            <meshStandardMaterial color="#e5e7eb" />
                        </mesh>
                    </group>
                </group>

                {/* Wheels */}
                {[
                    [-0.6, 0.3, 0.6],
                    [0.6, 0.3, 0.6],
                    [-0.6, 0.3, -0.6],
                    [0.6, 0.3, -0.6],
                ].map(([x, y, z], i) => (
                    <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
                        <meshStandardMaterial color="#1f2937" />
                    </mesh>
                ))}
            </group>
        </group>
    );
};
