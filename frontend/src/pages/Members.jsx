import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useIsViewOnly, useAppLink } from '../viewMode';

export default function Members() {
  const viewOnly = useIsViewOnly();
  const link = useAppLink();
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMembers()
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading members...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Members</h2>
          <p>{viewOnly ? 'Society members (view only)' : 'View and manage society members'}</p>
        </div>
        {!viewOnly && <Link to="/register" className="btn btn-primary">+ Register Member</Link>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {members.length === 0 ? (
          <div className="empty-state">
            <p>No members registered yet.</p>
            {!viewOnly && (
              <Link to="/register" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Register First Member
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>M-Pesa Number</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.full_name}</td>
                    <td>{m.phone}</td>
                    <td>{m.mpesa_number}</td>
                    <td>{new Date(m.joined_date).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className={`badge ${m.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <Link to={link(`/members/${m.id}`)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        View Record
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
