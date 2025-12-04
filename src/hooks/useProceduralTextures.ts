import { useMemo } from 'react';
import * as THREE from 'three';

// Procedural metal texture generator for enhanced metal surfaces
export const useProceduralMetalTexture = (enabled: boolean, seed: number = 0) => {
  return useMemo(() => {
    if (!enabled) return { roughnessMap: null, normalMap: null };

    const random = (s: number) => Math.abs(Math.sin(s * 12.9898 + 78.233) * 43758.5453) % 1;

    // Create roughness variation texture
    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = roughnessCanvas.height = 256;
    const rCtx = roughnessCanvas.getContext('2d')!;

    rCtx.fillStyle = '#666';
    rCtx.fillRect(0, 0, 256, 256);

    // Weld lines
    rCtx.fillStyle = '#444';
    for (let y = 40; y < 256; y += 60) {
      rCtx.fillRect(0, y + (seed % 10), 256, 3);
    }

    // Scratches
    rCtx.strokeStyle = '#555';
    rCtx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      rCtx.beginPath();
      rCtx.moveTo(random(seed + i) * 256, random(seed + i + 100) * 256);
      rCtx.lineTo(random(seed + i + 50) * 256, random(seed + i + 150) * 256);
      rCtx.stroke();
    }

    // Wear spots
    for (let i = 0; i < 15; i++) {
      const x = random(seed + i * 3) * 256;
      const y = random(seed + i * 3 + 1) * 256;
      const r = 5 + random(seed + i * 3 + 2) * 15;
      const gradient = rCtx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(
        0,
        `rgb(${100 + random(seed + i) * 40}, ${100 + random(seed + i) * 40}, ${100 + random(seed + i) * 40})`
      );
      gradient.addColorStop(1, 'rgba(102, 102, 102, 0)');
      rCtx.fillStyle = gradient;
      rCtx.beginPath();
      rCtx.arc(x, y, r, 0, Math.PI * 2);
      rCtx.fill();
    }

    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTexture.wrapS = roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(1, 2);

    // Create enhanced normal map with industrial details
    const normalCanvas = document.createElement('canvas');
    const normalSize = 256;
    normalCanvas.width = normalCanvas.height = normalSize;
    const nCtx = normalCanvas.getContext('2d')!;

    // Base neutral normal (pointing up: R=128, G=128, B=255)
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, normalSize, normalSize);

    // Helper to draw normal-mapped features
    const drawNormalBump = (x: number, y: number, radius: number, height: number) => {
      const gradient = nCtx.createRadialGradient(x, y, 0, x, y, radius);
      // Center is raised (brighter green = pointing forward)
      const centerG = Math.min(255, 128 + height * 60);
      gradient.addColorStop(0, `rgb(128, ${centerG}, 255)`);
      gradient.addColorStop(0.7, 'rgb(128, 128, 255)');
      gradient.addColorStop(1, `rgb(128, ${Math.max(0, 128 - height * 30)}, 255)`);
      nCtx.fillStyle = gradient;
      nCtx.beginPath();
      nCtx.arc(x, y, radius, 0, Math.PI * 2);
      nCtx.fill();
    };

    // Add rivets in grid pattern
    const rivetSpacing = 48;
    const rivetRadius = 4;
    for (let row = 0; row < normalSize / rivetSpacing; row++) {
      for (let col = 0; col < normalSize / rivetSpacing; col++) {
        const x = 24 + col * rivetSpacing + (random(seed + row * 10 + col) - 0.5) * 4;
        const y = 24 + row * rivetSpacing + (random(seed + row * 10 + col + 50) - 0.5) * 4;
        drawNormalBump(x, y, rivetRadius, 1.5);
      }
    }

    // Panel seam lines (horizontal) - create edge lighting effect
    for (let y = 64; y < normalSize; y += 64) {
      // Top edge of seam (light from above)
      nCtx.fillStyle = 'rgb(128, 160, 255)';
      nCtx.fillRect(0, y - 2, normalSize, 2);
      // Bottom edge of seam (shadow)
      nCtx.fillStyle = 'rgb(128, 96, 255)';
      nCtx.fillRect(0, y, normalSize, 2);
    }

    // Panel seam lines (vertical)
    for (let x = 128; x < normalSize; x += 128) {
      // Left edge (light)
      nCtx.fillStyle = 'rgb(160, 128, 255)';
      nCtx.fillRect(x - 2, 0, 2, normalSize);
      // Right edge (shadow)
      nCtx.fillStyle = 'rgb(96, 128, 255)';
      nCtx.fillRect(x, 0, 2, normalSize);
    }

    // Scratches with directional normals
    for (let i = 0; i < 20; i++) {
      const x1 = random(seed + i * 7) * normalSize;
      const y1 = random(seed + i * 7 + 1) * normalSize;
      const angle = random(seed + i * 7 + 2) * Math.PI;
      const length = 20 + random(seed + i * 7 + 3) * 40;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;

      // Scratch creates a groove - perpendicular normal displacement
      const perpAngle = angle + Math.PI / 2;
      const normalX = Math.cos(perpAngle) * 30;
      const normalY = Math.sin(perpAngle) * 30;

      nCtx.strokeStyle = `rgb(${128 + normalX}, ${128 + normalY}, 240)`;
      nCtx.lineWidth = 1;
      nCtx.beginPath();
      nCtx.moveTo(x1, y1);
      nCtx.lineTo(x2, y2);
      nCtx.stroke();
    }

    // Dents (inverted bumps)
    for (let i = 0; i < 5; i++) {
      const x = random(seed + i * 11) * normalSize;
      const y = random(seed + i * 11 + 1) * normalSize;
      const radius = 8 + random(seed + i * 11 + 2) * 12;
      const gradient = nCtx.createRadialGradient(x, y, 0, x, y, radius);
      // Center is depressed (darker green)
      gradient.addColorStop(0, 'rgb(128, 80, 255)');
      gradient.addColorStop(0.6, 'rgb(128, 128, 255)');
      gradient.addColorStop(1, 'rgb(128, 150, 255)');
      nCtx.fillStyle = gradient;
      nCtx.beginPath();
      nCtx.arc(x, y, radius, 0, Math.PI * 2);
      nCtx.fill();
    }

    // Add subtle surface noise
    const imageData = nCtx.getImageData(0, 0, normalSize, normalSize);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (random(seed + i) - 0.5) * 6;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
    }
    nCtx.putImageData(imageData, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;

    return { roughnessMap: roughnessTexture, normalMap: normalTexture };
  }, [enabled, seed]);
};

// Generate procedural wall texture with industrial detailing
export const useWallTexture = () => {
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
export const useWallRoughnessMap = () => {
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

// Generate procedural concrete texture for floor
export const useConcreteTexture = () => {
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

// Generate bump map for concrete surface detail
export const useConcreteBumpMap = () => {
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
export const useHazardStripeTexture = (type: 'walkway' | 'danger') => {
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
