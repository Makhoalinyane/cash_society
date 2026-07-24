import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function RegisterMember() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    mpesaNumber: '',
    email: '',
    joinedDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const member = await api.registerMember(form);
      setSuccess(`Member ${member.full_name} registered successfully!`);
      setTimeout(() => navigate(`/members/${member.id}`), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Register Member</h2>
        <p>Add a new member to the cash society</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ maxWidth: '520px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 26658888888" required />
          </div>
          <div className="form-group">
            <label>M-Pesa Number *</label>
            <input name="mpesaNumber" value={form.mpesaNumber} onChange={handleChange} placeholder="e.g. 26658888888" required />
          </div>
          <div className="form-group">
            <label>Email (optional)</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Joined Date</label>
            <input name="joinedDate" type="date" value={form.joinedDate} onChange={handleChange} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register Member'}
          </button>
        </form>
      </div>
    </div>
  );
}
