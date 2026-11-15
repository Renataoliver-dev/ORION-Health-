/**
 * Optional browser-only pose tracker. No FastAPI or YOLO changes.
 * MediaPipe scripts, WASM and model are loaded from public CDNs on first use.
 * Do not use measurements for clinical diagnosis.
 */
export type PoseLandmark = { x: number; y: number; visibility?: number };
export type PoseResult = { landmarks: PoseLandmark[][] };
export type PoseDetector = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => PoseResult;
  close: () => void;
};

type MediaPipeModule = {
  FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
  PoseLandmarker: {
    createFromOptions: (wasm: unknown, options: {
      baseOptions: { modelAssetPath: string; delegate: 'CPU' };
      runningMode: 'VIDEO'; numPoses: number;
      minPoseDetectionConfidence: number;
      minPosePresenceConfidence: number;
      minTrackingConfidence: number;
    }) => Promise<PoseDetector>;
  };
};

const PACKAGE_VERSION = '1.2.3';
const PACKAGE_MODULE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${PACKAGE_VERSION}/+esm`;
const WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${PACKAGE_VERSION}/wasm`;
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export async function createPoseDetector(): Promise<PoseDetector> {
  // Vite ignores this variable import so the dependency is not added to the
  // installed frontend. The browser must be online when tracking starts.
  const mod = (await import(/* @vite-ignore */ PACKAGE_MODULE)) as MediaPipeModule;
  if (!mod.FilesetResolver || !mod.PoseLandmarker) throw new Error('MediaPipe module did not load.');
  const wasm = await mod.FilesetResolver.forVisionTasks(WASM_PATH);
  return mod.PoseLandmarker.createFromOptions(wasm, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'CPU' },
    runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55
  });
}

const poseEdges: [number, number][] = [
  [11,12], [11,13], [13,15], [12,14], [14,16],
  [11,23], [12,24], [23,24], [23,25], [25,27],
  [24,26], [26,28], [27,29], [28,30]
];

function visible(point: PoseLandmark | undefined): point is PoseLandmark {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y) && (point.visibility ?? 1) >= 0.55;
}

/** Planar (2D) joint angle, not a clinical range-of-motion measurement. */
export function angle2D(points: PoseLandmark[], first: number, joint: number, last: number): number | null {
  const a = points[first], b = points[joint], c = points[last];
  if (!visible(a) || !visible(b) || !visible(c)) return null;
  const ux = a.x - b.x, uy = a.y - b.y, vx = c.x - b.x, vy = c.y - b.y;
  const denominator = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (denominator < 0.000001) return null;
  const cosine = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / denominator));
  return Math.round(Math.acos(cosine) * 180 / Math.PI);
}

export function poseMetrics(points: PoseLandmark[]) {
  const leftKnee = angle2D(points, 23, 25, 27);
  const rightKnee = angle2D(points, 24, 26, 28);
  const leftElbow = angle2D(points, 11, 13, 15);
  const rightElbow = angle2D(points, 12, 14, 16);
  // Shoulder elevation (hip–shoulder–elbow), 2D projection only.
  const leftShoulder = angle2D(points, 23, 11, 13);
  const rightShoulder = angle2D(points, 24, 12, 14);
  const viewable = points.filter(point => visible(point));
  const averageVisibility = viewable.length ? viewable.reduce((sum, point) => sum + (point.visibility ?? 1), 0) / viewable.length : null;
  return { leftKnee, rightKnee, leftElbow, rightElbow, leftShoulder, rightShoulder, averageVisibility, visiblePoints: viewable.length };
}

export function clearPoseOverlay(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawPoseOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement, points: PoseLandmark[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !video.videoWidth || !video.videoHeight) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
  const dx = (width - video.videoWidth * scale) / 2;
  const dy = (height - video.videoHeight * scale) / 2;
  const position = (point: PoseLandmark) => ({ x: dx + point.x * video.videoWidth * scale, y: dy + point.y * video.videoHeight * scale });
  ctx.strokeStyle = '#71d7ff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const [a, b] of poseEdges) {
    if (!visible(points[a]) || !visible(points[b])) continue;
    const p = position(points[a]), q = position(points[b]);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.fillStyle = '#def6ff';
  points.forEach((point, index) => {
    if (index < 11 || !visible(point)) return;
    const p = position(point);
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 2 * Math.PI); ctx.fill();
  });
}
