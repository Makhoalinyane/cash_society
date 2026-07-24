const express = require('express');
const transactionService = require('../services/transactionService');
const CONST = require('../config/constants');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const summary = await transactionService.getSocietySummary(year);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rules', (req, res) => {
  res.json({
    monthlyContribution: CONST.MONTHLY_CONTRIBUTION,
    memberSavingsPortion: CONST.MEMBER_SAVINGS_PORTION,
    societyPortion: CONST.SOCIETY_PORTION,
    latePenaltyAmount: CONST.LATE_PENALTY_AMOUNT,
    contributionDueDay: CONST.CONTRIBUTION_DUE_DAY,
    maxLoanAmount: CONST.MAX_LOAN_AMOUNT,
    loanInterestRate: CONST.LOAN_INTEREST_RATE,
    memberInterestShare: CONST.MEMBER_INTEREST_SHARE,
    societyInterestShare: CONST.SOCIETY_INTEREST_SHARE,
    loanInterestMonths: CONST.LOAN_INTEREST_MONTHS,
    borrowingPeriod: 'January – September',
    repaymentPeriod: 'October – December',
    yearEndPayout: 'M500 × 12 months + 10% of loan principal per interest month paid (from the 15% interest)',
    interestSplit: '15% interest = 10% returned to member + 5% retained by society',
    interestRule:
      'Month 1 interest when loan is taken. Months 2 and 3 only if still unpaid 10–15 days after each 30-day period (max 3 months).',
    interestPeriodDays: CONST.LOAN_INTEREST_PERIOD_DAYS,
    interestGraceDays: CONST.LOAN_INTEREST_GRACE_DAYS,
    yearEndRules: {
      noPayoutIfOwing: 'Members owing anything receive no year-end share',
      carryForward: 'Next-year payments clear prior outstanding before current-year benefits apply',
      penaltiesContinue: 'Late penalties continue as usual',
      deadline: 'All outstanding must be paid by 15 December',
    },
  });
});

module.exports = router;
