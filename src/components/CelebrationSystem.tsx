import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Award, Target } from 'lucide-react';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useProductionStore } from '../stores/productionStore';
import { useSafetyStore } from '../stores/safetyStore';
import { ConfettiBurst } from './ConfettiBurst';
import { audioManager } from '../utils/audioManager';

// Production milestone thresholds
const MILESTONES = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];

export const CelebrationSystem: React.FC = () => {
  const [activeConfetti, setActiveConfetti] = useState<
    Array<{ id: string; position: [number, number, number] }>
  >([]);
  const [milestoneDisplay, setMilestoneDisplay] = useState<{
    value: number;
    show: boolean;
  } | null>(null);

  const { celebrations, triggerCelebration, clearCelebration } = useGameSimulationStore();
  const totalBagsProduced = useProductionStore((state) => state.totalBagsProduced);
  const productionTarget = useProductionStore((state) => state.productionTarget);
  const safetyMetrics = useSafetyStore((state) => state.safetyMetrics);
  const addAnnouncement = useProductionStore((state) => state.addAnnouncement);
  const playCelebrationSound = useCallback((type: 'milestone' | 'safety' | 'target') => {
    if (type === 'milestone') {
      audioManager.playAISuccess();
      return;
    }
    if (type === 'safety') {
      audioManager.playShiftBell();
      return;
    }
    audioManager.playVictoryFanfare();
  }, []);

  // Track previous values to detect changes
  const [prevBagsProduced, setPrevBagsProduced] = useState(0);
  const [prevDaysSinceIncident, setPrevDaysSinceIncident] = useState(0);

  // Check for production milestones
  useEffect(() => {
    if (totalBagsProduced <= prevBagsProduced) {
      setPrevBagsProduced(totalBagsProduced);
      return;
    }

    // Check if we crossed any milestone
    const crossedMilestone = MILESTONES.find(
      (milestone) =>
        totalBagsProduced >= milestone &&
        prevBagsProduced < milestone &&
        milestone > celebrations.lastMilestone
    );

    if (crossedMilestone) {
      // Trigger celebration
      triggerCelebration('milestone', {
        value: crossedMilestone,
        message: `${crossedMilestone.toLocaleString()} BAGS!`,
      });

      // Show milestone display
      setMilestoneDisplay({ value: crossedMilestone, show: true });

      // Play celebration sound
      playCelebrationSound('milestone');

      // Spawn confetti at packer area
      const confettiId = `confetti-${Date.now()}`;
      setActiveConfetti((prev) => [
        ...prev,
        { id: confettiId, position: [0, 8, 20] }, // Packer zone
      ]);

      // PA announcement
      const messages = [
        `Congratulations team! ${crossedMilestone.toLocaleString()} bags and counting!`,
        `Production milestone reached: ${crossedMilestone.toLocaleString()} bags! Outstanding work!`,
        `${crossedMilestone.toLocaleString()} bags produced! The team is on fire!`,
        `Milestone alert: ${crossedMilestone.toLocaleString()} bags! Excellent performance!`,
      ];
      addAnnouncement({
        type: 'production',
        message: messages[Math.floor(Math.random() * messages.length)],
        duration: 10,
        priority: 'high',
      });

      // Hide milestone display after animation
      setTimeout(() => {
        setMilestoneDisplay((prev) => (prev?.value === crossedMilestone ? null : prev));
        clearCelebration();
      }, 4000);
    }

    setPrevBagsProduced(totalBagsProduced);
  }, [
    totalBagsProduced,
    prevBagsProduced,
    celebrations.lastMilestone,
    triggerCelebration,
    clearCelebration,
    addAnnouncement,
    playCelebrationSound,
  ]);

  // Check for zero-incident milestones
  useEffect(() => {
    const daysSinceIncident = safetyMetrics.daysSinceIncident;

    // Trigger celebration at certain thresholds: 7, 30, 100, 365 days
    const safetyMilestones = [7, 30, 100, 365];
    const crossedSafetyMilestone = safetyMilestones.find(
      (milestone) => daysSinceIncident >= milestone && prevDaysSinceIncident < milestone
    );

    if (crossedSafetyMilestone) {
      triggerCelebration('zero_incident', {
        value: crossedSafetyMilestone,
        message: `${crossedSafetyMilestone} days incident-free!`,
      });

      // Play celebration sound
      playCelebrationSound('safety');

      // Spawn confetti
      const confettiId = `confetti-${Date.now()}`;
      setActiveConfetti((prev) => [...prev, { id: confettiId, position: [0, 5, 0] }]);

      // PA announcement
      const messages = [
        `${crossedSafetyMilestone} days without incident! Great job everyone!`,
        `Safety milestone: ${crossedSafetyMilestone} incident-free days! Keep it up!`,
        `Celebrating ${crossedSafetyMilestone} days of zero incidents. Outstanding safety record!`,
      ];
      addAnnouncement({
        type: 'safety',
        message: messages[Math.floor(Math.random() * messages.length)],
        duration: 10,
        priority: 'high',
      });

      setTimeout(() => clearCelebration(), 4000);
    }

    setPrevDaysSinceIncident(daysSinceIncident);
  }, [
    safetyMetrics.daysSinceIncident,
    prevDaysSinceIncident,
    triggerCelebration,
    clearCelebration,
    addAnnouncement,
    playCelebrationSound,
  ]);

  // Check for daily target completion
  useEffect(() => {
    if (!productionTarget) return;

    if (productionTarget.status === 'completed' && productionTarget.producedBags > 0) {
      const wasJustCompleted =
        productionTarget.producedBags >= productionTarget.targetBags &&
        productionTarget.producedBags - 1 < productionTarget.targetBags;

      if (wasJustCompleted) {
        triggerCelebration('target_met', {
          message: 'Daily target achieved!',
        });

        // Play celebration sound
        playCelebrationSound('target');

        // Spawn confetti
        const confettiId = `confetti-${Date.now()}`;
        setActiveConfetti((prev) => [...prev, { id: confettiId, position: [0, 6, 0] }]);

        // PA announcement
        addAnnouncement({
          type: 'production',
          message: 'Daily production target achieved! Fantastic work team!',
          duration: 10,
          priority: 'high',
        });

        setTimeout(() => clearCelebration(), 4000);
      }
    }
  }, [
    productionTarget,
    triggerCelebration,
    clearCelebration,
    addAnnouncement,
    playCelebrationSound,
  ]);

  // Remove confetti after animation
  const handleConfettiComplete = useCallback((id: string) => {
    setActiveConfetti((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Get milestone icon and color
  const getMilestoneIcon = () => {
    if (!milestoneDisplay) return null;

    const { value } = milestoneDisplay;
    if (value >= 10000) return { Icon: Trophy, color: 'text-yellow-400' };
    if (value >= 1000) return { Icon: Star, color: 'text-cyan-400' };
    if (value >= 500) return { Icon: Award, color: 'text-orange-400' };
    return { Icon: Target, color: 'text-green-400' };
  };

  const iconData = getMilestoneIcon();

  return (
    <>
      {/* 3D Confetti Bursts */}
      {activeConfetti.map((confetti) => (
        <ConfettiBurst
          key={confetti.id}
          position={confetti.position}
          count={150}
          duration={3.5}
          onComplete={() => handleConfettiComplete(confetti.id)}
        />
      ))}

      {/* Milestone Display Overlay */}
      <AnimatePresence>
        {milestoneDisplay?.show && iconData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -50 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="relative">
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-yellow-400/30 blur-3xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Main content */}
              <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl border-4 border-yellow-400/50 shadow-2xl p-12">
                <motion.div
                  className="text-center"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="mb-4"
                  >
                    <iconData.Icon className={`w-24 h-24 mx-auto ${iconData.color}`} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-6xl font-black text-white mb-4">
                      {milestoneDisplay.value.toLocaleString()}
                    </h2>
                    <p className="text-3xl font-bold text-yellow-400 mb-2">BAGS!</p>
                    <p className="text-xl text-slate-300">Production Milestone</p>
                  </motion.div>
                </motion.div>

                {/* Particle effects around border */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 bg-yellow-400 rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                    }}
                    animate={{
                      x: [0, Math.cos((i / 8) * Math.PI * 2) * 200],
                      y: [0, Math.sin((i / 8) * Math.PI * 2) * 200],
                      opacity: [1, 0],
                      scale: [1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
