import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useMillStore } from '../store';
import { audioManager } from '../utils/audioManager';

// Simple lens flare effect for bright lights
const LensFlare: React.FC<{ position: [number, number, number]; color?: string; intensity?: number }> = ({
  position,
  color = '#fef3c7',
  intensity = 1
}) => {
  const flareRef = useRef<THREE.Group>(null);
  const gameTime = useMillStore((state) => state.gameTime);
  // Reusable Vector3 refs to avoid GC pressure in useFrame
  const lightPosRef = useRef(new THREE.Vector3());
  const toCameraRef = useRef(new THREE.Vector3());
  const cameraDirRef = useRef(new THREE.Vector3());

  // Only show lens flares during bright daylight
  const isDaytime = gameTime >= 8 && gameTime < 17;
  const daylightIntensity = isDaytime ? 1 : 0;

  useFrame(({ camera }) => {
    if (!flareRef.current || daylightIntensity === 0) return;

    // Calculate vector from light to camera (reusing refs)
    const lightPos = lightPosRef.current.set(position[0], position[1], position[2]);
    const toCamera = toCameraRef.current.subVectors(camera.position, lightPos).normalize();

    // Only show flare when looking toward the light
    const cameraDir = cameraDirRef.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const dot = toCamera.dot(cameraDir);

    // Fade based on angle (stronger when looking at light)
    const angleFade = Math.max(0, -dot);
    flareRef.current.visible = angleFade > 0.3;

    if (angleFade > 0.3) {
      // Scale flare based on angle
      const scale = angleFade * intensity * daylightIntensity;
      flareRef.current.scale.setScalar(scale);

      // Flare always faces camera
      flareRef.current.quaternion.copy(camera.quaternion);
    }
  });

  if (daylightIntensity === 0) return null;

  return (
    <group ref={flareRef} position={position}>
      {/* Main flare glow */}
      <sprite scale={[4, 4, 1]}>
        <spriteMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </sprite>
      {/* Inner bright core */}
      <sprite scale={[1.5, 1.5, 1]}>
        <spriteMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
      </sprite>
      {/* Secondary flare elements */}
      <sprite position={[1, 0.5, 0]} scale={[0.8, 0.8, 1]}>
        <spriteMaterial color="#87ceeb" transparent opacity={0.2} depthWrite={false} />
      </sprite>
      <sprite position={[-0.5, -0.3, 0]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial color="#fcd34d" transparent opacity={0.25} depthWrite={false} />
      </sprite>
    </group>
  );
};

// Generate procedural wall texture with industrial detailing
const useWallTexture = () => {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base wall color
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, size, size);

    // Add noise for wall texture
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    // Add horizontal panel lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Add vertical seams
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < size; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    // Add rivet dots
    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
    for (let x = 32; x < size; x += 128) {
      for (let y = 32; y < size; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);

    return texture;
  }, []);
};

// Generate roughness map for wall surface detail
const useWallRoughnessMap = () => {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base roughness (mid gray = 0.5 roughness)
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(0, 0, size, size);

    // Add variation
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 40;
      const value = Math.max(100, Math.min(200, 176 + noise));
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);

    return texture;
  }, []);
};

// Calculate daylight color based on game time
const getDaylightProperties = (hour: number) => {
  // Night (8pm - 5am): dark blue, minimal glow
  if (hour >= 20 || hour < 5) {
    return { color: '#1e3a5f', intensity: 0.1, opacity: 0.2 };
  }
  // Dawn (5am - 7am): warm orange/pink
  if (hour >= 5 && hour < 7) {
    const t = (hour - 5) / 2;
    return { color: '#f97316', intensity: 0.2 + t * 0.3, opacity: 0.3 + t * 0.2 };
  }
  // Morning (7am - 10am): transitioning to bright
  if (hour >= 7 && hour < 10) {
    const t = (hour - 7) / 3;
    return { color: '#fbbf24', intensity: 0.5 + t * 0.3, opacity: 0.5 + t * 0.2 };
  }
  // Midday (10am - 4pm): bright daylight
  if (hour >= 10 && hour < 16) {
    return { color: '#7dd3fc', intensity: 0.8, opacity: 0.7 };
  }
  // Afternoon (4pm - 6pm): warm golden
  if (hour >= 16 && hour < 18) {
    const t = (hour - 16) / 2;
    return { color: '#fbbf24', intensity: 0.7 - t * 0.2, opacity: 0.6 - t * 0.1 };
  }
  // Dusk (6pm - 8pm): orange/red sunset
  if (hour >= 18 && hour < 20) {
    const t = (hour - 18) / 2;
    return { color: '#f97316', intensity: 0.5 - t * 0.3, opacity: 0.5 - t * 0.2 };
  }

  return { color: '#7dd3fc', intensity: 0.5, opacity: 0.5 };
};

