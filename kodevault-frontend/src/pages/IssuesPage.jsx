import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import RepoTabs from '../components/RepoTabs';

export default function IssuesPage() {
  const { repoId } = useParams();
  const [issues, setIssues] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    loadIssues();
  }, [repoId]);

  async function loadIssues() {
    try {
      const res = await client.get(`/issues/${repoId}`);
      setIssues(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load issues');
    }
  }

  async function handleCreateIssue(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post(`/issues/${repoId}`, { title, description });
      setTitle('');
      setDescription('');
      loadIssues();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create issue');
    }
  }

  async function handleClose(issueId) {
    try {
      await client.patch(`/issues/item/${issueId}/close`);
      loadIssues();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close issue');
    }
  }

  const visibleIssues = issues.filter((i) => (showClosed ? true : i.status === 'OPEN'));

  return (
    <Layout>
      <h1>Issues</h1>
      <RepoTabs repoId={repoId} />

      <form onSubmit={handleCreateIssue} className="card" style={{ marginBottom: 24 }}>
        <input
          placeholder="Issue title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ marginBottom: 10 }}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            padding: '9px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            marginBottom: 12,
            resize: 'vertical',
          }}
        />
        <button type="submit">Open issue</button>
      </form>
      {error && <p className="error-text">{error}</p>}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Show closed issues
        </label>
      </div>

      {visibleIssues.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-secondary)' }}>No issues to show.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {visibleIssues.map((issue) => (
            <div key={issue.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{issue.title}</div>
                {issue.description && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>{issue.description}</div>
                )}
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                  opened by {issue.author?.username}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={issue.status === 'OPEN' ? 'badge-warn' : 'badge-success'}>
                  {issue.status.toLowerCase()}
                </span>
                {issue.status === 'OPEN' && (
                  <button className="secondary" onClick={() => handleClose(issue.id)} style={{ fontSize: 12, padding: '5px 10px' }}>
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}