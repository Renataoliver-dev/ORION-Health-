import { useEffect, useRef, useState } from 'react';
import { backendApi } from '../../services/backendApi';
import type { Athlete, ExerciseSession, MotionSample, SessionCreated } from '../../types/backend';
import { createPoseDetector, clearPoseOverlay, drawPoseOverlay, poseMetrics } from './poseClient';
import type { PoseDetector } from './poseClient';
import { ExerciseRepCounter, exerciseOptions, setupGuidance, supportsExerciseCounting } from './exerciseCounter';
import type { ExerciseCode, ExerciseSide, CounterSnapshot } from './exerciseCounter';
import './MovementStudio.css';

function toClock(seconds: number) { const m = Math.floor(seconds / 60); return `${String(m).padStart(2, '0')}:${String(seconds % 60).padStart(2,'0')}`; }
const message = (e: unknown) => e instanceof Error ? e.message : 'Unexpected error.';

type Props = {
  athlete: Athlete | null;
  backendReady: boolean;
  sessions: ExerciseSession[];
  onSessionChanged: () => void;
};
export default function MovementStudio({ athlete, backendReady, sessions, onSessionChanged }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const poseDetectorRef = useRef<PoseDetector | null>(null);
  const frameRef = useRef<number | null>(null);
  const loadingTokenRef = useRef(0);
  const lastPoseFrameRef = useRef(0);
  const lastMetricsUpdateRef = useRef(0);
  const exerciseCounterRef = useRef(new ExerciseRepCounter('squat', 'left'));
  const [counterSnapshot, setCounterSnapshot] = useState<CounterSnapshot | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [poseStatus, setPoseStatus] = useState<'idle' | 'loading' | 'running'>('idle');
  const [poseError, setPoseError] = useState('');
  const [liveMetrics, setLiveMetrics] = useState<ReturnType<typeof poseMetrics> | null>(null);
  const [exercise, setExercise] = useState<ExerciseCode>('squat');
  const [exerciseSide, setExerciseSide] = useState<ExerciseSide>('left');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [baseElapsed, setBaseElapsed] = useState(0);
  const [currentSession, setCurrentSession] = useState<SessionCreated | null>(null);
  const [load, setLoad] = useState('');
  const [target, setTarget] = useState('');
  const [serverBusy, setServerBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleCount, setSampleCount] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(baseElapsed + Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
    tick(); const id = window.setInterval(tick, 250); return () => window.clearInterval(id);
  }, [running, baseElapsed]);
  const releaseTracker = () => {
    loadingTokenRef.current += 1;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    poseDetectorRef.current?.close(); poseDetectorRef.current = null;
    clearPoseOverlay(overlayRef.current);
  };
  useEffect(() => () => {
    loadingTokenRef.current += 1;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    poseDetectorRef.current?.close(); poseDetectorRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const stopPoseTracking = () => {
    releaseTracker(); exerciseCounterRef.current.interrupt();
    setCounterSnapshot(prev => prev ? { ...prev, phase: 'waiting', trackingValid: false, guidance: 'Tracking stopped.', angle: null } : null);
    setPoseStatus('idle'); setLiveMetrics(null); setPoseError('');
  };
  const resetExerciseCounter = () => {
    exerciseCounterRef.current.reset();
    setCounterSnapshot(null);
  };
  const chooseExercise = (code: ExerciseCode) => {
    exerciseCounterRef.current = new ExerciseRepCounter(code, exerciseSide);
    setExercise(code); setCounterSnapshot(null); resetTimer();
  };
  const chooseSide = (side: ExerciseSide) => {
    exerciseCounterRef.current = new ExerciseRepCounter(exercise, side);
    setExerciseSide(side); setCounterSnapshot(null);
  };
  const startPoseTracking = async () => {
    if (!cameraOn || !videoRef.current || poseStatus !== 'idle') return;
    setPoseStatus('loading'); setPoseError('');
    const token = ++loadingTokenRef.current;
    try {
      const detector = await createPoseDetector();
      if (token !== loadingTokenRef.current || !streamRef.current || !videoRef.current) { detector.close(); return; }
      poseDetectorRef.current = detector;
      setPoseStatus('running');
      lastPoseFrameRef.current = 0; lastMetricsUpdateRef.current = 0;
      const frame = (timestamp: number) => {
        if (token !== loadingTokenRef.current) return;
        const video = videoRef.current, model = poseDetectorRef.current;
        if (video && model && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && timestamp - lastPoseFrameRef.current >= 120) {
          lastPoseFrameRef.current = timestamp;
          try {
            const result = model.detectForVideo(video, timestamp);
            const detected = result.landmarks?.[0];
            if (detected) drawPoseOverlay(overlayRef.current!, video, detected);
            else clearPoseOverlay(overlayRef.current);
            const metrics = detected ? poseMetrics(detected) : null;
            const next = exerciseCounterRef.current.update(metrics, timestamp);
            if (next) {
              setCounterSnapshot(previous => !previous || previous.reps !== next.reps || previous.phase !== next.phase || previous.guidance !== next.guidance || previous.trackingValid !== next.trackingValid ? next : previous);
            }
            if (timestamp - lastMetricsUpdateRef.current >= 250) {
              lastMetricsUpdateRef.current = timestamp;
              setLiveMetrics(metrics);
            }
          } catch (error) {
            releaseTracker(); exerciseCounterRef.current.interrupt();
            setCounterSnapshot(prev => prev ? { ...prev, phase: 'waiting', trackingValid: false, guidance: 'Pose processing stopped.', angle: null } : null);
            setPoseStatus('idle'); setLiveMetrics(null);
            setPoseError(`Pose processing stopped: ${message(error)}`);
            return;
          }
        }
        frameRef.current = requestAnimationFrame(frame);
      };
      frameRef.current = requestAnimationFrame(frame);
    } catch (error) {
      if (token !== loadingTokenRef.current) return;
      setPoseStatus('idle');
      setPoseError(`Could not load MediaPipe. Internet access is required for this prototype. ${message(error)}`);
    }
  };

  const turnCameraOff = () => {
    stopPoseTracking();
    streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };
  const turnCameraOn = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError('Camera requires localhost or HTTPS.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
    } catch { turnCameraOff(); setCameraError('Camera unavailable. Check permissions.'); }
  };
  const toggleTimer = () => {
    if (running) {
      const t = baseElapsed + Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000);
      setElapsed(t); setBaseElapsed(t); startedAtRef.current = null; setRunning(false);
    } else { startedAtRef.current = Date.now(); setRunning(true); }
  };
  const resetTimer = () => { setRunning(false); setElapsed(0); setBaseElapsed(0); startedAtRef.current = null; };

  const startSession = async () => {
    if (!athlete || !backendReady || exercise !== 'squat') return;
    if (load.trim() !== '' && (!Number.isFinite(Number(load)) || Number(load) < 0)) { setServerError('Enter a non-negative load.'); return; }
    if (target.trim() !== '' && (!Number.isInteger(Number(target)) || Number(target) <= 0)) { setServerError('Target reps must be a positive integer.'); return; }
    setServerBusy(true); setServerError(''); setServerMessage('');
    try {
      const created = await backendApi.createSession(athlete.id, load.trim() ? Number(load) : undefined, target.trim() ? Number(target) : undefined);
      setCurrentSession(created); setSampleCount(null);
      setServerMessage('Session created in SQLite. Pose tracking stays local until an explicit export is implemented.');
      onSessionChanged();
    } catch (e) { setServerError(message(e)); } finally { setServerBusy(false); }
  };
  const resumeSession = (item: ExerciseSession) => {
    setCurrentSession({ session_id: item.session_id, status: 'in_progress', started_at_utc: item.started_at_utc, protocol_version: '1' });
    setServerError(''); setServerMessage('Existing in-progress session selected.');
  };
  const finishSession = async () => {
    if (!currentSession) return;
    setServerBusy(true); setServerError('');
    try {
      const finished = await backendApi.finishSession(currentSession.session_id);
      setServerMessage(`Session ${finished.status} in SQLite. Stored rep_count: ${finished.rep_count} (not a pose measurement).`);
      setCurrentSession(null); setSampleFile(null); resetTimer(); onSessionChanged();
    } catch (e) { setServerError(message(e)); } finally { setServerBusy(false); }
  };
  const uploadSamples = async () => {
    if (!sampleFile || !currentSession) return;
    setServerBusy(true); setServerError(''); setServerMessage('');
    try {
      const raw: unknown = JSON.parse(await sampleFile.text());
      const obj = raw as {samples?: unknown};
      const samples = Array.isArray(raw) ? raw : obj && typeof obj === 'object' && Array.isArray(obj.samples) ? obj.samples : null;
      if (!samples || samples.length < 1 || samples.length > 50) throw new Error('Provide a JSON array of 1–50 real pose samples, or an object with a samples array.');
      const result = await backendApi.uploadSamples(currentSession.session_id, samples as MotionSample[]);
      setSampleCount(previous => (previous ?? 0) + result.inserted);
      setServerMessage(`Motion samples saved in SQLite: ${result.inserted} new, ${result.duplicates} duplicate.`);
    } catch (e) { setServerError(message(e)); } finally { setServerBusy(false); }
  };
  const openSession = sessions.find(s => s.status === 'in_progress' && s.exercise_code === 'squat');

  return <div className="movement-studio">
    <div className="ms-toolbar">
      <label className="ms-field" htmlFor="movement-exercise"><span>EXERCISE</span><select id="movement-exercise" value={exercise} disabled={!!currentSession} onChange={e => chooseExercise(e.target.value as ExerciseCode)}>{exerciseOptions.map(e => <option value={e.value} key={e.value}>{e.label}</option>)}</select></label>
      {exercise !== 'squat' && supportsExerciseCounting(exercise) && <label className="ms-field ms-field--side" htmlFor="movement-side"><span>TRACKED SIDE</span><select id="movement-side" value={exerciseSide} onChange={e => chooseSide(e.target.value as ExerciseSide)}><option value="left">Left</option><option value="right">Right</option></select></label>}
      <div className="ms-session-badge"><i className={currentSession ? 'ms-live-dot' : ''}/>{currentSession ? 'BACKEND SESSION OPEN' : backendReady ? 'API CONNECTED' : 'LOCAL CAMERA PREVIEW'}</div>
    </div>
    <div className="ms-camera-frame"><div className="ms-camera-head"><span>CAMERA / LOCAL PREVIEW</span><span>{poseStatus === 'running' ? 'MEDIAPIPE · LIVE 2D' : poseStatus === 'loading' ? 'LOADING MODEL' : 'POSE TRACKING OFF'}</span></div><video ref={videoRef} autoPlay muted playsInline className={cameraOn ? 'ms-video ms-video--visible' : 'ms-video'}/><canvas ref={overlayRef} className="ms-pose-overlay" aria-hidden="true"/>{!cameraOn && <div className="ms-camera-empty"><h3>Live camera workspace</h3><p>Enable the camera, then choose Start pose tracking for a local MediaPipe overlay. YOLO is not connected.</p></div>}</div>
    <div className="ms-controls"><button className={cameraOn ? 'ms-button ms-button--outline' : 'ms-button ms-button--primary'} type="button" onClick={cameraOn ? turnCameraOff : turnCameraOn}>{cameraOn ? 'Turn off camera' : 'Enable camera'}</button><button className={poseStatus === 'running' ? 'ms-button ms-button--outline' : 'ms-button ms-button--primary'} type="button" disabled={!cameraOn || poseStatus === 'loading'} onClick={poseStatus === 'running' ? stopPoseTracking : startPoseTracking}>{poseStatus === 'loading' ? 'Loading MediaPipe…' : poseStatus === 'running' ? 'Stop pose tracking' : 'Start pose tracking'}</button><div className="ms-timer-group"><span className="ms-time">{toClock(elapsed)}</span><button className="ms-button ms-button--outline" type="button" onClick={toggleTimer}>{running ? 'Pause local timer' : elapsed ? 'Resume local timer' : 'Start local timer'}</button><button className="ms-reset" type="button" onClick={resetTimer} disabled={!elapsed && !running}>Reset</button></div></div>
    {cameraError && <p className="ms-error" role="alert">{cameraError}</p>}
    {poseError && <p className="ms-error" role="alert">{poseError}</p>}
    {poseStatus === 'running' && <p className="ms-pose-hint" role="status">Experimental 2D tracking is running locally. Position your full body in view. No images or landmark measurements are sent to FastAPI.</p>}
    <section className="ms-squat-panel" aria-label="Experimental exercise repetition counter">
      <div className="ms-squat-info">
        <span className="ms-squat-label">EXERCISE REP COUNTER · LOCAL</span>
        <strong>{!supportsExerciseCounting(exercise) ? 'COUNTER UNAVAILABLE' : poseStatus === 'running' ? (counterSnapshot?.phase ?? 'waiting').replaceAll('_', ' ').toUpperCase() : 'INACTIVE'}</strong>
        <p aria-live="polite">{!supportsExerciseCounting(exercise) ? setupGuidance[exercise] : poseStatus !== 'running' ? 'Start the camera and pose tracking to count locally.' : counterSnapshot?.guidance ?? setupGuidance[exercise]}</p>
        <small>{setupGuidance[exercise]} · Experimental 2D angles</small>
      </div>
      <div className="ms-squat-actions"><div className="ms-squat-reps"><span>LOCAL REPS</span><strong>{supportsExerciseCounting(exercise) ? counterSnapshot?.reps ?? 0 : '—'}</strong></div><button type="button" className="ms-button ms-button--outline" onClick={resetExerciseCounter} disabled={!supportsExerciseCounting(exercise)}>Reset count</button></div>
    </section>
    <section className="ms-api-workspace" aria-label="Server exercise recording"><h3>FastAPI exercise recording</h3><p>Server storage supports <strong>squat / SQUAT-01</strong> only. The experimental local counter runs in your browser and is not recorded in SQLite.</p>
      {!athlete && <p className="ms-api-info">Select or create a crew profile in Overview before recording a session.</p>}
      {exercise !== 'squat' && <p className="ms-api-info">This exercise can be counted locally if supported, but the backend currently accepts only squat / SQUAT-01 for server sessions.</p>}
      {currentSession ? <><p className="ms-session-id">Active session: <code>{currentSession.session_id}</code></p><button type="button" className="ms-button ms-button--primary" onClick={finishSession} disabled={serverBusy || !backendReady}>Finish server session</button>
        <details className="ms-samples"><summary>Optional: import real MediaPipe measurements (JSON)</summary><p>Only use samples created by a real pose-tracking pipeline. No values will be fabricated. Batch size: 1–50. Fields: frame_id, captured_at_utc, pose_quality, angles_deg, image_width, image_height, landmarks_version.</p><input type="file" accept=".json,application/json" onChange={e => setSampleFile(e.target.files?.[0] ?? null)}/><button type="button" className="ms-button ms-button--outline" onClick={uploadSamples} disabled={!sampleFile || serverBusy}>Save samples to API</button>{sampleCount !== null && <small>Inserted this visit: {sampleCount}</small>}</details></>
      : <><div className="ms-form-row"><label>LOAD (KG, OPTIONAL)<input inputMode="decimal" type="number" min="0" step="any" value={load} onChange={e => setLoad(e.target.value)} placeholder="No load"/></label><label>TARGET REPS (OPTIONAL)<input inputMode="numeric" type="number" min="1" step="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="No target"/></label></div><button type="button" className="ms-button ms-button--primary" onClick={startSession} disabled={!athlete || !backendReady || exercise !== 'squat' || serverBusy}>Start server session</button>{openSession && <button type="button" className="ms-button ms-button--outline" onClick={() => resumeSession(openSession)}>Resume in-progress session</button>}</>}
      {serverError && <p className="ms-error" role="alert">{serverError}</p>}{serverMessage && <p className="ms-api-info" role="status">{serverMessage}</p>}
    </section>
    <div className="ms-metrics"><div><span>REPETITIONS · LOCAL</span><strong>{supportsExerciseCounting(exercise) ? counterSnapshot?.reps ?? 0 : '—'}</strong><small>Experimental counter; not stored</small></div><div><span>LEFT KNEE · 2D</span><strong>{liveMetrics?.leftKnee === null || liveMetrics?.leftKnee === undefined ? '—' : `${liveMetrics.leftKnee}°`}</strong><small>Camera projection</small></div><div><span>RIGHT KNEE · 2D</span><strong>{liveMetrics?.rightKnee === null || liveMetrics?.rightKnee === undefined ? '—' : `${liveMetrics.rightKnee}°`}</strong><small>Camera projection</small></div><div><span>LANDMARK VISIBILITY</span><strong>{liveMetrics?.averageVisibility == null ? '—' : `${Math.round(liveMetrics.averageVisibility * 100)}%`}</strong><small>Not clinical pose quality</small></div></div><div className="ms-secondary-metrics">Elbows (2D): left <strong>{liveMetrics?.leftElbow == null ? '—' : `${liveMetrics.leftElbow}°`}</strong> · right <strong>{liveMetrics?.rightElbow == null ? '—' : `${liveMetrics.rightElbow}°`}</strong> <span>· Heart rate: not connected</span></div>
    <p className="ms-note">Pose angles are experimental 2D camera projections, not validated clinical measurements. Camera frames and pose landmarks stay in the browser; MediaPipe runtime/model assets are downloaded on first use. Only session metadata and JSON samples explicitly uploaded by the user reach FastAPI. Exercise-specific repetition counting is experimental, selected manually, and local only; it is not validated for clinical or training assessment. No automated repetition count is saved to SQLite. No diagnosis is performed.</p>
  </div>;
}
