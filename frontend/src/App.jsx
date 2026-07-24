import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MemberDetail from './pages/MemberDetail';
import RegisterMember from './pages/RegisterMember';
import Transactions from './pages/Transactions';
import RecordTransaction from './pages/RecordTransaction';
import { useIsViewOnly, useAppLink } from './viewMode';
import { api, getAdminKey, setAdminKey, clearAdminKey } from './api';

function isLocalHost() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function AdminUnlock() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function unlock(e) {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      setAdminKey(key.trim());
      await api.verifyAdmin();
      window.location.reload();
    } catch (err) {
      clearAdminKey();
      setError(err.message || 'Invalid admin key');
      setChecking(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Admin unlock</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Enter the admin key to record or edit. Members should open the <code>/view</code> link instead.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={unlock}>
        <label className="form-group">
          <span>Admin key</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin key"
            required
            autoFocus
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={checking} style={{ marginTop: '1rem' }}>
          {checking ? 'Checking…' : 'Unlock admin'}
        </button>
      </form>
    </div>
  );
}

function AppShell({ children }) {
  const viewOnly = useIsViewOnly();
  const link = useAppLink();
  const location = useLocation();
  const needsUnlock = !viewOnly && !isLocalHost();
  const [adminReady, setAdminReady] = useState(!needsUnlock || Boolean(getAdminKey()));

  useEffect(() => {
    if (!needsUnlock) {
      setAdminReady(true);
      return;
    }
    if (!getAdminKey()) {
      setAdminReady(false);
      return;
    }
    api.verifyAdmin()
      .then(() => setAdminReady(true))
      .catch(() => {
        clearAdminKey();
        setAdminReady(false);
      });
  }, [needsUnlock, location.pathname]);

  return (
    <div className={`app-layout ${viewOnly ? 'view-only' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Cash Society</h1>
          <p>{viewOnly ? 'Member view · read only' : 'M-Pesa transaction records'}</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to={link('/')} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to={link('/members')} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Members
          </NavLink>
          {viewOnly ? (
            <NavLink to={link('/transactions')} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Transactions
            </NavLink>
          ) : (
            <>
              <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Register Member
              </NavLink>
              <NavLink to="/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Transactions
              </NavLink>
              <NavLink to="/record" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Record Transaction
              </NavLink>
            </>
          )}
        </nav>
      </aside>
      <main className="main-content">
        {needsUnlock && !adminReady ? <AdminUnlock /> : children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/members/:id" element={<MemberDetail />} />
        <Route path="/register" element={<RegisterMember />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/record" element={<RecordTransaction />} />

        <Route path="/view" element={<Dashboard />} />
        <Route path="/view/members" element={<Members />} />
        <Route path="/view/members/:id" element={<MemberDetail />} />
        <Route path="/view/transactions" element={<Transactions />} />
      </Routes>
    </AppShell>
  );
}

export default App;
