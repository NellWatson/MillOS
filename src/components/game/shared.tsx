import { createContext, useContext, useEffect, useRef } from 'react';
import { useProductionStore } from '../../stores/productionStore';
import { useUIStore } from '../../stores/uiStore';
import { useSafetyStore } from '../../stores/safetyStore';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useAnnouncementsStore, type AnnouncementInput } from '../../stores/announcementsStore';
import { audioManager } from '../../utils/audioManager';

export interface CameraFeedContextType {
  feedRefs: Map<string, React.RefObject<HTMLDivElement>>;
  registerFeedRef: (id: string, ref: React.RefObject<HTMLDivElement>) => void;
}

export const CameraFeedContext = createContext<CameraFeedContextType | null>(null);

export const useCameraFeedRefs = () => useContext(CameraFeedContext);

type AnnouncementCategory = 'operations' | 'production' | 'safety' | 'logistics' | 'environment';
type NoticeType = 'general' | 'production' | 'safety' | 'emergency';
type NoticePriority = 'low' | 'medium' | 'high' | 'critical';

interface AnnouncementConfig {
  message: string;
  type: NoticeType;
  category: AnnouncementCategory;
  stressWeight: number;
}

interface EventAnnouncementConfig {
  message: string;
  type: NoticeType;
  priority: NoticePriority;
  duration: number;
}

const MACHINE_IDS = {
  silos: ['Silo Alpha', 'Silo Beta', 'Silo Gamma', 'Silo Delta', 'Silo Epsilon'],
  mills: ['R.M. 101', 'R.M. 102', 'R.M. 103', 'R.M. 104'],
  sifters: ['Sifter A', 'Sifter B', 'Sifter C'],
  packers: ['Packer Line 1', 'Packer Line 2', 'Packer Line 3'],
} as const;

export const getRandomMachineOfType = (type: keyof typeof MACHINE_IDS): string => {
  const machines = MACHINE_IDS[type];
  return machines[Math.floor(Math.random() * machines.length)];
};

const AUTONOMOUS_NOTICES: AnnouncementConfig[] = [
  {
    message:
      'Process path verified from receiving through packing. All interlocks are reporting ready.',
    type: 'production',
    category: 'operations',
    stressWeight: 0.1,
  },
  {
    message: 'Silo inventory reconciliation complete. Mass balance remains within tolerance.',
    type: 'production',
    category: 'production',
    stressWeight: 0.15,
  },
  {
    message: 'Roller gap control is stable. Extraction load is tracking the current recipe.',
    type: 'production',
    category: 'production',
    stressWeight: 0.2,
  },
  {
    message: 'Plansifter differential pressure is nominal across all active sections.',
    type: 'production',
    category: 'operations',
    stressWeight: 0.2,
  },
  {
    message: 'Packing line verification complete. Checkweigher and reject logic are available.',
    type: 'production',
    category: 'production',
    stressWeight: 0.2,
  },
  {
    message: 'Dock sequencing has reserved a clear approach for the next autonomous delivery.',
    type: 'general',
    category: 'logistics',
    stressWeight: 0.25,
  },
  {
    message: 'Forklift routes have been deconflicted with truck and conveyor movements.',
    type: 'safety',
    category: 'logistics',
    stressWeight: 0.35,
  },
  {
    message: 'Mobile equipment geofences are synchronized with the active production zones.',
    type: 'safety',
    category: 'safety',
    stressWeight: 0.3,
  },
  {
    message:
      'Dust extraction trend is stable. Differential pressure remains inside the control band.',
    type: 'general',
    category: 'safety',
    stressWeight: 0.25,
  },
  {
    message:
      'Waterway telemetry is healthy. Stream flow and pond levels are within seasonal bounds.',
    type: 'general',
    category: 'environment',
    stressWeight: 0.1,
  },
  {
    message:
      'Weather adaptation is active. Lighting, wet surfaces, and vehicle limits share one state.',
    type: 'general',
    category: 'environment',
    stressWeight: 0.2,
  },
  {
    message: 'The mill is calm. This is a measured condition, not optimism.',
    type: 'general',
    category: 'operations',
    stressWeight: 0.05,
  },
  {
    message: 'A diagnostic packet has been captured for the highest-vibration asset.',
    type: 'general',
    category: 'operations',
    stressWeight: 0.45,
  },
  {
    message:
      'Production constraint analysis updated. The current bottleneck is highlighted in SCADA.',
    type: 'production',
    category: 'production',
    stressWeight: 0.45,
  },
  {
    message: 'A short cycle-time variance was detected and corrected by the line controller.',
    type: 'production',
    category: 'operations',
    stressWeight: 0.55,
  },
  {
    message: 'Automated housekeeping cycle complete. Access lanes and sensor sightlines are clear.',
    type: 'general',
    category: 'safety',
    stressWeight: 0.15,
  },
];

