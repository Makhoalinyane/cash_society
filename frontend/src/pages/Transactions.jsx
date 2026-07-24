import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney, formatDate, TRANSACTION_LABELS } from '../api';
import { useIsViewOnly, useAppLink } from '../viewMode';

function toInputDate(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Transactions() {
  const viewOnly = useIsViewOnly();
  const link = useAppLink();
  const [year, setYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', date: '', mpesaReference: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [year]);

  async function loadTransactions() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTransactions(year);
      setTransactions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(tx) {
    setEditing(tx);
    setEditForm({
      amount: String(tx.amount),
      date: toInputDate(tx.transaction_date),
      mpesaReference: tx.mpesa_reference || '',
      description: tx.description || '',
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateTransaction(editing.id, {
        amount: Number(editForm.amount),
        date: editForm.date,
        mpesaReference: editForm.mpesaReference,
        description: editForm.description,
      });
      setSuccess('Transaction updated.');
      setEditing(null);
      await loadTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tx) {
    const label = TRANSACTION_LABELS[tx.transaction_type] || tx.transaction_type;
    const confirmed = window.confirm(
      `Delete ${label} of ${formatMoney(tx.amount)} for ${tx.full_name} on ${formatDate(tx.transaction_date)}?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await api.deleteTransaction(tx.id);
      setSuccess('Transaction deleted.');
      await loadTransactions();
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.transaction_type === filter);

  if (loading) return <div className="loading">Loading transactions...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Transactions</h2>
          <p>{viewOnly ? 'All M-Pesa transactions (view only)' : 'All M-Pesa transactions for the society'}</p>
        </div>
        {!viewOnly && <Link to="/record" className="btn btn-primary">+ Record Transaction</Link>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="year-select">
        <label>Year:</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <label style={{ marginLeft: '1rem' }}>Type:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(TRANSACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">No transactions found for {year}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>M-Pesa Ref</th>
                  <th>Description</th>
                  {!viewOnly && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.transaction_date)}</td>
                    <td>
                      <Link to={link(`/members/${t.member_id}`)}>{t.full_name}</Link>
                    </td>
                    <td>
                      <span className={`badge ${
                        t.transaction_type === 'contribution' ? 'badge-success' :
                        t.transaction_type === 'late_penalty' ? 'badge-danger' :
                        t.transaction_type === 'loan_disbursement' ? 'badge-warning' :
                        'badge-info'
                      }`}>
                        {TRANSACTION_LABELS[t.transaction_type]}
                      </span>
                    </td>
                    <td>{formatMoney(t.amount)}</td>
                    <td>{t.mpesa_reference || '—'}</td>
                    <td>{t.description || '—'}</td>
                    {!viewOnly && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            onClick={() => openEdit(t)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                            onClick={() => handleDelete(t)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!viewOnly && editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Transaction</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {TRANSACTION_LABELS[editing.transaction_type]} · {editing.full_name}
            </p>
            <form onSubmit={saveEdit}>
              <div className="form-group">
                <label>Amount (M)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  disabled={editing.transaction_type === 'contribution' || editing.transaction_type === 'late_penalty'}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>M-Pesa Reference</label>
                <input
                  value={editForm.mpesaReference}
                  onChange={(e) => setEditForm({ ...editForm, mpesaReference: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
