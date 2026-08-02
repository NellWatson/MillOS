/**
 * Tree components for village and farm areas.
 *
 * These are thin single-tree wrappers over `InstancedTreeField`, which owns
 * the geometry, the alpha-cut leaf material and the wind injection. Prefer
 * `<InstancedTreeField trees={[...]} />` directly when placing more than one
 * or two trees - a whole stand then costs two draw calls instead of two per
 * tree.
 *
 * The previous implementation built canopies from solid `sphereGeometry`
 * blobs on a flat green material. That is the loudest "prototype" tell in an
 * exterior frame and is gone; see InstancedFoliage.tsx for what replaced it.
 */

import React, { useMemo } from 'react';
import { InstancedTreeField, type TreeInstance, type TreeSpecies } from './InstancedFoliage';

export type TreeType = TreeSpecies;

interface TreeProps {
  position: [number, number, number];
  type?: TreeType;
  scale?: number;
}

/**
 * Memoised on the position COMPONENTS rather than the array identity: callers
 * write `position={[x, y, z]}` inline, which is a fresh array every render and
 * would otherwise rebuild the instance matrices on each parent update.
 */
const useSingleTree = (
  position: [number, number, number],
  scale: number | undefined,
  type: TreeType
): TreeInstance[] => {
  const [x, y, z] = position;
  return useMemo(
    () => [{ position: [x, y, z] as [number, number, number], scale, type }],
    [x, y, z, scale, type]
  );
};

const SingleTree: React.FC<Required<Pick<TreeProps, 'type'>> & TreeProps> = ({
  position,
  scale,
  type,
}) => {
  const trees = useSingleTree(position, scale, type);
  return <InstancedTreeField trees={trees} />;
};

/** Broadleaf tree with a rounded card canopy. */
export const OakTree: React.FC<TreeProps> = React.memo((props) => (
  <SingleTree {...props} type="oak" />
));
OakTree.displayName = 'OakTree';

/** Conifer: tapered card cage on the needle atlas. */
export const PineTree: React.FC<TreeProps> = React.memo((props) => (
  <SingleTree {...props} type="pine" />
));
PineTree.displayName = 'PineTree';

/** White-barked broadleaf, narrower canopy. */
export const BirchTree: React.FC<TreeProps> = React.memo((props) => (
  <SingleTree {...props} type="birch" />
));
BirchTree.displayName = 'BirchTree';

/** Generic tree that selects a species. */
export const Tree: React.FC<TreeProps> = React.memo(({ type = 'oak', ...props }) => (
  <SingleTree {...props} type={type} />
));
Tree.displayName = 'Tree';

export default Tree;
