import { apiRequest } from './apiClient';
import type { Athlete, ExerciseSession, SessionCreated, SessionFinished, MotionSample, MotionSampleResult } from '../types/backend';

const json = () => ({ 'Content-Type': 'application/json' } as const);
export const backendApi = {
  health: () => apiRequest<{status: 'ok'}>('/health'),
  ready: () => apiRequest<{status: 'ready';database:'ok'}>('/ready'),
  createAthlete: (pseudonym: string) => apiRequest<Athlete>('/api/v1/athletes', {
    method: 'POST', headers: json(), body: JSON.stringify({ pseudonym })
  }),
  getAthlete: (id: string) => apiRequest<Athlete>(`/api/v1/athletes/${encodeURIComponent(id)}`),
  getSessions: (athleteId: string, limit = 100) => apiRequest<ExerciseSession[]>(`/api/v1/sessions?athlete_id=${encodeURIComponent(athleteId)}&limit=${limit}`),
  createSession: (athleteId: string, loadKg?: number, targetRepetitions?: number) => apiRequest<SessionCreated>('/api/v1/sessions', {
    method: 'POST', headers: json(), body: JSON.stringify({ athlete_id: athleteId, exercise_code: 'squat', protocol_id: 'SQUAT-01',
      ...(loadKg === undefined ? {} : { load_kg: loadKg }), ...(targetRepetitions === undefined ? {} : { target_repetitions: targetRepetitions }) })
  }),
  uploadSamples: (sessionId: string, samples: MotionSample[]) => apiRequest<MotionSampleResult>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/samples`, {
    method: 'POST', headers: json(), body: JSON.stringify({ samples })
  }),
  finishSession: (sessionId: string) => apiRequest<SessionFinished>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/finish`, { method: 'POST' })
};
