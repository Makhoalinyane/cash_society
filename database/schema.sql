-- Cash Society Database Schema
-- Run this in phpMyAdmin (XAMPP) or MySQL CLI

CREATE DATABASE IF NOT EXISTS cash_society;
USE cash_society;

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  mpesa_number VARCHAR(20) NOT NULL,
  email VARCHAR(150) DEFAULT NULL,
  joined_date DATE NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_phone (phone),
  UNIQUE KEY uk_mpesa (mpesa_number)
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  principal_amount DECIMAL(10, 2) NOT NULL,
  interest_rate DECIMAL(5, 4) DEFAULT 0.1500,
  interest_months INT DEFAULT 3,
  loan_date DATE NOT NULL,
  loan_month INT NOT NULL,
  loan_year INT NOT NULL,
  mpesa_reference VARCHAR(50) DEFAULT NULL,
  status ENUM('active', 'paid', 'defaulted') DEFAULT 'active',
  total_interest_charged DECIMAL(10, 2) DEFAULT 0,
  total_interest_paid DECIMAL(10, 2) DEFAULT 0,
  total_principal_paid DECIMAL(10, 2) DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member_status (member_id, status)
);

-- Transactions table (all M-Pesa transactions)
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  loan_id INT DEFAULT NULL,
  transaction_type ENUM(
    'contribution',
    'late_penalty',
    'loan_disbursement',
    'loan_repayment',
    'interest_payment',
    'savings_return',
    'interest_rebate'
  ) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_month INT NOT NULL,
  transaction_year INT NOT NULL,
  mpesa_reference VARCHAR(50) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  is_late TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL,
  INDEX idx_member_date (member_id, transaction_year, transaction_month),
  INDEX idx_type (transaction_type)
);

-- Monthly interest accrual tracking per loan
CREATE TABLE IF NOT EXISTS loan_interest_accruals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  member_id INT NOT NULL,
  accrual_month INT NOT NULL,
  accrual_year INT NOT NULL,
  interest_amount DECIMAL(10, 2) NOT NULL,
  is_paid TINYINT(1) DEFAULT 0,
  paid_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE KEY uk_loan_month (loan_id, accrual_year, accrual_month)
);
