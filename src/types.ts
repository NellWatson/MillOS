export enum MachineType {
  SILO = 'SILO',
  ROLLER_MILL = 'ROLLER_MILL',
  PLANSIFTER = 'PLANSIFTER',
  PACKER = 'PACKER',
  CONTROL_ROOM = 'CONTROL_ROOM',
}

// Grain quality grades
export type GrainQuality = 'premium' | 'standard' | 'economy' | 'mixed';

// Machine personality traits
export type PersonalityTrait = 'reliable' | 'temperamental' | 'workhorse' | 'quirky' | 'veteran';

// Machine mood states
export type MachineMood = 'happy' | 'neutral' | 'grumpy' | 'stressed';

export interface MachinePersonality {
  nickname: string;
  trait: PersonalityTrait;
  description: string;
  quirks: string[];
  workerFavorite?: boolean;
}

export interface MachineData {
  id: string;
  name: string;
  type: MachineType;
  position: [number, number, number];
  size: [number, number, number];
  rotation: number;
  status: 'running' | 'idle' | 'warning' | 'critical';
  metrics: {
    rpm: number;
    temperature: number;
    vibration: number;
    load: number;
  };
  lastMaintenance: string;
  nextMaintenance: string;
  // Silo-specific fields
  fillLevel?: number; // 0-100 percentage
  grainQuality?: GrainQuality;
  grainType?: string; // e.g., 'Wheat', 'Corn', 'Barley'
  // Maintenance tracking
  maintenanceCountdown?: number; // hours until next maintenance
  maintenanceHistory?: MaintenanceRecord[];
  // Machine personality system
  personality?: MachinePersonality;
  mood?: MachineMood;
  moodHistory?: Array<{ timestamp: number; mood: MachineMood; reason: string }>;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'preventive' | 'corrective' | 'emergency';
  technician: string;
  notes: string;
  duration: number; // minutes
}

export type WorkerIconType =
  | 'supervisor'
  | 'engineer'
  | 'operator'
  | 'safety'
  | 'quality'
  | 'maintenance';

// Worker gender for pronoun usage
export type WorkerGender = 'male' | 'female' | 'nonbinary';

// Pronoun set for a worker
export interface WorkerPronouns {
  subject: string; // he/she/they
  object: string; // him/her/them
  possessive: string; // his/her/their
  reflexive: string; // himself/herself/themself
}

