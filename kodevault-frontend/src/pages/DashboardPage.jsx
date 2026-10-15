import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function DashboardPage() {
  const { user } = useAuth();
  const [repos, setRepos] = useState([]);
  const [newRepoName, setNewRepoName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    try {
      const res = await client.get(`/repos/user/${user.username}`);
      setRepos(res.data.repos);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load repos');
    }
  }

  async function handleCreateRepo(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/repos', { name: newRepoName });
      setNewRepoName('');
      loadRepos();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create repo');
    }
  }

  return (
    <Layout>
      <h1>Your repos</h1>

      <form
        onSubmit={handleCreateRepo}
        style={{ display: 'flex', gap: 8, margin: '20px 0 32px', maxWidth: 420 }}
      >
        <input
          placeholder="New repo name"
          value={newRepoName}
          onChange={(e) => setNewRepoName(e.target.value)}
          required
        />
        <button
          type="submit"
          style={{ whiteSpace: 'nowrap', background: 'linear-gradient(135deg, var(--accent), #7c86e8)' }}
        >
          Create repo
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      {repos.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)' }}>
          No repos yet — create your first one above.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {repos.map((repo) => (
            <Link
              key={repo.id}
              to={`/repos/${repo.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px 20px',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
                  {repo.name}
                </div>
                {repo.description && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                    {repo.description}
                  </div>
                )}
              </div>
              <span className={repo.visibility === 'PRIVATE' ? 'badge-danger' : 'badge-success'}>
                {repo.visibility === 'PRIVATE' ? 'Private' : 'Public'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}