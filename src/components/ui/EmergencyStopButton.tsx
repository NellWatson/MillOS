import React from 'react';
import { OctagonX } from 'lucide-react';
import { useSafetyStore } from '../../stores/safetyStore';
import { audioManager } from '../../utils/audioManager';

export const EmergencyStopButton: React.FC = () => {
  const forkliftEmergencyStop = useSafetyStore((state) => state.forkliftEmergencyStop);
  const setForkliftEmergencyStop = useSafetyStore((state) => state.setForkliftEmergencyStop);
  const addSafetyIncident = useSafetyStore((state) => state.addSafetyIncident);

  const handleEmergencyStop = () => {
    const newState = !forkliftEmergencyStop;
    setForkliftEmergencyStop(newState);
    if (newState) {
      audioManager.playEmergencyStop();
      addSafetyIncident({
        type: 'emergency',
        description: 'Emergency stop activated - all forklifts halted',
      });
    }
  };

  return (
    <button
      onClick={handleEmergencyStop}
      className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
        forkliftEmergencyStop
          ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
          : 'bg-slate-800 text-red-400 hover:bg-red-900/50 border border-red-800'
      }`}
    >
      <OctagonX className="w-5 h-5" />
      {forkliftEmergencyStop ? 'RELEASE E-STOP' : 'EMERGENCY STOP'}
    </button>
  );
};
