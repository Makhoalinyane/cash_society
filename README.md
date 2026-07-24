# Cash Society Management System

A full-stack application for managing a cash society's M-Pesa transactions, monthly contributions, loans, penalties, and year-end payouts.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** MySQL via XAMPP

## Society Rules (Built In)

| Rule | Details |
|------|---------|
| Monthly contribution | **M550** due on or before the **8th** of each month |
| Late penalty | **M275** (50% of M550) if paid after the 8th |
| Member savings | **M500** returned per month at year end (M50 stays in society) |
| Max loan | **M2000** per member |
| Loan interest | **15%** month 1 when taken; months **2–3** only if still unpaid **10–15 days after each 30-day period** (max 3) |
| Interest split | **10%** of loan amount returned to member + **5%** retained by society (per interest month) |
| Borrowing period | **January – September** |
| Repayment period | **October – December** (no new loans) |
| Interest rebate | Member receives **10%** of loan principal per interest month paid |
| Year-end payout | **(M500 × 12)** + interest rebate — **only if all outstanding cleared by 15 December** |
| Outstanding rule | Members owing anything receive **no year-end share** |
| Carry-forward | Next-year payments clear prior debt first; penalties continue as usual |

## Prerequisites

1. [XAMPP](https://www.apachefriends.org/) installed and running (Apache + MySQL)
2. [Node.js](https://nodejs.org/) v18 or later

## Setup Instructions

### 1. Start XAMPP MySQL

1. Open XAMPP Control Panel
2. Start **Apache** and **MySQL**
3. Open phpMyAdmin: http://localhost/phpmyadmin

### 2. Create the Database

1. In phpMyAdmin, go to **Import** or **SQL**
2. Run the schema file: `database/schema.sql`
   - Or paste its contents into the SQL tab and execute

This creates the `cash_society` database with tables for members, loans, transactions, and interest accruals.

### 3. Configure the Backend

```bash
cd backend
copy .env.example .env
npm install
```

Edit `backend/.env` if your MySQL credentials differ:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=cash_society
DB_PORT=3306
```

Start the API:

```bash
npm run dev
```

API runs at: http://localhost:5000

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:3000

## Features

- **Dashboard** — Society balance, outstanding loans, share-per-member if balance is distributed
- **Register Member** — Add members with phone and M-Pesa number
- **Member Records** — Full monthly transaction breakdown (Jan–Dec), balances, loan eligibility
- **Record Transactions** — Contributions, loans, repayments (with automatic late penalties)
- **Loan Eligibility** — Shows whether a member can borrow or must clear outstanding debt first
- **Year-End Payout Estimate** — M500 × months contributed + 10% interest rebate

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/members` | List all members |
| POST | `/api/members` | Register member |
| GET | `/api/members/:id/summary?year=2026` | Member full record |
| POST | `/api/transactions/contribution` | Record M550 contribution |
| POST | `/api/transactions/loan` | Disburse loan |
| POST | `/api/transactions/repayment` | Record loan repayment |
| GET | `/api/society/summary?year=2026` | Society financial summary |

## Project Structure

```
cash-society/
├── database/
│   └── schema.sql          # MySQL schema
├── backend/
│   ├── config/             # DB & constants
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── server.js
└── frontend/
    └── src/
        ├── pages/          # Dashboard, Members, etc.
        └── api.js          # API client
```

## Notes

- All transactions are recorded as M-Pesa payments with optional reference codes.
- Interest accrues automatically when a loan is disbursed (first month). Use the accrue-interest endpoint for subsequent months if needed.
- The system prevents duplicate contributions for the same month.
- Loans are blocked during October–December and when a member has outstanding debt.
