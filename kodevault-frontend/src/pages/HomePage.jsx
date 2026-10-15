import { Link } from 'react-router-dom';

const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

function DiffIcon({ color }) {
  return (
    <svg {...iconProps} stroke={color}>
      <path d="M6 3v12a3 3 0 0 0 3 3h12" />
      <path d="M18 3v12a3 3 0 0 1-3 3H3" />
    </svg>
  );
}
function MergeIcon({ color }) {
  return (
    <svg {...iconProps} stroke={color}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 9v6" />
      <path d="M18 15a9 9 0 0 0-9-9" />
    </svg>
  );
}
function LockIcon({ color }) {
  return (
    <svg {...iconProps} stroke={color}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: -80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 400,
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>KodeVault</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: 13.5, fontWeight: 500 }}>
            Log in
          </Link>
          <Link to="/signup">
            <button>Sign up free</button>
          </Link>
        </div>
      </header>

      <div style={{ padding: '72px 40px 16px', textAlign: 'center', position: 'relative' }}>
        <h1 style={{ fontSize: 40, lineHeight: 1.15, marginBottom: 14 }}>
          Built for
          <br />
          fast-moving code
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 28px' }}>
          Content-addressable storage and real 3-way merges — branch, merge, ship, without the friction.
        </p>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 40px', position: 'relative' }}>
        <div className="panel-dark" style={{ padding: '28px 24px' }}>
          <svg width="100%" height="120" viewBox="0 0 460 120">
            <path d="M20,60 C60,60 60,60 100,60" stroke="var(--panel-dark-border)" strokeWidth="2" fill="none" />
            <path d="M100,60 C140,60 140,30 180,30" stroke="var(--panel-dark-border)" strokeWidth="2" fill="none" />
            <path d="M100,60 C140,60 140,90 180,90" stroke="var(--panel-dark-border)" strokeWidth="2" fill="none" />
            <path d="M180,30 C220,30 220,60 260,60" stroke="var(--panel-dark-border)" strokeWidth="2" fill="none" />
            <path d="M180,90 C220,90 220,60 260,60" stroke="var(--panel-dark-border)" strokeWidth="2" fill="none" />
            <path d="M260,60 C300,60 300,60 340,60" stroke="var(--panel-dark-border)" strokeWidth="2" fill="none" />
            <path d="M340,60 C370,60 370,60 400,60" stroke="var(--panel-dark-border)" strokeWidth="2" fill="none" />
            <circle cx="20" cy="60" r="5" fill="var(--accent)" />
            <circle cx="100" cy="60" r="5" fill="var(--accent)" />
            <circle cx="180" cy="30" r="5" fill="var(--accent)" />
            <circle cx="180" cy="90" r="5" fill="var(--danger)" />
            <circle cx="260" cy="60" r="5" fill="var(--success)" />
            <circle cx="340" cy="60" r="5" fill="var(--accent)" />
            <circle cx="400" cy="60" r="5" fill="var(--accent)" />
            <text x="180" y="12" fill="var(--text-muted)" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono, monospace">feature/merge</text>
            <text x="20" y="80" fill="var(--text-muted)" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono, monospace">main</text>
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', padding: '40px 40px 20px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 10, width: 200 }}>
          <DiffIcon color="var(--accent)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Real diffs</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Line-by-line, always accurate</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, width: 200 }}>
          <MergeIcon color="var(--success)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Smart merges</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Conflicts caught, not guessed</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, width: 200 }}>
          <LockIcon color="var(--danger)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Private repos</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Invite collaborators you trust</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 40px 80px', position: 'relative' }}>
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 20,
          }}
        >
          <div className="card" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>100%</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>real content-addressable storage — not a mock</div>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>3-way</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>merge algorithm with real conflict detection</div>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>1-click</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>deploy straight to Vercel from any branch</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <h2 style={{ fontSize: 26, marginBottom: 10 }}>Ready to see your history clearly?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 22 }}>
            Free to start. No credit card.
          </p>
          <Link to="/signup">
            <button style={{ padding: '11px 26px', fontSize: 14 }}>Create your first repo</button>
          </Link>
        </div>
      </div>
    </div>
  );
}