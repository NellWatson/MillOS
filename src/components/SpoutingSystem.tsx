import React, { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MachineData, MachineType } from '../types';
import { audioManager } from '../utils/audioManager';

export const SpoutingSystem: React.FC<{ machines: MachineData[] }> = ({ machines }) => {
  // Calculate spouting sound positions (midpoints of key pipe connections)
  const spoutPositions = useMemo(() => {
    const positions: { id: string; x: number; y: number; z: number }[] = [];
    const silos = machines.filter(m => m.type === MachineType.SILO);
    const mills = machines.filter(m => m.type === MachineType.ROLLER_MILL);
    const sifters = machines.filter(m => m.type === MachineType.PLANSIFTER);

    // Add sound positions at key pipe junctions
    mills.forEach((mill, i) => {
      const silo = silos[i % silos.length];
      if (silo) {
        positions.push({
          id: `spout-silo-mill-${i}`,
          x: (silo.position[0] + mill.position[0]) / 2,
          y: 8,
          z: (silo.position[2] + mill.position[2]) / 2
        });
      }
    });

    sifters.forEach((sifter, i) => {
      positions.push({
        id: `spout-sifter-${i}`,
        x: sifter.position[0],
        y: sifter.position[1],
        z: sifter.position[2]
      });
    });

    return positions;
  }, [machines]);

  // Start spouting sounds on mount
  useEffect(() => {
    spoutPositions.forEach(pos => {
      audioManager.startSpoutingSound(pos.id, pos.x, pos.y, pos.z);
    });

    return () => {
      spoutPositions.forEach(pos => {
        audioManager.stopSpoutingSound(pos.id);
      });
    };
  }, [spoutPositions]);

  // Update spatial audio volumes each frame
  useFrame(() => {
    spoutPositions.forEach(pos => {
      audioManager.updateSpoutingSpatialVolume(pos.id);
    });
  });

  const pipes = useMemo(() => {
    const _pipes: React.ReactNode[] = [];
    const tubeRadius = 0.18;

    const silos = machines.filter(m => m.type === MachineType.SILO);
    const mills = machines.filter(m => m.type === MachineType.ROLLER_MILL);
    const sifters = machines.filter(m => m.type === MachineType.PLANSIFTER);
    const packers = machines.filter(m => m.type === MachineType.PACKER);

    const createConnection = (start: THREE.Vector3, end: THREE.Vector3, key: string, color: string = '#94a3b8') => {
      const mid1 = start.clone().lerp(end, 0.25);
      mid1.y = Math.max(start.y, end.y) + 5;
      const mid2 = start.clone().lerp(end, 0.75);
      mid2.y = Math.max(start.y, end.y) + 5;

      const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
      const geometry = new THREE.TubeGeometry(curve, 32, tubeRadius, 12, false);
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.85,
        roughness: 0.15
      });

      return <mesh key={key} geometry={geometry} material={material} castShadow />;
    };

    // Silos to Mills (grain flow)
    mills.forEach((mill, i) => {
      const silo = silos[i % silos.length];
      if (!silo) return;
      const start = new THREE.Vector3(silo.position[0], 3, silo.position[2]);
      const end = new THREE.Vector3(mill.position[0], mill.position[1] + mill.size[1] + 1.5, mill.position[2]);
      _pipes.push(createConnection(start, end, `pipe-s-m-${i}`, '#64748b'));
    });

    // Mills to Sifters (pneumatic lift)
    mills.forEach((mill, i) => {
      const sifter = sifters[i % sifters.length];
      if (!sifter) return;
      const start = new THREE.Vector3(mill.position[0], mill.position[1] + mill.size[1], mill.position[2]);
      const end = new THREE.Vector3(
        sifter.position[0] + (Math.random() - 0.5) * 3,
        sifter.position[1] + sifter.size[1] / 2,
        sifter.position[2]
      );
      _pipes.push(createConnection(start, end, `pipe-m-s-${i}`, '#cbd5e1'));
    });

    // Sifters to Packers
    packers.forEach((packer, i) => {
      const sifter = sifters[i % sifters.length];
      if (!sifter) return;
      const start = new THREE.Vector3(sifter.position[0], sifter.position[1] - 2, sifter.position[2]);
      const end = new THREE.Vector3(packer.position[0], packer.position[1] + packer.size[1] + 1, packer.position[2]);
      _pipes.push(createConnection(start, end, `pipe-s-p-${i}`, '#e2e8f0'));
    });

    return _pipes;
  }, [machines]);

  return (
    <group>
      {pipes}
      {/* Pipe supports */}
      <PipeSupports />
    </group>
  );
};

const PipeSupports: React.FC = () => {
  const supports = useMemo(() => {
    const positions: [number, number, number][] = [
      [-15, 10, -12],
      [0, 10, -12],
      [15, 10, -12],
      [-10, 12, 0],
      [10, 12, 0],
      [-8, 10, 10],
      [8, 10, 10],
    ];

    return positions.map((pos, i) => (
      <group key={i} position={pos}>
        {/* Vertical support */}
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, pos[1] * 2]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Cross beam */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    ));
  }, []);

  return <group>{supports}</group>;
};
