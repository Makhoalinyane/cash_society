import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatMoney, formatDate, TRANSACTION_LABELS } from '../api';
import { useIsViewOnly, useAppLink } from '../viewMode';

export default function MemberDetail() {
  const { id } = useParams();
  const viewOnly = useIsViewOnly();
  const link = useAppLink();
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [id, year]);

  async function loadSummary() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMemberSummary(id, year);
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading member record...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!summary) return <div className="empty-state">Member not found</div>;

  const { member, balance, yearEndStatus, loanEligibility, activeLoans, monthlyBreakdown } = summary;
  const payout = balance.yearEndPayout;
  const potential = yearEndStatus?.potentialPayout || payout.potentialIfCleared;

  return (
    <div>
      <div className="page-header">
        <Link to={link('/members')} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>← Back to Members</Link>
        <h2 style={{ marginTop: '0.5rem' }}>{member.full_name}</h2>
        <p>{member.phone} · M-Pesa: {member.mpesa_number}</p>
      </div>

      <div className="year-select">
        <label>Year:</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {!viewOnly && (
          <Link to="/record" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            Record Transaction
          </Link>
        )}
      </div>

      <div className={`alert ${yearEndStatus?.eligible ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
        <strong>Year-End Payout ({yearEndStatus?.deadline}):</strong>{' '}
        {yearEndStatus?.eligible
          ? 'Eligible — all outstanding cleared. Member will receive their share.'
          : payout.reason || 'Not eligible — outstanding balance must be fully paid.'}
      </div>

      <div className={`alert ${loanEligibility.allowed ? 'alert-success' : 'alert-info'}`} style={{ marginBottom: '1.5rem' }}>
        <strong>Loan Status:</strong> {loanEligibility.reason}
      </div>

      {(yearEndStatus?.carriedForwardFromPriorYears > 0 || yearEndStatus?.paymentsAppliedToPriorDebt > 0) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Outstanding Carry-Forward</h3>
          <table>
            <tbody>
              <tr>
                <td>Debt carried from prior year(s)</td>
                <td className="stat-negative">{formatMoney(yearEndStatus.priorYearDebt)}</td>
              </tr>
              <tr>
                <td>Payments this year applied to prior debt</td>
                <td className="stat-positive">{formatMoney(yearEndStatus.paymentsAppliedToPriorDebt)}</td>
              </tr>
              <tr>
                <td><strong>Still carried from prior year(s)</strong></td>
                <td><strong className="stat-negative">{formatMoney(yearEndStatus.carriedForwardFromPriorYears)}</strong></td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Until prior-year debt is cleared, current-year payments go toward outstanding first. Penalties still apply as usual.
          </p>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-title">Total Contributions</div>
          <div className="card-value">{formatMoney(balance.totalContributions)}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{balance.contributionMonths} months paid</p>
        </div>
        <div className="card">
          <div className="card-title">Total Outstanding</div>
          <div className={`card-value ${yearEndStatus?.totalOutstanding > 0 ? 'stat-negative' : 'stat-positive'}`}>
            {formatMoney(yearEndStatus?.totalOutstanding)}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Loans: {formatMoney(yearEndStatus?.loanOutstanding)} · Contributions: {formatMoney(yearEndStatus?.contributionShortfall)}
            {yearEndStatus?.penaltyOwed > 0 && ` · Penalties: ${formatMoney(yearEndStatus.penaltyOwed)}`}
          </p>
        </div>
        <div className="card">
          <div className="card-title">Interest Paid (Loans)</div>
          <div className="card-value">{formatMoney(balance.totalInterestPaid)}</div>
        </div>
        <div className="card">
          <div className="card-title">Year-End Payout (Est.)</div>
          <div className={`card-value ${yearEndStatus?.eligible ? 'stat-positive' : 'stat-negative'}`}>
            {formatMoney(payout.total)}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {yearEndStatus?.eligible
              ? `Savings: ${formatMoney(payout.savingsReturn)} + Rebate: ${formatMoney(payout.interestRebate)}`
              : potential
                ? `Would be ${formatMoney(potential.total)} if all outstanding is paid by ${yearEndStatus.deadline}`
                : 'Blocked until outstanding is cleared'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Monthly Contributions ({year})</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Shows every month from January through the current month. Each row hints whether the M550 is paid, missing, or past the 8th — and what is still owing.
        </p>

        {(!yearEndStatus?.contributionMonthStatuses || yearEndStatus.contributionMonthStatuses.length === 0) ? (
          <p className="empty-state" style={{ padding: '1.5rem' }}>No contribution months to show for this year yet.</p>
        ) : (
          <>
            {(yearEndStatus.contributionStatusSummary?.missingMonths?.length > 0 ||
              yearEndStatus.contributionStatusSummary?.totalOwed > 0) && (
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                {yearEndStatus.contributionStatusSummary.missingMonths?.length > 0 && (
                  <div>
                    <strong>Missing months:</strong>{' '}
                    {yearEndStatus.contributionStatusSummary.missingMonths.join(', ')}
                  </div>
                )}
                {yearEndStatus.contributionStatusSummary.totalOwed > 0 && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <strong>Still owing from contributions:</strong>{' '}
                    {formatMoney(yearEndStatus.contributionStatusSummary.totalContributionOwed)} contribution
                    {yearEndStatus.contributionStatusSummary.totalPenaltyOwed > 0 && (
                      <> + {formatMoney(yearEndStatus.contributionStatusSummary.totalPenaltyOwed)} late penalty</>
                    )}
                    {' = '}
                    <strong className="stat-negative">
                      {formatMoney(yearEndStatus.contributionStatusSummary.totalOwed)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Status</th>
                    <th>Contribution</th>
                    <th>Late penalty</th>
                    <th>Total owing</th>
                    <th>Hint</th>
                  </tr>
                </thead>
                <tbody>
                  {yearEndStatus.contributionMonthStatuses.map((row) => {
                    const statusLabel = {
                      paid: 'Paid on time',
                      paid_late_settled: 'Paid late (settled)',
                      paid_late_penalty_owed: 'Paid late — penalty owing',
                      shortfall: 'Partial — balance owing',
                      overdue: 'Missing — overdue',
                      due: 'Due this month',
                    }[row.status] || row.status;

                    const badgeClass = {
                      paid: 'badge-success',
                      paid_late_settled: 'badge-info',
                      paid_late_penalty_owed: 'badge-warning',
                      shortfall: 'badge-warning',
                      overdue: 'badge-danger',
                      due: 'badge-warning',
                    }[row.status] || 'badge-info';

                    return (
                      <tr key={`contrib-status-${row.year}-${row.month}`}>
                        <td>{row.monthName} {row.year}</td>
                        <td><span className={`badge ${badgeClass}`}>{statusLabel}</span></td>
                        <td>
                          {row.contributionOwed > 0 ? (
                            <>
                              {row.contributionPaid > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {formatMoney(row.contributionPaid)} paid
                                </div>
                              )}
                              <span className="stat-negative">{formatMoney(row.contributionOwed)} due</span>
                            </>
                          ) : (
                            <span className="stat-positive">{formatMoney(row.contributionPaid)} paid</span>
                          )}
                          {row.paidOn && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDate(row.paidOn)}
                            </div>
                          )}
                        </td>
                        <td>
                          {row.penaltyOwed > 0
                            ? <span className="stat-negative">{formatMoney(row.penaltyOwed)}</span>
                            : '—'}
                        </td>
                        <td>
                          {row.totalOwed > 0
                            ? <strong className="stat-negative">{formatMoney(row.totalOwed)}</strong>
                            : <span className="stat-positive">M0.00</span>}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.hint}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {(yearEndStatus?.allUnpaidPenalties?.length > 0 ||
        yearEndStatus?.loanSchedules?.length > 0) && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Other Amounts Owed</h3>
          {yearEndStatus.allUnpaidPenalties?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
                Late penalties on contributions already paid
              </h4>
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Contribution paid</th>
                  </tr>
                </thead>
                <tbody>
                  {yearEndStatus.allUnpaidPenalties.map((p) => (
                    <tr key={`penalty-${p.year}-${p.month}`}>
                      <td>{p.monthName} {p.year}</td>
                      <td className="stat-negative">{formatMoney(p.amount)}</td>
                      <td>{p.paidOn ? formatDate(p.paidOn) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {yearEndStatus.loanSchedules?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>Loan Repayment Due Dates</h4>
              <table>
                <thead>
                  <tr>
                    <th>Loan</th>
                    <th>Taken</th>
                    <th>Interest due now</th>
                    <th>Interest ends</th>
                    <th>Full payment due</th>
                    <th>Total due now</th>
                    <th>Still owed</th>
                  </tr>
                </thead>
                <tbody>
                  {yearEndStatus.loanSchedules.map((s) => (
                    <tr key={`schedule-${s.loanId}`}>
                      <td>#{s.loanId}</td>
                      <td>{formatDate(s.loanDate)}</td>
                      <td>
                        {s.interestMonthLabels}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Charged so far: {formatMoney(s.interestCharged)}
                        </div>
                      </td>
                      <td>{formatDate(s.interestPeriodEnd)}</td>
                      <td><strong>{s.fullRepaymentDueLabel}</strong></td>
                      <td>
                        {formatMoney(s.currentTotalDue)}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Max if held 3 months: {formatMoney(s.maxTotalIfHeldFullTerm)}
                        </div>
                      </td>
                      <td className="stat-negative">{formatMoney(s.currentOutstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Month 1 interest is charged when the loan is taken. Months 2 and 3 are charged only if the loan is still unpaid 10–15 days after each 30-day period.
              </p>
            </div>
          )}
        </div>
      )}

      {activeLoans.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Active Loans</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Principal</th>
                  <th>Interest Charged</th>
                  <th>Interest Paid</th>
                  <th>Principal Paid</th>
                  <th>Outstanding</th>
                  <th>Full payment due</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((loan) => {
                  const schedule = loan.schedule;
                  const outstanding =
                    (Number(loan.principal_amount) - Number(loan.total_principal_paid)) +
                    (Number(loan.total_interest_charged) - Number(loan.total_interest_paid));
                  return (
                    <tr key={loan.id}>
                      <td>{formatDate(loan.loan_date)}</td>
                      <td>{formatMoney(loan.principal_amount)}</td>
                      <td>{formatMoney(loan.total_interest_charged)}</td>
                      <td>{formatMoney(loan.total_interest_paid)}</td>
                      <td>{formatMoney(loan.total_principal_paid)}</td>
                      <td className="stat-negative">{formatMoney(outstanding)}</td>
                      <td>
                        <strong>{schedule?.fullRepaymentDueLabel || '—'}</strong>
                        {schedule && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Interest charged: {schedule.interestMonthLabels}
                            {schedule.nextInterestInfo?.message && (
                              <> · {schedule.nextInterestInfo.message}</>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: '1rem' }}>Monthly Transactions ({year})</h3>

      {monthlyBreakdown.every((m) => m.transactions.length === 0) ? (
        <div className="card empty-state">No transactions recorded for {year}</div>
      ) : (
        monthlyBreakdown.map((month) => {
          if (month.transactions.length === 0) return null;
          const periodNote =
            month.month >= 10
              ? ' (Repayment period — no new loans)'
              : month.month <= 9
                ? ' (Borrowing allowed)'
                : '';

          return (
            <div key={month.month} className="month-section">
              <div className="month-header">
                <h4>{month.monthName} {year}{periodNote}</h4>
                <div>
                  <span style={{ marginRight: '1rem', fontSize: '0.85rem' }}>
                    In: <span className="stat-positive">{formatMoney(month.totalIn)}</span>
                  </span>
                  <span style={{ marginRight: '1rem', fontSize: '0.85rem' }}>
                    Out: <span className="stat-negative">{formatMoney(month.totalOut)}</span>
                  </span>
                  <span style={{ fontSize: '0.85rem' }}>
                    Balance: <strong>{formatMoney(month.balance)}</strong>
                  </span>
                </div>
              </div>
              <div className="card" style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>M-Pesa Ref</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {month.transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{formatDate(t.transaction_date)}</td>
                          <td>
                            <span className={`badge ${
                              t.transaction_type === 'contribution' ? 'badge-success' :
                              t.transaction_type === 'late_penalty' ? 'badge-danger' :
                              t.transaction_type === 'loan_disbursement' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {TRANSACTION_LABELS[t.transaction_type] || t.transaction_type}
                            </span>
                            {t.is_late ? ' (Late)' : ''}
                          </td>
                          <td className={t.direction === 'out' ? 'stat-negative' : 'stat-positive'}>
                            {t.direction === 'out' ? '-' : '+'}{formatMoney(t.amount)}
                          </td>
                          <td>{t.mpesa_reference || '—'}</td>
                          <td>{t.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Year-End Payout Breakdown</h3>
        {!yearEndStatus?.eligible && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <strong>No payout this year.</strong> Member owes {formatMoney(yearEndStatus.totalOutstanding)}.
            All outstanding must be paid by <strong>{yearEndStatus.deadline}</strong> to receive any share.
          </div>
        )}
        <table>
          <tbody>
            <tr>
              <td>Member savings (M500 × {balance.contributionMonths} months)</td>
              <td>{formatMoney(yearEndStatus?.eligible ? payout.savingsReturn : potential?.savingsReturn)}</td>
            </tr>
            <tr>
              <td>Interest rebate (10% of loan amount per interest month paid)</td>
              <td>{formatMoney(yearEndStatus?.eligible ? payout.interestRebate : potential?.interestRebate)}</td>
            </tr>
            <tr>
              <td>Society retains from interest (5% of loan amount per month)</td>
              <td>{formatMoney(payout.societyInterestRetained ?? potential?.societyInterestRetained)}</td>
            </tr>
            <tr>
              <td><strong>{yearEndStatus?.eligible ? 'Total payout' : 'Potential payout if cleared'}</strong></td>
              <td>
                <strong className={yearEndStatus?.eligible ? 'stat-positive' : 'stat-warning'}>
                  {formatMoney(yearEndStatus?.eligible ? payout.total : potential?.total)}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          Members with any outstanding (loans or missed contributions) receive nothing at year-end.
          Next-year payments clear prior debt first. Late penalties continue as usual.
        </p>
      </div>
    </div>
  );
}
