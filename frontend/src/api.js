const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api';
const ADMIN_KEY_STORAGE = 'cash_society_admin_key';
const DEFAULT_ADMIN_SECRET = 'cash-society-admin';

export function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

export function setAdminKey(key) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
}

export function clearAdminKey() {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

function isLocalHost() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function resolveAdminKey() {
  // Local PC: auto-allow admin writes
  if (isLocalHost()) return getAdminKey() || DEFAULT_ADMIN_SECRET;
  // Hosted site: only after admin unlock stores the key
  return getAdminKey();
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (method !== 'GET' && method !== 'HEAD') {
    const key = resolveAdminKey();
    if (key) headers['X-Admin-Key'] = key;
  }

  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  health: () => request('/health'),
  verifyAdmin: () => request('/admin/verify', { method: 'POST', body: '{}' }),

  getMembers: () => request('/members'),
  getMember: (id) => request(`/members/${id}`),
  getMemberSummary: (id, year) => request(`/members/${id}/summary?year=${year}`),
  registerMember: (data) => request('/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id, data) => request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getTransactions: (year) => request(`/transactions${year ? `?year=${year}` : ''}`),
  getMemberTransactions: (memberId, year) =>
    request(`/transactions/member/${memberId}${year ? `?year=${year}` : ''}`),

  recordContribution: (data) =>
    request('/transactions/contribution', { method: 'POST', body: JSON.stringify(data) }),
  recordPenalty: (data) =>
    request('/transactions/penalty', { method: 'POST', body: JSON.stringify(data) }),
  recordLoan: (data) =>
    request('/transactions/loan', { method: 'POST', body: JSON.stringify(data) }),
  recordRepayment: (data) =>
    request('/transactions/repayment', { method: 'POST', body: JSON.stringify(data) }),
  recordInterest: (data) =>
    request('/transactions/interest', { method: 'POST', body: JSON.stringify(data) }),
  recordPrincipal: (data) =>
    request('/transactions/principal', { method: 'POST', body: JSON.stringify(data) }),
  accrueInterest: (year, month) =>
    request('/transactions/accrue-interest', { method: 'POST', body: JSON.stringify({ year, month }) }),
  updateTransaction: (id, data) =>
    request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) =>
    request(`/transactions/${id}`, { method: 'DELETE' }),

  getSocietySummary: (year) => request(`/society/summary?year=${year}`),
  getSocietyRules: () => request('/society/rules'),
};

export function formatMoney(amount) {
  return `M${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const TRANSACTION_LABELS = {
  contribution: 'Contribution',
  late_penalty: 'Late Penalty',
  loan_disbursement: 'Loan Disbursement',
  loan_repayment: 'Loan Repayment',
  interest_payment: 'Interest Payment',
  savings_return: 'Savings Return',
  interest_rebate: 'Interest Rebate',
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
