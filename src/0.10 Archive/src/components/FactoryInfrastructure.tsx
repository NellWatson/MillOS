import React, { useMemo, useRef } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useMillStore } from '../store';

interface Props {
  floorSize: number;
  showZones: boolean;
}

// Generate procedural concrete texture for floor
const useConcreteTexture = () => {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base concrete color
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);

    // Add noise for concrete texture
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    // Add subtle cracks
    ctx.strokeStyle = 'rgba(20, 30, 40, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(
          ctx.canvas.width * Math.random(),
          ctx.canvas.height * Math.random()
        );
      }
      ctx.stroke();
    }

    // Add oil stains
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 10 + Math.random() * 30;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(40, 50, 60, 0.15)');
      gradient.addColorStop(1, 'rgba(40, 50, 60, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);

    return texture;
  }, []);
};

// Generate bump map for concrete surface detail
const useConcreteBumpMap = () => {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base gray
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Add noise for surface roughness
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 60;
      const value = Math.max(0, Math.min(255, 128 + noise));
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);

    return texture;
  }, []);
};

// Generate hazard stripe texture for safety walkways
const useHazardStripeTexture = (type: 'walkway' | 'danger') => {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    const stripeWidth = 32;
    const stripeColor = type === 'danger' ? '#dc2626' : '#eab308';
    const darkColor = '#1e293b';

    // Draw diagonal hazard stripes along edges
    ctx.save();

    // Top edge stripes
    ctx.beginPath();
    ctx.rect(0, 0, size, stripeWidth * 1.5);
    ctx.clip();

    for (let i = -size; i < size * 2; i += stripeWidth * 2) {
      ctx.fillStyle = stripeColor;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + stripeWidth, 0);
      ctx.lineTo(i + stripeWidth + stripeWidth * 1.5, stripeWidth * 1.5);
      ctx.lineTo(i + stripeWidth * 1.5, stripeWidth * 1.5);
      ctx.fill();

      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(i + stripeWidth, 0);
      ctx.lineTo(i + stripeWidth * 2, 0);
      ctx.lineTo(i + stripeWidth * 2 + stripeWidth * 1.5, stripeWidth * 1.5);
      ctx.lineTo(i + stripeWidth + stripeWidth * 1.5, stripeWidth * 1.5);
      ctx.fill();
    }
    ctx.restore();

    // Bottom edge stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, size - stripeWidth * 1.5, size, stripeWidth * 1.5);
    ctx.clip();

    for (let i = -size; i < size * 2; i += stripeWidth * 2) {
      ctx.fillStyle = stripeColor;
      ctx.beginPath();
      ctx.moveTo(i, size);
      ctx.lineTo(i + stripeWidth, size);
      ctx.lineTo(i + stripeWidth - stripeWidth * 1.5, size - stripeWidth * 1.5);
      ctx.lineTo(i - stripeWidth * 1.5, size - stripeWidth * 1.5);
      ctx.fill();

      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(i + stripeWidth, size);
      ctx.lineTo(i + stripeWidth * 2, size);
      ctx.lineTo(i + stripeWidth * 2 - stripeWidth * 1.5, size - stripeWidth * 1.5);
      ctx.lineTo(i + stripeWidth - stripeWidth * 1.5, size - stripeWidth * 1.5);
      ctx.fill();
    }
    ctx.restore();

    // Center dashed line for walkways
    if (type === 'walkway') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
  }, [type]);
};

// Safety zone component with proper industrial markings
const SafetyZone: React.FC<{
  position: [number, number, number];
  size: [number, number];
  type: 'walkway' | 'danger';
  rotation?: number;
}> = ({ position, size, type, rotation = 0 }) => {
  const texture = useHazardStripeTexture(type);

  // Calculate texture repeat based on size for consistent stripe width
  const repeatX = size[0] / 4;
  const repeatY = size[1] / 4;

  const clonedTexture = useMemo(() => {
    const t = texture.clone();
    t.repeat.set(repeatX, repeatY);
    t.needsUpdate = true;
    return t;
  }, [texture, repeatX, repeatY]);

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, rotation]}>
      {/* Hazard stripe border */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={size} />
        <meshBasicMaterial
          map={clonedTexture}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle inner fill */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[size[0] - 0.6, size[1] - 0.6]} />
        <meshBasicMaterial
          color={type === 'danger' ? '#7f1d1d' : '#422006'}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Floor puddle with reflective surface
