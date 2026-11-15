export type Athlete = { id: string; pseudonym: string; created_at: string };
export type SessionStatus = 'in_progress' | 'finished' | 'cancelled';
export type ExerciseSession = {
  session_id: string;
  exercise_code: string;
  protocol_id: string;
  status: SessionStatus;
  started_at_utc: string;
  ended_at_utc: string | null;
  rep_count: number;
};
export type SessionCreated = {
  session_id: string;
  status: SessionStatus;
  started_at_utc: string;
  protocol_version: string;
};
export type SessionFinished = {
  session_id: string;
  status: SessionStatus;
  ended_at_utc: string | null;
  rep_count: number;
};
export type MotionSample = {
  frame_id: number;
  captured_at_utc: string;
  pose_quality: number;
  angles_deg: Record<string, number>;
  image_width: number;
  image_height: number;
  landmarks_version: string;
};
export type MotionSampleResult = { received: number; inserted: number; duplicates: number };
