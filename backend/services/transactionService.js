const pool = require('../config/db');
const CONST = require('../config/constants');
const {
  isContributionLate,
  isBorrowingPeriod,
  calculateMonthlyInterest,
  canTakeLoan,
  calculateMemberBalance,
  calculateSocietyBalance,
  calculateYearEndStatus,
  calculateLoanSchedule,
  getChargeableInterestMonths,
  getInterestMonthSchedule,
  groupTransactionsByMonth,
  getSocietyPenaltiesStillOwing,
} = require('./calculations');

async function getMemberTransactions(memberId, year = null) {
  let query = 'SELECT * FROM transactions WHERE member_id = ?';
  const params = [memberId];
  if (year) {
    query += ' AND transaction_year = ?';
    params.push(year);
  }
  query += ' ORDER BY transaction_date ASC, id ASC';
  const [rows] = await pool.query(query, params);
  return rows;
}

async function getMemberLoans(memberId, year = null) {
  let query = 'SELECT * FROM loans WHERE member_id = ?';
  const params = [memberId];
  if (year) {
    query += ' AND loan_year = ?';
    params.push(year);
  }
  query += ' ORDER BY loan_date ASC';
  const [rows] = await pool.query(query, params);
  return rows;
}

async function getActiveLoans(memberId) {
  const [rows] = await pool.query(
    "SELECT * FROM loans WHERE member_id = ? AND status = 'active'",
    [memberId]
  );
  return rows;
}