// Physical glass window component that responds to game time daylight
const DaylightWindow: React.FC<{ position: [number, number, number]; size: [number, number] }> = ({ position, size }) => {
  const gameTime = useMillStore((state) => state.gameTime);
  const { color, intensity } = getDaylightProperties(gameTime);

  return (
    <group position={position}>
      {/* Window frame */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[size[0] + 0.4, size[1] + 0.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Glass pane - using standard material for performance */}
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial
          color="#a5d8ff"
          metalness={0.1}
          roughness={0.1}
          transparent
          opacity={0.3}
        />
      </mesh>
      {/* Daylight glow behind glass */}
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[size[0] - 0.2, size[1] - 0.2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity * 0.6}
        />
      </mesh>
    </group>
  );
};

// Light shaft component for volumetric effect from skylights
const LightShaft: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const gameTime = useMillStore((state) => state.gameTime);
  const graphics = useMillStore((state) => state.graphics);
  const { intensity } = getDaylightProperties(gameTime);

  // Check if light shafts are enabled and if it's bright enough
  if (!graphics.enableLightShafts || intensity < 0.3) return null;

  return (
    <mesh position={position} rotation={[0, 0, 0]}>
      <coneGeometry args={[6, 28, 8, 1, true]} />
      <meshBasicMaterial
        color="#fef3c7"
        transparent
        opacity={0.02 * intensity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// Gradient sky dome with time-of-day response
const GradientSky: React.FC = () => {
  const gameTime = useMillStore((state) => state.gameTime);

  const skyColors = useMemo(() => {
    // Determine sky colors based on time of day
    if (gameTime >= 20 || gameTime < 5) {
      // Night
      return { top: '#0c1929', bottom: '#1e293b' };
    } else if (gameTime >= 5 && gameTime < 7) {
      // Dawn
      return { top: '#1e3a5a', bottom: '#f97316' };
    } else if (gameTime >= 7 && gameTime < 10) {
      // Morning
      return { top: '#0ea5e9', bottom: '#fbbf24' };
    } else if (gameTime >= 10 && gameTime < 16) {
      // Midday
      return { top: '#0369a1', bottom: '#7dd3fc' };
    } else if (gameTime >= 16 && gameTime < 18) {
      // Afternoon
      return { top: '#0c4a6e', bottom: '#fbbf24' };
    } else {
      // Dusk
      return { top: '#1e293b', bottom: '#ea580c' };
    }
  }, [gameTime]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(skyColors.top) },
        bottomColor: { value: new THREE.Color(skyColors.bottom) },
        offset: { value: 20 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
  }, [skyColors]);

  // Update colors when time changes
  useMemo(() => {
    shaderMaterial.uniforms.topColor.value.set(skyColors.top);
    shaderMaterial.uniforms.bottomColor.value.set(skyColors.bottom);
  }, [skyColors, shaderMaterial]);

  return (
    <mesh material={shaderMaterial}>
      <sphereGeometry args={[200, 32, 32]} />
    </mesh>
  );
};

// Game time ticker component - throttled to every 500ms to reduce re-renders
const GameTimeTicker: React.FC = () => {
  const tickGameTime = useMillStore((state) => state.tickGameTime);
  const lastTickRef = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastTickRef.current >= 0.5) { // Tick every 500ms (was 100ms)
      // Tick 5 times to maintain same game speed
      for (let i = 0; i < 5; i++) tickGameTime();
      lastTickRef.current = now;
    }
  });

  return null;
};

// Global power flicker state for storm effects
const powerFlickerState = {
  intensity: 1,
  isFlickering: false,
  nextFlickerTime: 0
};

// Storm power flicker controller - manages flicker timing
const StormPowerFlicker: React.FC = () => {
  const weather = useMillStore((state) => state.weather);

  useFrame((state) => {
    const isStormy = weather === 'storm';
    const now = state.clock.elapsedTime;

    if (isStormy) {
      // Check if it's time for a flicker event
      if (now > powerFlickerState.nextFlickerTime) {
        // Random chance of flicker during storm
        if (Math.random() < 0.02) {
          powerFlickerState.isFlickering = true;
          // Flicker duration: 0.1 to 0.5 seconds
          powerFlickerState.nextFlickerTime = now + 0.1 + Math.random() * 0.4;

          // Play electrical buzz sound
          audioManager.playPowerFlicker();
        } else {
          powerFlickerState.nextFlickerTime = now + 0.5;
        }
      }

      // Update flicker intensity
      if (powerFlickerState.isFlickering) {
        // Rapid random fluctuation
        powerFlickerState.intensity = 0.2 + Math.random() * 0.5;

        // Check if flicker should end
        if (now > powerFlickerState.nextFlickerTime) {
          powerFlickerState.isFlickering = false;
          powerFlickerState.intensity = 1;
          // Next potential flicker in 5-20 seconds
          powerFlickerState.nextFlickerTime = now + 5 + Math.random() * 15;
        }
      }
    } else {
      // Reset when not stormy
      powerFlickerState.intensity = 1;
      powerFlickerState.isFlickering = false;
    }
  });

  return null;
};

