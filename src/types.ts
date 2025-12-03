export enum MachineType {
  SILO = 'SILO',
  ROLLER_MILL = 'ROLLER_MILL',
  PLANSIFTER = 'PLANSIFTER',
  PACKER = 'PACKER',
  CONTROL_ROOM = 'CONTROL_ROOM'
}

// Grain quality grades
export type GrainQuality = 'premium' | 'standard' | 'economy' | 'mixed';

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
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'preventive' | 'corrective' | 'emergency';
  technician: string;
  notes: string;
  duration: number; // minutes
}

export type WorkerIconType = 'supervisor' | 'engineer' | 'operator' | 'safety' | 'quality' | 'maintenance';

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
  role: 'Operator' | 'Engineer' | 'Supervisor' | 'Safety Officer' | 'Quality Control' | 'Maintenance';
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
  type: 'warning' | 'critical' | 'info' | 'success';
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

// Worker roster with detailed profiles
export const WORKER_ROSTER: Omit<WorkerData, 'position' | 'direction'>[] = [
  {
    id: 'w1',
    name: 'Marcus Chen',
    role: 'Supervisor',
    icon: 'supervisor',
    speed: 1.2,
    currentTask: 'Overseeing production line',
    targetMachine: 'rm-103',
    status: 'working',
    shiftStart: '06:00',
    experience: 15,
    certifications: ['Six Sigma', 'HACCP', 'ISO 22000'],
    color: '#3b82f6'
  },
  {
    id: 'w2',
    name: 'Sarah Mitchell',
    role: 'Engineer',
    icon: 'engineer',
    speed: 1.5,
    currentTask: 'Calibrating Roller Mill #2',
    targetMachine: 'mill-1.5',
    status: 'working',
    shiftStart: '06:00',
    experience: 8,
    certifications: ['PLC Programming', 'Mechanical Systems'],
    color: '#ffffff'
  },
  {
    id: 'w3',
    name: 'James Rodriguez',
    role: 'Operator',
    icon: 'operator',
    speed: 1.3,
    currentTask: 'Monitoring Silo levels',
    targetMachine: 'silo-0',
    status: 'working',
    shiftStart: '06:00',
    experience: 5,
    certifications: ['Forklift License', 'Food Safety'],
    color: '#f97316'
  },
  {
    id: 'w4',
    name: 'Emily Watson',
    role: 'Quality Control',
    icon: 'quality',
    speed: 1.1,
    currentTask: 'Testing flour samples',
    targetMachine: 'packer-2',
    status: 'working',
    shiftStart: '06:00',
    experience: 6,
    certifications: ['Lab Analysis', 'ISO 17025'],
    color: '#a855f7'
  },
  {
    id: 'w5',
    name: 'David Kim',
    role: 'Maintenance',
    icon: 'maintenance',
    speed: 1.4,
    currentTask: 'Preventive maintenance on Packer #1',
    targetMachine: 'packer-0',
    status: 'working',
    shiftStart: '06:00',
    experience: 12,
    certifications: ['Electrical Systems', 'Pneumatics'],
    color: '#eab308'
  },
  {
    id: 'w6',
    name: 'Lisa Thompson',
    role: 'Safety Officer',
    icon: 'safety',
    speed: 1.0,
    currentTask: 'Safety inspection - Zone 2',
    targetMachine: 'sifter-b',
    status: 'working',
    shiftStart: '06:00',
    experience: 10,
    certifications: ['OSHA', 'First Aid', 'Fire Safety'],
    color: '#22c55e'
  },
  {
    id: 'w7',
    name: 'Robert Garcia',
    role: 'Operator',
    icon: 'operator',
    speed: 1.2,
    currentTask: 'Loading grain into Silo 3',
    targetMachine: 'silo-2',
    status: 'working',
    shiftStart: '06:00',
    experience: 3,
    certifications: ['Forklift License'],
    color: '#f97316'
  },
  {
    id: 'w8',
    name: 'Anna Kowalski',
    role: 'Engineer',
    icon: 'engineer',
    speed: 1.6,
    currentTask: 'Optimizing Plansifter efficiency',
    targetMachine: 'sifter-0',
    status: 'working',
    shiftStart: '06:00',
    experience: 7,
    certifications: ['Process Optimization', 'Data Analytics'],
    color: '#ffffff'
  },
  {
    id: 'w9',
    name: 'Michael Brown',
    role: 'Operator',
    icon: 'operator',
    speed: 1.3,
    currentTask: 'Operating Packer #2',
    targetMachine: 'packer-2',
    status: 'working',
    shiftStart: '14:00',
    experience: 4,
    certifications: ['Packaging Systems'],
    color: '#f97316'
  },
  {
    id: 'w10',
    name: 'Jennifer Lee',
    role: 'Quality Control',
    icon: 'quality',
    speed: 1.2,
    currentTask: 'Moisture analysis',
    targetMachine: 'sifter-a',
    status: 'working',
    shiftStart: '14:00',
    experience: 5,
    certifications: ['Food Science', 'HACCP'],
    color: '#a855f7'
  }
];
