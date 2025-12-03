import { useFrame, useThree } from '@react-three/fiber';
import { audioManager } from '../utils/audioManager';
import { useMillStore } from '../store';

/**
 * SpatialAudioTracker component
 * Tracks camera position and updates the audio manager for spatial audio calculations.
 * Sounds from forklifts, machines, etc. will be louder when the camera is closer.
 * Also updates time-of-day audio based on game time.
 */
export const SpatialAudioTracker: React.FC = () => {
  const { camera } = useThree();
  const gameTime = useMillStore(state => state.gameTime);

  useFrame(() => {
    // Update the audio manager with the current camera position
    audioManager.updateCameraPosition(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    // Update time-of-day audio (birds quieter at night, crickets, etc.)
    audioManager.updateTimeOfDay(gameTime);
  });

  return null;
};
