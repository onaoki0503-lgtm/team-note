const MOTION_KEY = 'tn_motion_paused';

export function readMotionPaused(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeMotionPaused(paused: boolean): void {
  try {
    localStorage.setItem(MOTION_KEY, paused ? 'true' : 'false');
  } catch {
    /* Optional persistence. */
  }
}
