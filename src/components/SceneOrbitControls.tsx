/**
 * Narrow lazy boundary for scene navigation. Importing this local module lets
 * Rollup retain OrbitControls without turning the complete Drei public surface
 * into one manual chunk on the critical startup path.
 */
export { OrbitControls as default } from '@react-three/drei';
