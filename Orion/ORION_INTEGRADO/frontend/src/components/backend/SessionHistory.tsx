import type { ExerciseSession } from '../../types/backend';

type Props = { athleteName: string | null; sessions: ExerciseSession[]; ready: boolean; onRefresh: () => void };
export default function SessionHistory({ athleteName, sessions, ready, onRefresh }: Props) {
  return <section className="surface backend-panel" aria-label="Server exercise sessions">
    <div className="backend-panel-heading"><div><span className="section-number">SQLITE / SERVER RECORDS</span><h2>Exercise sessions {athleteName ? `· ${athleteName}` : ''}</h2></div><button type="button" className="ms-button ms-button--outline" onClick={onRefresh} disabled={!ready || !athleteName}>Refresh</button></div>
    {!athleteName ? <p className="backend-empty">Choose a crew profile in Overview to view its real session history.</p>
    : !sessions.length ? <p className="backend-empty">No server sessions were returned for this profile.</p>
    : <div className="backend-session-list">{sessions.map(record => <article key={record.session_id} className="backend-session-row"><div><strong>{record.exercise_code.toUpperCase()} · {record.protocol_id}</strong><small>{new Date(record.started_at_utc).toLocaleString('en-US')}</small><code>{record.session_id}</code></div><div><span className="backend-session-status">{record.status.replace('_', ' ')}</span><small>Backend rep_count: {record.rep_count} (not independently validated)</small></div></article>)}</div>}
    <p className="backend-disclaimer">The API lists the latest 100 sessions for the selected profile. Only data returned by the backend is displayed here.</p>
  </section>;
}