function parseDateParts(value) {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const d = new Date(value);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

async function getPrincipalFullyPaidDate(loanId, conn = null) {
  const db = conn || pool;
  const [loans] = await db.query('SELECT * FROM loans WHERE id = ?', [loanId]);
  if (loans.length === 0) return null;
  const loan = loans[0];
  if (Number(loan.total_principal_paid) < Number(loan.principal_amount)) return null;

  const [rows] = await db.query(
    `SELECT transaction_date FROM transactions
     WHERE loan_id = ? AND transaction_type = 'loan_repayment'
     ORDER BY transaction_date DESC, id DESC
     LIMIT 1`,
    [loanId]
  );
  return rows[0]?.transaction_date || null;
}

async function accrueAllDueInterest(loanId, memberId, asOfDate) {
  const [loans] = await pool.query(
    "SELECT * FROM loans WHERE id = ? AND status = 'active'",
    [loanId]
  );
  if (loans.length === 0) return;

  const loan = loans[0];
  let endDate = asOfDate;

  // If principal was already fully paid, interest only runs until payoff date.
  const payoffDate = await getPrincipalFullyPaidDate(loanId);
  if (payoffDate) {
    const payoff = parseDateParts(payoffDate);
    const asOf = parseDateParts(asOfDate);
    if (payoff.year < asOf.year || (payoff.year === asOf.year && (payoff.month < asOf.month || (payoff.month === asOf.month && payoff.day < asOf.day)))) {
      endDate = payoffDate;
    }
  }

  const chargeableMonths = getChargeableInterestMonths(loan.loan_date, endDate);
  const schedule = getInterestMonthSchedule(
    loan.loan_date,
    Number(loan.principal_amount),
    chargeableMonths
  );

  for (const slot of schedule) {
    await accrueLoanInterest(loanId, memberId, slot.month, slot.year);
  }

  // Drop any interest beyond months actually held (e.g. 3rd month after early payoff).
  await reconcileInterestToMonthsHeld(loanId, endDate);
}

async function reconcileInterestToMonthsHeld(loanId, asOfDate, conn = null) {
  const db = conn || pool;
  const [loans] = await db.query('SELECT * FROM loans WHERE id = ?', [loanId]);
  if (loans.length === 0) return 0;

  const loan = loans[0];
  const chargeableMonths = getChargeableInterestMonths(loan.loan_date, asOfDate);
  const allowed = getInterestMonthSchedule(
    loan.loan_date,
    Number(loan.principal_amount),
    chargeableMonths
  );
  const allowedKeys = new Set(allowed.map((m) => `${m.year}-${m.month}`));

  const [accruals] = await db.query(
    'SELECT id, accrual_year, accrual_month, interest_amount FROM loan_interest_accruals WHERE loan_id = ?',
    [loanId]
  );

  let removed = 0;
  for (const row of accruals) {
    const key = `${row.accrual_year}-${row.accrual_month}`;
    if (!allowedKeys.has(key)) {
      await db.query('DELETE FROM loan_interest_accruals WHERE id = ?', [row.id]);
      removed += Number(row.interest_amount);
    }
  }

  if (removed > 0) {
    await db.query(
      'UPDATE loans SET total_interest_charged = GREATEST(0, total_interest_charged - ?) WHERE id = ?',
      [removed, loanId]
    );
  }

  const [updated] = await db.query(
    'SELECT total_interest_charged, total_interest_paid, total_principal_paid, principal_amount, status FROM loans WHERE id = ?',
    [loanId]
  );
  const row = updated[0];
  const interestLeft = Number(row.total_interest_charged) - Number(row.total_interest_paid);
  const principalLeft = Number(row.principal_amount) - Number(row.total_principal_paid);
  if (row.status === 'active' && principalLeft <= 0 && interestLeft <= 0) {
    await db.query("UPDATE loans SET status = 'paid' WHERE id = ?", [loanId]);
  }

  return removed;
}

async function refreshActiveLoans(memberId, asOfDate = new Date().toISOString().split('T')[0]) {
  const loans = await getActiveLoans(memberId);
  for (const loan of loans) {
    // Prefer payoff date when principal is already cleared, so viewing today
    // does not invent a 3rd interest month after an early repayment.
    const payoffDate = await getPrincipalFullyPaidDate(loan.id);
    const effectiveDate = payoffDate || asOfDate;
    await accrueAllDueInterest(loan.id, memberId, effectiveDate);
  }
  return getActiveLoans(memberId);
}

async function getActiveLoan(loanId, memberId) {
  const [loans] = await pool.query(
    "SELECT * FROM loans WHERE id = ? AND member_id = ? AND status = 'active'",
    [loanId, memberId]
  );
  return loans[0] || null;
}

async function accrueLoanInterest(loanId, memberId, month, year, conn = null) {
  const db = conn || pool;

  const [existing] = await db.query(
    'SELECT id FROM loan_interest_accruals WHERE loan_id = ? AND accrual_month = ? AND accrual_year = ?',
    [loanId, month, year]
  );
  if (existing.length > 0) return null;

  const [loans] = await db.query('SELECT * FROM loans WHERE id = ?', [loanId]);
  if (loans.length === 0) return null;
  const loan = loans[0];

  // Interest only accrues while the loan is still outstanding.
  if (loan.status !== 'active') return null;

  const { year: loanYear, month: loanMonth } = parseDateParts(loan.loan_date);

  let monthsElapsed = (year - loanYear) * 12 + (month - loanMonth) + 1;
  if (monthsElapsed < 1) return null;
  if (monthsElapsed > CONST.LOAN_INTEREST_MONTHS) return null;

  const interestAmount = calculateMonthlyInterest(Number(loan.principal_amount));

  await db.query(
    'INSERT INTO loan_interest_accruals (loan_id, member_id, accrual_month, accrual_year, interest_amount) VALUES (?, ?, ?, ?, ?)',
    [loanId, memberId, month, year, interestAmount]
  );

  await db.query(
    'UPDATE loans SET total_interest_charged = total_interest_charged + ? WHERE id = ?',
    [interestAmount, loanId]
  );

  return interestAmount;
}

async function removeFutureInterestAfterPayoff(loanId, payoffDate, conn = null) {
  return reconcileInterestToMonthsHeld(loanId, payoffDate, conn);
}

async function processMonthlyInterestAccruals(year, month) {
  const [activeLoans] = await pool.query("SELECT * FROM loans WHERE status = 'active'");
  const results = [];
  for (const loan of activeLoans) {
    const interest = await accrueLoanInterest(loan.id, loan.member_id, month, year);
    if (interest) {
      results.push({ loanId: loan.id, memberId: loan.member_id, interest });
    }
  }
  return results;
}

async function getMemberSummary(memberId, year = new Date().getFullYear()) {
  const [members] = await pool.query('SELECT * FROM members WHERE id = ?', [memberId]);
  if (members.length === 0) return null;

  const member = members[0];
  const allTransactions = await getMemberTransactions(memberId);
  const allLoans = await getMemberLoans(memberId);
  const transactions = allTransactions.filter((t) => t.transaction_year === year);
  const loans = allLoans.filter((l) => l.loan_year === year || parseDateParts(l.loan_date).year === year);
  const activeLoans = await refreshActiveLoans(memberId);
  const activeLoansWithSchedule = activeLoans.map((loan) => ({
    ...loan,
    schedule: calculateLoanSchedule(loan, new Date()),
  }));

  const balance = calculateMemberBalance(transactions, [...allLoans.filter((l) => l.status === 'active')]);

  const yearEndStatus = calculateYearEndStatus(
    allTransactions,
    activeLoansWithSchedule,
    member.joined_date,
    year
  );

  balance.yearEndPayout = yearEndStatus.yearEndPayout;
  balance.totalOutstanding = yearEndStatus.totalOutstanding;
  balance.contributionShortfall = yearEndStatus.contributionShortfall;

  const currentMonth = new Date().getMonth() + 1;
  const loanEligibility = canTakeLoan(
    currentMonth,
    yearEndStatus.totalOutstanding,
    activeLoans.reduce((s, l) => s + Number(l.principal_amount), 0)
  );

  const monthlyBreakdown = groupTransactionsByMonth(transactions, year);

  const [accruals] = await pool.query(
    `SELECT lia.*, l.principal_amount FROM loan_interest_accruals lia
     JOIN loans l ON lia.loan_id = l.id
     WHERE lia.member_id = ? AND lia.accrual_year = ?
     ORDER BY lia.accrual_year, lia.accrual_month`,
    [memberId, year]
  );

  return {
    member,
    year,
    balance,
    yearEndStatus,
    loanEligibility,
    activeLoans: activeLoansWithSchedule,
    loans,
    transactions,
    monthlyBreakdown,
    interestAccruals: accruals,
  };
}

async function recordContribution(memberId, amount, date, mpesaRef, description) {
  const { year, month, day } = parseDateParts(date);
  const late = day > CONST.CONTRIBUTION_DUE_DAY;
  const expectedAmount = CONST.MONTHLY_CONTRIBUTION;

  if (Number(amount) !== expectedAmount) {
    throw new Error(`Contribution must be exactly M${expectedAmount}`);
  }

  const [existing] = await pool.query(
    "SELECT id FROM transactions WHERE member_id = ? AND transaction_type = 'contribution' AND transaction_month = ? AND transaction_year = ?",
    [memberId, month, year]
  );
  if (existing.length > 0) {
    throw new Error(`Contribution for ${month}/${year} already recorded`);
  }

  await pool.query(
    `INSERT INTO transactions (member_id, transaction_type, amount, transaction_date, transaction_month, transaction_year, mpesa_reference, description, is_late)
     VALUES (?, 'contribution', ?, ?, ?, ?, ?, ?, ?)`,
    [memberId, amount, date, month, year, mpesaRef, description || 'Monthly contribution', late ? 1 : 0]
  );

  return {
    success: true,
    late,
    penaltyOwed: late ? CONST.LATE_PENALTY_AMOUNT : 0,
    message: late
      ? `Contribution recorded as late. M${CONST.LATE_PENALTY_AMOUNT} penalty is still owed — record it separately when paid via M-Pesa.`
      : 'Contribution recorded successfully.',
  };
}

async function recordPenalty(memberId, amount, date, mpesaRef, description) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  if (Number(amount) !== CONST.LATE_PENALTY_AMOUNT) {
    throw new Error(`Late penalty must be exactly M${CONST.LATE_PENALTY_AMOUNT}`);
  }

  const [existing] = await pool.query(
    "SELECT id FROM transactions WHERE member_id = ? AND transaction_type = 'late_penalty' AND transaction_month = ? AND transaction_year = ?",
    [memberId, month, year]
  );
  if (existing.length > 0) {
    throw new Error(`Late penalty for ${month}/${year} already recorded`);
  }

  await pool.query(
    `INSERT INTO transactions (member_id, transaction_type, amount, transaction_date, transaction_month, transaction_year, mpesa_reference, description, is_late)
     VALUES (?, 'late_penalty', ?, ?, ?, ?, ?, ?, 1)`,
    [memberId, amount, date, month, year, mpesaRef, description || `Late penalty (50% of M${CONST.MONTHLY_CONTRIBUTION})`]
  );

  return { success: true };
}

