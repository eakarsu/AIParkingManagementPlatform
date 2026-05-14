import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

// Apply pass 5 — Extensions surface (rideshare, broadcast, vehicle reg,
// utility DR, self-service, mobile, permit fraud).

const API = process.env.REACT_APP_API_BASE || '/api';
function authHeaders() {
  const t = localStorage.getItem('token');
  return { headers: { Authorization: t ? `Bearer ${t}` : '' } };
}

const tabs = [
  { id: 'self', label: 'Self-Service' },
  { id: 'broadcast', label: 'Broadcast (Waze/GMaps)' },
  { id: 'rideshare', label: 'Rideshare' },
  { id: 'fraud', label: 'Permit Fraud' },
  { id: 'mobile', label: 'Mobile' },
];

export default function Extensions() {
  const [tab, setTab] = useState('self');
  return (
    <div style={{ padding: 20 }}>
      <h1>Extensions</h1>
      <p>Backlog endpoints (additive). Endpoints requiring credentials return 503 with explicit <code>missing</code> field.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 14px', border: '1px solid #ccc', background: tab === t.id ? '#1976d2' : '#fff', color: tab === t.id ? '#fff' : '#222', borderRadius: 4 }}>{t.label}</button>
        ))}
      </div>
      {tab === 'self' && <SelfService />}
      {tab === 'broadcast' && <Broadcast />}
      {tab === 'rideshare' && <Rideshare />}
      {tab === 'fraud' && <PermitFraud />}
      {tab === 'mobile' && <Mobile />}
    </div>
  );
}

function showErr(e) {
  const data = e?.response?.data || {};
  const status = e?.response?.status;
  if (status === 503) return `503 — ${data.error || ''} (missing: ${data.missing || 'unknown'})`;
  return data.error || e.message;
}

function SelfService() {
  const [reqs, setReqs] = useState([]);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ request_type: 'general', plate: '', facility_id: '' });
  const load = useCallback(async () => {
    try { const r = await axios.get(`${API}/self-service/requests`, authHeaders()); setReqs(r.data.requests || []); }
    catch (e) { setErr(showErr(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await axios.post(`${API}/self-service/requests`, form, authHeaders()); setForm({ request_type: 'general', plate: '', facility_id: '' }); load(); }
    catch (ex) { setErr(showErr(ex)); }
  };
  return (
    <div>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })}>
          {['general', 'refund', 'dispute', 'lost-ticket', 'permit-renewal', 'access-issue'].map(o => <option key={o}>{o}</option>)}
        </select>
        <input placeholder="plate" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} />
        <input placeholder="facility_id" value={form.facility_id} onChange={e => setForm({ ...form, facility_id: e.target.value })} />
        <button type="submit">Submit</button>
      </form>
      <table><thead><tr><th>ID</th><th>Type</th><th>Plate</th><th>Status</th><th>When</th></tr></thead><tbody>
        {reqs.map(r => (<tr key={r.id}><td>{r.id}</td><td>{r.request_type}</td><td>{r.plate || '—'}</td><td>{r.status}</td><td>{new Date(r.created_at).toLocaleString()}</td></tr>))}
      </tbody></table>
    </div>
  );
}

function Broadcast() {
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { const r = await axios.get(`${API}/broadcast/recent`, authHeaders()); setEvents(r.data.events || []); }
    catch (e) { setErr(showErr(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const send = async (provider) => {
    setErr('');
    try { await axios.post(`${API}/broadcast/${provider}`, { event_type: 'lot_full', payload: {} }, authHeaders()); load(); }
    catch (e) { setErr(showErr(e)); }
  };
  return (
    <div>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <button onClick={() => send('waze')} style={{ marginRight: 8 }}>Send Waze test event</button>
      <button onClick={() => send('gmaps')}>Send GMaps test event</button>
      <table style={{ marginTop: 12 }}><thead><tr><th>ID</th><th>Provider</th><th>Type</th><th>Status</th><th>When</th></tr></thead><tbody>
        {events.map(e => (<tr key={e.id}><td>{e.id}</td><td>{e.provider}</td><td>{e.event_type}</td><td>{e.status}</td><td>{new Date(e.created_at).toLocaleString()}</td></tr>))}
      </tbody></table>
    </div>
  );
}

function Rideshare() {
  const [readings, setReadings] = useState([]);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { const r = await axios.get(`${API}/rideshare/recent`, authHeaders()); setReadings(r.data.readings || []); }
    catch (e) { setErr(showErr(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const ingest = async () => {
    setErr('');
    try { await axios.post(`${API}/rideshare/correlate`, { provider: 'uber', demand_score: Math.random(), facility_id: 1 }, authHeaders()); load(); }
    catch (e) { setErr(showErr(e)); }
  };
  return (
    <div>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <button onClick={ingest}>Test ingest</button>
      <table style={{ marginTop: 12 }}><thead><tr><th>ID</th><th>Provider</th><th>Demand</th><th>When</th></tr></thead><tbody>
        {readings.map(r => (<tr key={r.id}><td>{r.id}</td><td>{r.provider}</td><td>{Number(r.demand_score).toFixed(3)}</td><td>{new Date(r.recorded_at).toLocaleString()}</td></tr>))}
      </tbody></table>
    </div>
  );
}

function PermitFraud() {
  const [err, setErr] = useState('');
  const [out, setOut] = useState(null);
  const scan = async () => {
    setErr(''); setOut(null);
    try {
      const r = await axios.post(`${API}/permit-fraud/scan`, { facility_id: 1, time_window_days: 30 }, authHeaders());
      setOut(r.data);
    } catch (e) { setErr(showErr(e)); }
  };
  return (
    <div>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <button onClick={scan}>Run permit-fraud scan</button>
      {out && <pre style={{ background: '#f3f3f3', padding: 12, marginTop: 12, maxHeight: 500, overflow: 'auto' }}>{JSON.stringify(out, null, 2)}</pre>}
    </div>
  );
}

function Mobile() {
  const [manifest, setManifest] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      try { const r = await axios.get(`${API}/mobile/manifest`); setManifest(r.data); }
      catch (e) { setErr(showErr(e)); }
    })();
  }, []);
  return (
    <div>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <pre style={{ background: '#f3f3f3', padding: 12, maxHeight: 500, overflow: 'auto' }}>{manifest ? JSON.stringify(manifest, null, 2) : 'Loading…'}</pre>
    </div>
  );
}
