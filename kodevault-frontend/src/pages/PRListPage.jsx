import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import RepoTabs from '../components/RepoTabs';

export default function PRListPage() {
  const { repoId } = useParams();
  const [prs, setPrs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [title, setTitle] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadPRs();
    loadBranches();
  }, [repoId]);

  async function loadPRs() {
    try {
      const res = await client.get(`/prs/${repoId}`);
      setPrs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pull requests');
    }
  }

  async function loadBranches() {
    try {
      const res = await client.get(`/branches/${repoId}`);
      setBranches(res.data);
      if (res.data.length >= 2) {
        setSourceBranch(res.data[1].name);
        setTargetBranch(res.data[0].name);
      }
    } catch (err) {
      // non-fatal
    }
  }

  async function handleCreatePR(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post(`/prs/${repoId}`, { title, sourceBranch, targetBranch });
      setTitle('');
      loadPRs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create pull request');
    }
  }

  function statusBadgeClass(status) {
    if (status === 'MERGED') return 'badge-success';
    if (status === 'CONFLICT') return 'badge-danger';
    if (status === 'CLOSED') return 'badge-warn';
    return 'badge-warn';
  }

  return (
    <Layout>
      <h1>Pull requests</h1>
      <RepoTabs repoId={repoId} />

      {branches.length >= 2 && (
        <form onSubmit={handleCreatePR} className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }}
            >
              {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>into</span>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }}
            >
              {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Pull request title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <button type="submit" style={{ whiteSpace: 'nowrap' }}>Open PR</button>
          </div>
        </form>
      )}
      {error && <p className="error-text">{error}</p>}

      {prs.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-secondary)' }}>No pull requests yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {prs.map((pr) => (
            <Link
              key={pr.id}
              to={`/repos/${repoId}/prs/${pr.id}`}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{pr.title}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {pr.sourceBranch} → {pr.targetBranch}
                </div>
              </div>
              <span className={statusBadgeClass(pr.status)}>{pr.status.toLowerCase()}</span>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}