async function recordInterestPayment(memberId, amount, date, mpesaRef, loanId, description) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  await accrueAllDueInterest(loanId, memberId, date);

  const loan = await getActiveLoan(loanId, memberId);
  if (!loan) throw new Error('Active loan not found');

  const outstandingInterest = Number(loan.total_interest_charged) - Number(loan.total_interest_paid);

    if (outstandingInterest <= 0) {
      const { year: loanYear, month: loanMonth } = parseDateParts(loan.loan_date);
      const monthsElapsed = (year - loanYear) * 12 + (month - loanMonth) + 1;
      if (monthsElapsed > CONST.LOAN_INTEREST_MONTHS) {
        throw new Error('The interest period has ended for months this loan was outstanding. Only principal repayment is due.');
      }
      throw new Error('No interest is currently owed. Interest is charged only for months the loan remains outstanding (max 3).');
    }

  if (Number(amount) > outstandingInterest) {
    throw new Error(`Amount exceeds outstanding interest of M${outstandingInterest.toFixed(2)}`);
  }

  if (Number(amount) <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO transactions (member_id, loan_id, transaction_type, amount, transaction_date, transaction_month, transaction_year, mpesa_reference, description)
       VALUES (?, ?, 'interest_payment', ?, ?, ?, ?, ?, ?)`,
      [memberId, loanId, amount, date, month, year, mpesaRef, description || 'Interest payment']
    );

    await conn.query(
      'UPDATE loans SET total_interest_paid = total_interest_paid + ? WHERE id = ?',
      [amount, loanId]
    );

    const outstandingPrincipal = Number(loan.principal_amount) - Number(loan.total_principal_paid);
    const remainingInterest = outstandingInterest - Number(amount);
    if (remainingInterest <= 0 && outstandingPrincipal <= 0) {
      await removeFutureInterestAfterPayoff(loanId, date, conn);
      await conn.query("UPDATE loans SET status = 'paid' WHERE id = ?", [loanId]);
    }

    await conn.commit();
    return {
      success: true,
      interestPaid: Number(amount),
      remainingInterest: Math.max(0, remainingInterest),
      remainingPrincipal: outstandingPrincipal,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function recordPrincipalRepayment(memberId, amount, date, mpesaRef, loanId, description) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const [loans] = await pool.query(
    "SELECT * FROM loans WHERE id = ? AND member_id = ? AND status = 'active'",
    [loanId, memberId]
  );
  if (loans.length === 0) throw new Error('Active loan not found');

  const loan = loans[0];
  const outstandingPrincipal = Number(loan.principal_amount) - Number(loan.total_principal_paid);

  if (outstandingPrincipal <= 0) {
    throw new Error('No outstanding principal on this loan');
  }

  if (Number(amount) > outstandingPrincipal) {
    throw new Error(`Amount exceeds outstanding principal of M${outstandingPrincipal.toFixed(2)}`);
  }

  if (Number(amount) <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO transactions (member_id, loan_id, transaction_type, amount, transaction_date, transaction_month, transaction_year, mpesa_reference, description)
       VALUES (?, ?, 'loan_repayment', ?, ?, ?, ?, ?, ?)`,
      [memberId, loanId, amount, date, month, year, mpesaRef, description || 'Principal repayment']
    );

    await conn.query(
      'UPDATE loans SET total_principal_paid = total_principal_paid + ? WHERE id = ?',
      [amount, loanId]
    );

    const remainingPrincipal = outstandingPrincipal - Number(amount);
    let remainingInterest = Number(loan.total_interest_charged) - Number(loan.total_interest_paid);

    // Once principal is cleared, stop charging interest for later months.
    if (remainingPrincipal <= 0) {
      await removeFutureInterestAfterPayoff(loanId, date, conn);
      const [updated] = await conn.query(
        'SELECT total_interest_charged, total_interest_paid FROM loans WHERE id = ?',
        [loanId]
      );
      remainingInterest = Number(updated[0].total_interest_charged) - Number(updated[0].total_interest_paid);
      if (remainingInterest <= 0) {
        await conn.query("UPDATE loans SET status = 'paid' WHERE id = ?", [loanId]);
      }
    }

    await conn.commit();
    return {
      success: true,
      principalPaid: Number(amount),
      remainingPrincipal: Math.max(0, remainingPrincipal),
      remainingInterest: Math.max(0, remainingInterest),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function recordLoan(memberId, amount, date, mpesaRef, description) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  if (!isBorrowingPeriod(month)) {
    throw new Error('Loans can only be taken between January and September');
  }

  if (Number(amount) > CONST.MAX_LOAN_AMOUNT || Number(amount) <= 0) {
    throw new Error(`Loan amount must be between M1 and M${CONST.MAX_LOAN_AMOUNT}`);
  }

  const activeLoans = await getActiveLoans(memberId);
  const totalActive = activeLoans.reduce((s, l) => s + Number(l.principal_amount), 0);
  const outstanding = activeLoans.reduce((s, l) => {
    const p = Number(l.principal_amount) - Number(l.total_principal_paid);
    const i = Number(l.total_interest_charged) - Number(l.total_interest_paid);
    return s + p + i;
  }, 0);

  const eligibility = canTakeLoan(month, outstanding, totalActive);
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason);
  }

  if (totalActive + Number(amount) > CONST.MAX_LOAN_AMOUNT) {
    throw new Error(`Total active loans cannot exceed M${CONST.MAX_LOAN_AMOUNT}. Current: M${totalActive}`);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [loanResult] = await conn.query(
      `INSERT INTO loans (member_id, principal_amount, loan_date, loan_month, loan_year, mpesa_reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [memberId, amount, date, month, year, mpesaRef, description || 'Loan disbursement']
    );

    const loanId = loanResult.insertId;

    await conn.query(
      `INSERT INTO transactions (member_id, loan_id, transaction_type, amount, transaction_date, transaction_month, transaction_year, mpesa_reference, description)
       VALUES (?, ?, 'loan_disbursement', ?, ?, ?, ?, ?, ?)`,
      [memberId, loanId, amount, date, month, year, mpesaRef, description || `Loan of M${amount}`]
    );

    await accrueLoanInterest(loanId, memberId, month, year, conn);

    await conn.commit();
    return { success: true, loanId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function recordLoanRepayment(memberId, amount, date, mpesaRef, loanId, description) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  await accrueAllDueInterest(loanId, memberId, date);

  const loan = await getActiveLoan(loanId, memberId);
  if (!loan) throw new Error('Active loan not found');
  const outstandingInterest = Number(loan.total_interest_charged) - Number(loan.total_interest_paid);
  const outstandingPrincipal = Number(loan.principal_amount) - Number(loan.total_principal_paid);
  const totalOutstanding = outstandingInterest + outstandingPrincipal;

  if (Number(amount) > totalOutstanding) {
    throw new Error(`Repayment exceeds outstanding balance of M${totalOutstanding.toFixed(2)}`);
  }

  let remaining = Number(amount);
  let interestPaid = 0;
  let principalPaid = 0;

  if (outstandingInterest > 0 && remaining > 0) {
    interestPaid = Math.min(remaining, outstandingInterest);
    remaining -= interestPaid;
  }
  if (remaining > 0) {
    principalPaid = Math.min(remaining, outstandingPrincipal);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (interestPaid > 0) {
      await conn.query(
        `INSERT INTO transactions (member_id, loan_id, transaction_type, amount, transaction_date, transaction_month, transaction_year, mpesa_reference, description)
         VALUES (?, ?, 'interest_payment', ?, ?, ?, ?, ?, ?)`,
        [memberId, loanId, interestPaid, date, month, year, mpesaRef, description || 'Interest payment']
      );
    }

    if (principalPaid > 0) {
      await conn.query(
        `INSERT INTO transactions (member_id, loan_id, transaction_type, amount, transaction_date, transaction_month, transaction_year, mpesa_reference, description)
         VALUES (?, ?, 'loan_repayment', ?, ?, ?, ?, ?, ?)`,
        [memberId, loanId, principalPaid, date, month, year, mpesaRef, description || 'Principal repayment']
      );
    }

    await conn.query(
      'UPDATE loans SET total_interest_paid = total_interest_paid + ?, total_principal_paid = total_principal_paid + ? WHERE id = ?',
      [interestPaid, principalPaid, loanId]
    );

    const remainingPrincipal =
      Number(loan.principal_amount) - Number(loan.total_principal_paid) - principalPaid;
    let remainingInterest =
      Number(loan.total_interest_charged) - Number(loan.total_interest_paid) - interestPaid;

    if (remainingPrincipal <= 0) {
      await removeFutureInterestAfterPayoff(loanId, date, conn);
      const [updated] = await conn.query(
        'SELECT total_interest_charged, total_interest_paid FROM loans WHERE id = ?',
        [loanId]
      );
      remainingInterest = Number(updated[0].total_interest_charged) - Number(updated[0].total_interest_paid);
    }

    if (remainingPrincipal <= 0 && remainingInterest <= 0) {
      await conn.query("UPDATE loans SET status = 'paid' WHERE id = ?", [loanId]);
    }

    await conn.commit();
    return {
      success: true,
      interestPaid,
      principalPaid,
      remainingBalance: Math.max(0, remainingPrincipal + remainingInterest),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getSocietySummary(year = new Date().getFullYear()) {
  const [transactions] = await pool.query(
    'SELECT * FROM transactions WHERE transaction_year = ?',
    [year]
  );
  const [loans] = await pool.query('SELECT * FROM loans WHERE loan_year = ? OR status = ?', [year, 'active']);
  const [members] = await pool.query('SELECT id, joined_date FROM members WHERE is_active = 1');
  const activeMembers = members.length;

  const societyBalance = calculateSocietyBalance(transactions, loans, year);
  const penaltiesStillOwing = getSocietyPenaltiesStillOwing(transactions, members, year);

  const sharePerMember = activeMembers > 0
    ? Math.max(0, societyBalance.availableBalance / activeMembers)
    : 0;

  return {
    year,
    activeMembers,
    societyBalance,
    sharePerMember,
    penaltiesStillOwing: penaltiesStillOwing.total,
    unpaidPenaltyMonths: penaltiesStillOwing.monthCount,
  };
}

async function getTransactionById(id) {
  const [rows] = await pool.query(
    `SELECT t.*, m.full_name, m.phone
     FROM transactions t
     JOIN members m ON t.member_id = m.id
     WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function reverseLoanEffects(conn, transaction, { deleteLoan = true } = {}) {
  if (!transaction.loan_id) return;

  if (transaction.transaction_type === 'interest_payment') {
    await conn.query(
      'UPDATE loans SET total_interest_paid = GREATEST(0, total_interest_paid - ?), status = ? WHERE id = ?',
      [transaction.amount, 'active', transaction.loan_id]
    );
  } else if (transaction.transaction_type === 'loan_repayment') {
    await conn.query(
      'UPDATE loans SET total_principal_paid = GREATEST(0, total_principal_paid - ?), status = ? WHERE id = ?',
      [transaction.amount, 'active', transaction.loan_id]
    );
  } else if (transaction.transaction_type === 'loan_disbursement' && deleteLoan) {
    const [related] = await conn.query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE loan_id = ? AND id != ? AND transaction_type IN ('interest_payment', 'loan_repayment')`,
      [transaction.loan_id, transaction.id]
    );
    if (related[0].count > 0) {
      throw new Error('Cannot delete a loan disbursement that already has repayments or interest payments. Delete those first.');
    }
    await conn.query('DELETE FROM loan_interest_accruals WHERE loan_id = ?', [transaction.loan_id]);
    await conn.query('DELETE FROM loans WHERE id = ?', [transaction.loan_id]);
  }
}

async function applyLoanEffects(conn, transaction) {
  if (!transaction.loan_id) return;

  if (transaction.transaction_type === 'interest_payment') {
    await conn.query(
      'UPDATE loans SET total_interest_paid = total_interest_paid + ? WHERE id = ?',
      [transaction.amount, transaction.loan_id]
    );
  } else if (transaction.transaction_type === 'loan_repayment') {
    await conn.query(
      'UPDATE loans SET total_principal_paid = total_principal_paid + ? WHERE id = ?',
      [transaction.amount, transaction.loan_id]
    );
  }
}

async function updateTransaction(id, data) {
  const existing = await getTransactionById(id);
  if (!existing) throw new Error('Transaction not found');

  const {
    amount = existing.amount,
    date = existing.transaction_date,
    mpesaReference = existing.mpesa_reference,
    description = existing.description,
  } = data;

  const { year, month, day } = parseDateParts(date);
  const late = existing.transaction_type === 'contribution' && day > CONST.CONTRIBUTION_DUE_DAY;

  if (existing.transaction_type === 'contribution' && Number(amount) !== CONST.MONTHLY_CONTRIBUTION) {
    throw new Error(`Contribution must be exactly M${CONST.MONTHLY_CONTRIBUTION}`);
  }
  if (existing.transaction_type === 'late_penalty' && Number(amount) !== CONST.LATE_PENALTY_AMOUNT) {
    throw new Error(`Late penalty must be exactly M${CONST.LATE_PENALTY_AMOUNT}`);
  }
  if (existing.transaction_type === 'loan_disbursement') {
    if (Number(amount) <= 0 || Number(amount) > CONST.MAX_LOAN_AMOUNT) {
      throw new Error(`Loan amount must be between M1 and M${CONST.MAX_LOAN_AMOUNT}`);
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await reverseLoanEffects(conn, existing, { deleteLoan: false });

    await conn.query(
      `UPDATE transactions
       SET amount = ?, transaction_date = ?, transaction_month = ?, transaction_year = ?,
           mpesa_reference = ?, description = ?, is_late = ?
       WHERE id = ?`,
      [
        amount,
        date,
        month,
        year,
        mpesaReference,
        description,
        late || existing.transaction_type === 'late_penalty' ? 1 : 0,
        id,
      ]
    );

    if (existing.transaction_type === 'loan_disbursement' && existing.loan_id) {
      await conn.query('DELETE FROM loan_interest_accruals WHERE loan_id = ?', [existing.loan_id]);
      await conn.query(
        `UPDATE loans SET principal_amount = ?, loan_date = ?, loan_month = ?, loan_year = ?,
         mpesa_reference = ?, notes = ?, total_interest_charged = 0 WHERE id = ?`,
        [amount, date, month, year, mpesaReference, description, existing.loan_id]
      );
      await accrueLoanInterest(existing.loan_id, existing.member_id, month, year, conn);
    } else {
      await applyLoanEffects(conn, {
        ...existing,
        amount,
        loan_id: existing.loan_id,
      });
    }

    await conn.commit();
    return getTransactionById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteTransaction(id) {
  const existing = await getTransactionById(id);
  if (!existing) throw new Error('Transaction not found');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await reverseLoanEffects(conn, existing);
    await conn.query('DELETE FROM transactions WHERE id = ?', [id]);
    await conn.commit();
    return { success: true, deletedId: Number(id) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  getMemberTransactions,
  getMemberLoans,
  getActiveLoans,
  getMemberSummary,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  recordContribution,
  recordPenalty,
  recordLoan,
  recordLoanRepayment,
  recordInterestPayment,
  recordPrincipalRepayment,
  processMonthlyInterestAccruals,
  getSocietySummary,
};
