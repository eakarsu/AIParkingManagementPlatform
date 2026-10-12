

import React, { useState, useEffect } from 'react';
import { aiAPI, facilitiesAPI, securityAPI } from '../services/api';
import AIResponse from '../components/AIResponse';

const TOOLS = [
  { id: 'asset', label: 'Asset Lifecycle Predict' },
  { id: 'audit', label: 'Facility Audit Recommend' },
  { id: 'intrusion', label: 'Intrusion Detect' },
];

function AIPredictive() {

  const [activeTool, setActiveTool] = useState('asset');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [asset, setAsset] = useState({
    facility_id: '',
    asset_type: '',
    install_date: '',
    last_serviced: '',
    usage_intensity: 'medium',
    failure_history: '',
  });
  const [audit, setAudit] = useState({
    facility_id: '',
    last_audit_date: '',
    incident_count: '',
    revenue_anomalies: '',
    compliance_areas: '',
  });
  const [intrusion, setIntrusion] = useState({
    time_window_hours: 24,
    camera_id: '',
    sensor_data: '',
    timestamp: '',
    facility_id: '',
  });

  const [facilities, setFacilities] = useState([]);
  const [cameras, setCameras] = useState([]);
  useEffect(() => { Promise.all([facilitiesAPI.getAll({ limit: 100 }), securityAPI.getAll()]).then(([facilityResponse, cameraResponse]) => { setFacilities(facilityResponse.data.data || facilityResponse.data || []); setCameras(cameraResponse.data.data || cameraResponse.data || []); }).catch(() => {}); }, []);
  const fillExample = (index) => {
    const firstFacility = String(facilities[0]?.id || '');
    if (activeTool === 'asset') setAsset(current => ({ facility_id: current.facility_id || firstFacility, asset_type: ['EV charger', 'Gate arm', 'Payment kiosk'][index], install_date: ['2022-05-15', '2021-09-10', '2023-02-20'][index], last_serviced: ['2026-08-15', '2026-07-10', '2026-09-20'][index], usage_intensity: ['medium', 'high', 'low'][index], failure_history: current.failure_history || JSON.stringify([{ date: '2026-06-15', issue: 'Fictional example: intermittent reset; verify service records.', downtime_hours: 2 }], null, 2) }));
    if (activeTool === 'audit') setAudit(current => ({ facility_id: current.facility_id || firstFacility, last_audit_date: ['2026-07-15', '2026-08-10', '2026-09-20'][index], incident_count: [2, 4, 1][index], revenue_anomalies: ['Fictional example: reconcile a 3% variance between receipts and sensor counts.', 'Fictional example: weekend receipts fell 5% while occupancy remained steady.', 'Fictional example: review one duplicate payment adjustment.'][index], compliance_areas: ['ADA, fire safety, signage', 'Lighting, emergency access, pedestrian routes', 'Payment disclosures, accessible spaces, wayfinding'][index] }));
    if (activeTool === 'intrusion') setIntrusion(current => { const facility = current.facility_id || firstFacility; const camera = cameras.find(item => String(item.facility_id) === facility); return { facility_id: facility, camera_id: current.camera_id || String(camera?.id || ''), time_window_hours: [4, 12, 24][index], sensor_data: current.sensor_data || JSON.stringify([{ sensor: 'fictional-motion-example', value: 1, ts: '2026-10-01T03:14:00Z', example: true }], null, 2), timestamp: ['2026-10-01T03:14', '2026-10-02T23:30', '2026-10-03T01:45'][index] }; });
  };

  const parseJsonOrText = (s) => {
    if (!s || !s.trim()) return undefined;
    try { return JSON.parse(s); } catch { return s; }
  };

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      let res;
      if (activeTool === 'asset') {
        res = await aiAPI.assetLifecyclePredict({
          facility_id: asset.facility_id ? parseInt(asset.facility_id, 10) : undefined,
          asset_type: asset.asset_type,
          install_date: asset.install_date,
          last_serviced: asset.last_serviced,
          usage_intensity: asset.usage_intensity,
          failure_history: parseJsonOrText(asset.failure_history),
        });
      } else if (activeTool === 'audit') {
        res = await aiAPI.facilityAuditRecommend({
          facility_id: audit.facility_id ? parseInt(audit.facility_id, 10) : undefined,
          condition_notes: `Unverified scenario inputs for review: last audit ${audit.last_audit_date}; incidents ${audit.incident_count}; revenue observations ${audit.revenue_anomalies}; review areas ${audit.compliance_areas}. These are not a compliance certification.`,
          last_audit_date: audit.last_audit_date,
          incident_count: audit.incident_count ? parseInt(audit.incident_count, 10) : undefined,
          revenue_anomalies: audit.revenue_anomalies,
          compliance_areas: audit.compliance_areas
            ? audit.compliance_areas.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        });
      } else {
        res = await aiAPI.intrusionDetect({
          time_window_hours: Number(intrusion.time_window_hours),
          camera_id: intrusion.camera_id ? parseInt(intrusion.camera_id, 10) : undefined,
          sensor_data: parseJsonOrText(intrusion.sensor_data),
          timestamp: intrusion.timestamp,
          facility_id: intrusion.facility_id ? parseInt(intrusion.facility_id, 10) : undefined,
        });
      }
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>AI Predictive Tools</h1>
        <p>Asset lifecycle, facility audits, and intrusion detection</p>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`btn ${activeTool === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTool(t.id); setResult(null); setError(''); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="ai-preset-bar"><div><strong>Complete predictive examples</strong><p>Each fills all editable scenario values, including optional fields. Selected real facility, camera and entered service/sensor evidence remain in place. Missing references require a real available record.</p></div><div className="ai-actions">{['Standard review', 'Priority review', 'Extended review'].map((label, index) => <button key={label} className="btn btn-secondary" type="button" disabled={loading} onClick={() => fillExample(index)}>{label}</button>)}</div></section>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        {activeTool === 'asset' && (
          <>
            <h3>Asset Lifecycle Prediction</h3>
            <div className="form-group"><label>Facility</label><select aria-label="Asset facility" value={asset.facility_id} onChange={event => setAsset({ ...asset, facility_id: event.target.value })}><option value="">Select a real facility</option>{facilities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div className="form-group">
              <label>Asset Type</label>
              <input value={asset.asset_type} onChange={e => setAsset({ ...asset, asset_type: e.target.value })} placeholder="EV charger, gate arm, sensor..." />
            </div>
            <div className="form-group">
              <label>Install Date</label>
              <input type="date" value={asset.install_date} onChange={e => setAsset({ ...asset, install_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Last Serviced</label>
              <input type="date" value={asset.last_serviced} onChange={e => setAsset({ ...asset, last_serviced: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Usage Intensity</label>
              <select value={asset.usage_intensity} onChange={e => setAsset({ ...asset, usage_intensity: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Failure History (JSON)</label>
              <textarea rows={3} value={asset.failure_history} onChange={e => setAsset({ ...asset, failure_history: e.target.value })} />
            </div>
          </>
        )}

        {activeTool === 'audit' && (
          <>
            <h3>Facility Audit Recommendation</h3>
            <div className="form-group">
              <label>Facility ID</label>
              <input type="number" value={audit.facility_id} onChange={e => setAudit({ ...audit, facility_id: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Last Audit Date</label>
              <input type="date" value={audit.last_audit_date} onChange={e => setAudit({ ...audit, last_audit_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Incident Count</label>
              <input type="number" value={audit.incident_count} onChange={e => setAudit({ ...audit, incident_count: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Revenue Anomalies</label>
              <textarea rows={2} value={audit.revenue_anomalies} onChange={e => setAudit({ ...audit, revenue_anomalies: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Compliance Areas (comma-separated)</label>
              <input value={audit.compliance_areas} onChange={e => setAudit({ ...audit, compliance_areas: e.target.value })} placeholder="ADA, fire safety, signage..." />
            </div>
          </>
        )}

        {activeTool === 'intrusion' && (
          <>
            <h3>Intrusion Detection</h3>
            <div className="form-group"><label>Time window (hours)</label><input aria-label="Time window (hours)" type="number" min="1" max="168" value={intrusion.time_window_hours} onChange={event => setIntrusion({ ...intrusion, time_window_hours: event.target.value })} /></div>
            <div className="form-group">
              <label>Camera ID</label>
              <input type="number" value={intrusion.camera_id} onChange={e => setIntrusion({ ...intrusion, camera_id: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Facility ID</label>
              <input type="number" value={intrusion.facility_id} onChange={e => setIntrusion({ ...intrusion, facility_id: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Sensor Data (JSON)</label>
              <textarea rows={4} value={intrusion.sensor_data} onChange={e => setIntrusion({ ...intrusion, sensor_data: e.target.value })} placeholder='[{"sensor":"motion-1","value":1,"ts":"2025-05-06T03:14:00Z"}]' />
            </div>
            <div className="form-group">
              <label>Timestamp</label>
              <input type="datetime-local" value={intrusion.timestamp} onChange={e => setIntrusion({ ...intrusion, timestamp: e.target.value })} />
            </div>
          </>
        )}

        <button className="btn btn-primary" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Running...' : 'Run AI'}
        </button>

        {error && <div style={{ color: '#ef4444', marginTop: 12 }}>{error}</div>}
      </div>

      {(loading || result) && (
        <AIResponse loading={loading} data={result ? { feature: TOOLS.find(t => t.id === activeTool)?.label, content: typeof (result.result || result.data || result) === 'string' ? (result.result || result.data || result) : JSON.stringify(result.result || result.data || result, null, 2) } : null} />
      )}
    </div>
  );
}

export default AIPredictive;
