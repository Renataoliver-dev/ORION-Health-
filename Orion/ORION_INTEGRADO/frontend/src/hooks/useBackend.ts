import { useCallback, useEffect, useState } from 'react';
import { backendApi } from '../services/backendApi';
import type { Athlete, ExerciseSession } from '../types/backend';

type ApiState = 'checking' | 'ready' | 'schema-not-ready' | 'offline';
const KEY = 'orion_active_athlete_id';
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unexpected API error.';

export function useBackend() {
  const [apiState, setApiState] = useState<ApiState>('checking');
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const checkConnection = useCallback(async () => {
    // Keep the initial effect free of synchronous state updates.
    await Promise.resolve();
    setApiState('checking');
    try {
      await backendApi.health();
    } catch (e) {
      setApiState('offline'); setError(messageOf(e)); return;
    }
    try { await backendApi.ready(); setApiState('ready'); setError(''); }
    catch { setApiState('schema-not-ready'); setError('Backend is online, but SQLite migrations are not ready. Run alembic upgrade head.'); }
  }, []);

  const reloadSessions = useCallback(async (id?: string) => {
    const key = id || athlete?.id;
    if (!key) { setSessions([]); return; }
    try { setSessions(await backendApi.getSessions(key)); setError(''); }
    catch (e) { setError(messageOf(e)); }
  }, [athlete?.id]);

  useEffect(() => {
    let active = true;
    void backendApi.health().then(() => backendApi.ready()).then(() => {
      if (active) { setApiState('ready'); setError(''); }
    }).catch(async () => {
      try {
        await backendApi.health();
        if (active) { setApiState('schema-not-ready'); setError('Backend online, but SQLite migrations are not ready. Run alembic upgrade head.'); }
      } catch (error) {
        if (active) { setApiState('offline'); setError(messageOf(error)); }
      }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (apiState !== 'ready') return;
    const saved = window.sessionStorage.getItem(KEY);
    if (!saved || athlete) return;
    let alive = true;
    backendApi.getAthlete(saved).then(profile => {
      if (!alive) return;
      setAthlete(profile);
      return backendApi.getSessions(profile.id).then(records => { if (alive) setSessions(records); });
    }).catch(() => { if (alive) window.sessionStorage.removeItem(KEY); });
    return () => { alive = false; };
  }, [apiState, athlete]);

  const openProfile = async (id: string) => {
    setWorking(true); setError('');
    try {
      const profile = await backendApi.getAthlete(id.trim());
      const records = await backendApi.getSessions(profile.id);
      setAthlete(profile); setSessions(records);
      window.sessionStorage.setItem(KEY, profile.id);
    } catch (e) { setError(messageOf(e)); } finally { setWorking(false); }
  };
  const createProfile = async (pseudonym: string) => {
    setWorking(true); setError('');
    try {
      const profile = await backendApi.createAthlete(pseudonym.trim());
      setAthlete(profile); setSessions([]);
      window.sessionStorage.setItem(KEY, profile.id);
    } catch (e) { setError(messageOf(e)); } finally { setWorking(false); }
  };
  const clearProfile = () => {
    window.sessionStorage.removeItem(KEY);
    setAthlete(null); setSessions([]); setError('');
  };
  return { apiState, athlete, sessions, working, error, checkConnection, reloadSessions, openProfile, createProfile, clearProfile };
}
