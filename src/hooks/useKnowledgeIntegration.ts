import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import {
  useAINarrationStore,
  type NarrationEntry,
  type NarrationTrigger,
} from '../stores/aiNarrationStore';
import { FEATURE_FLAGS } from '../config/featureFlags';

export function useKnowledgeIntegration(onNarration?: (narration: NarrationEntry) => void) {
  const sessionStartTime = useRef(Date.now());
  const firstPlayTriggered = useRef(false);
  const [minutesPlayed, setMinutesPlayed] = useState(0);
  // Select the four fields rather than the whole store: this hook lives in
  // GameInterface, and a whole-store subscription re-rendered the HUD host on
  // every knowledge or narration write.
  const unlockEntry = useKnowledgeStore((state) => state.unlockEntry);
  const { getNarration, markShown, hasBeenShown, enabled } = useAINarrationStore(
    useShallow((state) => ({
      getNarration: state.getNarration,
      markShown: state.markShown,
      hasBeenShown: state.hasBeenShown,
      enabled: state.enabled,
    }))
  );
  const extendedPlayTriggered = useRef(false);

  const triggerNarration = useCallback(
    (trigger: NarrationTrigger) => {
      if (!FEATURE_FLAGS.AI_NARRATION_ENABLED || !enabled) return;
      const narration = getNarration(trigger, minutesPlayed);
      if (!narration) return;
      markShown(narration.id);
      if (narration.unlocksEntry) unlockEntry(narration.unlocksEntry);
      onNarration?.(narration);
    },
    [enabled, getNarration, markShown, minutesPlayed, onNarration, unlockEntry]
  );

  useEffect(() => {
    if (firstPlayTriggered.current || hasBeenShown('welcome-autonomous-mill') || !enabled) return;
    firstPlayTriggered.current = true;
    const timer = window.setTimeout(() => triggerNarration('first-play'), 1800);
    return () => window.clearTimeout(timer);
  }, [enabled, hasBeenShown, triggerNarration]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - sessionStartTime.current) / 60000;
      setMinutesPlayed(elapsed);
      if (elapsed >= 60 && !extendedPlayTriggered.current) {
        extendedPlayTriggered.current = true;
        triggerNarration('extended-play');
      }
    }, 60000);
    return () => window.clearInterval(timer);
  }, [triggerNarration]);

  return { triggerNarration };
}
