import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Athlete } from '../../types/backend';
import type { BodyMeasurement } from '../../types/anthropometry';
import { calculateBmi, calculateWaistToHeight, formatNumber } from '../../utils/anthropometry';
import './BodyProfile.css';
import ExerciseAdvisor from '../advisor/ExerciseAdvisor';

type InputKey = 'ageYears' | 'heightCm' | 'weightKg' | 'waistCm' | 'hipCm' | 'rightUpperArmCm' | 'leftUpperArmCm' | 'rightForearmCm' | 'leftForearmCm' | 'rightThighCm' | 'leftThighCm' | 'rightCalfCm' | 'leftCalfCm' | 'bodyFatPercent' | 'skeletalMuscleMassKg' | 'bodyWaterPercent';
type FormValues = Record<InputKey, string> & { biaDevice: string };
const emptyForm: FormValues = {
  ageYears: '', heightCm: '', weightKg: '', waistCm: '', hipCm: '',
  rightUpperArmCm: '', leftUpperArmCm: '', rightForearmCm: '', leftForearmCm: '',
  rightThighCm: '', leftThighCm: '', rightCalfCm: '', leftCalfCm: '',
  bodyFatPercent: '', skeletalMuscleMassKg: '', bodyWaterPercent: '', biaDevice: ''
};
const optionalCircumferences: { key: InputKey; label: string }[] = [
  { key: 'waistCm', label: 'Waist' }, { key: 'hipCm', label: 'Hip' },
  { key: 'rightUpperArmCm', label: 'Right upper arm' }, { key: 'leftUpperArmCm', label: 'Left upper arm' },
  { key: 'rightForearmCm', label: 'Right forearm' }, { key: 'leftForearmCm', label: 'Left forearm' },
  { key: 'rightThighCm', label: 'Right thigh' }, { key: 'leftThighCm', label: 'Left thigh' },
  { key: 'rightCalfCm', label: 'Right calf' }, { key: 'leftCalfCm', label: 'Left calf' }
];
const numericLimits: Record<InputKey, [number, number]> = {
  ageYears: [18, 110], heightCm: [100, 250], weightKg: [20, 350],
  waistCm: [25, 250], hipCm: [25, 250], rightUpperArmCm: [10, 100], leftUpperArmCm: [10, 100],
  rightForearmCm: [10, 90], leftForearmCm: [10, 90], rightThighCm: [15, 140], leftThighCm: [15, 140],
  rightCalfCm: [10, 110], leftCalfCm: [10, 110], bodyFatPercent: [1, 80],
  skeletalMuscleMassKg: [1, 150], bodyWaterPercent: [10, 90]
};
function numericValue(form: FormValues, key: InputKey): number | null {
  const raw = form[key].trim();
  return raw === '' ? null : Number(raw);
}
function createMeasurement(form: FormValues, athleteId: string): BodyMeasurement {
  const numeric = (key: InputKey) => numericValue(form, key);
  return {
    id: crypto.randomUUID(), athleteId, recordedAt: new Date().toISOString(),
    ageYears: numeric('ageYears'), heightCm: numeric('heightCm')!, weightKg: numeric('weightKg')!,
    waistCm: numeric('waistCm'), hipCm: numeric('hipCm'), rightUpperArmCm: numeric('rightUpperArmCm'),
    leftUpperArmCm: numeric('leftUpperArmCm'), rightForearmCm: numeric('rightForearmCm'),
    leftForearmCm: numeric('leftForearmCm'), rightThighCm: numeric('rightThighCm'),
    leftThighCm: numeric('leftThighCm'), rightCalfCm: numeric('rightCalfCm'), leftCalfCm: numeric('leftCalfCm'),
    bodyFatPercent: numeric('bodyFatPercent'), skeletalMuscleMassKg: numeric('skeletalMuscleMassKg'),
    bodyWaterPercent: numeric('bodyWaterPercent'), biaDevice: form.biaDevice.trim() || null
  };
}
function NumericInput({ field, label, value, onChange, required = false, unit = 'cm' }: {
  field: InputKey; label: string; value: string; required?: boolean; unit?: string;
  onChange: (field: InputKey, value: string) => void;
}) {
  const [min, max] = numericLimits[field];
  return <label className="bp-field"><span>{label} {required && <b aria-label="required">*</b>}</span><div className="bp-input-wrap"><input type="number" inputMode="decimal" min={min} max={max} step={field === 'ageYears' ? 1 : 0.1} value={value} required={required} placeholder="—" onChange={e => onChange(field, e.target.value)}/><em>{unit}</em></div></label>;
}
function WeightTrend({ records }: { records: BodyMeasurement[] }) {
  const chronology = records.slice(0, 8).reverse();
  if (chronology.length < 2) return <p className="bp-placeholder">Add another measurement to view an individual weight trend.</p>;
  const weights = chronology.map(record => record.weightKg);
  const low = Math.min(...weights) - 1;
  const high = Math.max(...weights) + 1;
  const spread = Math.max(1, high - low);
  const points = weights.map((value, i) => `${20 + i * 52},${110 - ((value - low) / spread) * 85}`).join(' ');
  return <div className="bp-trend"><svg viewBox="0 0 410 125" role="img" aria-label={`Weight trend from ${weights[0].toFixed(1)} to ${weights.at(-1)!.toFixed(1)} kilograms`} preserveAspectRatio="xMidYMid meet">
    {[25, 65, 105].map(y => <line key={y} x1="15" x2="390" y1={y} y2={y} stroke="#dae1e9" strokeDasharray="4 5"/>)}
    <polyline points={points} fill="none" stroke="#375978" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {weights.map((weight, i) => <circle key={i} cx={20 + i * 52} cy={110 - ((weight - low) / spread) * 85} r="4" fill="#375978"><title>{weight.toFixed(1)} kg</title></circle>)}
  </svg><div className="bp-trend-caption"><span>Oldest of last {chronology.length}</span><span>Most recent</span></div></div>;
}
export default function BodyProfile({ athlete, records, onAdd, onRemove, onSelectCrew }: {
  athlete: Athlete | null;
  records: BodyMeasurement[];
  onAdd: (measurement: BodyMeasurement) => void;
  onRemove: (id: string) => void;
  onSelectCrew: () => void;
}) {
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCircs, setShowCircs] = useState(true);
  const [showBia, setShowBia] = useState(false);
  const latest = records[0] ?? null;
  const bmi = latest ? calculateBmi(latest.heightCm, latest.weightKg) : null;
  const waistRatio = latest ? calculateWaistToHeight(latest.waistCm, latest.heightCm) : null;
  const setField = (key: InputKey, value: string) => { setForm(prev => ({ ...prev, [key]: value })); setError(''); setSuccess(''); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!athlete) { setError('Select a crew profile before saving measurements.'); return; }
    const height = numericValue(form, 'heightCm'), weight = numericValue(form, 'weightKg');
    if (height === null || weight === null) { setError('Height and weight are required.'); return; }
    for (const key of Object.keys(numericLimits) as InputKey[]) {
      const value = numericValue(form, key); const [min, max] = numericLimits[key];
      if (value !== null && (!Number.isFinite(value) || value < min || value > max || (key === 'ageYears' && !Number.isInteger(value)))) {
        setError(`Check ${key}: expected a value from ${min} to ${max}.`); return;
      }
    }
    const hasBia = ['bodyFatPercent', 'skeletalMuscleMassKg', 'bodyWaterPercent'].some(key => form[key as InputKey].trim() !== '');
    if (hasBia && !form.biaDevice.trim()) { setError('Name the actual device or report used for any external BIA values.'); return; }
    if (form.biaDevice.length > 120) { setError('Device/source name must be 120 characters or fewer.'); return; }
    onAdd(createMeasurement(form, athlete.id));
    setForm(emptyForm); setSuccess('Measurement recorded in browser memory for the selected crew member. It will disappear on reload.');
  };
  return <div className="body-profile">
    <section className="surface bp-intro"><div><span className="section-number">PERSONAL ANTHROPOMETRY</span><h2>One person. One baseline.</h2><p>Record individual measurements without inferring physical characteristics from a webcam. ORION links each assessment to the selected crew UUID.</p></div><div className="bp-intro-seal"><strong>ORION</strong><span>BODY PROFILE</span></div></section>
    {!athlete ? <section className="surface bp-empty"><h2>No crew profile selected</h2><p>Register or open a crew member in Overview before recording personal measurements. This prevents mixing measurements between people.</p><button className="button-dark" type="button" onClick={onSelectCrew}>Open crew profiles ↗</button></section> : <>
      <div className="bp-crew-strip"><span className="bp-crew-dot"/><span>ACTIVE CREW MEMBER</span><strong>{athlete.pseudonym}</strong><code title={athlete.id}>{athlete.id}</code><span className="bp-memory-tag">LOCAL MEMORY ONLY</span></div>
      <div className="bp-metric-grid">
        <article className="surface bp-stat"><span>HEIGHT</span><strong>{formatNumber(latest?.heightCm)} <small>cm</small></strong><p>Entered manually</p></article>
        <article className="surface bp-stat"><span>BODY WEIGHT</span><strong>{formatNumber(latest?.weightKg)} <small>kg</small></strong><p>Entered manually</p></article>
        <article className="surface bp-stat"><span>BODY MASS INDEX</span><strong>{formatNumber(bmi)} <small>kg/m²</small></strong><p>Calculated from height and weight</p></article>
        <article className="surface bp-stat"><span>WAIST / HEIGHT</span><strong>{formatNumber(waistRatio, 2)}</strong><p>Shown only if waist is entered</p></article>
      </div>
      <ExerciseAdvisor key={`${athlete.id}:${latest?.id ?? "none"}`} measurement={latest}/>
      <div className="bp-columns"><section className="surface bp-form-card"><div className="surface-heading"><div><span className="section-number">NEW OBSERVATION</span><h2>Body measurements</h2></div><span className="bp-subtle-tag">MANUAL ENTRY</span></div>
        <form onSubmit={submit}><h3>Essential measurements</h3><div className="bp-form-grid">
          <NumericInput field="heightCm" label="Height" value={form.heightCm} onChange={setField} required/>
          <NumericInput field="weightKg" label="Body weight" unit="kg" value={form.weightKg} onChange={setField} required/>
          <NumericInput field="ageYears" label="Age (optional)" unit="years" value={form.ageYears} onChange={setField}/>
        </div>
        <button className="bp-section-toggle" type="button" aria-expanded={showCircs} onClick={() => setShowCircs(v => !v)}>Body circumferences <span>{showCircs ? '−' : '+'}</span></button>
        {showCircs && <><p className="bp-help">Optional tape measurements. Use the same landmarks, posture, and technique at each assessment.</p><div className="bp-form-grid">{optionalCircumferences.map(item => <NumericInput key={item.key} field={item.key} label={item.label} value={form[item.key]} onChange={setField}/>)}</div></>}
        <button className="bp-section-toggle" type="button" aria-expanded={showBia} onClick={() => setShowBia(v => !v)}>External bioimpedance results <span>{showBia ? '−' : '+'}</span></button>
        {showBia && <div className="bp-bia-section"><p className="bp-help"><strong>Only transcribe values measured by an actual BIA device.</strong> The webcam, pose tracking, height and weight cannot produce these measurements.</p><div className="bp-form-grid">
          <NumericInput field="bodyFatPercent" label="Body fat" unit="%" value={form.bodyFatPercent} onChange={setField}/>
          <NumericInput field="skeletalMuscleMassKg" label="Muscle mass (as reported)" unit="kg" value={form.skeletalMuscleMassKg} onChange={setField}/>
          <NumericInput field="bodyWaterPercent" label="Total body water" unit="%" value={form.bodyWaterPercent} onChange={setField}/>
          <label className="bp-field"><span>Measurement device / report</span><div className="bp-input-wrap"><input type="text" value={form.biaDevice} maxLength={120} placeholder="Device or report name" onChange={e => setForm(prev => ({ ...prev, biaDevice: e.target.value }))}/></div></label>
        </div></div>}
        <div className="bp-form-actions"><button type="submit" className="button-dark">Save local measurement</button><span>Nothing sent to FastAPI</span></div>
        {error && <p className="bp-error" role="alert">{error}</p>}{success && <p className="bp-success" role="status">{success}</p>}
        </form>
      </section><aside className="bp-side-stack"><section className="surface bp-history-card"><div className="surface-heading"><div><span className="section-number">INDIVIDUAL BASELINE</span><h2>Measurement history</h2></div><span className="bp-subtle-tag">{records.length} RECORD(S)</span></div><WeightTrend records={records}/>
        <div className="bp-history-list">{records.length === 0 ? <p className="bp-placeholder">No personal measurements have been entered for this crew member.</p> : records.map(item => <article key={item.id} className="bp-record"><div><strong>{item.weightKg.toFixed(1)} kg <span>·</span> {item.heightCm.toFixed(1)} cm</strong><small>{new Date(item.recordedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · BMI {formatNumber(calculateBmi(item.heightCm, item.weightKg))}</small>{item.biaDevice && <small>External BIA report: {item.biaDevice}</small>}</div><button type="button" onClick={() => { if (window.confirm('Remove this local measurement?')) onRemove(item.id); }} aria-label={`Remove record from ${new Date(item.recordedAt).toLocaleDateString('en-US')}`}>Remove</button></article>)}</div>
      </section><section className="surface bp-science-card"><span className="section-number">MEASUREMENT BOUNDARIES</span><h2>Not a bioimpedance examination.</h2><p>BMI and waist-to-height ratio are mathematical indicators, not diagnoses. Body fat, muscle mass, water compartments and individual identity cannot be determined reliably from a webcam or MediaPipe. ORION does not provide a medical classification.</p><p>Baseline comparisons are meaningful only with comparable repeated measurements from the same person.</p><p className="bp-privacy"><strong>Privacy:</strong> This release keeps anthropometry only in React memory; it is neither saved to SQLite nor stored in localStorage. Reloading the page clears these records.</p></section></aside></div>
    </>}
  </div>;
}
