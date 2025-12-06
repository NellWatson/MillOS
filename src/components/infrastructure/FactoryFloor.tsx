import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGraphicsStore } from '../../stores/graphicsStore';

interface FactoryFloorProps {
  floorSize: number; // Legacy: used as fallback
  floorWidth?: number; // X dimension (wider for truck bays)
  floorDepth?: number; // Z dimension
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
        ctx.lineTo(ctx.canvas.width * Math.random(), ctx.canvas.height * Math.random());
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
        <meshBasicMaterial map={clonedTexture} transparent opacity={0.85} depthWrite={false} />
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
const FloorPuddle: React.FC<{
  position: [number, number, number];
  size: [number, number];
  seed: number;
}> = ({ position, size, seed }) => {
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
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.08} depthWrite={false} />
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
      const x = size / 4 + (Math.random() * size) / 2;
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
        length,
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
        <mesh key={i} position={seg.position} rotation={[-Math.PI / 2, 0, seg.rotation]}>
          <planeGeometry args={[width, seg.length]} />
          <meshBasicMaterial map={clonedTexture} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

export const FactoryFloor: React.FC<FactoryFloorProps> = ({
  floorSize,
  floorWidth,
  floorDepth,
  showZones,
}) => {
  useConcreteTexture();
  const graphics = useGraphicsStore((state) => state.graphics);
  const graphicsQuality = graphics.quality;
  const isLowGraphics = graphicsQuality === 'low';

  // Use new dimensions if provided, otherwise fall back to legacy square
  const actualWidth = floorWidth ?? floorSize;
  const actualDepth = floorDepth ?? floorSize;

  // Feature flags from graphics settings
  const showPuddles = graphics.enableFloorPuddles;
  const showWornPaths = graphics.enableWornPaths;

  // Create optimized grid texture - single mesh instead of 58!
  const gridTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)'; // #334155 with 50% opacity
    ctx.lineWidth = 1;

    // Vertical and horizontal lines every 5 units (scaled to texture)
    const gridSpacing = size / 5; // 5 lines per texture repeat
    for (let i = 0; i <= 5; i++) {
      const pos = i * gridSpacing;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(actualWidth / 5, actualDepth / 5);
    return texture;
  }, [actualWidth, actualDepth]);

  return (
    <group matrixAutoUpdate={false}>
      {/* Main floor - standard material on low/medium, reflector only on high/ultra */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={graphicsQuality === 'high' || graphicsQuality === 'ultra'}
      >
        <planeGeometry args={[actualWidth, actualDepth]} />
        {/* CRITICAL FIX: MeshReflectorMaterial breaks scene when quality switches at runtime.
            Using meshStandardMaterial for all non-low quality until reflector issue is resolved.
            TODO: Investigate if reflector can be preloaded or if a stable ref approach works. */}
        {isLowGraphics ? (
          <meshBasicMaterial color="#1e293b" />
        ) : (
          <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.15} />
        )}
      </mesh>

      {/* Floor grid lines - OPTIMIZED: Single textured mesh replaces 58 individual meshes */}
      {/* RESTORED: Now shows on MEDIUM+ (!isLowGraphics) instead of HIGH+ only */}
      {!isLowGraphics && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[actualWidth, actualDepth]} />
          <meshBasicMaterial map={gridTexture} transparent depthWrite={false} />
        </mesh>
      )}

      {/* Safety walkways with industrial hazard stripe markings */}
      {showZones && (
        <>
          {/* Main aisles (vertical) */}
          <SafetyZone position={[-10, 0.02, 0]} size={[3, actualDepth - 10]} type="walkway" />
          <SafetyZone position={[10, 0.02, 0]} size={[3, actualDepth - 10]} type="walkway" />

          {/* Cross aisles (horizontal) */}
          <SafetyZone
            position={[0, 0.02, 10]}
            size={[actualWidth - 20, 2.5]}
            type="walkway"
            rotation={Math.PI / 2}
          />
          <SafetyZone
            position={[0, 0.02, -10]}
            size={[actualWidth - 20, 2.5]}
            type="walkway"
            rotation={Math.PI / 2}
          />

          {/* Danger zones around machinery */}
          <SafetyZone
            position={[0, 0.02, -20]}
            size={[60, 8]}
            type="danger"
            rotation={Math.PI / 2}
          />
        </>
      )}

      {/* Floor puddles - high/ultra graphics only */}
      {showPuddles && (
        <>
          {/* Near machinery areas */}
          <FloorPuddle position={[-20, 0.01, -15]} size={[2.5, 1.8]} seed={1} />
          <FloorPuddle position={[22, 0.01, -18]} size={[1.8, 2.2]} seed={2} />
          <FloorPuddle position={[-10, 0.01, -25]} size={[3, 2]} seed={3} />
          {/* Central factory */}
          <FloorPuddle position={[8, 0.01, 10]} size={[2, 1.5]} seed={4} />
          <FloorPuddle position={[-30, 0.01, 5]} size={[1.5, 1.2]} seed={5} />
          <FloorPuddle position={[35, 0.01, -5]} size={[2.2, 1.8]} seed={6} />
          {/* Near packing zone */}
          <FloorPuddle position={[-15, 0.01, 28]} size={[2, 1.8]} seed={7} />
          <FloorPuddle position={[18, 0.01, 32]} size={[1.6, 2]} seed={8} />
          {/* Near dock staging areas */}
          <FloorPuddle position={[-38, 0.01, 20]} size={[2.5, 2]} seed={9} />
          <FloorPuddle position={[40, 0.01, -20]} size={[2, 1.5]} seed={10} />
        </>
      )}

      {/* Worn footpaths - medium+ graphics */}
      {showWornPaths && (
        <>
          {/* Main aisle worn paths */}
          <WornFootpath
            path={[
              [-15, 0, -35],
              [-15, 0, 0],
              [-15, 0, 35],
            ]}
            width={2.5}
          />
          <WornFootpath
            path={[
              [15, 0, -35],
              [15, 0, 0],
              [15, 0, 35],
            ]}
            width={2.5}
          />
          {/* Cross aisle paths */}
          <WornFootpath
            path={[
              [-45, 0, 10],
              [0, 0, 10],
              [45, 0, 10],
            ]}
            width={1.8}
          />
          <WornFootpath
            path={[
              [-45, 0, -10],
              [0, 0, -10],
              [45, 0, -10],
            ]}
            width={1.8}
          />
          {/* Path to break rooms (inside factory) */}
          <WornFootpath
            path={[
              [15, 0, 20],
              [25, 0, 22],
              [35, 0, 25],
            ]}
            width={1.5}
          />
          <WornFootpath
            path={[
              [-15, 0, 20],
              [-25, 0, 22],
              [-35, 0, 25],
            ]}
            width={1.5}
          />
          {/* Path to locker room (inside factory) */}
          <WornFootpath
            path={[
              [-15, 0, 30],
              [-25, 0, 32],
              [-35, 0, 35],
            ]}
            width={1.8}
          />
          {/* Path to toilet block (inside factory) */}
          <WornFootpath
            path={[
              [15, 0, 30],
              [25, 0, 32],
              [35, 0, 35],
            ]}
            width={1.8}
          />
        </>
      )}
    </group>
  );
};
