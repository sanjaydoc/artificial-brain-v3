// In-memory timing mode (fast / quality). DB persistence dropped per spec.

let _mode = 'quality'

export function getTimingMode() {
  return _mode
}

export async function setTimingMode(mode) {
  if (mode !== 'fast' && mode !== 'quality') {
    throw new Error('Invalid timing mode')
  }
  _mode = mode
}

export async function loadTimingMode() {
  // No-op
}
