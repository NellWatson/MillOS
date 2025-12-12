import React from 'react';
import { MergedTruckModel } from './MergedTruckParts';
import type { TruckAnimState } from './useTruckPhysics';

interface TruckModelProps {
  color: string;
  company: string;
  plateNumber: string;
  wheelRotation: React.MutableRefObject<number>;
  throttle: React.MutableRefObject<number>;
  trailerAngle: React.MutableRefObject<number>;
  getTruckState: () => TruckAnimState;
}

export const TruckModel: React.FC<TruckModelProps> = (props) => {
  return <MergedTruckModel {...props} />;
};