// Flickering overhead lights component
const FlickeringOverheadLights: React.FC = () => {
  const lightRefs = useRef<THREE.PointLight[]>([]);
  const emissiveRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const baseIntensity = 40;

  useFrame(() => {
    const intensity = baseIntensity * powerFlickerState.intensity;
    const emissiveIntensity = 0.5 * powerFlickerState.intensity;

    lightRefs.current.forEach(light => {
      if (light) light.intensity = intensity;
    });

    emissiveRefs.current.forEach(mat => {
      if (mat) mat.emissiveIntensity = emissiveIntensity;
    });
  });

  return (
    <>
      {[-20, 0, 20].map((x, i) => (
        <group key={i}>
          <pointLight
            ref={(el) => { if (el) lightRefs.current[i] = el; }}
            position={[x, 18, 0]}
            intensity={baseIntensity}
            distance={35}
            decay={2}
            color="#fef3c7"
          />
          {/* Light fixture */}
          <mesh position={[x, 19, 0]}>
            <cylinderGeometry args={[0.5, 0.8, 0.3, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[x, 18.7, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.1, 8]} />
            <meshStandardMaterial
              ref={(el) => { if (el) emissiveRefs.current[i] = el; }}
              color="#fef3c7"
              emissive="#fef3c7"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

// Emergency backup lights - red lights that activate during power flickers
const EmergencyLights: React.FC = () => {
  const weather = useMillStore((state) => state.weather);
  const lightRefs = useRef<THREE.PointLight[]>([]);
  const emissiveRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  // Emergency light positions along walls
  const positions: [number, number, number][] = [
    [-50, 8, -30],
    [-50, 8, 0],
    [-50, 8, 30],
    [50, 8, -30],
    [50, 8, 0],
    [50, 8, 30],
  ];

  useFrame(() => {
    const isStormy = weather === 'storm';
    const isFlickering = powerFlickerState.isFlickering;

    // Emergency lights activate when main power flickers
    const emergencyOn = isStormy && isFlickering;
    const intensity = emergencyOn ? 8 : 0.5;
    const emissiveIntensity = emergencyOn ? 2 : 0.1;

    lightRefs.current.forEach(light => {
      if (light) light.intensity = intensity;
    });

    emissiveRefs.current.forEach(mat => {
      if (mat) mat.emissiveIntensity = emissiveIntensity;
    });
  });

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <pointLight
            ref={(el) => { if (el) lightRefs.current[i] = el; }}
            intensity={0.5}
            distance={15}
            color="#ef4444"
          />
          {/* Emergency light housing */}
          <mesh>
            <boxGeometry args={[0.3, 0.15, 0.15]} />
            <meshStandardMaterial
              ref={(el) => { if (el) emissiveRefs.current[i] = el; }}
              color="#991b1b"
              emissive="#ef4444"
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

export const FactoryEnvironment: React.FC = () => {
  const wallTexture = useWallTexture();
  const wallRoughnessMap = useWallRoughnessMap();
  const graphics = useMillStore((state) => state.graphics);

  // Determine shadow map size based on graphics settings
  const shadowMapSize = graphics.enableHighResShadows ? graphics.shadowMapSize : 2048;

  return (
    <group>
      {/* Game time ticker - advances time each frame */}
      <GameTimeTicker />

      {/* Storm power flicker effect */}
      <StormPowerFlicker />

      {/* Main ambient */}
      <ambientLight intensity={0.15} color="#b4c6e7" />

      {/* Dramatic key light */}
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.001}
        color="#fff5e6"
      />

      {/* Fill light */}
      <directionalLight
        position={[-20, 30, -10]}
        intensity={0.4}
        color="#7dd3fc"
      />

      {/* Industrial overhead lights with flicker capability */}
      <FlickeringOverheadLights />

      {/* Emergency backup lights - visible during power flickers */}
      <EmergencyLights />

      {/* Colored accent lights for drama - reduced intensity */}
      <pointLight position={[-30, 5, -15]} intensity={15} distance={20} color="#3b82f6" />
      <pointLight position={[30, 5, 15]} intensity={15} distance={20} color="#f97316" />

      {/* Spot lights on key machines - shadows disabled to prevent conflicts with directional light */}
      <spotLight
        position={[0, 20, -20]}
        angle={0.3}
        penumbra={0.5}
        intensity={100}
        distance={40}
        color="#ffffff"
        target-position={[0, 0, -20]}
      />

      {/* Contact shadows for grounding - positioned above floor to prevent z-fighting */}
      {graphics.enableContactShadows && (
        <ContactShadows
          position={[0, 0.05, 0]}
          opacity={0.35}
          scale={100}
          blur={2.5}
          far={40}
          color="#000000"
        />
      )}

      {/* Gradient sky dome with time-of-day response */}
      <GradientSky />

      {/* Factory walls - planes facing inward (only visible from inside) */}
      {/* Back wall */}
      <group position={[0, 15, -40]}>
        <mesh receiveShadow>
          <planeGeometry args={[120, 35]} />
          <meshStandardMaterial
            map={wallTexture}
            roughnessMap={wallRoughnessMap}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        {/* Industrial windows - daylight responsive */}
        {[-40, -20, 0, 20, 40].map((x, i) => (
          <DaylightWindow key={i} position={[x, 5, 0.1]} size={[8, 12]} />
        ))}
        {/* Wall panels */}
        {[-50, -30, -10, 10, 30, 50].map((x, i) => (
          <mesh key={i} position={[x, -5, 0.05]}>
            <planeGeometry args={[6, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Front wall */}
      <group position={[0, 15, 40]} rotation={[0, Math.PI, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[120, 35]} />
          <meshStandardMaterial
            map={wallTexture}
            roughnessMap={wallRoughnessMap}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        {/* Large loading bay doors */}
        {[-30, 0, 30].map((x, i) => (
          <mesh key={i} position={[x, -5, 0.1]}>
            <planeGeometry args={[15, 20]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        {/* Door warning stripes */}
        {[-30, 0, 30].map((x, i) => (
          <mesh key={i} position={[x, -14, 0.15]}>
            <planeGeometry args={[15, 2]} />
            <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.2} />
          </mesh>
        ))}
      </group>

      {/* Left wall */}
      <group position={[-55, 15, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[82, 35]} />
          <meshStandardMaterial
            map={wallTexture}
            roughnessMap={wallRoughnessMap}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        {/* Windows - daylight responsive */}
        {[-25, 0, 25].map((z, i) => (
          <DaylightWindow key={i} position={[z, 5, 0.1]} size={[10, 12]} />
        ))}
      </group>

      {/* Right wall */}
      <group position={[55, 15, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[82, 35]} />
          <meshStandardMaterial
            map={wallTexture}
            roughnessMap={wallRoughnessMap}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        {/* Windows - daylight responsive */}
        {[-25, 0, 25].map((z, i) => (
          <DaylightWindow key={i} position={[z, 5, 0.1]} size={[10, 12]} />
        ))}
      </group>

      {/* Ceiling - plane facing down (only visible from below) */}
      <mesh position={[0, 32, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[110, 80]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Skylights with physical glass, light shafts, and lens flares */}
      {[-20, 0, 20].map((x, i) => (
        <group key={i}>
          {/* Skylight frame */}
          <mesh position={[x, 31.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[11, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Glass skylight - using standard material for performance */}
          <mesh position={[x, 31.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[10, 15]} />
            <meshStandardMaterial
              color="#87ceeb"
              metalness={0.1}
              roughness={0.1}
              transparent
              opacity={0.4}
            />
          </mesh>
          {/* Volumetric light shaft */}
          <LightShaft position={[x, 18, 0]} />
          {/* Lens flare when looking at skylight - skip on low/medium graphics */}
          {graphics.quality !== 'low' && graphics.quality !== 'medium' && (
            <LensFlare position={[x, 31.5, 0]} color="#87ceeb" intensity={0.8} />
          )}
        </group>
      ))}

      {/* Support beams - reduce on low graphics */}
      {(graphics.quality === 'low' ? [-20, 0, 20] : [-40, -20, 0, 20, 40]).map((x, i) => (
        <mesh key={i} position={[x, 20, 0]} castShadow={graphics.quality !== 'low'}>
          <boxGeometry args={[0.5, 25, 0.5]} />
          {graphics.quality === 'low' ? (
            <meshBasicMaterial color="#374151" />
          ) : (
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
          )}
        </mesh>
      ))}

      {/* Roof trusses - skip on low graphics */}
      {graphics.quality !== 'low' && [-30, -15, 0, 15, 30].map((z, i) => (
        <mesh key={i} position={[0, 28, z]}>
          <boxGeometry args={[110, 0.3, 0.3]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Ventilation fans - skip on low graphics */}
      {graphics.quality !== 'low' && <VentilationFans />}

      {/* Weather effects visible through skylights */}
      <WeatherEffects />

      {/* Puddle reflections during rain */}
      <PuddleReflections />

      {/* Heat map visualization */}
      <HeatMapVisualization />
    </group>
  );
};

// Ventilation fan component with animation
const VentilationFan: React.FC<{ position: [number, number, number]; rotation?: number; size?: number }> = ({
  position,
  rotation = 0,
  size = 1.5
}) => {
  const bladeRef = useRef<THREE.Group>(null);
  const [speed, setSpeed] = useState(2 + Math.random() * 2);

  // Start fan sound on mount
  useEffect(() => {
    const fanId = `fan-${position.join('-')}`;
    audioManager.registerSoundPosition(fanId, position[0], position[1], position[2]);
  }, [position]);

  useFrame((_, delta) => {
    if (bladeRef.current) {
      bladeRef.current.rotation.z += delta * speed * 2;
    }
  });

  return (
    <group position={position} rotation={[Math.PI / 2, 0, rotation]}>
      {/* Fan housing */}
      <mesh>
        <cylinderGeometry args={[size + 0.2, size + 0.2, 0.3, 32]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Protective grill - front */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[size, size, 0.05, 32]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} wireframe />
      </mesh>
      {/* Protective grill - back */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[size, size, 0.05, 32]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} wireframe />
      </mesh>
      {/* Fan blades */}
      <group ref={bladeRef}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
            <boxGeometry args={[0.15, size * 0.8, 0.05]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        {/* Center hub */}
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

// Collection of ventilation fans around the factory
const VentilationFans: React.FC = () => {
  const fanSoundStarted = useRef(false);

  // Start ventilation fan ambient sound
  useEffect(() => {
    if (!fanSoundStarted.current) {
      fanSoundStarted.current = true;
      audioManager.startVentilationFanSound();
    }
    return () => {
      audioManager.stopVentilationFanSound();
    };
  }, []);

  return (
    <group>
      {/* Wall-mounted exhaust fans on back wall */}
      <VentilationFan position={[-35, 8, -39.5]} size={2} />
      <VentilationFan position={[35, 8, -39.5]} size={2} />

      {/* Side wall fans */}
      <VentilationFan position={[-54.5, 12, -15]} rotation={Math.PI / 2} size={1.8} />
      <VentilationFan position={[-54.5, 12, 15]} rotation={Math.PI / 2} size={1.8} />
      <VentilationFan position={[54.5, 12, -15]} rotation={-Math.PI / 2} size={1.8} />
      <VentilationFan position={[54.5, 12, 15]} rotation={-Math.PI / 2} size={1.8} />

      {/* Ceiling exhaust vents (smaller, faster) */}
      <VentilationFan position={[-30, 31.5, -20]} size={1.2} />
      <VentilationFan position={[30, 31.5, -20]} size={1.2} />
      <VentilationFan position={[-30, 31.5, 20]} size={1.2} />
      <VentilationFan position={[30, 31.5, 20]} size={1.2} />
    </group>
  );
};

// Single ripple mesh with ref-based animation
const RippleMesh: React.FC<{ data: { x: number; z: number; scale: number; opacity: number } }> = ({ data }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const scaleRef = useRef(data.scale);
  const opacityRef = useRef(data.opacity);

  useFrame((_, delta) => {
    scaleRef.current += delta * 2;
    opacityRef.current -= delta * 0.8;
    if (meshRef.current && materialRef.current) {
      const s = scaleRef.current;
      meshRef.current.scale.set(s, s, 1);
      materialRef.current.opacity = Math.max(0, opacityRef.current * 0.4);
    }
  });

  return (
    <mesh ref={meshRef} position={[data.x, 0.03, data.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.35, 32]} />
      <meshBasicMaterial ref={materialRef} color="#7dd3fc" transparent opacity={data.opacity * 0.4} />
    </mesh>
  );
};

// Puddle reflections on floor during rain
const PuddleReflections: React.FC = () => {
  const weather = useMillStore((state) => state.weather);
  const graphics = useMillStore((state) => state.graphics);
  const puddleRef = useRef<THREE.Group>(null);
  // Use a ref for ripple data and only re-render when adding new ripples
  const [rippleKeys, setRippleKeys] = useState<number[]>([]);
  const rippleDataRef = useRef<Map<number, { x: number; z: number; scale: number; opacity: number }>>(new Map());
  const nextRippleIdRef = useRef(0);

  // Generate puddle positions
  const puddlePositions = useMemo(() => [
    { x: -15, z: -10, size: 4, irregular: 0.3 },
    { x: 8, z: 5, size: 3.5, irregular: 0.4 },
    { x: -5, z: 18, size: 5, irregular: 0.2 },
    { x: 20, z: -15, size: 3, irregular: 0.5 },
    { x: -25, z: 12, size: 4.5, irregular: 0.35 },
    { x: 12, z: -5, size: 3.2, irregular: 0.45 },
    { x: -8, z: -20, size: 4, irregular: 0.3 },
    { x: 25, z: 10, size: 3.8, irregular: 0.25 },
  ], []);

  // Add new ripples during rain (infrequent state updates)
  useFrame(() => {
    if ((weather === 'rain' || weather === 'storm') && Math.random() < 0.1) {
      const puddle = puddlePositions[Math.floor(Math.random() * puddlePositions.length)];
      const offsetX = (Math.random() - 0.5) * puddle.size * 0.8;
      const offsetZ = (Math.random() - 0.5) * puddle.size * 0.8;
      const id = nextRippleIdRef.current++;
      rippleDataRef.current.set(id, {
        x: puddle.x + offsetX,
        z: puddle.z + offsetZ,
        scale: 0.1,
        opacity: 0.6
      });
      // Only update state when adding - happens ~6 times/sec max
      setRippleKeys(prev => [...prev.slice(-19), id]);
    }

    // Clean up expired ripples from ref (no state update needed)
    rippleDataRef.current.forEach((data, id) => {
      if (data.opacity <= 0) {
        rippleDataRef.current.delete(id);
      }
    });
  });

  // Don't render puddles in clear weather or on low graphics
  if (weather === 'clear' || weather === 'cloudy' || graphics.quality === 'low') return null;

  const rainIntensity = weather === 'storm' ? 1 : 0.6;

  return (
    <group ref={puddleRef}>
      {/* Puddle reflective surfaces */}
      {puddlePositions.map((puddle, i) => (
        <group key={i} position={[puddle.x, 0.02, puddle.z]}>
          {/* Main puddle surface - reflective */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[puddle.size, 32]} />
            <meshStandardMaterial
              color="#1e3a5f"
              metalness={0.9}
              roughness={0.1 + (1 - rainIntensity) * 0.2}
              transparent
              opacity={0.7 * rainIntensity}
              envMapIntensity={1.5}
            />
          </mesh>
          {/* Puddle edge (darker, blends with floor) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
            <ringGeometry args={[puddle.size * 0.9, puddle.size * 1.1, 32]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.3 * rainIntensity} />
          </mesh>
        </group>
      ))}

      {/* Ripple effects - each ripple animates via its own ref */}
      {rippleKeys.map(id => {
        const data = rippleDataRef.current.get(id);
        return data ? <RippleMesh key={id} data={data} /> : null;
      })}

      {/* Wet floor warning signs */}
      <WetFloorSigns puddlePositions={puddlePositions} />

      {/* Tire tracks on wet floor */}
      <TireTrackSystem puddlePositions={puddlePositions} />

      {/* Ceiling drips */}
      <CeilingDrips />
    </group>
  );
};

// Wet floor warning sign component
const WetFloorSign: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const signRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (signRef.current) {
      // Gentle sway animation
      signRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={signRef} position={position}>
      {/* Sign base/stand */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.4, 0.04, 0.4]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      {/* Sign pole */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>
      {/* Warning triangle sign */}
      <group position={[0, 0.85, 0]}>
        {/* Triangle background */}
        <mesh rotation={[0, 0, 0]}>
          <coneGeometry args={[0.25, 0.4, 3]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} />
        </mesh>
        {/* Inner triangle (black border effect) */}
        <mesh rotation={[0, 0, 0]} position={[0, 0.02, 0.01]}>
          <coneGeometry args={[0.18, 0.3, 3]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} />
        </mesh>
        {/* Exclamation mark - dot */}
        <mesh position={[0, -0.05, 0.12]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>
        {/* Exclamation mark - line */}
        <mesh position={[0, 0.05, 0.12]}>
          <boxGeometry args={[0.03, 0.12, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
};

// Wet floor warning signs near puddles
const WetFloorSigns: React.FC<{ puddlePositions: { x: number; z: number; size: number }[] }> = ({ puddlePositions }) => {
  const weather = useMillStore((state) => state.weather);

  // Only show signs during rain
  if (weather !== 'rain' && weather !== 'storm') return null;

  // Place signs near larger puddles
  const signPositions = useMemo(() => {
    return puddlePositions
      .filter(p => p.size >= 3.5)
      .map(p => ({
        x: p.x + p.size * 0.8,
        z: p.z + p.size * 0.3
      }));
  }, [puddlePositions]);

  return (
    <group>
      {signPositions.map((pos, i) => (
        <WetFloorSign key={i} position={[pos.x, 0, pos.z]} />
      ))}
    </group>
  );
};

// Tire track on wet floor
interface TireTrack {
  id: number;
  points: [number, number, number][];
  opacity: number;
  width: number;
}

// Single track mesh with ref-based fade animation
const TrackMesh: React.FC<{ track: TireTrack; fadeRate: number }> = ({ track, fadeRate }) => {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const opacityRef = useRef(track.opacity);

  useFrame((_, delta) => {
    opacityRef.current -= delta * fadeRate;
    if (materialRef.current) {
      materialRef.current.opacity = Math.max(0, opacityRef.current);
    }
  });

  const rotation = Math.atan2(
    track.points[1][2] - track.points[0][2],
    track.points[1][0] - track.points[0][0]
  );

  return (
    <mesh position={track.points[0]} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={[1.5, track.width]} />
      <meshBasicMaterial ref={materialRef} color="#1e293b" transparent opacity={track.opacity} depthWrite={false} />
    </mesh>
  );
};

// Tire track system - shows tracks when forklifts drive through puddles
const TireTrackSystem: React.FC<{ puddlePositions: { x: number; z: number; size: number }[] }> = ({ puddlePositions }) => {
  const weather = useMillStore((state) => state.weather);
  const [trackKeys, setTrackKeys] = useState<number[]>([]);
  const trackDataRef = useRef<Map<number, TireTrack>>(new Map());
  const trackIdRef = useRef(0);
  const lastTrackTimeRef = useRef<Map<string, number>>(new Map());
  const isRainingRef = useRef(false);

  // Check if a point is in a puddle
  const isInPuddle = (x: number, z: number): boolean => {
    for (const puddle of puddlePositions) {
      const dx = x - puddle.x;
      const dz = z - puddle.z;
      if (Math.sqrt(dx * dx + dz * dz) < puddle.size) {
        return true;
      }
    }
    return false;
  };

  // Track weather state
  isRainingRef.current = weather === 'rain' || weather === 'storm';

  useFrame((state) => {
    if (!isRainingRef.current) return;

    // Check forklift positions from the scene
    const forkliftPaths = [
      { id: 'forklift-1', x: -28 + Math.sin(state.clock.elapsedTime * 0.3) * 30, z: -18 + Math.cos(state.clock.elapsedTime * 0.2) * 25 },
      { id: 'forklift-2', x: 28 + Math.sin(state.clock.elapsedTime * 0.25) * 30, z: 5 + Math.cos(state.clock.elapsedTime * 0.3) * 20 }
    ];

    forkliftPaths.forEach(forklift => {
      if (isInPuddle(forklift.x, forklift.z)) {
        const now = state.clock.elapsedTime;
        const lastTime = lastTrackTimeRef.current.get(forklift.id) || 0;

        if (now - lastTime > 0.3) {
          lastTrackTimeRef.current.set(forklift.id, now);

          const trackId = trackIdRef.current++;
          const angle = Math.random() * Math.PI * 2;
          const offsetX = Math.cos(angle) * 0.3;
          const offsetZ = Math.sin(angle) * 0.3;

          trackDataRef.current.set(trackId, {
            id: trackId,
            points: [
              [forklift.x - offsetX, 0.015, forklift.z - offsetZ],
              [forklift.x + offsetX, 0.015, forklift.z + offsetZ]
            ],
            opacity: 0.4,
            width: 0.15 + Math.random() * 0.1
          });
          // Only re-render when adding new track
          setTrackKeys(prev => [...prev.slice(-29), trackId]);
        }
      }
    });
  });

  // Clean up expired tracks periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      setTrackKeys(prev => prev.filter(id => trackDataRef.current.has(id)));
    }, 5000);
    return () => clearInterval(cleanup);
  }, []);

  if (trackKeys.length === 0) return null;

  const fadeRate = isRainingRef.current ? 0.08 : 0.5;

  return (
    <group>
      {trackKeys.map(id => {
        const track = trackDataRef.current.get(id);
        return track ? <TrackMesh key={id} track={track} fadeRate={fadeRate} /> : null;
      })}
    </group>
  );
};

// Splash particle for when drips hit the floor
interface SplashParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

// Single drip with ref-based physics
const DripMesh: React.FC<{
  data: { x: number; z: number };
  onImpact: (x: number, z: number) => void;
}> = ({ data, onImpact }) => {
  const groupRef = useRef<THREE.Group>(null);
  const dropletRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const trailMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const yRef = useRef(31);
  const vyRef = useRef(0);
  const opacityRef = useRef(0.8);
  const hasImpactedRef = useRef(false);

  useFrame((_, delta) => {
    if (hasImpactedRef.current) return;

    vyRef.current -= 25 * delta;
    yRef.current += vyRef.current * delta;

    if (yRef.current <= 0.1 && !hasImpactedRef.current) {
      hasImpactedRef.current = true;
      onImpact(data.x, data.z);
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    if (yRef.current < 1) {
      opacityRef.current -= delta * 3;
    }

    if (groupRef.current) {
      groupRef.current.position.y = yRef.current;
    }
    if (materialRef.current) {
      materialRef.current.opacity = opacityRef.current * 0.6;
    }
    if (trailRef.current) {
      trailRef.current.visible = vyRef.current < -5;
      trailRef.current.position.y = 0.15;
    }
    if (trailMaterialRef.current) {
      trailMaterialRef.current.opacity = opacityRef.current * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[data.x, 31, data.z]}>
      <mesh ref={dropletRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial ref={materialRef} color="#7dd3fc" transparent opacity={0.48} metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh ref={trailRef} visible={false}>
        <cylinderGeometry args={[0.02, 0.04, 0.3, 6]} />
        <meshBasicMaterial ref={trailMaterialRef} color="#7dd3fc" transparent opacity={0.24} />
      </mesh>
    </group>
  );
};

// Single splash particle with ref-based physics
const SplashMesh: React.FC<{ data: SplashParticle }> = ({ data }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const posRef = useRef({ x: data.x, y: data.y, z: data.z });
  const velRef = useRef({ vx: data.vx, vy: data.vy, vz: data.vz });
  const lifeRef = useRef(data.life);

  useFrame((_, delta) => {
    velRef.current.vy -= 15 * delta;
    posRef.current.x += velRef.current.vx * delta;
    posRef.current.y = Math.max(0, posRef.current.y + velRef.current.vy * delta);
    posRef.current.z += velRef.current.vz * delta;
    lifeRef.current -= delta * 2.5;

    if (meshRef.current) {
      meshRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
    }
    if (materialRef.current) {
      materialRef.current.opacity = Math.max(0, lifeRef.current * 0.5);
    }
    if (ringRef.current && ringMaterialRef.current) {
      ringRef.current.visible = lifeRef.current > 0.7;
      ringRef.current.position.set(posRef.current.x, 0.02, posRef.current.z);
      const ringSize = (1 - lifeRef.current) * 0.5;
      ringRef.current.scale.set(ringSize * 10 + 1, ringSize * 10 + 1, 1);
      ringMaterialRef.current.opacity = Math.max(0, (lifeRef.current - 0.7) * 2);
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={[data.x, data.y, data.z]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial ref={materialRef} color="#7dd3fc" transparent opacity={0.5} />
      </mesh>
      <mesh ref={ringRef} position={[data.x, 0.02, data.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.05, 0.1, 16]} />
        <meshBasicMaterial ref={ringMaterialRef} color="#7dd3fc" transparent opacity={0.6} />
      </mesh>
    </>
  );
};

// Ceiling drips during/after rain with splash effects
const CeilingDrips: React.FC = () => {
  const weather = useMillStore((state) => state.weather);
  const graphics = useMillStore((state) => state.graphics);
  const [dripKeys, setDripKeys] = useState<number[]>([]);
  const [splashKeys, setSplashKeys] = useState<number[]>([]);
  const dripDataRef = useRef<Map<number, { x: number; z: number }>>(new Map());
  const splashDataRef = useRef<Map<number, SplashParticle>>(new Map());
  const dripIdRef = useRef(0);
  const splashIdRef = useRef(0);
  const lastDripTimeRef = useRef(0);

  // Drip source positions (near skylights and roof joints)
  const dripSources = useMemo(() => [
    { x: -20, z: 0 },
    { x: 0, z: 0 },
    { x: 20, z: 0 },
    { x: -25, z: -15 },
    { x: 25, z: 15 },
    { x: -15, z: 20 },
    { x: 15, z: -20 },
  ], []);

  // Spawn splash particles at impact point
  const handleImpact = useCallback((x: number, z: number) => {
    const particleCount = graphics.quality === 'medium' ? 4 : 6;
    const newIds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2;
      const id = splashIdRef.current++;
      splashDataRef.current.set(id, {
        id,
        x,
        y: 0.1,
        z,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
        life: 1
      });
      newIds.push(id);
    }

    setSplashKeys(prev => [...prev.slice(-24), ...newIds]);
    audioManager.playWaterDrip();
  }, [graphics.quality]);

  // Spawn new drips during rain
  useFrame((state) => {
    const isRaining = weather === 'rain' || weather === 'storm';
    if (!isRaining || graphics.quality === 'low') return;

    const now = state.clock.elapsedTime;
    const dripInterval = weather === 'storm' ? 0.3 : 0.8;

    if (now - lastDripTimeRef.current > dripInterval) {
      lastDripTimeRef.current = now;
      const source = dripSources[Math.floor(Math.random() * dripSources.length)];
      const dripId = dripIdRef.current++;
      dripDataRef.current.set(dripId, {
        x: source.x + (Math.random() - 0.5) * 2,
        z: source.z + (Math.random() - 0.5) * 2
      });
      setDripKeys(prev => [...prev.slice(-19), dripId]);
    }
  });

  if (dripKeys.length === 0 && splashKeys.length === 0) return null;

  return (
    <group>
      {dripKeys.map(id => {
        const data = dripDataRef.current.get(id);
        return data ? <DripMesh key={id} data={data} onImpact={handleImpact} /> : null;
      })}
      {splashKeys.map(id => {
        const data = splashDataRef.current.get(id);
        return data ? <SplashMesh key={id} data={data} /> : null;
      })}
    </group>
  );
};

// Weather effects component with enhanced rain
const WeatherEffects: React.FC = () => {
  const weather = useMillStore((state) => state.weather);
  const graphics = useMillStore((state) => state.graphics);
  const rainRef = useRef<THREE.Points>(null);
  const rainStreaksRef = useRef<THREE.Points>(null);
  const splashRef = useRef<THREE.Points>(null);

  // Rain particle count based on graphics quality
  const rainCount = graphics.quality === 'low' ? 150 : graphics.quality === 'medium' ? 300 : 500;
  const streakCount = graphics.quality === 'low' ? 0 : graphics.quality === 'medium' ? 100 : 200;
  const splashCount = graphics.quality === 'low' ? 0 : 50;

  // Main rain positions (sky above skylights)
  const rainPositions = useMemo(() => {
    const pos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = 32 + Math.random() * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [rainCount]);

  // Rain streak positions (longer, faster drops for storm effect)
  const streakPositions = useMemo(() => {
    const pos = new Float32Array(streakCount * 3);
    for (let i = 0; i < streakCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = 32 + Math.random() * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [streakCount]);

  // Rain splash positions (where rain hits skylights)
  const splashPositions = useMemo(() => {
    const pos = new Float32Array(splashCount * 3);
    // Place splashes near skylight positions
    const skylightX = [-20, 0, 20];
    for (let i = 0; i < splashCount; i++) {
      const sx = skylightX[i % 3];
      pos[i * 3] = sx + (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = 32 + Math.random() * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return pos;
  }, [splashCount]);

  const splashVelocities = useRef<Float32Array>(new Float32Array(splashCount * 3));
  const splashLife = useRef<Float32Array>(new Float32Array(splashCount));

  useFrame((_, delta) => {
    // Animate main rain
    if (rainRef.current && (weather === 'rain' || weather === 'storm')) {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array;
      const speed = weather === 'storm' ? 1.2 : 0.6;
      const windDrift = weather === 'storm' ? 0.3 : 0.1;

      for (let i = 0; i < rainCount; i++) {
        positions[i * 3] += (Math.random() - 0.5) * windDrift * delta; // Wind drift
        positions[i * 3 + 1] -= speed;
        if (positions[i * 3 + 1] < 30) {
          positions[i * 3 + 1] = 47;
          positions[i * 3] = (Math.random() - 0.5) * 60;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Animate rain streaks (faster, longer)
    if (rainStreaksRef.current && weather === 'storm' && streakCount > 0) {
      const positions = rainStreaksRef.current.geometry.attributes.position.array as Float32Array;
      const speed = 2.5;

      for (let i = 0; i < streakCount; i++) {
        positions[i * 3] += (Math.random() - 0.5) * 0.5 * delta;
        positions[i * 3 + 1] -= speed;
        if (positions[i * 3 + 1] < 30) {
          positions[i * 3 + 1] = 52;
          positions[i * 3] = (Math.random() - 0.5) * 60;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
      }
      rainStreaksRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Animate splashes
    if (splashRef.current && (weather === 'rain' || weather === 'storm') && splashCount > 0) {
      const positions = splashRef.current.geometry.attributes.position.array as Float32Array;
      const skylightX = [-20, 0, 20];

      for (let i = 0; i < splashCount; i++) {
        splashLife.current[i] -= delta * 3;

        if (splashLife.current[i] <= 0) {
          // Respawn splash
          const sx = skylightX[Math.floor(Math.random() * 3)];
          positions[i * 3] = sx + (Math.random() - 0.5) * 10;
          positions[i * 3 + 1] = 32;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
          splashVelocities.current[i * 3] = (Math.random() - 0.5) * 2;
          splashVelocities.current[i * 3 + 1] = 1 + Math.random();
          splashVelocities.current[i * 3 + 2] = (Math.random() - 0.5) * 2;
          splashLife.current[i] = 0.3 + Math.random() * 0.3;
        } else {
          // Update position
          positions[i * 3] += splashVelocities.current[i * 3] * delta;
          positions[i * 3 + 1] += splashVelocities.current[i * 3 + 1] * delta;
          positions[i * 3 + 2] += splashVelocities.current[i * 3 + 2] * delta;
          splashVelocities.current[i * 3 + 1] -= 8 * delta; // Gravity
        }
      }
      splashRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (weather === 'clear') return null;

  return (
    <group>
      {/* Clouds visible through skylights */}
      {(weather === 'cloudy' || weather === 'rain' || weather === 'storm') && (
        <group position={[0, 35, 0]}>
          {[[-15, 0], [0, 5], [15, -3], [-8, 8], [10, 10]].map(([x, z], i) => (
            <mesh key={i} position={[x, Math.random() * 3, z]}>
              <sphereGeometry args={[4 + Math.random() * 3, 16, 16]} />
              <meshBasicMaterial
                color={weather === 'storm' ? '#374151' : '#94a3b8'}
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Main rain particles - key forces remount when count changes */}
      {(weather === 'rain' || weather === 'storm') && (
        <points ref={rainRef} key={`rain-${rainCount}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={rainCount}
              array={rainPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={weather === 'storm' ? 0.08 : 0.05}
            color={weather === 'storm' ? '#64748b' : '#94a3b8'}
            transparent
            opacity={0.7}
            sizeAttenuation
          />
        </points>
      )}

      {/* Rain streaks for storm (faster, longer drops) - key forces remount when count changes */}
      {weather === 'storm' && streakCount > 0 && (
        <points ref={rainStreaksRef} key={`streaks-${streakCount}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={streakCount}
              array={streakPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.15}
            color="#94a3b8"
            transparent
            opacity={0.4}
            sizeAttenuation
          />
        </points>
      )}

      {/* Rain splashes on skylights - key forces remount when count changes */}
      {(weather === 'rain' || weather === 'storm') && splashCount > 0 && (
        <points ref={splashRef} key={`splash-${splashCount}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={splashCount}
              array={splashPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.1}
            color="#b4c6e7"
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      )}

      {/* Storm lightning flash - synced with audio */}
      {weather === 'storm' && <LightningFlash />}
    </group>
  );
};

// Lightning flash effect - synced with audio thunder
const LightningFlash: React.FC = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  const [flashIntensity, setFlashIntensity] = useState(0);
  const screenFlashRef = useRef<THREE.Mesh>(null);

  // Subscribe to thunder events from audio manager
  useEffect(() => {
    const triggerFlash = () => {
      if (!lightRef.current) return;

      // Multi-stage flash for realistic lightning
      // Stage 1: Initial bright flash
      lightRef.current.intensity = 300;
      setFlashIntensity(0.15);

      // Stage 2: Brief dim
      setTimeout(() => {
        if (lightRef.current) {
          lightRef.current.intensity = 50;
          setFlashIntensity(0.03);
        }
      }, 60);

      // Stage 3: Second flash (often lightning has multiple strokes)
      setTimeout(() => {
        if (lightRef.current) {
          lightRef.current.intensity = 250;
          setFlashIntensity(0.12);
        }
      }, 120);

      // Stage 4: Fade out
      setTimeout(() => {
        if (lightRef.current) {
          lightRef.current.intensity = 100;
          setFlashIntensity(0.05);
        }
      }, 180);

      // Stage 5: Off
      setTimeout(() => {
        if (lightRef.current) {
          lightRef.current.intensity = 0;
          setFlashIntensity(0);
        }
      }, 250);
    };

    // Subscribe to thunder events
    const unsubscribe = audioManager.onThunder(triggerFlash);
    return unsubscribe;
  }, []);

  return (
    <group>
      {/* Point light for scene illumination */}
      <pointLight
        ref={lightRef}
        position={[0, 40, 0]}
        color="#f0f9ff"
        intensity={0}
        distance={150}
      />
      {/* Screen flash overlay for dramatic effect */}
      {flashIntensity > 0 && (
        <mesh ref={screenFlashRef} position={[0, 15, 0]}>
          <sphereGeometry args={[80, 8, 8]} />
          <meshBasicMaterial
            color="#f0f9ff"
            transparent
            opacity={flashIntensity}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

// Heat map visualization
const HeatMapVisualization: React.FC = () => {
  const heatMapData = useMillStore((state) => state.heatMapData);
  const showHeatMap = useMillStore((state) => state.showHeatMap);

  if (!showHeatMap || heatMapData.length === 0) return null;

  return (
    <group position={[0, 0.1, 0]}>
      {heatMapData.map((point, i) => (
        <mesh key={i} position={[point.x, 0, point.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1 + point.intensity * 0.2, 16]} />
          <meshBasicMaterial
            color={point.intensity > 5 ? '#ef4444' : point.intensity > 3 ? '#f97316' : '#22c55e'}
            transparent
            opacity={0.2 + point.intensity * 0.05}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
