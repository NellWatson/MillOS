import React from 'react';

interface FactoryLightingProps {
  floorWidth: number;
  floorDepth: number;
}

export const FactoryLighting: React.FC<FactoryLightingProps> = () => {
  return (
    <group>
      {/* Overhead lighting is handled by the Environment component */}
      {/* This component is a placeholder for any future factory-specific lighting fixtures */}
    </group>
  );
};