const TIME_NOTICES: Record<'day' | 'night', AnnouncementConfig[]> = {
  day: [
    {
      message: 'Daylight control is active. Exterior luminaires are tracking available light.',
      type: 'general',
      category: 'environment',
      stressWeight: 0.1,
    },
    {
      message: 'Solar loading forecast has been applied to ventilation and cooling setpoints.',
      type: 'general',
      category: 'environment',
      stressWeight: 0.2,
    },
  ],
  night: [
    {
      message:
        'Night profile active. Perimeter lighting and low-visibility vehicle limits are engaged.',
      type: 'safety',
      category: 'environment',
      stressWeight: 0.25,
    },
    {
      message:
        'The celestial clock and facility lighting are synchronized for the current night cycle.',
      type: 'general',
      category: 'environment',
      stressWeight: 0.1,
    },
  ],
};

const MACHINE_STATUS_NOTICES = {
  warning: {
    template: 'Warning at {MACHINE}. Diagnostic review is required before the next control change.',
    type: 'production' as const,
    priority: 'high' as const,
  },
  critical: {
    template: 'Critical alarm at {MACHINE}. The affected process is held in a verified safe state.',
    type: 'emergency' as const,
    priority: 'critical' as const,
  },
  running: {
    template:
      '{MACHINE} recovery complete. Interlocks are clear and normal production has resumed.',
    type: 'production' as const,
    priority: 'medium' as const,
  },
};

const MILESTONE_MESSAGES: Record<number, string> = {
  25: 'Production has reached 25% of the current target.',
  50: 'Production has reached 50% of the current target.',
  75: 'Production has reached 75% of the current target.',
  90: 'Production has reached 90% of the current target.',
  100: 'Production target achieved. The completed batch record is available in SCADA.',
};

export const SAFETY_INCIDENT_ANNOUNCEMENTS: EventAnnouncementConfig[] = [
  {
    message: 'Safety interlock event logged. The affected zone is held in a verified safe state.',
    type: 'safety',
    priority: 'high',
    duration: 20,
  },
  {
    message:
      'Near-miss logic triggered. Mobile equipment is stationary while route telemetry is reviewed.',
    type: 'safety',
    priority: 'high',
    duration: 20,
  },
  {
    message:
      'Vehicle proximity event. Conflicting routes are locked until the control system clears them.',
    type: 'safety',
    priority: 'high',
    duration: 24,
  },
];

export const FIRE_DRILL_ANNOUNCEMENTS: EventAnnouncementConfig[] = [
  {
    message: 'Simulated fire-response drill active. Equipment is entering its verified safe state.',
    type: 'emergency',
    priority: 'critical',
    duration: 20,
  },
  {
    message:
      'Fire-response simulation in progress. Egress sensors and isolation interlocks are under test.',
    type: 'emergency',
    priority: 'critical',
    duration: 20,
  },
  {
    message:
      'Drill sequence complete. Restart remains inhibited until every safety channel reports clear.',
    type: 'emergency',
    priority: 'critical',
    duration: 20,
  },
];

export const EMERGENCY_STOP_ANNOUNCEMENTS: EventAnnouncementConfig[] = [
  {
    message: 'Emergency stop activated. Machines and mobile equipment are stationary.',
    type: 'emergency',
    priority: 'critical',
    duration: 20,
  },
  {
    message:
      'Facility emergency stop engaged. Restart is inhibited until the cause and interlocks clear.',
    type: 'emergency',
    priority: 'critical',
    duration: 20,
  },
  {
    message:
      'All autonomous vehicles are secure. Route reservations remain locked pending the all clear.',
    type: 'emergency',
    priority: 'critical',
    duration: 22,
  },
];

const mapAnnouncementType = (type: NoticeType): AnnouncementInput['type'] => {
  if (type === 'emergency') return 'emergency';
  if (type === 'safety') return 'warning';
  if (type === 'production') return 'success';
  return 'info';
};

const mapPriority = (priority: NoticePriority): number =>
  ({ low: 1, medium: 2, high: 3, critical: 4 })[priority];

const calculateOperationalStress = (): number => {
  const productionState = useProductionStore.getState();
  const machines = productionState.machines ?? [];
  const critical = machines.filter((machine) => machine.status === 'critical').length;
  const warning = machines.filter((machine) => machine.status === 'warning').length;
  const alerts = useUIStore.getState().alerts ?? [];
  const criticalAlerts = alerts.filter((alert) => alert.type === 'critical').length;
  const warningAlerts = alerts.filter((alert) => alert.type === 'warning').length;
  const incidents = useSafetyStore.getState().safetyIncidents ?? [];
  const recentIncidents = incidents.filter(
    (incident) => Date.now() - incident.timestamp < 5 * 60 * 1000
  ).length;
  return Math.min(
    1,
    critical * 0.3 +
      warning * 0.1 +
      criticalAlerts * 0.25 +
      warningAlerts * 0.08 +
      recentIncidents * 0.15
  );
};

