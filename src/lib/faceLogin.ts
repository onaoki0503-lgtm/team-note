/** Device-local face enrollment for optional login assist. Not a password substitute. */

export interface FaceEnrollment {
  version: 1;
  enabled: boolean;
  userId: string;
  email: string;
  displayName: string;
  /** Downscaled grayscale face crop as data URL for coarse same-device match. */
  descriptor: string;
  enrolledAt: string;
}

const STORAGE_KEY = 'tn_face_login';
const DESCRIPTOR_SIZE = 48;

type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

function faceDetectorCtor(): FaceDetectorCtor | null {
  const ctor = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
  return typeof ctor === 'function' ? ctor : null;
}

export function faceDetectionSupported(): boolean {
  return Boolean(faceDetectorCtor()) && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function readFaceEnrollment(): FaceEnrollment | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FaceEnrollment;
    if (parsed?.version !== 1 || typeof parsed.descriptor !== 'string' || !parsed.descriptor) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFaceEnrollment(enrollment: FaceEnrollment | null): void {
  try {
    if (!enrollment) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(enrollment));
  } catch {
    /* Optional persistence. */
  }
}

export function setFaceLoginEnabled(enabled: boolean): FaceEnrollment | null {
  const current = readFaceEnrollment();
  if (!current) return null;
  const next = { ...current, enabled };
  writeFaceEnrollment(next);
  return next;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  return img;
}

function cropToDescriptor(source: CanvasImageSource, box: { x: number; y: number; width: number; height: number }, sourceWidth: number, sourceHeight: number): string {
  const pad = Math.max(box.width, box.height) * 0.18;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const w = Math.min(sourceWidth - x, box.width + pad * 2);
  const h = Math.min(sourceHeight - y, box.height + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = DESCRIPTOR_SIZE;
  canvas.height = DESCRIPTOR_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(source, x, y, w, h, 0, 0, DESCRIPTOR_SIZE, DESCRIPTOR_SIZE);
  const data = ctx.getImageData(0, 0, DESCRIPTOR_SIZE, DESCRIPTOR_SIZE);
  for (let i = 0; i < data.data.length; i += 4) {
    const g = Math.round(data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = g;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.72);
}

function centerBox(width: number, height: number) {
  const side = Math.min(width, height) * 0.62;
  return { x: (width - side) / 2, y: (height - side) / 2, width: side, height: side };
}

export async function detectLargestFace(source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const width = 'videoWidth' in source ? source.videoWidth || source.width : source.width;
  const height = 'videoHeight' in source ? source.videoHeight || source.height : source.height;
  if (!width || !height) return null;
  const Ctor = faceDetectorCtor();
  if (Ctor) {
    try {
      const faces = await new Ctor({ fastMode: true, maxDetectedFaces: 3 }).detect(source);
      if (!faces.length) return null;
      const best = faces.reduce((a, b) => (a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height ? a : b));
      const box = best.boundingBox;
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    } catch {
      /* Fall through to center crop. */
    }
  }
  return centerBox(width, height);
}

export async function captureFaceDescriptor(video: HTMLVideoElement): Promise<string> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new Error('camera_not_ready');
  const face = await detectLargestFace(video);
  if (!face) throw new Error('face_not_found');
  if (faceDetectorCtor() && (face.width < width * 0.12 || face.height < height * 0.12)) {
    throw new Error('face_too_small');
  }
  return cropToDescriptor(video, face, width, height);
}

function descriptorDistance(a: string, b: string, pixelsA: Uint8ClampedArray, pixelsB: Uint8ClampedArray): number {
  void a;
  void b;
  let sum = 0;
  for (let i = 0; i < pixelsA.length; i += 4) {
    const d = pixelsA[i] - pixelsB[i];
    sum += d * d;
  }
  return Math.sqrt(sum / (DESCRIPTOR_SIZE * DESCRIPTOR_SIZE));
}

export async function matchFaceDescriptor(candidate: string, enrolled: string, threshold = 38): Promise<boolean> {
  const [imgA, imgB] = await Promise.all([loadImage(candidate), loadImage(enrolled)]);
  const canvas = document.createElement('canvas');
  canvas.width = DESCRIPTOR_SIZE;
  canvas.height = DESCRIPTOR_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(imgA, 0, 0);
  const pixelsA = ctx.getImageData(0, 0, DESCRIPTOR_SIZE, DESCRIPTOR_SIZE).data;
  ctx.drawImage(imgB, 0, 0);
  const pixelsB = ctx.getImageData(0, 0, DESCRIPTOR_SIZE, DESCRIPTOR_SIZE).data;
  return descriptorDistance(candidate, enrolled, pixelsA, pixelsB) <= threshold;
}
