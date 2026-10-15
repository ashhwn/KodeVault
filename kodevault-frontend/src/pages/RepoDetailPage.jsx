import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import RepoTabs from '../components/RepoTabs';
import DeployModal from '../components/DeployModal';

export default function RepoDetailPage() {
  const { repoId } = useParams();
  const [repo, setRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [tree, setTree] = useState(null);
  const [error, setError] = useState('');
  const [showDeploy, setShowDeploy] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);

  useEffect(() => {
    loadRepo();
    loadBranches();
  }, [repoId]);

  useEffect(() => {
    if (selectedBranch) loadTree();
  }, [selectedBranch]);

  async function loadRepo() {
    try {
      const res = await client.get(`/repos/${repoId}`);
      setRepo(res.data);
      setSelectedBranch(res.data.defaultBranch);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load repo');
    }
  }

  async function loadBranches() {
    try {
      const res = await client.get(`/branches/${repoId}`);
      setBranches(res.data);
    } catch (err) {
      // non-fatal
    }
  }

  async function loadTree() {
    try {
      const history = await client.get(`/commits/${repoId}/history/${selectedBranch}`);
      const latestCommit = history.data[0];
      if (!latestCommit) return;
      const res = await client.get(`/commits/${repoId}/tree/${latestCommit.hash}`);
      setTree(res.data.tree);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    }
  }

  async function handleCreateBranch(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post(`/branches/${repoId}`, {
        name: newBranchName,
        fromBranch: selectedBranch,
      });
      setNewBranchName('');
      setShowBranchInput(false);
      await loadBranches();
      setSelectedBranch(newBranchName);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create branch');
    }
  }

  if (error && !repo) return <Layout><p className="error-text">{error}</p></Layout>;
  if (!repo) return <Layout><p>Loading…</p></Layout>;

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ marginBottom: 0 }}>{repo.name}</h1>
        <span className={repo.visibility === 'PRIVATE' ? 'badge-danger' : 'badge-success'}>
          {repo.visibility === 'PRIVATE' ? 'Private' : 'Public'}
        </span>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 18 }}>
        {repo.description || 'No description'}
      </p>

      <RepoTabs repoId={repoId} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            padding: '7px 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            width: 'auto',
          }}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>

        <button className="secondary" onClick={() => setShowBranchInput((v) => !v)}>
          New branch
        </button>

        <Link to={`/repos/${repoId}/commit`}>
          <button className="secondary">New commit</button>
        </Link>
        <button onClick={() => setShowDeploy(true)}>Deploy</button>
      </div>

      {showBranchInput && (
        <form onSubmit={handleCreateBranch} style={{ display: 'flex', gap: 8, marginBottom: 18, maxWidth: 400 }}>
          <input
            className="mono"
            placeholder={`new branch from ${selectedBranch}`}
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            required
          />
          <button type="submit" style={{ whiteSpace: 'nowrap' }}>Create</button>
        </form>
      )}

      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="panel-dark">
        {tree && tree.entries.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tree.entries.map((entry) => (
              <div key={entry.hash} className="mono" style={{ fontSize: 13 }}>
                {entry.type === 'tree' ? '📁' : '📄'} {entry.name}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0 }}>No files yet on this branch.</p>
        )}
      </div>

      {showDeploy && (
        <DeployModal repoId={repoId} branchName={selectedBranch} onClose={() => setShowDeploy(false)} />
      )}
    </Layout>
  );
}