const chooseNotice = (gameTime: number): AnnouncementConfig => {
  const timeBand = gameTime >= 7 && gameTime < 19 ? 'day' : 'night';
  const corpus = Math.random() < 0.2 ? TIME_NOTICES[timeBand] : AUTONOMOUS_NOTICES;
  const stress = calculateOperationalStress();
  const ranked = corpus
    .map((announcement) => ({
      announcement,
      weight: 1 - Math.abs(announcement.stressWeight - stress) + Math.random() * 0.2,
    }))
    .sort((left, right) => right.weight - left.weight);
  return ranked[Math.floor(Math.random() * Math.min(4, ranked.length))].announcement;
};

export const PA_ANNOUNCEMENT_COUNT =
  AUTONOMOUS_NOTICES.length + TIME_NOTICES.day.length + TIME_NOTICES.night.length;

let lastMilestoneReached = 0;
const lastMachineStatuses: Record<string, string> = {};
const lastMachineStatusAnnouncementTime: Record<string, number> = {};
const MACHINE_STATUS_COOLDOWN_MS = 30000;

const checkEventAnnouncements = (addAnnouncement: (input: AnnouncementInput) => void): void => {
  if (useAnnouncementsStore.getState().mode === 'off') return;
  const state = useProductionStore.getState();
  const target = state.productionTarget;

  if (target && target.targetBags > 0) {
    const progress = Math.floor((target.producedBags / target.targetBags) * 100);
    for (const milestone of [25, 50, 75, 90, 100]) {
      if (progress >= milestone && lastMilestoneReached < milestone) {
        lastMilestoneReached = milestone;
        addAnnouncement({
          type: 'success',
          message: MILESTONE_MESSAGES[milestone],
          priority: milestone === 100 ? 4 : milestone >= 50 ? 3 : 2,
          source: 'Production controller',
          channel: 'operational',
          tone: 'literal',
          audience: 'control',
          cooldownMs: 90000,
        });
      }
    }
    if (progress < 10 && lastMilestoneReached > 0) lastMilestoneReached = 0;
  }

  const now = Date.now();
  for (const machine of state.machines ?? []) {
    const previous = lastMachineStatuses[machine.id];
    const current = machine.status;
    if (previous && previous !== current && current in MACHINE_STATUS_NOTICES) {
      const lastTime = lastMachineStatusAnnouncementTime[current] ?? 0;
      if (now - lastTime >= MACHINE_STATUS_COOLDOWN_MS) {
        const notice = MACHINE_STATUS_NOTICES[current as keyof typeof MACHINE_STATUS_NOTICES];
        addAnnouncement({
          type: mapAnnouncementType(notice.type),
          message: notice.template.replace('{MACHINE}', machine.name || machine.id),
          priority: mapPriority(notice.priority),
          source: 'Asset diagnostics',
          channel: 'operational',
          tone: 'literal',
          audience: 'control',
          cooldownMs: 90000,
        });
        lastMachineStatusAnnouncementTime[current] = now;
      }
    }
    lastMachineStatuses[machine.id] = current;
  }
};

const useEventAnnouncementScheduler = () => {
  const addAnnouncement = useProductionStore((state) => state.addAnnouncement);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!audioManager.muted) checkEventAnnouncements(addAnnouncement);
    }, 5000);
    return () => clearInterval(interval);
  }, [addAnnouncement]);
};

const usePAScheduler = () => {
  const addAnnouncement = useProductionStore((state) => state.addAnnouncement);
  const lastAnnouncementRef = useRef('');

  useEffect(() => {
    const scheduleNext = (): ReturnType<typeof setTimeout> => {
      const stress = calculateOperationalStress();
      const minimum = 90000 - stress * 40000;
      const maximum = 180000 - stress * 80000;
      return setTimeout(
        () => {
          const mode = useAnnouncementsStore.getState().mode;
          if (!audioManager.muted && mode !== 'off') {
            const gameTime = useGameSimulationStore.getState().gameTime;
            let notice = chooseNotice(gameTime);
            for (
              let attempt = 0;
              notice.message === lastAnnouncementRef.current && attempt < 4;
              attempt++
            ) {
              notice = chooseNotice(gameTime);
            }
            lastAnnouncementRef.current = notice.message;
            const stressNow = calculateOperationalStress();
            const priority =
              notice.type === 'emergency'
                ? 4
                : notice.type === 'safety' && stressNow > 0.5
                  ? 3
                  : stressNow > 0.7
                    ? 3
                    : 2;
            addAnnouncement({
              type: mapAnnouncementType(notice.type),
              message: notice.message,
              priority,
              source: 'Autonomous plant notice',
              channel:
                notice.category === 'logistics'
                  ? 'logistics'
                  : notice.category === 'safety'
                    ? 'safety'
                    : 'operational',
              tone: mode === 'characterful' ? 'characterful' : 'literal',
              audience: notice.category === 'logistics' ? 'logistics' : 'control',
              cooldownMs: mode === 'focused' ? 180000 : 90000,
            });
          }
          timeoutRef = scheduleNext();
        },
        minimum + Math.random() * (maximum - minimum)
      );
    };

    let timeoutRef = scheduleNext();
    return () => clearTimeout(timeoutRef);
  }, [addAnnouncement]);
};

export { usePAScheduler, useEventAnnouncementScheduler };
