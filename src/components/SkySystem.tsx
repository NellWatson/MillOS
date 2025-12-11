import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useGraphicsStore } from '../stores/graphicsStore';

// Vertex Shader for SkyDome - Ultrathink Sky System
const skyVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vHeight;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vHeight = normalize(position).y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment Shader for SkyDome with Procedural Clouds - Enhanced Ultrathink version
const skyFragmentShader = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform vec3 horizonColor;
uniform vec3 groundColor;
uniform float time;
uniform float cloudDensity;
uniform float sunAngle;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vHeight;

// Improved pseudo-random noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Smooth 2D Noise
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion for realistic clouds
float fbm(vec2 st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 6; ++i) {
        v += a * noise(st);
        st = rot * st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    float h = normalize(vWorldPosition).y;

    // Multi-layer sky gradient with horizon band
    vec3 skyColor;
    if (h < 0.0) {
        // Below horizon - use ground color to match ground plane (prevents dark dome artifact)
        skyColor = mix(horizonColor * 0.9, groundColor, min(-h * 3.0, 1.0));
    } else if (h < 0.15) {
        // Horizon band - smooth transition
        float horizonFactor = h / 0.15;
        skyColor = mix(horizonColor, bottomColor, smoothstep(0.0, 1.0, horizonFactor));
    } else if (h < 0.5) {
        // Lower sky
        float t = (h - 0.15) / 0.35;
        skyColor = mix(bottomColor, mix(bottomColor, topColor, 0.5), smoothstep(0.0, 1.0, t));
    } else {
        // Upper sky
        float t = (h - 0.5) / 0.5;
        skyColor = mix(mix(bottomColor, topColor, 0.5), topColor, smoothstep(0.0, 1.0, t));
    }

    // Procedural clouds with drift animation
    vec2 cloudUV = vUv * 3.0;
    cloudUV.x += time * 0.015;
    cloudUV.y += time * 0.005;

    float n = fbm(cloudUV);
    float n2 = fbm(cloudUV * 2.0 + vec2(time * 0.01, 0.0));
    float cloudShape = (n + n2 * 0.5) / 1.5;

    // Cloud mask - only show clouds in upper sky, fade near horizon
    float cloudMask = smoothstep(0.1, 0.4, h) * (1.0 - smoothstep(0.85, 1.0, h));
    float cloudThreshold = 0.45 - cloudDensity * 0.15;
    float clouds = smoothstep(cloudThreshold, cloudThreshold + 0.2, cloudShape) * cloudMask;

    // Cloud lighting - brighter on sun side
    vec3 cloudColorLit = vec3(1.0, 0.98, 0.95);
    vec3 cloudColorShadow = vec3(0.7, 0.75, 0.85);
    float sunInfluence = max(0.0, sin(sunAngle));
    vec3 cloudColor = mix(cloudColorShadow, cloudColorLit, sunInfluence * 0.5 + 0.5);

    // Mix sky and clouds
    vec3 finalColor = mix(skyColor, cloudColor, clouds * cloudDensity * 0.8);

    // Add subtle atmospheric scattering near horizon during dawn/dusk
    float horizonGlow = smoothstep(0.2, 0.0, abs(h)) * (1.0 - abs(sin(sunAngle)));
    finalColor += horizonColor * horizonGlow * 0.3;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const SkySystem: React.FC = () => {
  const gameTime = useGameSimulationStore((state) => state.gameTime);
  const weather = useGameSimulationStore((state) => state.weather);
  const shadowMapSize = useGraphicsStore((state) => state.graphics.shadowMapSize);
  const meshRef = useRef<THREE.Mesh>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  // Enhanced sky colors with horizon color for each time of day
  const skyColors = useMemo(() => {
    // [Top, Bottom, Horizon]
    if (gameTime >= 21 || gameTime < 5) {
      // Deep Night (21:00 - 05:00)
      return {
        top: '#0a0f1a',
        bottom: '#1a2744',
        horizon: '#2d3748',
        ambient: '#0f172a',
        ground: '#0f172a',
      };
    }
    if (gameTime >= 5 && gameTime < 6) {
      // Early Dawn (05:00 - 06:00)
      return {
        top: '#1e1b4b',
        bottom: '#4c1d95',
        horizon: '#f97316',
        ambient: '#312e81',
        ground: '#1e293b',
      };
    }
    if (gameTime >= 6 && gameTime < 8) {
      // Dawn/Sunrise (06:00 - 08:00)
      return {
        top: '#3b0764',
        bottom: '#f59e0b',
        horizon: '#fbbf24',
        ambient: '#7c2d12',
        ground: '#451a03',
      };
    }
    if (gameTime >= 8 && gameTime < 10) {
      // Morning (08:00 - 10:00) - bright and fresh
      return {
        top: '#0ea5e9',
        bottom: '#a5d8ff',
        horizon: '#fff7ed',
        ambient: '#f0f9ff',
        ground: '#5a7a5a',
      };
    }
    if (gameTime >= 10 && gameTime < 16) {
      // Midday (10:00 - 16:00) - Far Cry bright tropical sun
      return {
        top: '#1e90ff',
        bottom: '#87ceeb',
        horizon: '#fffaf0',
        ambient: '#fffff0',
        ground: '#7cb77c',
      };
    }
    if (gameTime >= 16 && gameTime < 18) {
      // Afternoon (16:00 - 18:00) - warm sunny
      return {
        top: '#0ea5e9',
        bottom: '#67d4fc',
        horizon: '#fef3c7',
        ambient: '#fef9c3',
        ground: '#5a7a5a',
      };
    }
    if (gameTime >= 18 && gameTime < 19) {
      // Golden Hour (18:00 - 19:00)
      return {
        top: '#0c4a6e',
        bottom: '#f97316',
        horizon: '#fbbf24',
        ambient: '#ea580c',
        ground: '#451a03',
      };
    }
    if (gameTime >= 19 && gameTime < 21) {
      // Dusk/Twilight (19:00 - 21:00)
      return {
        top: '#1e1b4b',
        bottom: '#ea580c',
        horizon: '#dc2626',
        ambient: '#312e81',
        ground: '#1e293b',
      };
    }
    // Default to midday
    return {
      top: '#0369a1',
      bottom: '#7dd3fc',
      horizon: '#bae6fd',
      ambient: '#f0f9ff',
      ground: '#475569',
    };
  }, [gameTime]);

  // Cloud density based on weather
  const cloudDensity = useMemo(() => {
    switch (weather) {
      case 'clear':
        return 0.3;
      case 'cloudy':
        return 0.7;
      case 'rain':
        return 0.9;
      case 'storm':
        return 1.0;
      default:
        return 0.5;
    }
  }, [weather]);

  // Sun angle calculation - 6am = sunrise (0), 12pm = zenith (PI/2), 6pm = sunset (PI)
  const sunAngle = useMemo(() => {
    return ((gameTime - 6) / 12) * Math.PI;
  }, [gameTime]);

  // Sun position - orbits from East (negative Z) to West (positive Z)
  // Adjusted orbit to track across the sky properly
  // Radius 340 places sun BEHIND all mountain layers (260-320) for proper occlusion at sunrise/sunset
  const sunPosition = useMemo(() => {
    const radius = 340; // Beyond mountains (320 max) so sun sets behind them
    const theta = sunAngle;
    // Simple orbit in X-Y plane (East-West) with some Z tilt
    // East (Sunrise) -> Up -> West (Sunset)
    // Add vertical offset to push sun higher in the sky
    const heightMultiplier = 1.3; // Makes zenith higher
    return new THREE.Vector3(
      Math.cos(theta) * -radius,
      Math.sin(theta) * radius * heightMultiplier + 60, // Higher base + amplified arc (adjusted for new radius)
      Math.cos(theta) * 50 // Slight tilt (adjusted for new radius)
    );
  }, [sunAngle]);

  // Moon position - opposite to sun
  const moonPosition = useMemo(() => {
    return sunPosition.clone().negate();
  }, [sunPosition]);

  // Sun visibility (above horizon)
  const sunVisible = sunPosition.y > -5;
  const moonVisible = moonPosition.y > -5;

  // Sun color based on position
  const sunColor = useMemo(() => {
    if (sunAngle < 0.3 || sunAngle > 2.84) {
      return '#ff6b35'; // Orange at sunrise/sunset
    }
    return '#fff7ed'; // Bright warm white during day
  }, [sunAngle]);

  // Sun/Moon Light Intensity - Far Cry intense sunlight
  const sunIntensity = useMemo(() => {
    if (!sunVisible) return 0;
    return Math.max(0, Math.sin(sunAngle)) * 3.5 + 0.8;
  }, [sunVisible, sunAngle]);

  const moonIntensity = useMemo(() => {
    if (!moonVisible) return 0;
    return 0.3; // Dim moonlight
  }, [moonVisible]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
      material.uniforms.topColor.value.set(skyColors.top);
      material.uniforms.bottomColor.value.set(skyColors.bottom);
      material.uniforms.horizonColor.value.set(skyColors.horizon);
      material.uniforms.groundColor.value.set(skyColors.ground);
      material.uniforms.cloudDensity.value = cloudDensity;
      material.uniforms.sunAngle.value = sunAngle;
    }

    // Update lights
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunPosition);
      sunLightRef.current.intensity = sunIntensity;
      sunLightRef.current.color.set(sunColor);
    }

    if (moonLightRef.current) {
      moonLightRef.current.position.copy(moonPosition);
      moonLightRef.current.intensity = moonIntensity;
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(skyColors.ambient);
      ambientLightRef.current.intensity = sunVisible ? 1.0 : 0.1;
    }
  });

  return (
    <group>
      {/* Dynamic Lighting */}
      <ambientLight ref={ambientLightRef} intensity={0.4} />

      <directionalLight
        ref={sunLightRef}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-far={600}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.001}
      />

      <directionalLight
        ref={moonLightRef}
        color="#a5f3fc"
        castShadow={false} // Disable moon shadows for performance
      />

      {/* Ground Plane - Infinite Environment */}
      {/* fog={false} prevents dark artifacts at far distances */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[400, 64]} />
        <meshStandardMaterial color={skyColors.ground} roughness={1} metalness={0} fog={false} />
      </mesh>

      {/* Sky Dome - renderOrder -1000 ensures it renders behind everything */}
      <mesh ref={meshRef} renderOrder={-1000}>
        <sphereGeometry args={[350, 64, 64]} />
        <shaderMaterial
          vertexShader={skyVertexShader}
          fragmentShader={skyFragmentShader}
          uniforms={{
            topColor: { value: new THREE.Color(skyColors.top) },
            bottomColor: { value: new THREE.Color(skyColors.bottom) },
            horizonColor: { value: new THREE.Color(skyColors.horizon) },
            groundColor: { value: new THREE.Color(skyColors.ground) },
            time: { value: 0 },
            cloudDensity: { value: cloudDensity },
            sunAngle: { value: sunAngle },
          }}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Sun Visuals - Far Cry intense sun with multiple glow layers */}
      {/* Geometry scaled 1.21x to maintain visual size at increased radius (340 vs 280) */}
      {sunVisible && (
        <group position={sunPosition}>
          {/* Core sun - bright white */}
          <mesh>
            <sphereGeometry args={[22, 32, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Inner glow */}
          <mesh>
            <sphereGeometry args={[36, 32, 32]} />
            <meshBasicMaterial color="#fffde7" transparent opacity={0.6} />
          </mesh>
          {/* Mid glow */}
          <mesh>
            <sphereGeometry args={[55, 32, 32]} />
            <meshBasicMaterial color={sunColor} transparent opacity={0.35} depthWrite={false} />
          </mesh>
          {/* Outer glow - large corona */}
          <mesh>
            <sphereGeometry args={[85, 32, 32]} />
            <meshBasicMaterial color="#fff8e1" transparent opacity={0.15} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Moon Visuals */}
      {/* Geometry scaled 1.21x to maintain visual size at increased radius (340 vs 280) */}
      {moonVisible && (
        <group position={moonPosition}>
          {/* Moon surface - fog={false} prevents dark artifacts at far distances */}
          <mesh>
            <sphereGeometry args={[15, 32, 32]} />
            <meshStandardMaterial color="#e2e8f0" emissive="#94a3b8" emissiveIntensity={0.3} fog={false} />
          </mesh>
          {/* Moon glow */}
          <mesh>
            <sphereGeometry args={[22, 32, 32]} />
            <meshBasicMaterial color="#a5f3fc" transparent opacity={0.15} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Stars - visible at night (21:00-05:00) */}
      <Stars visible={gameTime >= 20 || gameTime < 6} />

      {/* Horizon Silhouette Ring - provides mountains and distant city */}
      <HorizonRing />
    </group>
  );
};

// Stars for nighttime sky - enhanced with more stars, colors, and twinkling
const Stars: React.FC<{ visible: boolean }> = React.memo(({ visible }) => {
  const starsRef = useRef<THREE.Points>(null);
  const brightStarsRef = useRef<THREE.Points>(null);
  const twinkleOffsetsRef = useRef<Float32Array | null>(null);

  const STAR_COUNT = 1500;
  const BRIGHT_STAR_COUNT = 50;

  // Generate star positions on a sphere
  const { positions: starPositions, colors: starColors } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);

    // Star color palette - slightly warm and cool tints
    const starTints = [
      [1.0, 1.0, 1.0],     // Pure white
      [1.0, 0.95, 0.9],    // Warm white
      [0.9, 0.95, 1.0],    // Cool white
      [1.0, 0.9, 0.8],     // Yellow-ish
      [0.85, 0.9, 1.0],    // Blue-ish
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 340 + Math.random() * 5;

      const y = Math.cos(phi) * radius;
      if (y > 15) {
        positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      } else {
        positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[i * 3 + 1] = Math.abs(y) + 25 + Math.random() * 50;
        positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      }

      // Random color tint
      const tint = starTints[Math.floor(Math.random() * starTints.length)];
      colors[i * 3] = tint[0];
      colors[i * 3 + 1] = tint[1];
      colors[i * 3 + 2] = tint[2];
    }
    return { positions, colors };
  }, []);

  // Bright stars (bigger, more prominent)
  const brightStarPositions = useMemo(() => {
    const positions = new Float32Array(BRIGHT_STAR_COUNT * 3);
    for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random()); // Bias toward upper hemisphere
      const radius = 338;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius + 50;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    return positions;
  }, []);

  // Star sizes for variety
  const starSizes = useMemo(() => {
    const sizes = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      sizes[i] = 0.3 + Math.random() * 1.2;
    }
    return sizes;
  }, []);

  // Initialize twinkle offsets
  useMemo(() => {
    twinkleOffsetsRef.current = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      twinkleOffsetsRef.current[i] = Math.random() * Math.PI * 2;
    }
  }, []);

  // Twinkling animation with individual star phases
  useFrame((state) => {
    if (!visible) return;

    if (starsRef.current) {
      const material = starsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.75 + Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }

    if (brightStarsRef.current) {
      const material = brightStarsRef.current.material as THREE.PointsMaterial;
      // Bright stars twinkle more noticeably
      material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* Main star field */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[starColors, 3]} />
          <bufferAttribute attach="attributes-size" args={[starSizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.2}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation={false}
          depthWrite={false}
        />
      </points>

      {/* Bright prominent stars */}
      <points ref={brightStarsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[brightStarPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={2.5}
          color="#fffef0"
          transparent
          opacity={0.95}
          sizeAttenuation={false}
          depthWrite={false}
        />
      </points>
    </group>
  );
});

// Generate smooth mountain/hill profile using noise
const generateMountainProfile = (
  width: number,
  segments: number,
  baseHeight: number,
  amplitude: number,
  frequency: number,
  seed: number
): number[] => {
  const heights: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    let h = baseHeight;
    // Multiple octaves of sine waves for organic look
    h += Math.sin((x * frequency + seed) * 0.01) * amplitude;
    h += Math.sin((x * frequency + seed * 2) * 0.025) * amplitude * 0.5;
    h += Math.sin((x * frequency + seed * 3) * 0.05) * amplitude * 0.25;
    h += Math.sin((x * frequency + seed * 0.5) * 0.003) * amplitude * 1.5;
    heights.push(Math.max(0, h));
  }
  return heights;
};

// Generate city skyline profile with buildings
const generateCitySkyline = (
  segments: number,
  baseHeight: number,
  maxBuildingHeight: number,
  density: number,
  seed: number
): number[] => {
  const heights: number[] = [];
  let inBuilding = false;
  let buildingWidth = 0;
  let currentBuildingHeight = baseHeight;

  const seededRandom = (i: number) => {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i <= segments; i++) {
    const rand = seededRandom(i);

    if (!inBuilding && rand < density) {
      // Start a new building
      inBuilding = true;
      buildingWidth = Math.floor(seededRandom(i + 1000) * 4) + 2;
      currentBuildingHeight = baseHeight + seededRandom(i + 2000) * maxBuildingHeight;
      // Occasionally add a tall skyscraper
      if (seededRandom(i + 3000) > 0.85) {
        currentBuildingHeight *= 1.5;
      }
    }

    if (inBuilding) {
      heights.push(currentBuildingHeight);
      buildingWidth--;
      if (buildingWidth <= 0) {
        inBuilding = false;
        // Gap between buildings
        const gap = Math.floor(seededRandom(i + 4000) * 3) + 1;
        for (let g = 0; g < gap && i + g <= segments; g++) {
          heights.push(baseHeight);
          i++;
        }
        i--; // Adjust for outer loop increment
      }
    } else {
      heights.push(baseHeight);
    }
  }

  // Ensure correct length
  while (heights.length <= segments) heights.push(baseHeight);
  return heights.slice(0, segments + 1);
};

// City skyline layer - renders buildings in a specific arc
const CitySkylineLayer: React.FC<{
  startAngle: number;
  endAngle: number;
  radius: number;
  baseY: number;
  heights: number[];
  color: string;
  renderOrder?: number;
}> = React.memo(({ startAngle, endAngle, radius, baseY, heights, color, renderOrder = -700 }) => {
  const geometry = useMemo(() => {
    const segments = heights.length - 1;
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    const angleSpan = endAngle - startAngle;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * angleSpan;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Bottom vertex
      positions.push(x, baseY, z);
      // Top vertex (building height)
      positions.push(x, baseY + heights[i], z);
    }

    // Create faces (facing inward)
    for (let i = 0; i < segments; i++) {
      const bl = i * 2;
      const br = (i + 1) * 2;
      const tl = i * 2 + 1;
      const tr = (i + 1) * 2 + 1;

      indices.push(bl, tl, br);
      indices.push(br, tl, tr);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [startAngle, endAngle, radius, baseY, heights]);

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={renderOrder}>
      <meshBasicMaterial
        color={color}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

// City lights component for nighttime
const CityLights: React.FC<{
  startAngle: number;
  endAngle: number;
  radius: number;
  baseY: number;
  isNight: boolean;
}> = React.memo(({ startAngle, endAngle, radius, baseY, isNight }) => {
  const lightsRef = useRef<THREE.Points>(null);

  const lightPositions = useMemo(() => {
    const positions: number[] = [];
    const lightCount = 80;
    const angleSpan = endAngle - startAngle;

    for (let i = 0; i < lightCount; i++) {
      const angle = startAngle + (i / lightCount) * angleSpan + (Math.random() - 0.5) * 0.02;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = baseY + Math.random() * 12 + 2;
      positions.push(x, y, z);
    }
    return new Float32Array(positions);
  }, [startAngle, endAngle, radius, baseY]);

  const lightColors = useMemo(() => {
    const colors: number[] = [];
    const colorOptions = [
      [1.0, 0.95, 0.7],   // Warm yellow
      [1.0, 1.0, 1.0],    // White
      [1.0, 0.85, 0.6],   // Orange-ish
      [0.9, 0.95, 1.0],   // Cool white
      [1.0, 0.4, 0.3],    // Red (aircraft warning)
    ];

    for (let i = 0; i < 80; i++) {
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors.push(color[0], color[1], color[2]);
    }
    return new Float32Array(colors);
  }, []);

  // Animate city lights twinkling
  useFrame((state) => {
    if (!isNight || !lightsRef.current) return;
    const material = lightsRef.current.material as THREE.PointsMaterial;
    material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
  });

  if (!isNight) return null;

  return (
    <points ref={lightsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[lightPositions, 3]} />
        <bufferAttribute attach="attributes-color" args={[lightColors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
});

// Snow-capped mountain layer with height-based coloring
const SnowCappedMountainLayer: React.FC<{
  radius: number;
  baseY: number;
  heights: number[];
  snowLineHeight: number;
  treeLineHeight: number;
  rockColor: string;
  treeColor: string;
  snowColor: string;
  opacity: number;
  renderOrder?: number;
}> = React.memo(({ radius, baseY, heights, snowLineHeight, treeLineHeight, rockColor, treeColor, snowColor, opacity, renderOrder = -900 }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Update uniforms when colors change (similar to SkySystem)
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.rockColor.value.set(rockColor);
      materialRef.current.uniforms.treeColor.value.set(treeColor);
      materialRef.current.uniforms.snowColor.value.set(snowColor);
      materialRef.current.uniforms.opacity.value = opacity;
    }
  });

  const geometry = useMemo(() => {
    const segments = heights.length - 1;
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const maxHeight = Math.max(...heights);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = heights[i % heights.length];

      // Bottom vertex
      positions.push(x, baseY, z);
      uvs.push(i / segments, 0);
      // Top vertex
      positions.push(x, baseY + h, z);
      uvs.push(i / segments, h / maxHeight); // UV.y = normalized height
    }

    for (let i = 0; i < segments; i++) {
      const bl = i * 2;
      const br = (i + 1) * 2;
      const tl = i * 2 + 1;
      const tr = (i + 1) * 2 + 1;
      indices.push(bl, tl, br);
      indices.push(br, tl, tr);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [radius, baseY, heights]);

  const shaderMaterial = useMemo(() => ({
    uniforms: {
      rockColor: { value: new THREE.Color(rockColor) },
      treeColor: { value: new THREE.Color(treeColor) },
      snowColor: { value: new THREE.Color(snowColor) },
      snowLineHeight: { value: snowLineHeight },
      treeLineHeight: { value: treeLineHeight },
      opacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 rockColor;
      uniform vec3 treeColor;
      uniform vec3 snowColor;
      uniform float snowLineHeight;
      uniform float treeLineHeight;
      uniform float opacity;
      varying vec2 vUv;

      void main() {
        float h = vUv.y; // Normalized height 0-1
        vec3 color;

        if (h > snowLineHeight) {
          // Snow cap - blend from rock to snow
          float snowBlend = smoothstep(snowLineHeight, snowLineHeight + 0.15, h);
          color = mix(rockColor, snowColor, snowBlend);
        } else if (h > treeLineHeight) {
          // Rocky area - blend from trees to rock
          float rockBlend = smoothstep(treeLineHeight, treeLineHeight + 0.1, h);
          color = mix(treeColor, rockColor, rockBlend);
        } else {
          // Tree line at base
          color = treeColor;
        }

        gl_FragColor = vec4(color, opacity);
      }
    `,
  }), [rockColor, treeColor, snowColor, snowLineHeight, treeLineHeight, opacity]);

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={renderOrder}>
      <shaderMaterial
        ref={materialRef}
        {...shaderMaterial}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

// Create a single horizon layer mesh
const HorizonLayer: React.FC<{
  radius: number;
  baseY: number;
  heights: number[];
  color: string;
  opacity: number;
  renderOrder?: number;
}> = React.memo(({ radius, baseY, heights, color, opacity, renderOrder = -900 }) => {
  const geometry = useMemo(() => {
    const segments = heights.length - 1;
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];

    // Create vertices for the silhouette ring
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Bottom vertex (at base)
      positions.push(x, baseY, z);
      // Top vertex (at height)
      positions.push(x, baseY + heights[i % heights.length], z);
    }

    // Create faces
    for (let i = 0; i < segments; i++) {
      const bl = i * 2;
      const br = (i + 1) * 2;
      const tl = i * 2 + 1;
      const tr = (i + 1) * 2 + 1;

      // Two triangles per quad (facing inward)
      indices.push(bl, tl, br);
      indices.push(br, tl, tr);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [radius, baseY, heights]);

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={renderOrder}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

// Animated water surface component
const DistantWater: React.FC<{
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  baseY: number;
  waterColor: string;
  reflectionColor: string;
  renderOrder?: number;
}> = React.memo(
  ({ startAngle, endAngle, innerRadius, outerRadius, baseY, waterColor, reflectionColor, renderOrder = -600 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Custom shader for animated water
    const waterShader = useMemo(
      () => ({
        uniforms: {
          time: { value: 0 },
          waterColor: { value: new THREE.Color(waterColor) },
          reflectionColor: { value: new THREE.Color(reflectionColor) },
        },
        vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float time;

        void main() {
          vUv = uv;
          vPosition = position;

          // Gentle wave displacement
          vec3 pos = position;
          float wave = sin(pos.x * 0.05 + time * 0.5) * 0.3;
          wave += sin(pos.z * 0.08 + time * 0.3) * 0.2;
          pos.y += wave;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
        fragmentShader: `
        uniform vec3 waterColor;
        uniform vec3 reflectionColor;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Shimmer effect
          float shimmer = sin(vPosition.x * 0.1 + time * 2.0) * 0.5 + 0.5;
          shimmer *= sin(vPosition.z * 0.15 + time * 1.5) * 0.5 + 0.5;

          // Mix water and reflection colors
          vec3 color = mix(waterColor, reflectionColor, shimmer * 0.3);

          // Add sparkles
          float sparkle = pow(shimmer, 8.0) * 0.5;
          color += vec3(sparkle);

          // Fade at edges
          float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

          gl_FragColor = vec4(color, 0.85 * edgeFade);
        }
      `,
      }),
      [waterColor, reflectionColor]
    );

    // Animate water
    useFrame((state) => {
      if (materialRef.current) {
        materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      }
    });

    // Create water segment geometry
    const geometry = useMemo(() => {
      const segments = 64;
      const geo = new THREE.BufferGeometry();
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const angleSpan = endAngle - startAngle;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = startAngle + t * angleSpan;

        // Inner edge
        positions.push(Math.cos(angle) * innerRadius, baseY, Math.sin(angle) * innerRadius);
        uvs.push(t, 0);

        // Outer edge
        positions.push(Math.cos(angle) * outerRadius, baseY, Math.sin(angle) * outerRadius);
        uvs.push(t, 1);
      }

      for (let i = 0; i < segments; i++) {
        const bl = i * 2;
        const br = (i + 1) * 2;
        const tl = i * 2 + 1;
        const tr = (i + 1) * 2 + 1;

        indices.push(bl, br, tl);
        indices.push(br, tr, tl);
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);

      return geo;
    }, [startAngle, endAngle, innerRadius, outerRadius, baseY]);

    return (
      <mesh ref={meshRef} geometry={geometry} frustumCulled={false} renderOrder={renderOrder}>
        <shaderMaterial
          ref={materialRef}
          {...waterShader}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }
);

export const HorizonRing: React.FC = () => {
  const gameTime = useGameSimulationStore((state) => state.gameTime);

  // Determine colors based on time of day
  const { layerColors, waterColors, mountainColors } = useMemo(() => {
    const isNight = gameTime >= 20 || gameTime < 6;
    const isDawn = gameTime >= 5 && gameTime < 8;
    const isDusk = gameTime >= 17 && gameTime < 20;

    if (isNight) {
      return {
        layerColors: {
          far: '#0a0f1a',
          mid: '#0d1420',
          near: '#101824',
          ground: '#080c12',
        },
        waterColors: {
          water: '#0a1525',
          reflection: '#1a2540',
        },
        mountainColors: {
          snow: '#2a3545',
          rock: '#151a24',
          tree: '#0a1210',
        },
      };
    } else if (isDawn) {
      return {
        layerColors: {
          far: '#1a1520',
          mid: '#251a28',
          near: '#301f30',
          ground: '#120e18',
        },
        waterColors: {
          water: '#1a2535',
          reflection: '#f0a060',
        },
        mountainColors: {
          snow: '#f0d0c0',
          rock: '#6a5060',
          tree: '#2a3528',
        },
      };
    } else if (isDusk) {
      return {
        layerColors: {
          far: '#1a1015',
          mid: '#25151a',
          near: '#301a20',
          ground: '#100a0d',
        },
        waterColors: {
          water: '#1a1525',
          reflection: '#e07040',
        },
        mountainColors: {
          snow: '#e0b0a0',
          rock: '#5a4048',
          tree: '#252820',
        },
      };
    } else {
      // Day - vibrant mountains with snow caps
      return {
        layerColors: {
          far: '#c8dce8', // Hazy blue distant
          mid: '#a8c8dc', // Light blue mid
          near: '#88b4cc', // Soft blue near
          ground: '#5a8a5a', // Forest green
        },
        waterColors: {
          water: '#40a0c0',
          reflection: '#e0ffff',
        },
        mountainColors: {
          snow: '#ffffff',
          rock: '#8090a0',
          tree: '#3a6040',
        },
      };
    }
  }, [gameTime]);

  // Determine if it's night for city lights
  const isNight = gameTime >= 20 || gameTime < 6;

  // City colors based on time of day
  const cityColor = useMemo(() => {
    if (isNight) return '#0a0e14';
    if (gameTime >= 17 && gameTime < 20) return '#1a1520'; // Dusk
    if (gameTime >= 5 && gameTime < 8) return '#201825'; // Dawn
    return '#2a3540'; // Day - darker silhouette against bright sky
  }, [gameTime, isNight]);

  // Generate different mountain profiles for each layer - taller for visibility
  const farMountains = useMemo(() => generateMountainProfile(360, 128, 40, 60, 1.2, 42), []);
  const midMountains = useMemo(() => generateMountainProfile(360, 128, 30, 45, 1.8, 137), []);
  const nearHills = useMemo(() => generateMountainProfile(360, 128, 20, 30, 2.5, 891), []);
  const groundLevel = useMemo(() => generateMountainProfile(360, 128, 8, 12, 4, 2023), []);

  // Generate city skyline (positioned in one sector of the horizon) - taller buildings
  const citySkyline = useMemo(() => generateCitySkyline(64, 10, 35, 0.4, 7777), []);

  return (
    <group>
      {/* Far mountains - tallest with snow caps */}
      <SnowCappedMountainLayer
        radius={320}
        baseY={-5}
        heights={farMountains}
        snowLineHeight={0.7}
        treeLineHeight={0.3}
        rockColor={mountainColors.rock}
        treeColor={mountainColors.tree}
        snowColor={mountainColors.snow}
        opacity={0.85}
        renderOrder={-950}
      />

      {/* Mid mountains with snow caps */}
      <SnowCappedMountainLayer
        radius={300}
        baseY={-3}
        heights={midMountains}
        snowLineHeight={0.75}
        treeLineHeight={0.35}
        rockColor={mountainColors.rock}
        treeColor={mountainColors.tree}
        snowColor={mountainColors.snow}
        opacity={0.9}
        renderOrder={-900}
      />

      {/* Near hills - more forested, less snow */}
      <SnowCappedMountainLayer
        radius={280}
        baseY={-2}
        heights={nearHills}
        snowLineHeight={0.85}
        treeLineHeight={0.25}
        rockColor={mountainColors.rock}
        treeColor={mountainColors.tree}
        snowColor={mountainColors.snow}
        opacity={0.95}
        renderOrder={-850}
      />

      {/* Ground/treeline (closest - all forest) */}
      <HorizonLayer
        radius={260}
        baseY={-1}
        heights={groundLevel}
        color={layerColors.ground}
        opacity={1.0}
        renderOrder={-800}
      />

      {/* Distant city skyline - positioned in one sector */}
      <CitySkylineLayer
        startAngle={Math.PI * 1.65}
        endAngle={Math.PI * 1.95}
        radius={275}
        baseY={-2}
        heights={citySkyline}
        color={cityColor}
        renderOrder={-700}
      />

      {/* City lights at night */}
      <CityLights
        startAngle={Math.PI * 1.65}
        endAngle={Math.PI * 1.95}
        radius={275}
        baseY={-2}
        isNight={isNight}
      />

      {/* Distant lake - positioned in a valley between mountains */}
      <DistantWater
        startAngle={Math.PI * 0.15}
        endAngle={Math.PI * 0.45}
        innerRadius={270}
        outerRadius={310}
        baseY={-3}
        waterColor={waterColors.water}
        reflectionColor={waterColors.reflection}
        renderOrder={-650}
      />

      {/* Ocean/sea on opposite side */}
      <DistantWater
        startAngle={Math.PI * 1.1}
        endAngle={Math.PI * 1.6}
        innerRadius={265}
        outerRadius={340}
        baseY={-4}
        waterColor={waterColors.water}
        reflectionColor={waterColors.reflection}
        renderOrder={-650}
      />

      {/* Small river/inlet */}
      <DistantWater
        startAngle={Math.PI * 0.7}
        endAngle={Math.PI * 0.85}
        innerRadius={260}
        outerRadius={290}
        baseY={-2}
        waterColor={waterColors.water}
        reflectionColor={waterColors.reflection}
        renderOrder={-600}
      />

      {/* Solid ground plane below horizon */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} renderOrder={-750}>
        <ringGeometry args={[0, 260, 64]} />
        <meshBasicMaterial color={layerColors.ground} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
