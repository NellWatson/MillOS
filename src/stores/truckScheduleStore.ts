/**
 * Truck Schedule Store - Truck Arrival/Departure Management
 * Extracted from productionStore for better separation of concerns
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type TruckDock = 'receiving' | 'shipping';

export interface DockSchedule {
  truckDocked: boolean;
  nextArrivalMinutes: number;
  lastDepartureSimulationMinutes: number | null;
  departureCount: number;
}

export interface TruckScheduleState {
  receiving: DockSchedule;
  shipping: DockSchedule;
}

export interface TruckScheduleStore {
  truckSchedule: TruckScheduleState;
  setTruckDocked: (dock: TruckDock, docked: boolean) => void;
  updateNextArrival: (dock: TruckDock, minutes: number) => void;
  recordTruckDeparture: (dock: TruckDock, simulationMinutes: number) => void;
  isAnyTruckDocked: () => boolean;
  getTimeUntilNextArrival: (dock: TruckDock) => number;
  tickArrivals: (deltaMinutes: number) => void;
  resetTruckSchedule: () => void;
}

const ARRIVAL_CADENCE_MINUTES = {
  receiving: [12, 18, 24, 15],
  shipping: [20, 14, 26, 17],
} as const satisfies Record<TruckDock, readonly number[]>;

/**
 * Deterministic arrival cadence used by replays and runtime scheduling.
 * departureCount is one-based: the first completed departure selects item 0.
 */
export function getDeterministicNextArrivalMinutes(
  dock: TruckDock,
  departureCount: number
): number {
  const cadence = ARRIVAL_CADENCE_MINUTES[dock];
  const safeCount = Number.isFinite(departureCount) ? Math.max(1, Math.trunc(departureCount)) : 1;
  return cadence[(safeCount - 1) % cadence.length];
}

const createInitialTruckSchedule = (): TruckScheduleState => ({
  receiving: {
    truckDocked: false,
    nextArrivalMinutes: 15,
    lastDepartureSimulationMinutes: null,
    departureCount: 0,
  },
  shipping: {
    truckDocked: false,
    nextArrivalMinutes: 20,
    lastDepartureSimulationMinutes: null,
    departureCount: 0,
  },
});

export const useTruckScheduleStore = create<TruckScheduleStore>()(
  subscribeWithSelector((set, get) => ({
    truckSchedule: createInitialTruckSchedule(),

    setTruckDocked: (dock, docked) =>
      set((state) => ({
        truckSchedule: {
          ...state.truckSchedule,
          [dock]: {
            ...state.truckSchedule[dock],
            truckDocked: docked,
          },
        },
      })),

    updateNextArrival: (dock, minutes) => {
      if (!Number.isFinite(minutes)) return;
      set((state) => ({
        truckSchedule: {
          ...state.truckSchedule,
          [dock]: {
            ...state.truckSchedule[dock],
            nextArrivalMinutes: Math.max(0, minutes),
          },
        },
      }));
    },

    recordTruckDeparture: (dock, simulationMinutes) => {
      if (!Number.isFinite(simulationMinutes) || simulationMinutes < 0) return;
      set((state) => {
        const departureCount = state.truckSchedule[dock].departureCount + 1;
        return {
          truckSchedule: {
            ...state.truckSchedule,
            [dock]: {
              ...state.truckSchedule[dock],
              truckDocked: false,
              lastDepartureSimulationMinutes: simulationMinutes,
              departureCount,
              nextArrivalMinutes: getDeterministicNextArrivalMinutes(dock, departureCount),
            },
          },
        };
      });
    },

    isAnyTruckDocked: () => {
      const { truckSchedule } = get();
      return truckSchedule.receiving.truckDocked || truckSchedule.shipping.truckDocked;
    },

    getTimeUntilNextArrival: (dock) => get().truckSchedule[dock].nextArrivalMinutes,

    tickArrivals: (deltaMinutes: number) => {
      if (!Number.isFinite(deltaMinutes) || deltaMinutes <= 0) return;
      set((state) => {
        const newReceiving = { ...state.truckSchedule.receiving };
        const newShipping = { ...state.truckSchedule.shipping };

        // Tick down arrival timers
        if (!newReceiving.truckDocked) {
          newReceiving.nextArrivalMinutes = Math.max(
            0,
            newReceiving.nextArrivalMinutes - deltaMinutes
          );
          if (newReceiving.nextArrivalMinutes <= 0) {
            newReceiving.truckDocked = true;
          }
        }

        if (!newShipping.truckDocked) {
          newShipping.nextArrivalMinutes = Math.max(
            0,
            newShipping.nextArrivalMinutes - deltaMinutes
          );
          if (newShipping.nextArrivalMinutes <= 0) {
            newShipping.truckDocked = true;
          }
        }

        return {
          truckSchedule: {
            receiving: newReceiving,
            shipping: newShipping,
          },
        };
      });
    },

    resetTruckSchedule: () => set({ truckSchedule: createInitialTruckSchedule() }),
  }))
);
