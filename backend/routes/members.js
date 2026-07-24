const express = require('express');
const pool = require('../config/db');
const transactionService = require('../services/transactionService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM members ORDER BY full_name ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/summary', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const summary = await transactionService.getMemberSummary(req.params.id, year);
    if (!summary) return res.status(404).json({ error: 'Member not found' });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fullName, phone, mpesaNumber, email, joinedDate } = req.body;
    if (!fullName || !phone || !mpesaNumber) {
      return res.status(400).json({ error: 'fullName, phone, and mpesaNumber are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO members (full_name, phone, mpesa_number, email, joined_date)
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, phone, mpesaNumber, email || null, joinedDate || new Date().toISOString().split('T')[0]]
    );
    const [member] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    res.status(201).json(member[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Phone or M-Pesa number already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { fullName, phone, mpesaNumber, email, isActive } = req.body;
    await pool.query(
      `UPDATE members SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone),
       mpesa_number = COALESCE(?, mpesa_number), email = COALESCE(?, email),
       is_active = COALESCE(?, is_active) WHERE id = ?`,
      [fullName, phone, mpesaNumber, email, isActive, req.params.id]
    );
    const [member] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (member.length === 0) return res.status(404).json({ error: 'Member not found' });
    res.json(member[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
