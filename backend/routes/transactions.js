const express = require('express');
const pool = require('../config/db');
const transactionService = require('../services/transactionService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { year } = req.query;
    let query = `
      SELECT t.*, m.full_name, m.phone
      FROM transactions t
      JOIN members m ON t.member_id = m.id
    `;
    const params = [];
    if (year) {
      query += ' WHERE t.transaction_year = ?';
      params.push(year);
    }
    query += ' ORDER BY t.transaction_date DESC, t.id DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/member/:memberId', async (req, res) => {
  try {
    const { year } = req.query;
    const transactions = await transactionService.getMemberTransactions(
      req.params.memberId,
      year ? parseInt(year, 10) : null
    );
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/contribution', async (req, res) => {
  try {
    const { memberId, amount, date, mpesaReference, description } = req.body;
    if (!memberId || !amount || !date) {
      return res.status(400).json({ error: 'memberId, amount, and date are required' });
    }
    const result = await transactionService.recordContribution(
      memberId, amount, date, mpesaReference, description
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/penalty', async (req, res) => {
  try {
    const { memberId, amount, date, mpesaReference, description, forMonth, forYear } = req.body;
    if (!memberId || !amount || !date) {
      return res.status(400).json({ error: 'memberId, amount, and date are required' });
    }
    const result = await transactionService.recordPenalty(
      memberId, amount, date, mpesaReference, description, forMonth, forYear
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/loan', async (req, res) => {
  try {
    const { memberId, amount, date, mpesaReference, description } = req.body;
    if (!memberId || !amount || !date) {
      return res.status(400).json({ error: 'memberId, amount, and date are required' });
    }
    const result = await transactionService.recordLoan(
      memberId, amount, date, mpesaReference, description
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/repayment', async (req, res) => {
  try {
    const { memberId, amount, date, mpesaReference, loanId, description } = req.body;
    if (!memberId || !amount || !date || !loanId) {
      return res.status(400).json({ error: 'memberId, amount, date, and loanId are required' });
    }
    const result = await transactionService.recordLoanRepayment(
      memberId, amount, date, mpesaReference, loanId, description
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/interest', async (req, res) => {
  try {
    const { memberId, amount, date, mpesaReference, loanId, description } = req.body;
    if (!memberId || !amount || !date || !loanId) {
      return res.status(400).json({ error: 'memberId, amount, date, and loanId are required' });
    }
    const result = await transactionService.recordInterestPayment(
      memberId, amount, date, mpesaReference, loanId, description
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/principal', async (req, res) => {
  try {
    const { memberId, amount, date, mpesaReference, loanId, description } = req.body;
    if (!memberId || !amount || !date || !loanId) {
      return res.status(400).json({ error: 'memberId, amount, date, and loanId are required' });
    }
    const result = await transactionService.recordPrincipalRepayment(
      memberId, amount, date, mpesaReference, loanId, description
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/accrue-interest', async (req, res) => {
  try {
    const { year, month } = req.body;
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;
    const results = await transactionService.processMonthlyInterestAccruals(y, m);
    res.json({ accrued: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await transactionService.updateTransaction(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await transactionService.deleteTransaction(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
