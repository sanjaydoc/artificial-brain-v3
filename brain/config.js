/**
 * Artificial Brain v3 — Brain Configuration
 * In-memory config for enabling/disabling nodes and routes.
 * Replaces Redis-backed brain_config.py / brain_config.js
 */

const ALL_NODES = [
  'prefrontal', 'hippocampus', 'amygdala', 'cerebellum', 'broca',
  'wernicke', 'visual_cortex', 'temporal_lobe', 'parietal_lobe',
  'thalamus', 'basal_ganglia', 'insula', 'cingulate', 'brainstem',
];

const ALL_ROUTES = [
  { src: 'prefrontal', dst: 'cerebellum' },
  { src: 'prefrontal', dst: 'broca' },
  { src: 'prefrontal', dst: 'cingulate' },
  { src: 'amygdala', dst: 'prefrontal' },
  { src: 'amygdala', dst: 'broca' },
  { src: 'amygdala', dst: 'thalamus' },
  { src: 'cerebellum', dst: 'hippocampus' },
  { src: 'cerebellum', dst: 'amygdala' },
  { src: 'cerebellum', dst: 'basal_ganglia' },
  { src: 'cerebellum', dst: 'parietal_lobe' },
  { src: 'cerebellum', dst: 'thalamus' },
  { src: 'visual_cortex', dst: 'cerebellum' },
  { src: 'visual_cortex', dst: 'parietal_lobe' },
  { src: 'wernicke', dst: 'prefrontal' },
  { src: 'basal_ganglia', dst: 'prefrontal' },
  { src: 'cingulate', dst: 'prefrontal' },
  { src: 'parietal_lobe', dst: 'prefrontal' },
  { src: 'parietal_lobe', dst: 'hippocampus' },
  { src: 'insula', dst: 'cingulate' },
  { src: 'thalamus', dst: 'parietal_lobe' },
  { src: 'thalamus', dst: 'amygdala' },
  { src: 'thalamus', dst: 'basal_ganglia' },
  { src: 'thalamus', dst: 'cingulate' },
  { src: 'thalamus', dst: 'cerebellum' },
];

// ── State ───────────────────────────────────────────────────────────────────

const state = {
  nodes: {},   // { nodeName: { enabled: true } }
  routes: {},  // { 'src→dst': { enabled: true } }
  updated: Date.now(),
};

// Initialize all enabled
for (const n of ALL_NODES) state.nodes[n] = { enabled: true };
for (const r of ALL_ROUTES) state.routes[`${r.src}→${r.dst}`] = { enabled: true };

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = {
  'Full Brain': { enableAll: true },
  'Motor Only': {
    nodes: ['cerebellum', 'visual_cortex', 'parietal_lobe', 'thalamus', 'brainstem'],
  },
  'Language Mode': {
    nodes: ['prefrontal', 'broca', 'wernicke', 'temporal_lobe', 'hippocampus', 'thalamus'],
  },
  'Limbic Loop': {
    nodes: ['amygdala', 'hippocampus', 'basal_ganglia', 'cingulate', 'prefrontal', 'thalamus'],
  },
  'Minimal': {
    nodes: ['brainstem', 'thalamus', 'cerebellum'],
  },
  'No Feedback': {
    enableAll: true,
    disableRoutes: ['amygdala→prefrontal', 'basal_ganglia→prefrontal', 'cingulate→prefrontal'],
  },
};

// ── API ─────────────────────────────────────────────────────────────────────

export function isNodeEnabled(name) {
  return state.nodes[name]?.enabled !== false;
}

export function isRouteEnabled(src, dst) {
  const key = `${src}→${dst}`;
  return state.routes[key]?.enabled !== false;
}

export function setNodeEnabled(name, enabled) {
  if (state.nodes[name]) {
    state.nodes[name].enabled = enabled;
    state.updated = Date.now();
  }
}

export function setRouteEnabled(src, dst, enabled) {
  const key = `${src}→${dst}`;
  if (state.routes[key]) {
    state.routes[key].enabled = enabled;
    state.updated = Date.now();
  }
}

export function addRoute(src, dst) {
  const key = `${src}→${dst}`;
  state.routes[key] = { enabled: true };
  state.updated = Date.now();
}

export function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return false;

  if (preset.enableAll) {
    for (const n of ALL_NODES) state.nodes[n].enabled = true;
    for (const key of Object.keys(state.routes)) state.routes[key].enabled = true;
  } else if (preset.nodes) {
    const enabledSet = new Set(preset.nodes);
    for (const n of ALL_NODES) state.nodes[n].enabled = enabledSet.has(n);
    // Enable only routes between enabled nodes
    for (const key of Object.keys(state.routes)) {
      const [src, dst] = key.split('→');
      state.routes[key].enabled = enabledSet.has(src) && enabledSet.has(dst);
    }
  }

  if (preset.disableRoutes) {
    for (const key of preset.disableRoutes) {
      if (state.routes[key]) state.routes[key].enabled = false;
    }
  }

  state.updated = Date.now();
  return true;
}

export function getConfig() {
  return { nodes: { ...state.nodes }, routes: { ...state.routes }, updated: state.updated };
}

export function getPresetNames() {
  return Object.keys(PRESETS);
}

export { ALL_NODES, ALL_ROUTES };

export default {
  isNodeEnabled, isRouteEnabled, setNodeEnabled, setRouteEnabled,
  addRoute, applyPreset, getConfig, getPresetNames, ALL_NODES, ALL_ROUTES,
};
