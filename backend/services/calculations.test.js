const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateYearEndPayoutProgress,
  calculateYearEndStatus,
  calculateSocietyBalance,
} = require('./calculations');

test('payout progress totals only payouts recorded in the selected year', () => {
  const progress = calculateYearEndPayoutProgress(
    { total: 1200 },
    [
      { transaction_year: 2026, transaction_type: 'savings_return', amount: 500 },
      { transaction_year: 2026, transaction_type: 'interest_rebate', amount: 100 },
      { transaction_year: 2025, transaction_type: 'savings_return', amount: 200 },
    ],
    2026
  );

  assert.deepEqual(progress, {
    paidSavingsReturn: 500,
    paidInterestRebate: 100,
    paidTotal: 600,
    remaining: 600,
  });
});

test('member year-end status subtracts a recorded partial payout from the remaining share', () => {
  const transactions = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      transaction_type: 'contribution',
      amount: 550,
      transaction_date: `2026-${String(month).padStart(2, '0')}-05`,
      transaction_month: month,
      transaction_year: 2026,
      is_late: 0,
    };
  });
  transactions.push({
    transaction_type: 'savings_return',
    amount: 500,
    transaction_date: '2026-12-15',
    transaction_month: 12,
    transaction_year: 2026,
  });

  const status = calculateYearEndStatus(
    transactions,
    [],
    '2026-01-01',
    2026,
    '2026-12-15'
  );

  assert.equal(status.eligible, true);
  assert.equal(status.yearEndPayout.total, 6000);
  assert.equal(status.yearEndPayout.paid, 500);
  assert.equal(status.yearEndPayout.remaining, 5500);
});

test('recorded savings returns reduce society cash by the amount paid', () => {
  const balance = calculateSocietyBalance(
    [
      { transaction_type: 'contribution', amount: 550 },
      { transaction_type: 'savings_return', amount: 500 },
    ],
    [],
    2025
  );

  assert.equal(balance.moneyIn, 550);
  assert.equal(balance.moneyOut, 500);
  assert.equal(balance.availableBalance, 50);
});
