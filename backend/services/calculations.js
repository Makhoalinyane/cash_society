const CONST = require('../config/constants');

const INFLOW_TYPES = ['contribution', 'late_penalty', 'interest_payment', 'loan_repayment'];

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

function getJoinYear(joinedDate) {
  return parseDateParts(joinedDate).year;
}

function daysBetween(startDate, endDate) {
  const start = parseDateParts(startDate);
  const end = parseDateParts(endDate);
  const a = Date.UTC(start.year, start.month - 1, start.day);
  const b = Date.UTC(end.year, end.month - 1, end.day);
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Interest months charged while a loan is outstanding (max 3):
 * - Month 1: charged when the loan is taken
 * - Month 2: only if still unpaid after 30 days + grace (10–15 days)
 * - Month 3: only if still unpaid after another 30 days + grace
 *
 * Default grace = 12 days (within the 10–15 day window).
 * So month 2 from day 42, month 3 from day 84.
 */
function getChargeableInterestMonths(loanDate, asOfDate) {
  const days = daysBetween(loanDate, asOfDate);
  const period = CONST.LOAN_INTEREST_PERIOD_DAYS;
  const grace = CONST.LOAN_INTEREST_GRACE_DAYS;

  let months = 1; // first month always applies while loan exists / at disbursement
  if (days >= period + grace) months = 2;
  if (days >= 2 * period + grace) months = 3;

  return Math.min(CONST.LOAN_INTEREST_MONTHS, months);
}

function getNextInterestDueInfo(loanDate, asOfDate) {
  const days = daysBetween(loanDate, asOfDate);
  const period = CONST.LOAN_INTEREST_PERIOD_DAYS;
  const grace = CONST.LOAN_INTEREST_GRACE_DAYS;
  const charged = getChargeableInterestMonths(loanDate, asOfDate);

  if (charged >= CONST.LOAN_INTEREST_MONTHS) {
    return {
      chargedMonths: charged,
      nextMonthNumber: null,
      daysUntilNextInterest: null,
      message: 'Maximum 3 months interest reached — no further interest will be charged.',
    };
  }

  const nextThreshold = charged * period + grace;
  const daysUntil = Math.max(0, nextThreshold - days);

  return {
    chargedMonths: charged,
    nextMonthNumber: charged + 1,
    daysUntilNextInterest: daysUntil,
    graceDays: grace,
    periodDays: period,
    message:
      daysUntil === 0
        ? `Month ${charged + 1} interest applies — loan still unpaid after ${period} days + ${grace}-day grace.`
        : `Month ${charged + 1} interest will apply in ${daysUntil} day(s) if the loan is still unpaid (after ${period} days + ${grace}-day grace).`,
  };
}

function getInterestMonthSchedule(loanDate, principal, count = CONST.LOAN_INTEREST_MONTHS) {
  const { year: loanYear, month: loanMonth } = parseDateParts(loanDate);
  const months = [];
  let y = loanYear;
  let m = loanMonth;
  for (let i = 0; i < count; i++) {
    months.push({
      month: m,
      monthName: getMonthName(m),
      year: y,
      interestAmount: calculateMonthlyInterest(principal),
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function isMonthOnOrBefore(year, month, asOfYear, asOfMonth) {
  return year < asOfYear || (year === asOfYear && month <= asOfMonth);
}

function getDueMonthRange(year, joinedDate, asOfDate = new Date()) {
  const { year: joinYear, month: joinMonth } = parseDateParts(joinedDate);
  const { year: asOfYear, month: asOfMonth } = parseDateParts(asOfDate);

  if (year < joinYear || year > asOfYear) return null;

  const startMonth = year === joinYear ? joinMonth : 1;
  const endMonth = year === asOfYear ? asOfMonth : 12;

  if (startMonth > endMonth) return null;

  return { startMonth, endMonth };
}

function getExpectedContributionMonths(year, joinedDate, asOfDate = new Date()) {
  const range = getDueMonthRange(year, joinedDate, asOfDate);
  if (!range) return 0;
  return range.endMonth - range.startMonth + 1;
}

function getContributionShortfall(transactions, year, joinedDate, asOfDate = new Date()) {
  const expected = getExpectedContributionMonths(year, joinedDate, asOfDate);
  const paid = transactions.filter(
    (t) => t.transaction_year === year && t.transaction_type === 'contribution'
  ).length;
  return Math.max(0, expected - paid) * CONST.MONTHLY_CONTRIBUTION;
}

function getActiveLoanOutstanding(loans) {
  return loans
    .filter((l) => l.status === 'active')
    .reduce((sum, loan) => {
      const principal = Number(loan.principal_amount) - Number(loan.total_principal_paid);
      const interest = Number(loan.total_interest_charged) - Number(loan.total_interest_paid);
      return sum + principal + interest;
    }, 0);
}

function sumYearInflows(transactions, year) {
  return transactions
    .filter((t) => t.transaction_year === year && INFLOW_TYPES.includes(t.transaction_type))
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function getYearInterestPaid(transactions, year) {
  return transactions
    .filter((t) => t.transaction_year === year && t.transaction_type === 'interest_payment')
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function getUnpaidPenalties(transactions, year, asOfDate = new Date()) {
  const { year: asOfYear, month: asOfMonth } = parseDateParts(asOfDate);
  const yearTx = transactions.filter((t) => t.transaction_year === year);
  const penaltiesPaidMonths = new Set(
    yearTx
      .filter((t) => t.transaction_type === 'late_penalty')
      .map((t) => t.transaction_month)
  );

  return yearTx
    .filter((t) => t.transaction_type === 'contribution')
    .filter((t) => Boolean(t.is_late) || isContributionLate(t.transaction_date))
    // Full contributions only — shortfalls already show late penalty on the month row
    .filter((t) => Number(t.amount) >= CONST.MONTHLY_CONTRIBUTION)
    .filter((t) => isMonthOnOrBefore(t.transaction_year, t.transaction_month, asOfYear, asOfMonth))
    .filter((t) => !penaltiesPaidMonths.has(t.transaction_month))
    .map((t) => ({
      month: t.transaction_month,
      monthName: getMonthName(t.transaction_month),
      year: t.transaction_year,
      amount: CONST.LATE_PENALTY_AMOUNT,
      paidOn: t.transaction_date,
    }));
}

function getUnpaidPenaltyOwed(transactions, year, asOfDate = new Date()) {
  return getUnpaidPenalties(transactions, year, asOfDate).reduce((sum, p) => sum + p.amount, 0);
}

function getMissedContributions(transactions, year, joinedDate, asOfDate = new Date()) {
  const statuses = getContributionMonthStatuses(transactions, year, joinedDate, asOfDate);
  return statuses
    .filter((s) => s.contributionOwed > 0 || s.status === 'overdue' || s.status === 'due' || s.status === 'shortfall')
    .map((s) => ({
      month: s.month,
      monthName: s.monthName,
      year: s.year,
      amount: s.contributionOwed,
      penaltyDue: s.penaltyOwed,
      totalDue: s.contributionOwed + s.penaltyOwed,
      pastDeadline: s.status === 'overdue' || s.status === 'shortfall',
      deadlineDay: CONST.CONTRIBUTION_DUE_DAY,
      hint: s.hint,
    }));
}

/**
 * Month-by-month contribution status for member details (hints + amounts owed).
 */
function getContributionMonthStatuses(transactions, year, joinedDate, asOfDate = new Date()) {
  const { year: asOfYear, month: asOfMonth, day: asOfDay } = parseDateParts(asOfDate);

  // Always show January through current month for the selected year
  // (or full year for past years), so missing months are never hidden.
  if (year > asOfYear) return [];

  const yearTx = transactions.filter((t) => t.transaction_year === year);
  const contributionsByMonth = {};
  for (const t of yearTx) {
    if (t.transaction_type === 'contribution') {
      contributionsByMonth[t.transaction_month] = t;
    }
  }
  const penaltiesPaidMonths = new Set(
    yearTx.filter((t) => t.transaction_type === 'late_penalty').map((t) => t.transaction_month)
  );

  const startMonth = 1;
  const endMonth = year === asOfYear ? asOfMonth : 12;
  if (startMonth > endMonth) return [];

  const statuses = [];
  for (let m = startMonth; m <= endMonth; m++) {
    const contribution = contributionsByMonth[m];
    const isCurrentMonth = year === asOfYear && m === asOfMonth;
    const pastDeadline = !isCurrentMonth || asOfDay > CONST.CONTRIBUTION_DUE_DAY;
    const penaltyPaid = penaltiesPaidMonths.has(m);

    if (contribution) {
      const paid = Number(contribution.amount);
      const shortfall = Math.max(0, CONST.MONTHLY_CONTRIBUTION - paid);
      // Prefer calendar date over stored flag (timezone-safe with dateStrings)
      const late = Boolean(contribution.is_late) || isContributionLate(contribution.transaction_date);
      const penaltyOwed = late && !penaltyPaid ? CONST.LATE_PENALTY_AMOUNT : 0;

      if (shortfall > 0) {
        const lateHint = late && !penaltyPaid
          ? ` + late penalty M${CONST.LATE_PENALTY_AMOUNT} (paid after the ${CONST.CONTRIBUTION_DUE_DAY}th)`
          : '';
        statuses.push({
          month: m,
          monthName: getMonthName(m),
          year,
          status: 'shortfall',
          contributionPaid: paid,
          contributionOwed: shortfall,
          penaltyOwed,
          totalOwed: shortfall + penaltyOwed,
          paidOn: contribution.transaction_date,
          hint: `Partial payment — M${paid.toFixed(2)} paid, M${shortfall.toFixed(2)} still outstanding for ${getMonthName(m)}${lateHint}`,
        });
      } else if (late && !penaltyPaid) {
        statuses.push({
          month: m,
          monthName: getMonthName(m),
          year,
          status: 'paid_late_penalty_owed',
          contributionPaid: paid,
          contributionOwed: 0,
          penaltyOwed: CONST.LATE_PENALTY_AMOUNT,
          totalOwed: CONST.LATE_PENALTY_AMOUNT,
          paidOn: contribution.transaction_date,
          hint: `Paid late — late penalty M${CONST.LATE_PENALTY_AMOUNT} still owing (deadline was the ${CONST.CONTRIBUTION_DUE_DAY}th)`,
        });
      } else if (late && penaltyPaid) {
        statuses.push({
          month: m,
          monthName: getMonthName(m),
          year,
          status: 'paid_late_settled',
          contributionPaid: paid,
          contributionOwed: 0,
          penaltyOwed: 0,
          totalOwed: 0,
          paidOn: contribution.transaction_date,
          hint: 'Contribution and late penalty settled',
        });
      } else {
        statuses.push({
          month: m,
          monthName: getMonthName(m),
          year,
          status: 'paid',
          contributionPaid: paid,
          contributionOwed: 0,
          penaltyOwed: 0,
          totalOwed: 0,
          paidOn: contribution.transaction_date,
          hint: 'Contribution paid on time',
        });
      }
    } else if (pastDeadline) {
      const penaltyOwed = penaltyPaid ? 0 : CONST.LATE_PENALTY_AMOUNT;
      const penHint = penaltyPaid
        ? `Late penalty settled; still owing contribution M${CONST.MONTHLY_CONTRIBUTION}`
        : `Missing — owing contribution M${CONST.MONTHLY_CONTRIBUTION} + late penalty M${CONST.LATE_PENALTY_AMOUNT} (deadline was the ${CONST.CONTRIBUTION_DUE_DAY}th)`;
      statuses.push({
        month: m,
        monthName: getMonthName(m),
        year,
        status: 'overdue',
        contributionPaid: 0,
        contributionOwed: CONST.MONTHLY_CONTRIBUTION,
        penaltyOwed,
        totalOwed: CONST.MONTHLY_CONTRIBUTION + penaltyOwed,
        paidOn: null,
        hint: penHint,
      });
    } else {
      statuses.push({
        month: m,
        monthName: getMonthName(m),
        year,
        status: 'due',
        contributionPaid: 0,
        contributionOwed: CONST.MONTHLY_CONTRIBUTION,
        penaltyOwed: 0,
        totalOwed: CONST.MONTHLY_CONTRIBUTION,
        paidOn: null,
        hint: `Not paid yet — due on or before the ${CONST.CONTRIBUTION_DUE_DAY}th (no penalty until after deadline)`,
      });
    }
  }

  return statuses;
}

function getContributionStatusSummary(statuses) {
  const missing = statuses.filter(
    (s) => s.status === 'overdue' || s.status === 'due' || s.status === 'shortfall' || s.contributionOwed > 0
  );
  const penaltyOwed = statuses.filter((s) => s.penaltyOwed > 0);
  const totalContributionOwed = statuses.reduce((sum, s) => sum + s.contributionOwed, 0);
  const totalPenaltyOwed = statuses.reduce((sum, s) => sum + s.penaltyOwed, 0);

  return {
    missingMonths: missing.map((s) => `${s.monthName} ${s.year}`),
    overdueCount: statuses.filter((s) => s.status === 'overdue').length,
    dueSoonCount: statuses.filter((s) => s.status === 'due').length,
    shortfallCount: statuses.filter((s) => s.status === 'shortfall').length,
    unpaidPenaltyCount: penaltyOwed.length,
    totalContributionOwed,
    totalPenaltyOwed,
    totalOwed: totalContributionOwed + totalPenaltyOwed,
  };
}

function formatISODate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getLastDayOfMonth(year, monthOneIndexed) {
  return new Date(year, monthOneIndexed, 0).getDate();
}

function calculateLoanSchedule(loan, asOfDate = new Date()) {
  const principal = Number(loan.principal_amount);
  const loanYear = loan.loan_year || parseDateParts(loan.loan_date).year;
  const { month: loanMonth, day: loanDay } = parseDateParts(loan.loan_date);

  const possibleInterestMonths = getInterestMonthSchedule(loan.loan_date, principal);
  const chargeableMonths = getChargeableInterestMonths(loan.loan_date, asOfDate);

  const isActive = loan.status === 'active';
  const interestCharged = Number(loan.total_interest_charged);
  const interestPaid = Number(loan.total_interest_paid);
  const monthsCharged = interestCharged > 0
    ? Math.round(interestCharged / calculateMonthlyInterest(principal))
    : 0;

  const interestMonthsDue = possibleInterestMonths.slice(0, Math.max(monthsCharged, chargeableMonths));
  const interestMonthsUpcoming = isActive
    ? possibleInterestMonths.slice(Math.max(monthsCharged, chargeableMonths))
    : [];

  const lastPossible = possibleInterestMonths[possibleInterestMonths.length - 1];
  const interestPeriodEnd = formatISODate(
    lastPossible.year,
    lastPossible.month,
    getLastDayOfMonth(lastPossible.year, lastPossible.month)
  );

  const fullRepaymentDueDate = formatISODate(
    loanYear,
    CONST.YEAR_END_PAYOUT_MONTH,
    CONST.YEAR_END_PAYOUT_DAY
  );

  const maxInterest = principal * CONST.LOAN_INTEREST_RATE * CONST.LOAN_INTEREST_MONTHS;
  const outstandingPrincipal = principal - Number(loan.total_principal_paid);
  const outstandingInterest = interestCharged - interestPaid;

  return {
    loanId: loan.id,
    loanDate: formatISODate(loanYear, loanMonth, loanDay),
    principal,
    interestMonths: possibleInterestMonths,
    interestMonthsDue: interestMonthsDue.slice(0, monthsCharged || chargeableMonths),
    interestMonthsUpcoming,
    monthsCharged,
    chargeableMonths,
    interestMonthLabels: interestMonthsDue
      .slice(0, monthsCharged || chargeableMonths)
      .map((im) => `${im.monthName} ${im.year}`)
      .join(', ') || 'None yet',
    upcomingInterestMonthLabels: interestMonthsUpcoming
      .map((im) => `${im.monthName} ${im.year}`)
      .join(', '),
    interestPeriodEnd,
    fullRepaymentDueDate,
    fullRepaymentDueLabel: `${CONST.YEAR_END_PAYOUT_DAY} ${CONST.MONTH_NAMES[CONST.YEAR_END_PAYOUT_MONTH - 1]} ${loanYear}`,
    interestCharged,
    maxInterest,
    maxTotalIfHeldFullTerm: principal + maxInterest,
    currentTotalDue: outstandingPrincipal + outstandingInterest,
    currentOutstanding: outstandingPrincipal + outstandingInterest,
    outstandingPrincipal,
    outstandingInterest,
    earlyPayoffRule:
      'Month 1 interest at disbursement. Months 2 and 3 only if still unpaid 10–15 days after each 30-day period.',
    nextInterestInfo: isActive ? getNextInterestDueInfo(loan.loan_date, asOfDate) : null,
  };
}

function getAllUnpaidPenalties(transactions, joinedDate, throughYear, asOfDate = new Date()) {
  const joinYear = getJoinYear(joinedDate);
  const all = [];
  for (let year = joinYear; year <= throughYear; year++) {
    all.push(...getUnpaidPenalties(transactions, year, asOfDate));
  }
  return all;
}

function getAllMissedContributions(transactions, joinedDate, throughYear, asOfDate = new Date()) {
  const joinYear = getJoinYear(joinedDate);
  const all = [];
  for (let year = joinYear; year <= throughYear; year++) {
    all.push(...getMissedContributions(transactions, year, joinedDate, asOfDate));
  }
  return all;
}

function calculateTotalOutstanding(transactions, loans, joinedDate, throughYear, asOfDate = new Date()) {
  const joinYear = getJoinYear(joinedDate);
  let total = getActiveLoanOutstanding(loans);

  for (let year = joinYear; year <= throughYear; year++) {
    // Month statuses already include contribution shortfalls + late penalties (no double-count)
    const statuses = getContributionMonthStatuses(transactions, year, joinedDate, asOfDate);
    total += statuses.reduce((sum, s) => sum + Number(s.totalOwed || 0), 0);
  }

  return total;
}

function getAllContributionMonthStatuses(transactions, joinedDate, throughYear, asOfDate = new Date()) {
  const joinYear = getJoinYear(joinedDate);
  const all = [];
  for (let year = joinYear; year <= throughYear; year++) {
    all.push(...getContributionMonthStatuses(transactions, year, joinedDate, asOfDate));
  }
  return all;
}

function calculateYearEndStatus(allTransactions, allLoans, joinedDate, targetYear, asOfDate = new Date()) {
  const joinYear = getJoinYear(joinedDate);
  const yearTransactions = allTransactions.filter((t) => t.transaction_year === targetYear);

  const contributionMonthStatuses = getContributionMonthStatuses(
    allTransactions, targetYear, joinedDate, asOfDate
  );
  const contributionStatusSummary = getContributionStatusSummary(contributionMonthStatuses);
  const missedContributions = getMissedContributions(allTransactions, targetYear, joinedDate, asOfDate);
  const contributionShortfall = missedContributions.reduce((sum, m) => sum + m.amount, 0);
  // Late penalties on fully-paid contributions (shortfall/overdue penalties live in month statuses)
  const unpaidPenalties = getUnpaidPenalties(allTransactions, targetYear, asOfDate);
  const penaltyOwed = contributionStatusSummary.totalPenaltyOwed;
  const loanOutstanding = getActiveLoanOutstanding(allLoans);
  const loanSchedules = allLoans
    .filter((l) => l.status === 'active')
    .map((l) => calculateLoanSchedule(l, asOfDate));
  const totalOutstanding = calculateTotalOutstanding(
    allTransactions, allLoans, joinedDate, targetYear, asOfDate
  );

  const priorYearDebt = targetYear > joinYear
    ? calculateTotalOutstanding(allTransactions, allLoans, joinedDate, targetYear - 1, asOfDate)
    : 0;

  const currentYearInflows = sumYearInflows(allTransactions, targetYear);
  const paymentsAppliedToPriorDebt = priorYearDebt > 0
    ? Math.min(currentYearInflows, priorYearDebt)
    : 0;

  const carriedForwardFromPriorYears = Math.max(0, priorYearDebt - paymentsAppliedToPriorDebt);

  const contributionMonths = yearTransactions.filter(
    (t) => t.transaction_type === 'contribution'
  ).length;

  const interestPaidInYear = getYearInterestPaid(allTransactions, targetYear);
  const potentialPayout = calculateYearEndPayout(contributionMonths, interestPaidInYear);

  const eligible = totalOutstanding === 0;
  const deadline = `${CONST.YEAR_END_PAYOUT_DAY} ${CONST.MONTH_NAMES[CONST.YEAR_END_PAYOUT_MONTH - 1]} ${targetYear}`;

  let blockedReason = null;
  if (!eligible) {
    const parts = [];
    if (carriedForwardFromPriorYears > 0) {
      parts.push(`M${carriedForwardFromPriorYears.toFixed(2)} carried from prior year(s)`);
    }
    if (contributionShortfall > 0) {
      const months = missedContributions.map((m) => m.monthName).join(', ');
      parts.push(`M${contributionShortfall.toFixed(2)} in missed contributions (${months})`);
    }
    if (penaltyOwed > 0) {
      parts.push(`M${penaltyOwed.toFixed(2)} in late penalties (missed deadline / unpaid)`);
    }
    if (loanOutstanding > 0) {
      const loanDueParts = loanSchedules.map(
        (s) => `Loan #${s.loanId} due ${s.fullRepaymentDueLabel}`
      );
      parts.push(`M${loanOutstanding.toFixed(2)} in loan debt (${loanDueParts.join('; ')})`);
    }
    blockedReason = `All outstanding must be paid by ${deadline} to receive year-end share. Owed: ${parts.join(', ')}.`;
  }

  const yearEndPayout = eligible
    ? { ...potentialPayout, blocked: false, eligible: true }
    : {
        savingsReturn: 0,
        interestRebate: 0,
        societyInterestRetained: potentialPayout.societyInterestRetained,
        total: 0,
        blocked: true,
        eligible: false,
        reason: blockedReason,
        potentialIfCleared: potentialPayout,
      };

  return {
    eligible,
    deadline,
    totalOutstanding,
    contributionShortfall,
    missedContributions,
    contributionMonthStatuses,
    contributionStatusSummary,
    allContributionMonthStatuses: getAllContributionMonthStatuses(
      allTransactions, joinedDate, targetYear, asOfDate
    ),
    penaltyOwed,
    unpaidPenalties,
    loanOutstanding,
    loanSchedules,
    allUnpaidPenalties: getAllUnpaidPenalties(allTransactions, joinedDate, targetYear, asOfDate),
    allMissedContributions: getAllMissedContributions(allTransactions, joinedDate, targetYear, asOfDate),
    priorYearDebt,
    carriedForwardFromPriorYears,
    paymentsAppliedToPriorDebt,
    currentYearInflows,
    yearEndPayout,
    potentialPayout,
    rules: {
      noPayoutIfOwing: 'Members with any outstanding balance receive nothing at year-end',
      carryForward: 'Payments in a new year first clear prior year debt before earning current year benefits',
      penaltiesContinue: 'Late penalties still apply as usual on overdue contributions',
      deadline: `All outstanding must be cleared by ${deadline}`,
    },
  };
}

function isBorrowingPeriod(month) {
  return month >= CONST.BORROWING_START_MONTH && month <= CONST.BORROWING_END_MONTH;
}

function isRepaymentOnlyPeriod(month) {
  return month >= CONST.REPAYMENT_START_MONTH && month <= CONST.REPAYMENT_END_MONTH;
}

function isContributionLate(date) {
  const { day } = parseDateParts(date);
  return day > CONST.CONTRIBUTION_DUE_DAY;
}

function formatCurrency(amount) {
  return `M${Number(amount).toFixed(2)}`;
}

function getMonthName(month) {
  return CONST.MONTH_NAMES[month - 1] || '';
}

function calculateLoanInterest(principal, monthsElapsed) {
  const chargeableMonths = Math.min(monthsElapsed, CONST.LOAN_INTEREST_MONTHS);
  return principal * CONST.LOAN_INTEREST_RATE * chargeableMonths;
}

function calculateMonthlyInterest(principal) {
  return principal * CONST.LOAN_INTEREST_RATE;
}

function calculateMemberInterestRebate(interestPaid) {
  return interestPaid * (CONST.MEMBER_INTEREST_SHARE / CONST.LOAN_INTEREST_RATE);
}

function calculateSocietyInterestShare(interestPaid) {
  return interestPaid * (CONST.SOCIETY_INTEREST_SHARE / CONST.LOAN_INTEREST_RATE);
}

function calculateYearEndPayout(memberSavingsMonths, totalInterestPaid) {
  const savingsReturn = CONST.MEMBER_SAVINGS_PORTION * memberSavingsMonths;
  const interestRebate = calculateMemberInterestRebate(totalInterestPaid);
  const societyInterestRetained = calculateSocietyInterestShare(totalInterestPaid);
  return {
    savingsReturn,
    interestRebate,
    societyInterestRetained,
    total: savingsReturn + interestRebate,
  };
}

function canTakeLoan(month, outstandingBalance, activeLoanPrincipal) {
  if (!isBorrowingPeriod(month)) {
    return {
      allowed: false,
      reason: 'Loans are only available January through September. October–December is repayment only.',
    };
  }
  if (outstandingBalance > 0) {
    return {
      allowed: false,
      reason: `Outstanding balance of ${formatCurrency(outstandingBalance)} must be paid before taking a new loan.`,
    };
  }
  if (activeLoanPrincipal >= CONST.MAX_LOAN_AMOUNT) {
    return {
      allowed: false,
      reason: `Maximum loan limit of ${formatCurrency(CONST.MAX_LOAN_AMOUNT)} reached.`,
    };
  }
  return { allowed: true, reason: 'Eligible for a loan.' };
}

function calculateMemberBalance(transactions, loans) {
  let totalContributions = 0;
  let totalPenalties = 0;
  let totalLoanRepayments = 0;
  let totalInterestPaid = 0;
  let totalSavingsReturned = 0;
  let totalRebates = 0;
  let totalLoanReceived = 0;

  for (const t of transactions) {
    switch (t.transaction_type) {
      case 'contribution':
        totalContributions += Number(t.amount);
        break;
      case 'late_penalty':
        totalPenalties += Number(t.amount);
        break;
      case 'loan_disbursement':
        totalLoanReceived += Number(t.amount);
        break;
      case 'loan_repayment':
        totalLoanRepayments += Number(t.amount);
        break;
      case 'interest_payment':
        totalInterestPaid += Number(t.amount);
        break;
      case 'savings_return':
        totalSavingsReturned += Number(t.amount);
        break;
      case 'interest_rebate':
        totalRebates += Number(t.amount);
        break;
      default:
        break;
    }
  }

  let outstandingPrincipal = 0;
  let outstandingInterest = 0;
  let totalInterestCharged = 0;
  let interestPaidOnLoans = 0;

  for (const loan of loans) {
    if (loan.status === 'active') {
      outstandingPrincipal += Number(loan.principal_amount) - Number(loan.total_principal_paid);
      const charged = Number(loan.total_interest_charged);
      const paid = Number(loan.total_interest_paid);
      outstandingInterest += charged - paid;
      totalInterestCharged += charged;
      interestPaidOnLoans += paid;
    } else if (loan.status === 'paid') {
      interestPaidOnLoans += Number(loan.total_interest_paid);
      totalInterestCharged += Number(loan.total_interest_charged);
    }
  }

  const totalOwed = outstandingPrincipal + outstandingInterest;
  const totalPaidIn = totalContributions + totalPenalties + totalLoanRepayments + totalInterestPaid;
  const totalPaidOut = totalLoanReceived + totalSavingsReturned + totalRebates;
  const netBalance = totalPaidIn - totalPaidOut - totalOwed;

  const contributionMonths = transactions.filter(
    (t) => t.transaction_type === 'contribution'
  ).length;

  const yearEndPayout = calculateYearEndPayout(contributionMonths, interestPaidOnLoans);

  return {
    totalContributions,
    totalPenalties,
    totalLoanReceived,
    totalLoanRepayments,
    totalInterestPaid: interestPaidOnLoans,
    totalSavingsReturned,
    totalRebates,
    outstandingPrincipal,
    outstandingInterest,
    totalOwed,
    totalPaidIn,
    totalPaidOut,
    netBalance,
    contributionMonths,
    yearEndPayout,
  };
}

function getSocietyPenaltiesStillOwing(allTransactions, members, year, asOfDate = new Date()) {
  let total = 0;
  let monthCount = 0;

  for (const member of members) {
    const memberTx = allTransactions.filter((t) => Number(t.member_id) === Number(member.id));
    const statuses = getContributionMonthStatuses(
      memberTx,
      year,
      member.joined_date,
      asOfDate
    );
    for (const s of statuses) {
      const pen = Number(s.penaltyOwed || 0);
      if (pen > 0) {
        total += pen;
        monthCount += 1;
      }
    }
  }

  return { total, monthCount };
}

function getSocietyOpeningBalance(year) {
  const map = CONST.SOCIETY_OPENING_BALANCE_BY_YEAR || {};
  return Number(map[year] || 0);
}

function calculateSocietyBalance(allTransactions, allLoans, year = new Date().getFullYear()) {
  let contributions = 0;
  let penalties = 0;
  let loanRepayments = 0;
  let interestPayments = 0;
  let loanDisbursements = 0;
  let savingsReturns = 0;
  let rebates = 0;

  for (const t of allTransactions) {
    const amt = Number(t.amount);
    switch (t.transaction_type) {
      case 'contribution':
        contributions += amt;
        break;
      case 'late_penalty':
        penalties += amt;
        break;
      case 'loan_repayment':
        loanRepayments += amt;
        break;
      case 'interest_payment':
        interestPayments += amt;
        break;
      case 'loan_disbursement':
        loanDisbursements += amt;
        break;
      case 'savings_return':
        savingsReturns += amt;
        break;
      case 'interest_rebate':
        rebates += amt;
        break;
      default:
        break;
    }
  }

  const openingBalance = getSocietyOpeningBalance(year);
  const moneyInFromTransactions = contributions + penalties + loanRepayments + interestPayments;
  const moneyIn = openingBalance + moneyInFromTransactions;
  const moneyOut = loanDisbursements + savingsReturns + rebates;
  const outstandingLoans = allLoans
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => {
      const principal = Number(l.principal_amount) - Number(l.total_principal_paid);
      const interest = Number(l.total_interest_charged) - Number(l.total_interest_paid);
      return sum + principal + interest;
    }, 0);

  const availableBalance = moneyIn - moneyOut;
  // What members can share from is the savings cash only. Loan balances are
  // already reflected in cash (disbursements left the account; repayments return).
  const distributableBalance = availableBalance;
  const pendingMemberRebates = calculateMemberInterestRebate(interestPayments) - rebates;
  const societyInterestRetained = calculateSocietyInterestShare(interestPayments);

  return {
    openingBalance,
    contributions,
    penalties,
    loanRepayments,
    interestPayments,
    loanDisbursements,
    savingsReturns,
    rebates,
    moneyInFromTransactions,
    moneyIn,
    moneyOut,
    availableBalance,
    outstandingLoans,
    distributableBalance,
    pendingMemberRebates,
    societyInterestRetained,
  };
}

function groupTransactionsByMonth(transactions, year) {
  const months = {};
  for (let m = 1; m <= 12; m++) {
    months[m] = {
      month: m,
      monthName: getMonthName(m),
      year,
      transactions: [],
      totalIn: 0,
      totalOut: 0,
      balance: 0,
    };
  }

  let runningBalance = 0;
  const sorted = [...transactions].sort((a, b) => {
    const dateA = new Date(a.transaction_date);
    const dateB = new Date(b.transaction_date);
    return dateA - dateB;
  });

  for (const t of sorted) {
    if (t.transaction_year !== year) continue;
    const m = t.transaction_month;
    const amt = Number(t.amount);
    const isOutflow = ['loan_disbursement', 'savings_return', 'interest_rebate'].includes(t.transaction_type);

    months[m].transactions.push({
      ...t,
      amount: amt,
      direction: isOutflow ? 'out' : 'in',
    });

    if (isOutflow) {
      months[m].totalOut += amt;
      runningBalance -= amt;
    } else {
      months[m].totalIn += amt;
      runningBalance += amt;
    }
    months[m].balance = runningBalance;
  }

  return Object.values(months);
}

module.exports = {
  isBorrowingPeriod,
  isRepaymentOnlyPeriod,
  isContributionLate,
  formatCurrency,
  getMonthName,
  calculateLoanInterest,
  calculateMonthlyInterest,
  calculateMemberInterestRebate,
  calculateSocietyInterestShare,
  getChargeableInterestMonths,
  getNextInterestDueInfo,
  getInterestMonthSchedule,
  calculateLoanSchedule,
  calculateYearEndPayout,
  calculateYearEndStatus,
  calculateTotalOutstanding,
  canTakeLoan,
  calculateMemberBalance,
  getSocietyOpeningBalance,
  getSocietyPenaltiesStillOwing,
  calculateSocietyBalance,
  groupTransactionsByMonth,
  CONST,
};
