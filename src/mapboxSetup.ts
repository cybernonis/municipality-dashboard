import mapboxgl from 'mapbox-gl';

// Point mapbox-gl at the pre-built CSP worker that lives in public/.
// This bypasses the inlined worker blob that Terser mangles in production builds.
(mapboxgl as any).workerUrl =
  (process.env.PUBLIC_URL ?? '') + '/mapbox-gl-csp-worker.js';
