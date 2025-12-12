/**
 * Multiplayer type definitions for P2P collaborative play
 */

// Player avatar colors for identification
export const PLAYER_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Remote player state (broadcast at 20Hz)
export interface RemotePlayer {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number; // Y-axis yaw in radians
  velocity: [number, number, number];
  color: PlayerColor;
  selectedMachineId: string | null;
  isInFpsMode: boolean;
  lastUpdate: number; // timestamp for interpolation
}

// Local player state for broadcasting
export interface LocalPlayerState {
  position: [number, number, number];
  rotation: number;
  velocity: [number, number, number];
  selectedMachineId: string | null;
  isInFpsMode: boolean;
}

// Machine control intent (client -> host)
export interface MachineIntent {
  id: string; // unique intent ID
  type: 'START' | 'STOP' | 'ADJUST';
  machineId: string;
  playerId: string;
  timestamp: number;
  parameters?: Record<string, unknown>;
}

// Intent result (host -> client)
export interface IntentResult {
  intentId: string;
  success: boolean;
  error?: string;
}

// AI decision vote
export interface AIVote {
  decisionId: string;
  playerId: string;
  approve: boolean;
  timestamp: number;
}

// Game state diff (host -> clients at 10Hz)
export interface GameStateDiff {
  sequence: number; // for ordering
  machines?: Array<{
    id: string;
    status?: 'running' | 'idle' | 'warning' | 'critical';
    metrics?: {
      rpm?: number;
      temperature?: number;
      vibration?: number;
      load?: number;
    };
  }>;
  gameTime?: number;
  weather?: string;
  emergencyActive?: boolean;
  timestamp: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  message: string;
  timestamp: number;
}

// Network message types sent over WebRTC DataChannel
export type MultiplayerMessage =
  | { type: 'PLAYER_UPDATE'; payload: RemotePlayer }
  | { type: 'PLAYER_JOIN'; payload: { id: string; name: string; color: PlayerColor } }
  | { type: 'PLAYER_LEAVE'; payload: { id: string } }
  | { type: 'STATE_SYNC'; payload: GameStateDiff }
  | { type: 'FULL_STATE_SYNC'; payload: FullGameState }
  | { type: 'INTENT'; payload: MachineIntent }
  | { type: 'INTENT_RESULT'; payload: IntentResult }
  | { type: 'AI_VOTE'; payload: AIVote }
  | { type: 'CHAT'; payload: ChatMessage }
  | { type: 'PING'; payload: { timestamp: number } }
  | { type: 'PONG'; payload: { timestamp: number; hostTime: number } }
  | { type: 'MACHINE_LOCK'; payload: { machineId: string; playerId: string | null } };

// Full game state for initial sync when joining
export interface FullGameState {
  gameTime: number;
  weather: string;
  emergencyActive: boolean;
  machines: Array<{
    id: string;
    status: 'running' | 'idle' | 'warning' | 'critical';
    metrics: {
      rpm: number;
      temperature: number;
      vibration: number;
      load: number;
    };
  }>;
  machineLocks: Record<string, string>; // machineId -> playerId
}

// Room configuration
export interface RoomConfig {
  code: string;
  hostId: string;
  maxPlayers: number;
  createdAt: number;
}

// Peer connection info
export interface PeerInfo {
  id: string;
  name: string;
  color: PlayerColor;
  latencyMs: number;
  connectionState: ConnectionState;
}
