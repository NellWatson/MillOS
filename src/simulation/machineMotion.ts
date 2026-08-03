import type { MachineBuffer } from '../stores/materialFlowStore';

export type MachineOperationalState = 'operating' | 'stopped' | 'starved' | 'blocked' | 'faulted';

export function getMachineOperationalState(
  status: string,
  buffer: MachineBuffer | undefined
): MachineOperationalState {
  if (status === 'critical') return 'faulted';
  if (status !== 'running' && status !== 'warning') return 'stopped';
  if (!buffer || !buffer.isProcessing) return buffer ? 'stopped' : 'operating';

  const sourceKg =
    buffer.machineType === 'silo'
      ? buffer.outputBuffer.reduce((sum, material) => sum + material.amount, 0)
      : buffer.inputBuffer.reduce((sum, material) => sum + material.amount, 0);
  if (sourceKg <= 0.01) return 'starved';

  const outputKg = buffer.outputBuffer.reduce((sum, material) => sum + material.amount, 0);
  if (outputKg >= buffer.outputCapacity - 0.01) return 'blocked';
  return 'operating';
}
