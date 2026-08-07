import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatMoney } from '../api';

const TYPES = [
  { value: 'contribution', label: 'Monthly Contribution (M550)' },
  { value: 'penalty', label: 'Late Penalty (M275)' },
  { value: 'loan', label: 'Loan Disbursement (max M2000)' },
  { value: 'interest', label: 'Interest Payment' },
  { value: 'principal', label: 'Principal Repayment' },
  { value: 'repayment', label: 'Combined Repayment (Interest + Principal)' },
];

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const LOAN_TYPES = ['interest', 'principal', 'repayment'];

export default function RecordTransaction() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [type, setType] = useState('contribution');
  const [form, setForm] = useState({
    memberId: '',
    amount: '550',
    date: new Date().toISOString().split('T')[0],
    mpesaReference: '',
    loanId: '',
    description: '',
    forMonth: String(new Date().getMonth() + 1),
    forYear: String(new Date().getFullYear()),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getMembers().then(setMembers).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.memberId && LOAN_TYPES.includes(type)) {
      api.getMemberSummary(form.memberId, new Date().getFullYear())
        .then((s) => {
          setActiveLoans(s.activeLoans || []);
          setSelectedLoan(null);
        })
        .catch(() => {
          setActiveLoans([]);
          setSelectedLoan(null);
        });
    }
  }, [form.memberId, type]);

  useEffect(() => {
    if (form.loanId && activeLoans.length > 0) {
      const loan = activeLoans.find((l) => String(l.id) === String(form.loanId));
      setSelectedLoan(loan || null);
    } else {
      setSelectedLoan(null);
    }
  }, [form.loanId, activeLoans]);

  useEffect(() => {
    if (type === 'contribution') setForm((f) => ({ ...f, amount: '550' }));
    if (type === 'penalty') setForm((f) => ({ ...f, amount: '275' }));
    if (type === 'loan') setForm((f) => ({ ...f, amount: '' }));
    if (['interest', 'principal', 'repayment'].includes(type)) {
      setForm((f) => ({ ...f, amount: '', loanId: '' }));
    }
  }, [type]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function getOutstanding(loan) {
    const principal = Number(loan.principal_amount) - Number(loan.total_principal_paid);
    const interest = Number(loan.total_interest_charged) - Number(loan.total_interest_paid);
    return { principal, interest, total: principal + interest };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      memberId: Number(form.memberId),
      amount: Number(form.amount),
      date: form.date,
      mpesaReference: form.mpesaReference,
      description: form.description,
    };

    try {
      let result;
      if (type === 'contribution') {
        result = await api.recordContribution(payload);
        setSuccess(result.message || 'Contribution recorded successfully.');
      } else if (type === 'penalty') {
        result = await api.recordPenalty({
          ...payload,
          forMonth: Number(form.forMonth),
          forYear: Number(form.forYear),
        });
        setSuccess(result.message || `Late penalty of ${formatMoney(form.amount)} recorded successfully.`);
      } else if (type === 'loan') {
        result = await api.recordLoan(payload);
        setSuccess(`Loan of ${formatMoney(form.amount)} disbursed. Loan ID: ${result.loanId}`);
      } else if (type === 'interest') {
        result = await api.recordInterest({ ...payload, loanId: Number(form.loanId) });
        setSuccess(
          `Interest payment of ${formatMoney(result.interestPaid)} recorded. Remaining interest: ${formatMoney(result.remainingInterest)}, principal: ${formatMoney(result.remainingPrincipal)}`
        );
      } else if (type === 'principal') {
        result = await api.recordPrincipal({ ...payload, loanId: Number(form.loanId) });
        setSuccess(
          `Principal repayment of ${formatMoney(result.principalPaid)} recorded. Remaining principal: ${formatMoney(result.remainingPrincipal)}, interest: ${formatMoney(result.remainingInterest)}`
        );
      } else if (type === 'repayment') {
        result = await api.recordRepayment({ ...payload, loanId: Number(form.loanId) });
        setSuccess(
          `Repayment recorded. Interest: ${formatMoney(result.interestPaid)}, Principal: ${formatMoney(result.principalPaid)}. Remaining: ${formatMoney(result.remainingBalance)}`
        );
      }
      setTimeout(() => navigate(`/members/${form.memberId}`), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedDate = form.date;
  const day = Number(selectedDate.split('-')[2] || 0);
  const month = Number(selectedDate.split('-')[1] || 0);
  const isLate = day > 8;
  const isBorrowingMonth = month >= 1 && month <= 9;
  const needsLoan = LOAN_TYPES.includes(type);
  const outstanding = selectedLoan ? getOutstanding(selectedLoan) : null;

  return (
    <div>
      <div className="page-header">
        <h2>Record Transaction</h2>
        <p>Record M-Pesa contributions, penalties, loans, interest, and repayments</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ maxWidth: '560px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Transaction Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Member *</label>
            <select name="memberId" value={form.memberId} onChange={handleChange} required>
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>
              ))}
            </select>
          </div>

          {needsLoan && (
            <div className="form-group">
              <label>Loan *</label>
              <select name="loanId" value={form.loanId} onChange={handleChange} required>
                <option value="">Select loan...</option>
                {activeLoans.map((l) => {
                  const out = getOutstanding(l);
                  return (
                    <option key={l.id} value={l.id}>
                      Loan #{l.id} — {formatMoney(l.principal_amount)} (Interest: {formatMoney(out.interest)}, Principal: {formatMoney(out.principal)})
                    </option>
                  );
                })}
              </select>
              {activeLoans.length === 0 && form.memberId && (
                <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                  No active loans for this member.
                </p>
              )}
              {outstanding && (
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px' }}>
                  <div>Outstanding interest: <strong className="stat-warning">{formatMoney(outstanding.interest)}</strong></div>
                  <div>Outstanding principal: <strong className="stat-negative">{formatMoney(outstanding.principal)}</strong></div>
                  <div>Total owed: <strong>{formatMoney(outstanding.total)}</strong></div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Amount (M) *</label>
            <input
              name="amount"
              type="number"
              min="1"
              max={type === 'loan' ? '2000' : undefined}
              value={form.amount}
              onChange={handleChange}
              disabled={type === 'contribution' || type === 'penalty'}
              required
            />
            {type === 'contribution' && isLate && (
              <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                Payment is after the 8th — only M550 will be recorded now. The M275 late penalty stays owed until you record it separately when paid via M-Pesa.
              </p>
            )}
            {type === 'penalty' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Standard late penalty is M275 (50% of M550) for missing the 8th deadline.
              </p>
            )}
            {type === 'interest' && outstanding && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Pay up to {formatMoney(outstanding.interest)} outstanding interest on this loan.
              </p>
            )}
            {type === 'principal' && outstanding && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Pay up to {formatMoney(outstanding.principal)} outstanding principal on this loan.
              </p>
            )}
            {type === 'loan' && !isBorrowingMonth && (
              <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                Loans are only allowed January–September.
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Transaction Date *</label>
            <input name="date" type="date" value={form.date} onChange={handleChange} required />
          </div>

          {type === 'penalty' && (
            <div className="form-group">
              <label>Penalty is for (contribution month) *</label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <select
                  name="forMonth"
                  value={form.forMonth}
                  onChange={handleChange}
                  required
                  style={{ flex: '1 1 140px' }}
                >
                  {MONTH_OPTIONS.map((name, i) => (
                    <option key={name} value={String(i + 1)}>{name}</option>
                  ))}
                </select>
                <input
                  name="forYear"
                  type="number"
                  min="2020"
                  max="2100"
                  value={form.forYear}
                  onChange={handleChange}
                  required
                  style={{ flex: '0 0 100px' }}
                />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Choose the month that was paid late (e.g. May), not only the day money was sent on M-Pesa.
                This clears that month from “penalties still owing”.
              </p>
            </div>
          )}

          <div className="form-group">
            <label>M-Pesa Reference</label>
            <input name="mpesaReference" value={form.mpesaReference} onChange={handleChange} placeholder="e.g. QHK7X2ABCD" />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <input name="description" value={form.description} onChange={handleChange} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Recording...' : 'Record Transaction'}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: '560px', marginTop: '1.5rem' }}>
        <h4 style={{ marginBottom: '0.75rem' }}>Quick Reference</h4>
        <ul className="rules-list">
          <li>Contribution: <strong>M550</strong> by 8th of month</li>
          <li>Late penalty: <strong>M275</strong> — record separately when paid (not included in M550 contribution)</li>
          <li>Interest payment: pay the <strong>15% monthly interest</strong> on an active loan</li>
          <li>Principal repayment: pay back the <strong>loan amount</strong> borrowed</li>
          <li>Interest: <strong>15%</strong> month 1 at disbursement; months 2–3 only if still unpaid <strong>10–15 days after each 30-day period</strong></li>
          <li>Of that interest: <strong>10%</strong> returned to member, <strong>5%</strong> kept by society</li>
          <li>Borrowing: Jan–Sep only · Repayment: Oct–Dec</li>
          <li>Year-end: <strong>no payout if owing</strong> — clear all debt by <strong>15 December</strong></li>
          <li>Carry-forward: next-year payments clear prior outstanding first; penalties continue</li>
        </ul>
      </div>
    </div>
  );
}
