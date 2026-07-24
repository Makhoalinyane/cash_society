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

export default function Dashboard() {
  const viewOnly = useIsViewOnly();
  const link = useAppLink();
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [rules, setRules] = useState(null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', date: '', mpesaReference: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const memberLink = `${window.location.origin}/view`;

  async function copyMemberLink() {
    try {
      await navigator.clipboard.writeText(memberLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt('Copy this member view link:', memberLink);
    }
  }

  useEffect(() => {
    loadData();
  }, [year]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [society, rulesData, membersData, txData] = await Promise.all([
        api.getSocietySummary(year),
        api.getSocietyRules(),
        api.getMembers(),
        api.getTransactions(year),
      ]);
      setSummary(society);
      setRules(rulesData);
      setMembers(membersData);
      setTransactions(txData);
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
    setError('');
    setSuccess('');
  }

  function closeEdit() {
    setEditing(null);
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
      await loadData();
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

    setError('');
    setSuccess('');
    try {
      await api.deleteTransaction(tx.id);
      setSuccess('Transaction deleted.');
      if (editing?.id === tx.id) setEditing(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const bal = summary?.societyBalance || {};

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>{viewOnly ? 'Society overview (view only)' : 'Society overview and financial summary'}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {viewOnly && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          View only — you can see balances and records. Editing is turned off.
        </div>
      )}
      {!viewOnly && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Member view link</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Send members this link. They can view the dashboard only — no recording or editing.
            For phones on other networks, run <code>npm run share</code> in the frontend folder and send the printed <code>…/view</code> link.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ background: 'var(--surface-hover)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', wordBreak: 'break-all' }}>
              {memberLink}
            </code>
            <button type="button" className="btn btn-primary" onClick={copyMemberLink}>
              {shareCopied ? 'Copied!' : 'Copy link'}
            </button>
            <Link to="/view" className="btn btn-secondary">Open view</Link>
          </div>
        </div>
      )}

      <div className="year-select">
        <label>Year:</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-title">Available Balance</div>
          <div className="card-value stat-positive">{formatMoney(bal.availableBalance)}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Opening balance + Total In − Total Out
          </p>
        </div>
        <div className="card">
          <div className="card-title">Outstanding Loans</div>
          <div className="card-value stat-negative">{formatMoney(bal.outstandingLoans)}</div>
        </div>
        <div className="card">
          <div className="card-title">Distributable Balance</div>
          <div className="card-value stat-positive">{formatMoney(bal.distributableBalance)}</div>
        </div>
        <div className="card">
          <div className="card-title">Share Per Member (if shared now)</div>
          <div className="card-value stat-warning">{formatMoney(summary?.sharePerMember)}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {summary?.activeMembers} active members
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Transactions ({transactions.length})</h3>
          {!viewOnly && <Link to="/record" className="btn btn-primary">+ Record Transaction</Link>}
        </div>
        {transactions.length === 0 ? (
          <div className="empty-state">No transactions recorded for {year}</div>
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
                {transactions.map((t) => (
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
                        {TRANSACTION_LABELS[t.transaction_type] || t.transaction_type}
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

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>How the balance works</h3>
        <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Available balance includes cash held before 1 January, plus every M-Pesa transaction recorded for the selected year.
        </p>
        <div className="grid grid-2">
          <div>
            <strong className="stat-positive">Adds to balance (+)</strong>
            <ul className="rules-list" style={{ marginTop: '0.5rem' }}>
              <li>Opening balance (cash before 1 Jan)</li>
              <li>Monthly contributions (M550)</li>
              <li>Late penalties (M275)</li>
              <li>Loan repayments (principal)</li>
              <li>Interest payments</li>
            </ul>
          </div>
          <div>
            <strong className="stat-negative">Subtracts from balance (−)</strong>
            <ul className="rules-list" style={{ marginTop: '0.5rem' }}>
              <li>Loan disbursements (money lent out)</li>
              <li>Savings returns (year-end M500 payouts)</li>
              <li>Interest rebates (10% back to members)</li>
            </ul>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          <strong>Available Balance</strong> = {formatMoney(bal.openingBalance || 0)} (opening) + {formatMoney(bal.moneyInFromTransactions ?? ((bal.moneyIn || 0) - (bal.openingBalance || 0)))} (year txs in) − {formatMoney(bal.moneyOut)} (out) = <strong>{formatMoney(bal.availableBalance)}</strong>
          <br />
          <strong>Distributable Balance</strong> = Available Balance − Outstanding Loans = <strong>{formatMoney(bal.distributableBalance)}</strong>
        </p>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Money In</h3>
          <table>
            <tbody>
              <tr><td>Opening balance (before 1 Jan)</td><td className="stat-positive">{formatMoney(bal.openingBalance || 0)}</td></tr>
              <tr><td>Contributions</td><td className="stat-positive">{formatMoney(bal.contributions)}</td></tr>
              <tr><td>Late Penalties</td><td>{formatMoney(bal.penalties)}</td></tr>
              <tr><td>Loan Repayments</td><td>{formatMoney(bal.loanRepayments)}</td></tr>
              <tr><td>Interest Payments</td><td>{formatMoney(bal.interestPayments)}</td></tr>
              <tr><td><strong>Total In</strong></td><td><strong>{formatMoney(bal.moneyIn)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Money Out</h3>
          <table>
            <tbody>
              <tr><td>Loan Disbursements</td><td className="stat-negative">{formatMoney(bal.loanDisbursements)}</td></tr>
              <tr><td>Savings Returns</td><td>{formatMoney(bal.savingsReturns)}</td></tr>
              <tr><td>Interest Rebates</td><td>{formatMoney(bal.rebates)}</td></tr>
              <tr><td><strong>Total Out</strong></td><td><strong>{formatMoney(bal.moneyOut)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Society Rules</h3>
          {rules && (
            <ul className="rules-list">
              <li>Monthly contribution: <strong>{formatMoney(rules.monthlyContribution)}</strong> (due by 8th)</li>
              <li>Late penalty: <strong>{formatMoney(rules.latePenaltyAmount)}</strong> (50% of contribution)</li>
              <li>Max loan: <strong>{formatMoney(rules.maxLoanAmount)}</strong> at {(rules.loanInterestRate * 100)}% (max {rules.loanInterestMonths} months)</li>
              <li>Interest timing: <strong>month 1 at loan</strong>; months 2–3 only if unpaid <strong>10–15 days after each 30-day period</strong></li>
              <li>Interest split: <strong>{(rules.memberInterestShare * 100)}% to member</strong> + <strong>{(rules.societyInterestShare * 100)}% to society</strong> (of loan amount per month)</li>
              <li>Borrowing: <strong>{rules.borrowingPeriod}</strong></li>
              <li>Repayment only: <strong>{rules.repaymentPeriod}</strong></li>
              <li>Year-end payout: <strong>{rules.yearEndPayout}</strong></li>
              <li>Outstanding rule: <strong>no payout if anything is owed</strong> — must clear by 15 December</li>
              <li>Carry-forward: <strong>prior-year debt paid first</strong> before current-year benefits apply</li>
            </ul>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Members ({members.length})</h3>
          {members.length === 0 ? (
            <p className="empty-state">
              No members yet.
              {!viewOnly && <> <Link to="/register">Register one</Link></>}
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 8).map((m) => (
                    <tr key={m.id}>
                      <td><Link to={link(`/members/${m.id}`)}>{m.full_name}</Link></td>
                      <td>{m.phone}</td>
                      <td>
                        <span className={`badge ${m.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length > 8 && (
                <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <Link to={link('/members')}>View all {members.length} members</Link>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {!viewOnly && editing && (
        <div className="modal-overlay" onClick={closeEdit}>
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
                <button type="button" className="btn btn-secondary" onClick={closeEdit}>Cancel</button>
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
