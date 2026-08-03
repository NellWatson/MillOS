/// <reference types="vite/client" />

declare const __MILLOS_BUILD_ID__: string;
declare const __MILLOS_CACHE_VERSION__: string;

// n8ao is consumed through @react-three/postprocessing and currently ships
// without a declaration entrypoint. Keep the compatibility boundary local.
declare module 'n8ao';
