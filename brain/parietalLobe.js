/**
 * Node 09 — Parietal Lobe: Sensory integration / world model
 * Merges signals into unified world model object.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'parietal_lobe';
const worldModel = {
  position: [0, 0, 0.79], orientation: 0, reward: 0,
  brightness: 0.5, edge_density: 0, stable: true,
};
let prevReward = 0;
const state = { signal_count: 0 };

function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  // Merge incoming data
  if (p.position) worldModel.position = p.position;
  if (p.orientation !== undefined) worldModel.orientation = p.orientation;
  if (p.reward !== undefined) worldModel.reward = Number(p.reward);
  if (p.brightness !== undefined) worldModel.brightness = p.brightness;
  if (p.edge_density !== undefined) worldModel.edge_density = p.edge_density;
  if (p.stable !== undefined) worldModel.stable = p.stable;
  if (p.fallen !== undefined) worldModel.stable = !p.fallen;

  // Write memory on significant reward change
  const delta = Math.abs(worldModel.reward - prevReward);
  if (delta > 0.2) {
    prevReward = worldModel.reward;
    mem.writeMemory(NODE, 'world_update', {
      reward: worldModel.reward, stable: worldModel.stable,
      position: worldModel.position,
    }, Math.min(delta, 1.0));
  }

  // Publish to prefrontal + hippocampus
  bus.emit(bus.chan('prefrontal'), bus.makeMsg(NODE, 'prefrontal', 'signal', {
    world_model: { ...worldModel },
  }));
  bus.emit(bus.chan('hippocampus'), bus.makeMsg(NODE, 'hippocampus', 'store', {
    obs: JSON.stringify(worldModel).slice(0, 500),
    action: '', reward: worldModel.reward,
  }));
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  console.log(`[${NODE}] Sensory fusion ready`);
}

export function getState() { return { ...state, world_model: { ...worldModel } }; }
export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy };
