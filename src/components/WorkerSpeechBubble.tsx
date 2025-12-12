/**
 * WorkerSpeechBubble Component
 *
 * Displays speech bubbles above workers using @react-three/drei Html.
 * Supports different message types with visual styling:
 * - casual: White bubble for everyday chat
 * - work: Light blue for work-related communication
 * - safety: Yellow/amber for safety alerts
 * - radio: Amber with icon for radio chatter
 */

import React, { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';
import type { DialogueType } from '../utils/workerDialogue';

interface WorkerSpeechBubbleProps {
  text: string;
  type: DialogueType;
  position?: [number, number, number]; // Position above worker
  onDismiss?: () => void;
  duration?: number; // Auto-dismiss after this many ms (default: 4000)
}

export const WorkerSpeechBubble: React.FC<WorkerSpeechBubbleProps> = ({
  text,
  type,
  position = [0, 2.5, 0],
  onDismiss,
  duration = 4000,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onDismiss?.();
      }, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  // Styling based on type
  const getBubbleStyle = () => {
    switch (type) {
      case 'radio':
        return {
          bg: 'bg-amber-500',
          text: 'text-white',
          border: 'border-amber-600',
          shadow: 'shadow-amber-500/50',
        };
      case 'safety':
        return {
          bg: 'bg-yellow-400',
          text: 'text-gray-900',
          border: 'border-yellow-500',
          shadow: 'shadow-yellow-400/50',
        };
      case 'work':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-900',
          border: 'border-blue-300',
          shadow: 'shadow-blue-200/50',
        };
      case 'handoff':
        // Shift handoff conversations - emerald green for visibility
        return {
          bg: 'bg-emerald-500',
          text: 'text-white',
          border: 'border-emerald-600',
          shadow: 'shadow-emerald-500/50',
        };
      case 'casual':
      default:
        return {
          bg: 'bg-white',
          text: 'text-gray-800',
          border: 'border-gray-300',
          shadow: 'shadow-gray-300/50',
        };
    }
  };

  const style = getBubbleStyle();

  return (
    <Html position={position} center distanceFactor={12} zIndexRange={[100, 0]}>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-none"
          >
            {/* Speech bubble container */}
            <div className="relative">
              {/* Bubble - larger for better visibility */}
              <div
                className={`
                  ${style.bg} ${style.text} ${style.border}
                  px-4 py-3 rounded-xl border-2 shadow-lg ${style.shadow}
                  max-w-[280px] min-w-[160px]
                  backdrop-blur-sm
                  flex items-center gap-3
                `}
              >
                {/* Radio icon for radio chatter */}
                {type === 'radio' && <Radio className="w-5 h-5 flex-shrink-0 animate-pulse" />}

                {/* Text content - larger font */}
                <span className="text-base font-medium leading-snug">{text}</span>
              </div>

              {/* Bubble tail (pointing down to worker) */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0">
                <div
                  className={`
                    border-l-[8px] border-l-transparent
                    border-r-[8px] border-r-transparent
                    border-t-[10px] ${style.border.replace('border-', 'border-t-')}
                  `}
                  style={{
                    filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1))',
                  }}
                />
                {/* Inner tail for filled effect */}
                <div
                  className={`
                    absolute top-[-11px] left-1/2 -translate-x-1/2
                    border-l-[7px] border-l-transparent
                    border-r-[7px] border-r-transparent
                    border-t-[9px] ${style.bg.replace('bg-', 'border-t-')}
                  `}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Html>
  );
};

export default WorkerSpeechBubble;