// Get pronouns for a given gender
export const getPronouns = (gender: WorkerGender): WorkerPronouns => {
  switch (gender) {
    case 'male':
      return { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' };
    case 'female':
      return { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' };
    case 'nonbinary':
      return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' };
  }
};

// Worker skill levels
export type SkillLevel = 1 | 2 | 3 | 4 | 5; // 1=Novice, 5=Master

export interface WorkerSkills {
  machineOperation: SkillLevel;
  safetyProtocols: SkillLevel;
  qualityControl: SkillLevel;
  troubleshooting: SkillLevel;
  teamwork: SkillLevel;
}

export interface PerformanceReview {
  id: string;
  date: string;
  reviewer: string;
  overallScore: number; // 1-100
  strengths: string[];
  improvements: string[];
  notes: string;
}

export interface WorkerData {
  id: string;
  name: string;
  gender: WorkerGender;
  role:
    | 'Operator'
    | 'Engineer'
    | 'Supervisor'
    | 'Safety Officer'
    | 'Quality Control'
    | 'Maintenance';
  icon: WorkerIconType;
  position: [number, number, number];
  speed: number;
  direction: 1 | -1;
  currentTask: string;
  targetMachine?: string;
  status: 'working' | 'idle' | 'break' | 'responding';
  shiftStart: string;
  experience: number; // years
  certifications: string[];
  color: string;
  // Worker advancement
  skills?: WorkerSkills;
  skillPoints?: number; // XP towards next skill level
  promotionLevel?: number; // 0=Junior, 1=Regular, 2=Senior, 3=Lead
  performanceReviews?: PerformanceReview[];
  productivityScore?: number; // 0-100 current shift
  tasksCompleted?: number;
  trainingSessions?: number;
}

export interface ProductData {
  id: string;
  position: [number, number, number];
  rotation: number;
  speed: number;
  axis: 'x' | 'z';
  direction: 1 | -1;
  type: 'GRAIN' | 'FLOUR_BAG';
  // Batch tracking
  batchNumber?: string;
  batchDate?: string;
  quality?: GrainQuality;
  weight?: number; // kg
}

// Production targets and achievements
export interface ProductionTarget {
  id: string;
  date: string;
  targetBags: number;
  producedBags: number;
  targetThroughput: number; // tons/hour
  actualThroughput: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: 'safety' | 'production' | 'quality' | 'teamwork';
  unlockedAt?: string;
  progress?: number; // 0-100 for progressive achievements
  requirement: number;
  currentValue: number;
}

// PA Announcement system
export interface PAnnouncement {
  id: string;
  type: 'shift_change' | 'safety' | 'production' | 'emergency' | 'general';
  message: string;
  timestamp: number;
  duration: number; // seconds to display
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Incident replay data
export interface IncidentReplayFrame {
  timestamp: number;
  workerPositions: Record<string, [number, number, number]>;
  forkliftPositions: Record<string, [number, number, number]>;
  machineStates: Record<string, string>;
}

export interface AlertData {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success' | 'safety';
  title: string;
  message: string;
  machineId?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface AIDecision {
  id: string;
  timestamp: Date;
  type: 'assignment' | 'optimization' | 'prediction' | 'maintenance' | 'safety';
  action: string;
  reasoning: string;
  confidence: number;
  impact: string;
  workerId?: string;
  machineId?: string;
  // Decision chain support
  parentDecisionId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'superseded';
  outcome?: string;
  // Context awareness
  triggeredBy?: 'alert' | 'metric' | 'schedule' | 'prediction' | 'user';
  relatedAlertId?: string;
  // Alternatives and uncertainty
  alternatives?: { action: string; tradeoff: string }[];
  uncertainty?: string;
  // Priority and urgency
  priority: 'low' | 'medium' | 'high' | 'critical';
  expiresAt?: Date;
}

export interface ForkliftData {
  id: string;
  position: [number, number, number];
  rotation: number;
  status: 'moving' | 'loading' | 'unloading' | 'idle';
  cargo: 'empty' | 'grain' | 'flour';
  targetPosition: [number, number, number];
}

// =========================================================================
// WORKER MOOD SYSTEM - Theme Hospital inspired (but with levity!)
// Workers grumble and complain, but they're fundamentally content souls
// =========================================================================

export type MoodState =
  | 'content' // Default happy state - whistling, efficient
  | 'tired' // Yawning, slower, needs coffee
  | 'frustrated' // Grumbling, eye-rolling, dramatic sighs
  | 'hangry' // The worst kind of frustrated - needs snacks
  | 'elated'; // Post-break bliss, helps colleagues, works faster

export type DemandType =
  | 'raise' // "I deserve better!"
  | 'vacation' // "When's my holiday?"
  | 'better_equipment' // "This ancient forklift..."
  | 'new_coffee_machine' // The most urgent demand
  | 'plant_on_desk' // "This place needs life!"
  | 'air_conditioning'; // "It's like a sauna in here!";

export type DemandUrgency = 'polite' | 'insistent' | 'dramatic';

export interface WorkerDemand {
  type: DemandType;
  urgency: DemandUrgency;
  deadline?: number; // Game time deadline (but they never actually leave)
  phrase: string; // What they say about it
}

export interface WorkerMood {
  workerId: string;
  energy: number; // 0-100, depletes over shift, restored by breaks
  satisfaction: number; // 0-100, affected by events, equipment, colleagues
  patience: number; // 0-100, depletes when things go wrong
  state: MoodState;
  pendingDemand?: WorkerDemand;
  lastBreak: number; // Game time of last break
  grumbleQueue: string[]; // Queue of complaints to cycle through
  isSpeaking: boolean; // Currently showing speech bubble
  currentPhrase?: string; // What they're saying right now
}

// Grumble phrases by mood state - workers love to complain (good-naturedly)
export const GRUMBLE_PHRASES: Record<MoodState, string[]> = {
  content: [
    'Another beautiful day of grain!',
    '*whistles cheerfully*',
    'Love the smell of flour in the morning.',
    "Best job I've ever had. Seriously.",
    '*hums a jaunty tune*',
  ],
  tired: [
    '*yaaawn* Is it break time yet?',
    'Need... coffee...',
    'Who scheduled 6am starts? Oh right, me.',
    '*stretches dramatically*',
    'Five more minutes...',
    'My kingdom for an espresso.',
  ],
  frustrated: [
    'This again?!',
    '*dramatic sigh*',
    'I went to university for this.',
    "Sure, I'll just do EVERYTHING.",
    '*mutters under breath*',
    'Fine. FINE. I got it.',
    '*eye roll of the century*',
  ],
  hangry: [
    'Is the vending machine broken AGAIN?!',
    "Don't talk to me until I've eaten.",
    '*stomach growls ominously*',
    'Where are my biscuits?!',
    'LUNCH. NOW.',
  ],
  elated: [
    'What a great team we have!',
    '*helping colleagues enthusiastically*',
    'That coffee was PERFECT.',
    "Let's smash those targets!",
    '*practically skipping*',
    'I could do this all day!',
  ],
};

// =========================================================================
// VISIBLE CHAOS EVENTS - Things going wrong... visibly and amusingly
// =========================================================================

export type ChaosEventType =
  | 'grain_spill' // Animated pile spreading on floor
  | 'dust_cloud' // Particle burst, workers cough dramatically
  | 'conveyor_jam' // Bags piling up, belt straining
  | 'temperature_spike' // Steam venting, red glow
  | 'rat_sighting' // Animated rat scurrying - everyone panics
  | 'power_flicker' // Lights dim, machines stutter
  | 'coffee_machine_broken' // Workers gathering, grumbling en masse
  | 'pigeon_incursion' // A pigeon got in. Chaos ensues.
  | 'mysterious_puddle'; // Nobody knows where it came from

export interface ChaosEvent {
  id: string;
  type: ChaosEventType;
  position: [number, number, number];
  startTime: number; // When the chaos began
  duration: number; // How long it lasts
  severity: 'minor' | 'moderate' | 'dramatic'; // How much everyone overreacts
  affectedWorkerIds: string[]; // Workers who noticed and are reacting
  resolved: boolean;
  description: string; // For UI display
}

// Chaos event configurations with amusing descriptions
export const CHAOS_EVENT_CONFIG: Record<
  ChaosEventType,
  {
    defaultDuration: number;
    workerReactions: string[];
    description: string;
  }
> = {
  grain_spill: {
    defaultDuration: 30,
    workerReactions: ['Not again!', 'Watch your step!', "I'll get the broom... eventually."],
    description: 'Grain spill detected. Workers stepping gingerly.',
  },
  dust_cloud: {
    defaultDuration: 15,
    workerReactions: ['*cough cough*', 'My lungs!', 'Very atmospheric.'],
    description: 'Dust cloud. Everyone pretending not to notice.',
  },
  conveyor_jam: {
    defaultDuration: 45,
    workerReactions: ['Uh oh.', 'Not my department!', 'Have you tried turning it off and on?'],
    description: 'Conveyor jam. Bags accumulating ominously.',
  },
  temperature_spike: {
    defaultDuration: 20,
    workerReactions: ['Is it hot in here?', 'Like a sauna!', 'Who touched the thermostat?!'],
    description: 'Temperature spike. Steam venting dramatically.',
  },
  rat_sighting: {
    defaultDuration: 60,
    workerReactions: ['RAT!', "It's actually kind of cute...", 'EVERYBODY STAY CALM!'],
    description: 'Rat sighting. Controlled panic in progress.',
  },
  power_flicker: {
    defaultDuration: 10,
    workerReactions: ['*gasp*', 'Did anyone save their work?', 'Spooky!'],
    description: 'Power flicker. Machines doing a restart dance.',
  },
  coffee_machine_broken: {
    defaultDuration: 120, // This is a serious matter
    workerReactions: ['NOOOOO!', 'This is a DISASTER!', "I can't work under these conditions!"],
    description: 'CRITICAL: Coffee machine down. Morale plummeting.',
  },
  pigeon_incursion: {
    defaultDuration: 45,
    workerReactions: ['How did it get IN?!', 'Shoo! SHOO!', "It's judging us."],
    description: 'Pigeon alert. Bird doing pigeon things.',
  },
  mysterious_puddle: {
    defaultDuration: 60,
    workerReactions: ["I didn't do it.", "Don't look at me.", 'Concerning.'],
    description: 'Mysterious puddle. Origin unknown. Concerning.',
  },
};

// =========================================================================
// MAINTENANCE & ENVIRONMENT - The Handyman equivalent
// =========================================================================

export interface FactoryEnvironment {
  dustLevel: number; // 0-100, accumulates over time
  machineOilLevels: Record<string, number>; // Machine ID -> oil level 0-100
  lightBulbsWorking: Record<string, boolean>; // Zone -> working status
  plants: FactoryPlant[]; // Workers like plants!
  coffeeMachineStatus: 'working' | 'broken' | 'empty' | 'brewing';
  lastCleaning: number; // Game time
}

export interface FactoryPlant {
  id: string;
  position: [number, number, number];
  type: 'potted_fern' | 'desk_succulent' | 'tall_palm' | 'hanging_ivy';
  health: number; // 0-100, needs watering!
  lastWatered: number;
  name?: string; // Workers name their plants
}

export interface MaintenanceTask {
  id: string;
  type:
    | 'sweeping'
    | 'oiling'
    | 'lightbulb'
    | 'plant_watering'
    | 'spill_cleanup'
    | 'general_tidying';
  position: [number, number, number];
  priority: 'low' | 'medium' | 'high';
  assignedWorkerId?: string;
  progress: number; // 0-100
  description: string;
}

// Fun plant names that workers might give their plants
export const PLANT_NAMES = [
  'Fernie Sanders',
  'Leaf Erikson',
  'Morgan Treeman',
  'Planty McPlantface',
  'Sir Photosynthesis',
  'Groot Jr.',
  'Chlorophyll Phil',
  'Aloe There',
  'Vincent Van Grow',
  'Elvis Parsley',
];

// Worker roster with detailed profiles
export const WORKER_ROSTER: Omit<WorkerData, 'position' | 'direction'>[] = [
  {
    id: 'w1',
    name: 'Marcus Chen',
    gender: 'male',
    role: 'Supervisor',
    icon: 'supervisor',
    speed: 6.0,
    currentTask: 'Overseeing production line',
    targetMachine: 'rm-103',
    status: 'working',
    shiftStart: '06:00',
    experience: 15,
    certifications: ['Six Sigma', 'HACCP', 'ISO 22000'],
    color: '#3b82f6',
  },
  {
    id: 'w2',
    name: 'Sarah Mitchell',
    gender: 'female',
    role: 'Engineer',
    icon: 'engineer',
    speed: 7.0,
    currentTask: 'Calibrating Roller Mill #2',
    targetMachine: 'mill-1.5',
    status: 'working',
    shiftStart: '06:00',
    experience: 8,
    certifications: ['PLC Programming', 'Mechanical Systems'],
    color: '#ffffff',
  },
  {
    id: 'w3',
    name: 'James Rodriguez',
    gender: 'male',
    role: 'Operator',
    icon: 'operator',
    speed: 6.4,
    currentTask: 'Monitoring Silo levels',
    targetMachine: 'silo-0',
    status: 'working',
    shiftStart: '06:00',
    experience: 5,
    certifications: ['Forklift License', 'Food Safety'],
    color: '#f97316',
  },
  {
    id: 'w4',
    name: 'Emily Watson',
    gender: 'female',
    role: 'Quality Control',
    icon: 'quality',
    speed: 5.6,
    currentTask: 'Testing flour samples',
    targetMachine: 'packer-2',
    status: 'working',
    shiftStart: '06:00',
    experience: 6,
    certifications: ['Lab Analysis', 'ISO 17025'],
    color: '#a855f7',
  },
  {
    id: 'w5',
    name: 'David Kim',
    gender: 'male',
    role: 'Maintenance',
    icon: 'maintenance',
    speed: 6.8,
    currentTask: 'Preventive maintenance on Packer #1',
    targetMachine: 'packer-0',
    status: 'working',
    shiftStart: '06:00',
    experience: 12,
    certifications: ['Electrical Systems', 'Pneumatics'],
    color: '#eab308',
  },
  {
    id: 'w6',
    name: 'Lisa Thompson',
    gender: 'female',
    role: 'Safety Officer',
    icon: 'safety',
    speed: 5.0,
    currentTask: 'Safety inspection - Zone 2',
    targetMachine: 'sifter-b',
    status: 'working',
    shiftStart: '06:00',
    experience: 10,
    certifications: ['OSHA', 'First Aid', 'Fire Safety'],
    color: '#22c55e',
  },
  {
    id: 'w7',
    name: 'Robert Garcia',
    gender: 'male',
    role: 'Operator',
    icon: 'operator',
    speed: 6.0,
    currentTask: 'Loading grain into Silo 3',
    targetMachine: 'silo-2',
    status: 'working',
    shiftStart: '06:00',
    experience: 3,
    certifications: ['Forklift License'],
    color: '#f97316',
  },
  {
    id: 'w8',
    name: 'Anna Kowalski',
    gender: 'female',
    role: 'Engineer',
    icon: 'engineer',
    speed: 7.6,
    currentTask: 'Optimizing Plansifter efficiency',
    targetMachine: 'sifter-0',
    status: 'working',
    shiftStart: '06:00',
    experience: 7,
    certifications: ['Process Optimization', 'Data Analytics'],
    color: '#ffffff',
  },
  {
    id: 'w9',
    name: 'Michael Brown',
    gender: 'male',
    role: 'Operator',
    icon: 'operator',
    speed: 6.4,
    currentTask: 'Operating Packer #2',
    targetMachine: 'packer-2',
    status: 'working',
    shiftStart: '14:00',
    experience: 4,
    certifications: ['Packaging Systems'],
    color: '#f97316',
  },
  {
    id: 'w10',
    name: 'Jennifer Lee',
    gender: 'female',
    role: 'Quality Control',
    icon: 'quality',
    speed: 6.0,
    currentTask: 'Moisture analysis',
    targetMachine: 'sifter-a',
    status: 'working',
    shiftStart: '14:00',
    experience: 5,
    certifications: ['Food Science', 'HACCP'],
    color: '#a855f7',
  },
];
