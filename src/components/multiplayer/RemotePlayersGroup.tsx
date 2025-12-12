/**
 * RemotePlayersGroup - Container for all remote player avatars
 *
 * Renders all connected remote players from the multiplayer store.
 * Only renders when multiplayer is active.
 */

import React from 'react';
import { useRemotePlayersArray, useIsMultiplayerActive } from '../../stores/multiplayerStore';
import { RemotePlayerAvatar } from './RemotePlayerAvatar';

export const RemotePlayersGroup: React.FC = () => {
  const isMultiplayerActive = useIsMultiplayerActive();
  const remotePlayers = useRemotePlayersArray();

  // Don't render anything if multiplayer is not active
  if (!isMultiplayerActive) {
    return null;
  }

  return (
    <group name="remote-players">
      {remotePlayers.map((player) => (
        <RemotePlayerAvatar key={player.id} player={player} />
      ))}
    </group>
  );
};

RemotePlayersGroup.displayName = 'RemotePlayersGroup';
