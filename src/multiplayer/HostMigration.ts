/**
 * Host Loss Handler
 *
 * Ends a guest session cleanly when its host disconnects. MillOS v0.40 does
 * not elect a replacement host or transfer authoritative state.
 */

import { useMultiplayerStore } from '../stores/multiplayerStore';

/**
 * Handle loss of the authoritative host connection for guest players.
 */
export function handleHostDisconnect(): void {
  const store = useMultiplayerStore.getState();

  if (store.isHost) {
    // A host cannot lose its own authoritative connection.
    return;
  }

  // Clear multiplayer session state while preserving the player's name
  store.leaveRoom();

  // Dispatch event for UI notification
  window.dispatchEvent(
    new CustomEvent('multiplayer:host-disconnected', {
      detail: { message: 'The host has left the session. The session has ended.' },
    })
  );
}
