import { useState } from 'react';
import client from '../api/client';

export default function DeployModal({ repoId, branchName, onClose }) {
  const [vercelToken, setVercelToken] = useState('');
  const [projectName, setProjectName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | deploying | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleDeploy(e) {
    e.preventDefault();
    setStatus('deploying');
    setError('');
    try {
      const res = await client.post(`/deploy/${repoId}`, {
        branchName,
        vercelToken,
        projectName,
      });
      setResult(res.data);
      setStatus('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Deployment failed');
      setStatus('error');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>Deploy {branchName}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 18 }}>
          Deploys this branch as a static/serverless site via Vercel.
        </p>

        {status === 'success' ? (
          <div>
            <p style={{ fontSize: 14 }}>🎉 Live at:</p>
            <a href={result.url} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 14 }}>
              {result.url}
            </a>
            <div style={{ marginTop: 20 }}>
              <button className="secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeploy}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              PROJECT NAME
            </label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-kodevault-app"
              required
              style={{ marginTop: 4, marginBottom: 14 }}
            />

            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              VERCEL ACCESS TOKEN
            </label>
            <input
              type="password"
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              placeholder="Paste your Vercel token"
              required
              style={{ marginTop: 4, marginBottom: 6 }}
            />
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 0, marginBottom: 18 }}>
              Only used for this deploy — never stored. Create one at vercel.com/account/tokens.
            </p>

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={status === 'deploying'}>
                {status === 'deploying' ? 'Deploying…' : 'Deploy'}
              </button>
              <button type="button" className="secondary" onClick={onClose}>
                Cancel
              </button>
              
            </div>
          </form>
        )}
      </div>
    </div>
  );
}