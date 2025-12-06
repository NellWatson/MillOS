import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useGameSimulationStore } from '../stores/gameSimulationStore';

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
    const meshRef = useRef<THREE.Mesh>(null);

    // Enhanced sky colors with horizon color for each time of day
    const skyColors = useMemo(() => {
        // [Top, Bottom, Horizon]
        if (gameTime >= 21 || gameTime < 5) {
            // Deep Night (21:00 - 05:00)
            return {
                top: '#0a0f1a',
                bottom: '#1a2744',
                horizon: '#2d3748',
            };
        }
        if (gameTime >= 5 && gameTime < 6) {
            // Early Dawn (05:00 - 06:00)
            return {
                top: '#1e1b4b',
                bottom: '#4c1d95',
                horizon: '#f97316',
            };
        }
        if (gameTime >= 6 && gameTime < 8) {
            // Dawn/Sunrise (06:00 - 08:00)
            return {
                top: '#3b0764',
                bottom: '#f59e0b',
                horizon: '#fbbf24',
            };
        }
        if (gameTime >= 8 && gameTime < 10) {
            // Morning (08:00 - 10:00)
            return {
                top: '#0284c7',
                bottom: '#7dd3fc',
                horizon: '#fef3c7',
            };
        }
        if (gameTime >= 10 && gameTime < 16) {
            // Midday (10:00 - 16:00)
            return {
                top: '#0369a1',
                bottom: '#7dd3fc',
                horizon: '#bae6fd',
            };
        }
        if (gameTime >= 16 && gameTime < 18) {
            // Afternoon (16:00 - 18:00)
            return {
                top: '#075985',
                bottom: '#38bdf8',
                horizon: '#fed7aa',
            };
        }
        if (gameTime >= 18 && gameTime < 19) {
            // Golden Hour (18:00 - 19:00)
            return {
                top: '#0c4a6e',
                bottom: '#f97316',
                horizon: '#fbbf24',
            };
        }
        if (gameTime >= 19 && gameTime < 21) {
            // Dusk/Twilight (19:00 - 21:00)
            return {
                top: '#1e1b4b',
                bottom: '#ea580c',
                horizon: '#dc2626',
            };
        }
        // Default to midday
        return {
            top: '#0369a1',
            bottom: '#7dd3fc',
            horizon: '#bae6fd',
        };
    }, [gameTime]);

    // Cloud density based on weather
    const cloudDensity = useMemo(() => {
        switch (weather) {
            case 'clear': return 0.3;
            case 'cloudy': return 0.7;
            case 'rain': return 0.9;
            case 'storm': return 1.0;
            default: return 0.5;
        }
    }, [weather]);

    // Sun angle calculation - 6am = sunrise (0), 12pm = zenith (PI/2), 6pm = sunset (PI)
    const sunAngle = useMemo(() => {
        return ((gameTime - 6) / 12) * Math.PI;
    }, [gameTime]);

    // Sun position - orbits from East (negative Z) to West (positive Z)
    const sunPosition = useMemo(() => {
        const radius = 400;
        return new THREE.Vector3(
            0,
            Math.sin(sunAngle) * radius,
            Math.cos(sunAngle) * radius
        );
    }, [sunAngle]);

    // Moon position - opposite to sun
    const moonPosition = useMemo(() => {
        const radius = 400;
        return new THREE.Vector3(
            0,
            Math.sin(sunAngle + Math.PI) * radius,
            Math.cos(sunAngle + Math.PI) * radius
        );
    }, [sunAngle]);

    // Sun visibility (above horizon)
    const sunVisible = sunPosition.y > -10;
    const moonVisible = moonPosition.y > -10;

    // Sun color based on position
    const sunColor = useMemo(() => {
        if (sunAngle < 0.3 || sunAngle > 2.84) {
            return '#ff6b35'; // Orange at sunrise/sunset
        }
        return '#fdb813'; // Yellow during day
    }, [sunAngle]);

    // Sun glow intensity
    const sunIntensity = useMemo(() => {
        if (!sunVisible) return 0;
        return Math.max(0, Math.sin(sunAngle)) * 2;
    }, [sunVisible, sunAngle]);

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
    });

    return (
        <group>
            {/* Sky Dome */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[290, 64, 64]} />
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

            {/* Sun - bright yellow/orange sphere with glow */}
            {sunVisible && (
                <group position={sunPosition}>
                    {/* Sun core */}
                    <mesh>
                        <sphereGeometry args={[15, 32, 32]} />
                        <meshBasicMaterial color={sunColor} />
                    </mesh>
                    {/* Sun glow */}
                    <mesh>
                        <sphereGeometry args={[25, 32, 32]} />
                        <meshBasicMaterial
                            color={sunColor}
                            transparent
                            opacity={0.3}
                        />
                    </mesh>
                    {/* Sun light */}
                    <pointLight
                        intensity={sunIntensity}
                        distance={1000}
                        decay={2}
                        color="#fff7ed"
                    />
                </group>
            )}

            {/* Moon - pale sphere with subtle glow */}
            {moonVisible && (
                <group position={moonPosition}>
                    {/* Moon surface */}
                    <mesh>
                        <sphereGeometry args={[12, 32, 32]} />
                        <meshStandardMaterial
                            color="#e2e8f0"
                            emissive="#94a3b8"
                            emissiveIntensity={0.3}
                        />
                    </mesh>
                    {/* Moon glow */}
                    <mesh>
                        <sphereGeometry args={[18, 32, 32]} />
                        <meshBasicMaterial
                            color="#cbd5e1"
                            transparent
                            opacity={0.15}
                        />
                    </mesh>
                    {/* Subtle moon light */}
                    <pointLight
                        intensity={0.3}
                        distance={500}
                        decay={2}
                        color="#94a3b8"
                    />
                </group>
            )}

            {/* Horizon Silhouette Ring */}
            <HorizonRing />
        </group>
    );
};

const HorizonRing: React.FC = () => {
    const texture = useTexture('/assets/horizon_silhouette.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(4, 1); // Repeat 4 times around the horizon

    return (
        <mesh position={[0, 10, 0]}>
            {/* Height 60 to be visible over potential ground obstacles */}
            <cylinderGeometry args={[280, 280, 60, 64, 1, true]} />
            <meshBasicMaterial
                map={texture}
                transparent
                side={THREE.DoubleSide}
                alphaTest={0.5} // Cutout transparency
                color="#000000" // Silhouette color
            />
        </mesh>
    );
}
