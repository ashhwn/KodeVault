import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 400,
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: 360, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, letterSpacing: '-0.01em' }}>
            KodeVault
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>Log in to continue</div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 26,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginTop: 6, marginBottom: 16, background: 'rgba(255,255,255,0.03)' }}
          />
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginTop: 6, marginBottom: 22, background: 'rgba(255,255,255,0.03)' }}
          />
          {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '11px',
              fontSize: 14,
              background: 'linear-gradient(135deg, var(--accent), #7c86e8)',
            }}
          >
            Log in
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 20 }}>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}