const FloorPuddle: React.FC<{ position: [number, number, number]; size: [number, number]; seed: number }> = ({
  position,
  size,
  seed
}) => {
  const random = (s: number) => Math.abs(Math.sin(s * 12.9898 + 78.233) * 43758.5453) % 1;

  // Generate irregular puddle shape points
  const shape = useMemo(() => {
    const points: [number, number][] = [];
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const radiusVariation = 0.7 + random(seed + i) * 0.6;
      const r = (size[0] / 2) * radiusVariation;
      points.push([Math.cos(angle) * r, Math.sin(angle) * r * (size[1] / size[0])]);
    }
    return points;
  }, [size, seed]);

  const shapeGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(shape[0][0], shape[0][1]);
    for (let i = 1; i < shape.length; i++) {
      const prev = shape[i - 1];
      const curr = shape[i];
      const next = shape[(i + 1) % shape.length];
      const cpX = curr[0];
      const cpY = curr[1];
      s.quadraticCurveTo(cpX, cpY, (curr[0] + next[0]) / 2, (curr[1] + next[1]) / 2);
    }
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [shape]);

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, random(seed) * Math.PI * 2]}>
      {/* Wet floor darkening */}
      <mesh position={[0, 0, -0.001]} geometry={shapeGeometry}>
        <meshBasicMaterial color="#0f172a" transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* Reflective water surface */}
      <mesh position={[0, 0, 0.001]} geometry={shapeGeometry}>
        <meshStandardMaterial
          color="#1e3a5f"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.6}
          envMapIntensity={2}
        />
      </mesh>

      {/* Subtle ripple highlight */}
      <mesh position={[0, 0, 0.002]} geometry={shapeGeometry}>
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Cable tray running along walls/ceiling
const CableTray: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  width?: number;
}> = ({ start, end, width = 0.4 }) => {
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );

  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ];

  // Calculate rotation to point from start to end
  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  ).normalize();

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    return q;
  }, [direction]);

  return (
    <group position={midpoint} quaternion={quaternion}>
      {/* Tray bottom */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[width, 0.02, length]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Tray sides */}
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[0.02, 0.12, length]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[0.02, 0.12, length]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Cables inside (colored bundles) */}
      {[-0.12, 0, 0.12].map((offset, i) => (
        <mesh key={i} position={[offset, -0.02, 0]}>
          <cylinderGeometry args={[0.04, 0.04, length, 8]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial
            color={['#3b82f6', '#1e293b', '#f97316'][i]}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

// Conduit pipe running along surfaces
const ConduitPipe: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  radius?: number;
  color?: string;
}> = ({ start, end, radius = 0.05, color = '#64748b' }) => {
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );

  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ];

  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  ).normalize();

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return q;
  }, [direction]);

  return (
    <group position={midpoint} quaternion={quaternion}>
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 12]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
};

