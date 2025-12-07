import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
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
        // Below horizon - ground reflection color
        skyColor = mix(horizonColor * 0.7, horizonColor * 0.3, min(-h * 2.0, 1.0));
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
      // Morning (08:00 - 10:00)
      return {
        top: '#0284c7',
        bottom: '#7dd3fc',
        horizon: '#fef3c7',
        ambient: '#e0f2fe',
        ground: '#334155',
      };
    }
    if (gameTime >= 10 && gameTime < 16) {
      // Midday (10:00 - 16:00)
      return {
        top: '#0369a1',
        bottom: '#7dd3fc',
        horizon: '#bae6fd',
        ambient: '#f0f9ff',
        ground: '#475569',
      };
    }
    if (gameTime >= 16 && gameTime < 18) {
      // Afternoon (16:00 - 18:00)
      return {
        top: '#075985',
        bottom: '#38bdf8',
        horizon: '#fed7aa',
        ambient: '#e0f2fe',
        ground: '#334155',
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
  const sunPosition = useMemo(() => {
    const radius = 100; // Reduced radius for shadow camera precision
    const theta = sunAngle;
    // Simple orbit in X-Y plane (East-West) with some Z tilt
    // East (Sunrise) -> Up -> West (Sunset)
    return new THREE.Vector3(
      Math.cos(theta) * -radius, // East is negative X? No, usually +X is Right, -X Left.
      Math.sin(theta) * radius,
      Math.cos(theta) * 30 // Slight tilt
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

  // Sun/Moon Light Intensity
  const sunIntensity = useMemo(() => {
    if (!sunVisible) return 0;
    return Math.max(0, Math.sin(sunAngle)) * 1.5;
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
      ambientLightRef.current.intensity = sunVisible ? 0.4 : 0.1;
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
        shadow-camera-far={400}
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[400, 64]} />
        <meshStandardMaterial color={skyColors.ground} roughness={1} metalness={0} />
      </mesh>

      {/* Sky Dome */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[350, 64, 64]} />
        <shaderMaterial
          vertexShader={skyVertexShader}
          fragmentShader={skyFragmentShader}
          uniforms={{
            topColor: { value: new THREE.Color(skyColors.top) },
            bottomColor: { value: new THREE.Color(skyColors.bottom) },
            horizonColor: { value: new THREE.Color(skyColors.horizon) },
            time: { value: 0 },
            cloudDensity: { value: cloudDensity },
            sunAngle: { value: sunAngle },
          }}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Sun Visuals */}
      {sunVisible && (
        <group position={sunPosition}>
          <mesh>
            <sphereGeometry args={[15, 32, 32]} />
            <meshBasicMaterial color={sunColor} />
          </mesh>
          <mesh>
            <sphereGeometry args={[25, 32, 32]} />
            <meshBasicMaterial color={sunColor} transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* Moon Visuals */}
      {moonVisible && (
        <group position={moonPosition}>
          {/* Moon surface */}
          <mesh>
            <sphereGeometry args={[12, 32, 32]} />
            <meshStandardMaterial color="#e2e8f0" emissive="#94a3b8" emissiveIntensity={0.3} />
          </mesh>
          {/* Moon glow */}
          <mesh>
            <sphereGeometry args={[18, 32, 32]} />
            <meshBasicMaterial color="#a5f3fc" transparent opacity={0.15} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Stars - visible at night (21:00-05:00) */}
      <Stars visible={gameTime >= 20 || gameTime < 6} />

      {/* Horizon Silhouette Ring */}
      <HorizonRing />
    </group>
  );
};

// Stars for nighttime sky
const Stars: React.FC<{ visible: boolean }> = React.memo(({ visible }) => {
  const starsRef = useRef<THREE.Points>(null);

  // Generate star positions on a sphere
  const starPositions = useMemo(() => {
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      // Random point on sphere using spherical coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 340; // Inside sky dome but outside horizon

      // Only place stars in upper hemisphere (above horizon)
      const y = Math.cos(phi) * radius;
      if (y > 20) {
        // Only above horizon
        positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      } else {
        // Reposition below-horizon stars to above
        positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[i * 3 + 1] = Math.abs(y) + 30;
        positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      }
    }
    return positions;
  }, []);

  // Star sizes for variety
  const starSizes = useMemo(() => {
    const sizes = new Float32Array(500);
    for (let i = 0; i < 500; i++) {
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    return sizes;
  }, []);

  // Subtle twinkling animation
  useFrame((state) => {
    if (!visible || !starsRef.current) return;
    const material = starsRef.current.material as THREE.PointsMaterial;
    // Gentle opacity variation for twinkling effect
    material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });

  if (!visible) return null;

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        <bufferAttribute attach="attributes-size" args={[starSizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={1.5}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
});

const HorizonRing: React.FC = () => {
  const texture = useTexture('/assets/horizon_silhouette.png');

  // Configure texture properly with useMemo to avoid re-running on each render
  useMemo(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(4, 1);
    texture.offset.set(0, 0);
    texture.needsUpdate = true;
  }, [texture]);

  return (
    // Position cylinder at horizon level - use frustumCulled={false} to ensure visibility
    <mesh position={[0, 8, 0]} frustumCulled={false}>
      <cylinderGeometry args={[250, 250, 50, 64, 1, true]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.5}
        side={THREE.BackSide}
        depthWrite={false}
        alphaTest={0.1}
      />
    </mesh>
  );
};
