import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside
      style={{
        width: 200,
        minHeight: '100vh',
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--border)',
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Link to="/dashboard" style={{ textDecoration: 'none' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: 17, marginBottom: 24 }}>KodeVault</h2>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <Link
          to="/dashboard"
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Repositories
        </Link>
      </nav>

      {user && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, fontSize: 12.5 }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            <span className="mono">{user.username}</span>
          </div>
          <button className="secondary" onClick={logout} style={{ width: '100%', fontSize: 13 }}>
            Log out
          </button>
        </div>
      )}
    </aside>
  );
}