// Worn footpath texture overlay
const WornFootpath: React.FC<{
  path: Array<[number, number, number]>;
  width?: number;
}> = ({ path, width = 2 }) => {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent base
    ctx.clearRect(0, 0, size, size);

    // Worn/scuffed pattern
    ctx.fillStyle = 'rgba(50, 60, 70, 0.3)';

    // Random scuff marks
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 5 + Math.random() * 15;
      const h = 2 + Math.random() * 5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    // Footprint-like darker areas
    ctx.fillStyle = 'rgba(30, 40, 50, 0.2)';
    for (let i = 0; i < 15; i++) {
      const x = size / 4 + Math.random() * size / 2;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 12, Math.random() * 0.3 - 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  // Create path segments
  const segments = useMemo(() => {
    const segs: Array<{
      position: [number, number, number];
      rotation: number;
      length: number;
    }> = [];

    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const length = Math.sqrt(dx * dx + dz * dz);
      const rotation = Math.atan2(dx, dz);

      segs.push({
        position: [(start[0] + end[0]) / 2, 0.015, (start[2] + end[2]) / 2],
        rotation,
        length
      });
    }

    return segs;
  }, [path]);

  const clonedTexture = useMemo(() => {
    const t = texture.clone();
    t.repeat.set(1, 4);
    t.needsUpdate = true;
    return t;
  }, [texture]);

  return (
    <group>
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={seg.position}
          rotation={[-Math.PI / 2, 0, seg.rotation]}
        >
          <planeGeometry args={[width, seg.length]} />
          <meshBasicMaterial
            map={clonedTexture}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// Volumetric fog layer for atmospheric depth
const VolumetricFog: React.FC<{ density?: number }> = ({ density = 0.015 }) => {
  const fogRef = useRef<THREE.Mesh>(null);
  const gameTime = useMillStore((state) => state.gameTime);

  // Fog is denser in early morning and evening
  const timeBasedDensity = useMemo(() => {
    if (gameTime >= 5 && gameTime < 8) return density * 1.5; // Morning mist
    if (gameTime >= 18 && gameTime < 21) return density * 1.3; // Evening haze
    if (gameTime >= 21 || gameTime < 5) return density * 0.8; // Night
    return density;
  }, [gameTime, density]);

  return (
    <group>
      {/* Lower fog layer - denser near floor */}
      <mesh position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 90]} />
        <meshBasicMaterial
          color="#94a3b8"
          transparent
          opacity={timeBasedDensity * 2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Mid-level fog patches */}
      {[[-20, 8, -10], [15, 10, 5], [-10, 12, 15], [25, 7, -15]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[8 + i * 2, 16, 16]} />
          <meshBasicMaterial
            color="#cbd5e1"
            transparent
            opacity={timeBasedDensity * 0.8}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
      ))}

      {/* Light shaft interaction fog volumes */}
      {[-20, 0, 20].map((x, i) => (
        <mesh key={i} position={[x, 15, 0]}>
          <cylinderGeometry args={[4, 6, 20, 16, 1, true]} />
          <meshBasicMaterial
            color="#fef3c7"
            transparent
            opacity={timeBasedDensity * 0.5}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// Stacked pallets with optional crates
const PalletStack: React.FC<{
  position: [number, number, number];
  layers?: number;
  hasCrates?: boolean;
  rotation?: number;
}> = ({ position, layers = 1, hasCrates = false, rotation = 0 }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Wooden pallet(s) */}
      {Array.from({ length: layers }).map((_, layer) => (
        <group key={layer} position={[0, layer * 0.15, 0]}>
          {/* Pallet top boards */}
          {[-0.4, 0, 0.4].map((z, i) => (
            <mesh key={`top-${i}`} position={[0, 0.12, z]} castShadow>
              <boxGeometry args={[1.2, 0.025, 0.2]} />
              <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
            </mesh>
          ))}
          {/* Pallet stringers */}
          {[-0.5, 0, 0.5].map((x, i) => (
            <mesh key={`stringer-${i}`} position={[x, 0.05, 0]} castShadow>
              <boxGeometry args={[0.1, 0.1, 1]} />
              <meshStandardMaterial color="#6b4423" roughness={0.9} />
            </mesh>
          ))}
          {/* Pallet bottom boards */}
          {[-0.35, 0.35].map((z, i) => (
            <mesh key={`bottom-${i}`} position={[0, 0, z]} castShadow>
              <boxGeometry args={[1.2, 0.02, 0.15]} />
              <meshStandardMaterial color="#7a4c2a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Crates on top */}
      {hasCrates && (
        <group position={[0, layers * 0.15 + 0.3, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.5, 0.6]} />
            <meshStandardMaterial color="#d4a574" roughness={0.8} />
          </mesh>
          {/* Crate slats */}
          {[-0.2, 0.2].map((z, i) => (
            <mesh key={i} position={[0, 0, z]} castShadow>
              <boxGeometry args={[0.82, 0.52, 0.02]} />
              <meshStandardMaterial color="#b8956e" roughness={0.85} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

// Sack stack (grain bags)
const SackStack: React.FC<{
  position: [number, number, number];
  count?: number;
  rotation?: number;
}> = ({ position, count = 3, rotation = 0 }) => {
  const sackPositions = useMemo(() => {
    const positions: Array<[number, number, number, number]> = [];
    let y = 0.15;
    let remaining = count;
    let rowSize = Math.min(3, remaining);

    while (remaining > 0) {
      for (let i = 0; i < rowSize && remaining > 0; i++) {
        const x = (i - (rowSize - 1) / 2) * 0.45;
        const rz = (Math.random() - 0.5) * 0.1;
        positions.push([x, y, 0, rz]);
        remaining--;
      }
      y += 0.25;
      rowSize = Math.max(1, rowSize - 1);
    }
    return positions;
  }, [count]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {sackPositions.map(([x, y, z, rz], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, rz]} castShadow>
          <boxGeometry args={[0.4, 0.25, 0.3]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// Warning signage component
const WarningSign: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  type: 'forklift' | 'hardhat' | 'danger' | 'exit' | 'electrical';
}> = ({ position, rotation = [0, 0, 0], type }) => {
  const colors = {
    forklift: { bg: '#fbbf24', text: '#1e293b' },
    hardhat: { bg: '#fbbf24', text: '#1e293b' },
    danger: { bg: '#ef4444', text: '#ffffff' },
    exit: { bg: '#22c55e', text: '#ffffff' },
    electrical: { bg: '#fbbf24', text: '#1e293b' },
  };

  const { bg, text } = colors[type];

  return (
    <group position={position} rotation={rotation}>
      {/* Sign backing */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.6, 0.02]} />
        <meshStandardMaterial color={bg} />
      </mesh>
      {/* Sign border */}
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.72, 0.52]} />
        <meshBasicMaterial color={text} />
      </mesh>
      {/* Inner area */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[0.68, 0.48]} />
        <meshBasicMaterial color={bg} />
      </mesh>
      {/* Symbol area (simplified) */}
      {type === 'forklift' && (
        <mesh position={[0, 0, 0.015]}>
          <planeGeometry args={[0.3, 0.2]} />
          <meshBasicMaterial color={text} />
        </mesh>
      )}
      {type === 'danger' && (
        <mesh position={[0, 0.05, 0.015]} rotation={[0, 0, Math.PI]}>
          <circleGeometry args={[0.15, 3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {type === 'exit' && (
        <mesh position={[0.15, 0, 0.015]}>
          <boxGeometry args={[0.15, 0.25, 0.001]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {/* Post */}
      <mesh position={[0, -0.8, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.3, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
};

// Wall-mounted sign
const WallSign: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  text: string;
  color?: string;
}> = ({ position, rotation = [0, 0, 0], text, color = '#3b82f6' }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[1.2, 0.4, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Text area (simplified as lighter rectangle) */}
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[1.1, 0.3]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
};

// Ventilation duct system
const VentilationDuct: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  size?: [number, number];
}> = ({ start, end, size = [1.2, 0.8] }) => {
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );

  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ];

  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  ).normalize();

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    return q;
  }, [direction]);

  return (
    <group position={midpoint} quaternion={quaternion}>
      {/* Main duct body */}
      <mesh castShadow>
        <boxGeometry args={[size[0], size[1], length]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Seam lines */}
      {Array.from({ length: Math.floor(length / 3) }).map((_, i) => (
        <mesh key={i} position={[0, size[1] / 2 + 0.01, -length / 2 + (i + 1) * 3]}>
          <boxGeometry args={[size[0] + 0.02, 0.02, 0.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// Vent grille
const VentGrille: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
}> = ({ position, rotation = [0, 0, 0], size = [0.6, 0.4] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[size[0] + 0.1, size[1] + 0.1, 0.05]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Slats */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -size[1] / 2 + 0.05 + i * (size[1] / 6), 0.03]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[size[0] - 0.05, 0.02, 0.04]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

// Break Room component - a small covered rest area for workers
const BreakRoom: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Floor/platform */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 5]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.15} />
      </mesh>

      {/* Shelter roof */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.15, 5]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Support pillars */}
      {[[-2.7, 0, -2.2], [-2.7, 0, 2.2], [2.7, 0, -2.2], [2.7, 0, 2.2]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 1.5, pos[2]]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Bench */}
      <group position={[0, 0, 1.5]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[4, 0.08, 0.5]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {[[-1.5, 0, 0], [1.5, 0, 0]].map((pos, i) => (
          <mesh key={i} position={[pos[0], 0.2, pos[2]]} castShadow>
            <boxGeometry args={[0.1, 0.4, 0.4]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Table */}
      <group position={[0, 0, -0.5]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[2.5, 0.06, 1.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        {[[-1, 0, -0.4], [-1, 0, 0.4], [1, 0, -0.4], [1, 0, 0.4]].map((pos, i) => (
          <mesh key={i} position={[pos[0], 0.35, pos[2]]} castShadow>
            <boxGeometry args={[0.08, 0.7, 0.08]} />
            <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Vending machine (simplified) */}
      <group position={[2.2, 0, -1.5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[0.8, 2, 0.6]} />
          <meshStandardMaterial color="#1e40af" roughness={0.4} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 1.2, 0.31]}>
          <planeGeometry args={[0.5, 0.4]} />
          <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.5} />
        </mesh>
        {/* Buttons */}
        {[0.6, 0.7, 0.8].map((y, i) => (
          <mesh key={i} position={[0, y, 0.31]}>
            <circleGeometry args={[0.03, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>

      {/* Break room sign */}
      <group position={[0, 2.8, -2.3]}>
        <mesh>
          <boxGeometry args={[1.5, 0.4, 0.05]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      </group>

      {/* Wall clock */}
      <WallClock position={[-2.5, 2.2, -2.35]} />

      {/* Safety bulletin board with "Days Since Incident" */}
      <BulletinBoard position={[2.5, 1.8, -2.35]} />

      {/* Ambient light for break room */}
      <pointLight
        position={[0, 2.5, 0]}
        color="#fef3c7"
        intensity={0.5}
        distance={8}
      />
    </group>
  );
};

// Wall clock that syncs with game time
const WallClock: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const gameTime = useMillStore((state) => state.gameTime);
  const hourAngle = (gameTime / 12) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = ((gameTime % 1) * 60 / 60) * Math.PI * 2 - Math.PI / 2;

  return (
    <group position={position}>
      {/* Clock face */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 0.05, 32]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      {/* Clock rim */}
      <mesh position={[0, 0, 0.03]}>
        <torusGeometry args={[0.35, 0.03, 8, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(angle) * 0.28, Math.cos(angle) * 0.28, 0.03]}>
            <boxGeometry args={[0.02, i % 3 === 0 ? 0.06 : 0.03, 0.01]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        );
      })}
      {/* Hour hand */}
      <mesh position={[Math.cos(hourAngle) * 0.1, Math.sin(hourAngle) * 0.1, 0.04]} rotation={[0, 0, -hourAngle]}>
        <boxGeometry args={[0.2, 0.025, 0.01]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Minute hand */}
      <mesh position={[Math.cos(minuteAngle) * 0.12, Math.sin(minuteAngle) * 0.12, 0.05]} rotation={[0, 0, -minuteAngle]}>
        <boxGeometry args={[0.25, 0.015, 0.01]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Center cap */}
      <mesh position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>
    </group>
  );
};

// Safety bulletin board with days since incident counter
const BulletinBoard: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const daysSinceIncident = useMillStore((state) => state.safetyMetrics.daysSinceIncident);

  return (
    <group position={position}>
      {/* Board frame */}
      <mesh>
        <boxGeometry args={[1.2, 1, 0.08]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      {/* Cork board surface */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.1, 0.9]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </mesh>
      {/* "SAFETY FIRST" header */}
      <mesh position={[0, 0.35, 0.05]}>
        <planeGeometry args={[0.9, 0.15]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      {/* Days counter display */}
      <group position={[0, 0, 0.05]}>
        {/* Counter background */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.8, 0.35]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Number display (simplified as glowing segments) */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.6, 0.25]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={daysSinceIncident > 100 ? 1 : 0.5}
          />
        </mesh>
      </group>
      {/* "Days Without Incident" label */}
      <mesh position={[0, -0.28, 0.05]}>
        <planeGeometry args={[0.9, 0.12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* Push pins */}
      {[[-0.48, 0.38], [0.48, 0.38], [-0.48, -0.38], [0.48, -0.38]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.06]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color={['#ef4444', '#eab308', '#22c55e', '#3b82f6'][i]} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

export const FactoryInfrastructure: React.FC<Props> = ({ floorSize, showZones }) => {
  const concreteTexture = useConcreteTexture();
  const bumpMap = useConcreteBumpMap();
  const graphics = useMillStore((state) => state.graphics);
  const graphicsQuality = graphics.quality;
  const isLowGraphics = graphicsQuality === 'low';

  // Feature flags from graphics settings
  const showPuddles = graphics.enableFloorPuddles;
  const showWornPaths = graphics.enableWornPaths;
  const showCables = graphics.enableCableConduits;
  const showVolumetricFog = graphics.enableVolumetricFog;
  const showWarehouseClutter = graphics.enableWarehouseClutter;
  const showSignage = graphics.enableSignage;
  const showVentilationDucts = graphics.enableVentilationDucts;

  return (
    <group>
      {/* Main floor - standard material on low/medium, reflector only on high/ultra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={graphicsQuality === 'high' || graphicsQuality === 'ultra'}>
        <planeGeometry args={[floorSize, floorSize]} />
        {isLowGraphics ? (
          <meshBasicMaterial color="#1e293b" />
        ) : graphicsQuality === 'medium' ? (
          <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.15} />
        ) : (
          <MeshReflectorMaterial
            blur={[100, 50]}
            resolution={1024}
            mixBlur={0.5}
            mixStrength={4}
            roughness={0.85}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#1e293b"
            metalness={0.15}
            mirror={0}
          />
        )}
      </mesh>

      {/* Floor grid lines - skip on low, raised to prevent z-fighting */}
      {!isLowGraphics && Array.from({ length: 15 }).map((_, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-35 + i * 5, 0.03, 0]}>
            <planeGeometry args={[0.05, floorSize]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -35 + i * 5]}>
            <planeGeometry args={[floorSize, 0.05]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* Safety walkways with industrial hazard stripe markings */}
      {showZones && (
        <>
          {/* Main aisles (vertical) */}
          <SafetyZone
            position={[-10, 0.02, 0]}
            size={[3, floorSize - 10]}
            type="walkway"
          />
          <SafetyZone
            position={[10, 0.02, 0]}
            size={[3, floorSize - 10]}
            type="walkway"
          />

          {/* Cross aisles (horizontal) */}
          <SafetyZone
            position={[0, 0.02, 10]}
            size={[floorSize - 20, 2.5]}
            type="walkway"
            rotation={Math.PI / 2}
          />
          <SafetyZone
            position={[0, 0.02, -10]}
            size={[floorSize - 20, 2.5]}
            type="walkway"
            rotation={Math.PI / 2}
          />

          {/* Danger zones around machinery */}
          <SafetyZone
            position={[0, 0.02, -20]}
            size={[50, 8]}
            type="danger"
            rotation={Math.PI / 2}
          />
        </>
      )}

      {/* Catwalks at elevated level - skip on low graphics */}
      {!isLowGraphics && (
        <group position={[0, 6, 0]}>
          {/* Main catwalk */}
          <mesh receiveShadow castShadow>
            <boxGeometry args={[50, 0.15, 3]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} transparent opacity={0.95} />
          </mesh>
          {/* Railings */}
          <mesh position={[0, 0.6, 1.4]} castShadow>
            <boxGeometry args={[50, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.6, -1.4]} castShadow>
            <boxGeometry args={[50, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.3, 1.4]} castShadow>
            <boxGeometry args={[50, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.3, -1.4]} castShadow>
            <boxGeometry args={[50, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Vertical posts */}
          {Array.from({ length: 20 }).map((_, i) => (
            <group key={i}>
              <mesh position={[-24 + i * 2.5, 0.3, 1.4]} castShadow>
                <boxGeometry args={[0.05, 0.6, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[-24 + i * 2.5, 0.3, -1.4]} castShadow>
                <boxGeometry args={[0.05, 0.6, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* Grating texture (simplified) */}
          <mesh position={[0, 0.08, 0]}>
            <planeGeometry args={[50, 3]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* Catwalk supports - skip on low graphics */}
      {!isLowGraphics && [-20, -10, 0, 10, 20].map((x, i) => (
        <mesh key={i} position={[x, 3, 0]} castShadow>
          <boxGeometry args={[0.3, 6, 0.3]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Stairs to catwalk - positioned away from forklift paths */}
      {!isLowGraphics && (
        <group position={[-45, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[0, 0.25 + i * 0.5, -i * 0.4]} castShadow>
              <boxGeometry args={[1.5, 0.1, 0.4]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}

      {/* Break Room - single one on far side of factory, away from truck paths */}
      {!isLowGraphics && (
        <group rotation={[0, Math.PI / 2, 0]}>
          <BreakRoom position={[-25, 0, -40]} />
        </group>
      )}

      {/* Locker Room - moved to back of mill, away from truck paths */}
      {!isLowGraphics && <LockerRoom position={[-40, 0, -35]} />}

      {/* Safety Stations around the factory - skip on low graphics */}
      {!isLowGraphics && (
        <>
          <SafetyStation position={[0, 0, 25]} type="first-aid" />
          <SafetyStation position={[-20, 0, -10]} type="eyewash" />
          <SafetyStation position={[20, 0, -10]} type="fire" />
          <SafetyStation position={[0, 0, -25]} type="emergency-stop" />
        </>
      )}

      {/* Floor puddles - high/ultra graphics only */}
      {showPuddles && (
        <>
          <FloorPuddle position={[-15, 0.01, 5]} size={[2.5, 1.8]} seed={1} />
          <FloorPuddle position={[18, 0.01, -15]} size={[1.8, 2.2]} seed={2} />
          <FloorPuddle position={[-8, 0.01, -18]} size={[3, 2]} seed={3} />
          <FloorPuddle position={[5, 0.01, 15]} size={[2, 1.5]} seed={4} />
          <FloorPuddle position={[-22, 0.01, 12]} size={[1.5, 1.2]} seed={5} />
          <FloorPuddle position={[25, 0.01, 8]} size={[2.2, 1.8]} seed={6} />
        </>
      )}

      {/* Worn footpaths - medium+ graphics */}
      {showWornPaths && (
        <>
          {/* Main aisle worn paths */}
          <WornFootpath
            path={[
              [-10, 0, -30],
              [-10, 0, 0],
              [-10, 0, 30]
            ]}
            width={2.5}
          />
          <WornFootpath
            path={[
              [10, 0, -30],
              [10, 0, 0],
              [10, 0, 30]
            ]}
            width={2.5}
          />
          {/* Cross aisle paths */}
          <WornFootpath
            path={[
              [-30, 0, 10],
              [0, 0, 10],
              [30, 0, 10]
            ]}
            width={1.8}
          />
          {/* Path to break rooms - routes around forklift lanes */}
          <WornFootpath
            path={[
              [10, 0, 0],
              [30, 0, 0],
              [40, 0, 0]
            ]}
            width={1.5}
          />
          <WornFootpath
            path={[
              [-10, 0, 0],
              [-30, 0, 0],
              [-40, 0, 0]
            ]}
            width={1.5}
          />
        </>
      )}

      {/* Cable trays and conduits - high/ultra graphics only */}
      {showCables && (
        <>
          {/* Ceiling cable trays running length of factory */}
          <CableTray start={[-50, 28, -5]} end={[50, 28, -5]} />
          <CableTray start={[-50, 28, 5]} end={[50, 28, 5]} />

          {/* Cross cable trays */}
          <CableTray start={[-20, 28, -30]} end={[-20, 28, 30]} />
          <CableTray start={[20, 28, -30]} end={[20, 28, 30]} />

          {/* Wall-mounted conduit pipes */}
          <ConduitPipe start={[-54, 3, -30]} end={[-54, 3, 30]} radius={0.06} color="#64748b" />
          <ConduitPipe start={[-54, 5, -30]} end={[-54, 5, 30]} radius={0.04} color="#f97316" />
          <ConduitPipe start={[54, 3, -30]} end={[54, 3, 30]} radius={0.06} color="#64748b" />
          <ConduitPipe start={[54, 5, -30]} end={[54, 5, 30]} radius={0.04} color="#3b82f6" />

          {/* Vertical conduit drops to machines */}
          <ConduitPipe start={[-20, 28, -20]} end={[-20, 12, -20]} radius={0.05} />
          <ConduitPipe start={[0, 28, -20]} end={[0, 12, -20]} radius={0.05} />
          <ConduitPipe start={[20, 28, -20]} end={[20, 12, -20]} radius={0.05} />
        </>
      )}

      {/* Volumetric fog - high/ultra graphics only */}
      {showVolumetricFog && <VolumetricFog density={0.012} />}

      {/* Warehouse clutter - pallets, crates, sacks */}
      {showWarehouseClutter && (
        <>
          {/* Pallets near loading area */}
          <PalletStack position={[35, 0, 20]} layers={2} hasCrates rotation={0.1} />
          <PalletStack position={[38, 0, 18]} layers={1} hasCrates={false} rotation={-0.05} />
          <PalletStack position={[32, 0, 22]} layers={3} hasCrates rotation={0.2} />

          {/* Pallets near packing zone */}
          <PalletStack position={[15, 0, 25]} layers={2} hasCrates={false} rotation={Math.PI / 2} />
          <PalletStack position={[-15, 0, 25]} layers={1} hasCrates rotation={Math.PI / 2 + 0.1} />

          {/* Sack stacks near silos */}
          <SackStack position={[-5, 0, -25]} count={6} rotation={0.15} />
          <SackStack position={[5, 0, -25]} count={4} rotation={-0.1} />
          <SackStack position={[0, 0, -28]} count={8} />

          {/* Scattered pallets around factory */}
          <PalletStack position={[-35, 0, 5]} layers={1} hasCrates={false} rotation={0.3} />
          <PalletStack position={[-38, 0, -8]} layers={2} hasCrates rotation={-0.15} />
          <PalletStack position={[30, 0, -5]} layers={1} hasCrates={false} rotation={Math.PI / 4} />
        </>
      )}

      {/* Warning signage */}
      {showSignage && (
        <>
          {/* Forklift warning signs near aisles */}
          <WarningSign position={[-10, 1.5, 25]} type="forklift" rotation={[0, Math.PI, 0]} />
          <WarningSign position={[10, 1.5, 25]} type="forklift" rotation={[0, Math.PI, 0]} />

          {/* Hard hat signs at entrances */}
          <WarningSign position={[30, 1.5, 35]} type="hardhat" rotation={[0, Math.PI, 0]} />
          <WarningSign position={[-30, 1.5, 35]} type="hardhat" rotation={[0, Math.PI, 0]} />

          {/* Danger signs near machinery */}
          <WarningSign position={[-25, 1.5, -18]} type="danger" />
          <WarningSign position={[25, 1.5, -18]} type="danger" />

          {/* Exit signs on walls */}
          <WallSign position={[0, 4, 39.9]} rotation={[0, Math.PI, 0]} text="EXIT" color="#22c55e" />
          <WallSign position={[-54.9, 4, 0]} rotation={[0, Math.PI / 2, 0]} text="EXIT" color="#22c55e" />

          {/* Zone signs */}
          <WallSign position={[0, 4, -39.9]} rotation={[0, 0, 0]} text="ZONE 1 - STORAGE" color="#3b82f6" />
          <WallSign position={[0, 4, -10]} rotation={[0, 0, 0]} text="ZONE 2 - MILLING" color="#f97316" />
          <WallSign position={[54.9, 4, 0]} rotation={[0, -Math.PI / 2, 0]} text="ZONE 3 - PACKING" color="#8b5cf6" />

          {/* Electrical warning */}
          <WarningSign position={[-35, 1.5, -30]} type="electrical" />
        </>
      )}

      {/* Ventilation ducts - high/ultra graphics only */}
      {showVentilationDucts && (
        <>
          {/* Main HVAC duct running along ceiling */}
          <VentilationDuct start={[-50, 26, 15]} end={[50, 26, 15]} size={[1.5, 1]} />
          <VentilationDuct start={[-50, 26, -15]} end={[50, 26, -15]} size={[1.5, 1]} />

          {/* Cross ducts */}
          <VentilationDuct start={[-30, 26, -15]} end={[-30, 26, 15]} size={[1, 0.8]} />
          <VentilationDuct start={[30, 26, -15]} end={[30, 26, 15]} size={[1, 0.8]} />

          {/* Vent grilles on walls */}
          <VentGrille position={[-54.9, 8, -20]} rotation={[0, Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[-54.9, 8, 0]} rotation={[0, Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[-54.9, 8, 20]} rotation={[0, Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[54.9, 8, -20]} rotation={[0, -Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[54.9, 8, 0]} rotation={[0, -Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[54.9, 8, 20]} rotation={[0, -Math.PI / 2, 0]} size={[0.8, 0.5]} />
        </>
      )}
    </group>
  );
};

// Locker Room component
const LockerRoom: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.5, -3]} receiveShadow>
        <boxGeometry args={[8, 3, 0.1]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Lockers - row of 6 */}
      {[-3, -1.8, -0.6, 0.6, 1.8, 3].map((x, i) => (
        <group key={i} position={[x, 0, -2.5]}>
          {/* Locker body */}
          <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[1, 2, 0.5]} />
            <meshStandardMaterial color={['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'][i]} roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Locker door handle */}
          <mesh position={[0.35, 1.2, 0.26]}>
            <boxGeometry args={[0.05, 0.15, 0.05]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          {/* Ventilation slots */}
          <mesh position={[0, 0.3, 0.26]}>
            <planeGeometry args={[0.6, 0.15]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 1.7, 0.26]}>
            <planeGeometry args={[0.6, 0.15]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}

      {/* Bench in front of lockers */}
      <group position={[0, 0, -0.5]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[6, 0.08, 0.4]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {[[-2.5, 0, 0], [2.5, 0, 0]].map((pos, i) => (
          <mesh key={i} position={[pos[0], 0.175, pos[2]]} castShadow>
            <boxGeometry args={[0.08, 0.35, 0.35]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Coat hooks on side wall */}
      <group position={[-3.9, 1.5, 0]}>
        {[0, 0.8, 1.6, 2.4].map((z, i) => (
          <mesh key={i} position={[0, 0, z - 1.2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Overhead light */}
      <pointLight position={[0, 2.5, 0]} color="#fef3c7" intensity={0.4} distance={6} />
    </group>
  );
};

// Safety Station component
const SafetyStation: React.FC<{ position: [number, number, number]; type: 'first-aid' | 'eyewash' | 'fire' | 'emergency-stop' }> = ({ position, type }) => {
  const colors = {
    'first-aid': '#22c55e',
    'eyewash': '#3b82f6',
    'fire': '#ef4444',
    'emergency-stop': '#f97316'
  };

  const color = colors[type];

  return (
    <group position={position}>
      {/* Wall mount or stand */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1.6, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Station box/cabinet */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>

      {/* Cross or symbol */}
      {type === 'first-aid' && (
        <group position={[0, 1.4, 0.13]}>
          <mesh>
            <boxGeometry args={[0.25, 0.08, 0.02]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.25, 0.02]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      )}

      {type === 'fire' && (
        <mesh position={[0, 0.5, 0.15]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.8, 12]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>
      )}

      {type === 'emergency-stop' && (
        <mesh position={[0, 1.4, 0.15]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Warning stripes on floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Glow effect */}
      <pointLight position={[0, 1.5, 0.3]} color={color} intensity={0.3} distance={3} />
    </group>
  );
};
