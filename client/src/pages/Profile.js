import React, { useState, useEffect, useCallback } from 'react';
import { profileAPI } from '../services/api';
import Toast from '../components/Toast';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await profileAPI.get();
      setProfile(res.data);
      setForm({ name: res.data.name, email: res.data.email });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await profileAPI.update(form);
      setToast({ msg: 'Profile updated', type: 'success' });
      setEditMode(false);
      load();
      // Update localStorage
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      savedUser.name = form.name;
      savedUser.email = form.email;
      localStorage.setItem('user', JSON.stringify(savedUser));
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Update failed', type: 'error' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setToast({ msg: 'Passwords do not match', type: 'error' });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setToast({ msg: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    try {
      await profileAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setToast({ msg: 'Password changed successfully', type: 'success' });
      setShowPasswordForm(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Password change failed', type: 'error' });
    }
  };

  if (!profile) return <div style={{ padding: '24px', color: '#94a3b8' }}>Loading...</div>;

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>👤 My Profile</h1>
          <p>View and manage your account</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '900px' }}>
        {/* Profile Card */}
        <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 12px',
            }}>
              {profile.name?.charAt(0)?.toUpperCase()}
            </div>
            <h2 style={{ margin: 0 }}>{profile.name}</h2>
            <p style={{ color: '#94a3b8', margin: '4px 0' }}>{profile.email}</p>
            <span className={`badge badge-${profile.role}`} style={{ textTransform: 'capitalize' }}>{profile.role}</span>
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Member Since</span>
              <span>{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Last Updated</span>
              <span>{new Date(profile.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordForm(!showPasswordForm)}>
              Change Password
            </button>
          </div>
        </div>

        {/* Edit / Password Forms */}
        <div>
          {editMode && (
            <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
              <h3 style={{ marginBottom: '16px' }}>Edit Profile</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          )}

          {showPasswordForm && (
            <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>Change Password</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} required />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">Update Password</button>
                </div>
              </form>
            </div>
          )}

          {!editMode && !showPasswordForm && (
            <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid #334155', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ fontSize: '2rem', marginBottom: '8px' }}>✏️</p>
              <p>Click "Edit Profile" or "Change Password" to modify your account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
