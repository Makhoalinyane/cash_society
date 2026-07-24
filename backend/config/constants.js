module.exports = {
  MONTHLY_CONTRIBUTION: 550,
  MEMBER_SAVINGS_PORTION: 500,
  SOCIETY_PORTION: 50,
  LATE_PENALTY_RATE: 0.5,
  LATE_PENALTY_AMOUNT: 275,
  CONTRIBUTION_DUE_DAY: 8,
  // Cash held before recorded 2026 activity.
  // Calibrated to real savings M24,192. Later, a M300 interest payment that was
  // already inside that cash figure was recorded in the app — opening was reduced
  // by M300 so it is not double-counted in Available Balance.
  SOCIETY_OPENING_BALANCE_BY_YEAR: {
    2026: 6069.5,
  },
  MAX_LOAN_AMOUNT: 2000,
  LOAN_INTEREST_RATE: 0.15,
  MEMBER_INTEREST_SHARE: 0.10,
  SOCIETY_INTEREST_SHARE: 0.05,
  LOAN_INTEREST_MONTHS: 3,
  LOAN_INTEREST_PERIOD_DAYS: 30,
  // Next month interest applies only if still unpaid after this grace
  // following each 30-day period (society rule: 10–15 days).
  LOAN_INTEREST_GRACE_DAYS: 12,
  BORROWING_START_MONTH: 1,
  BORROWING_END_MONTH: 9,
  REPAYMENT_START_MONTH: 10,
  REPAYMENT_END_MONTH: 12,
  YEAR_END_PAYOUT_MONTH: 12,
  YEAR_END_PAYOUT_DAY: 15,
  MONTH_NAMES: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};
