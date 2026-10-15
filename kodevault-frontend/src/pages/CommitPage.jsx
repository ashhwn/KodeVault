import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import RepoTabs from '../components/RepoTabs';

export default function CommitPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [branchName, setBranchName] = useState('main');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([{ path: '', content: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateFile(index, field, value) {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  function addFileRow() {
    setFiles((prev) => [...prev, { path: '', content: '' }]);
  }

  function removeFileRow(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCommit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const cleanFiles = files.filter((f) => f.path.trim() !== '');
      await client.post(`/commits/${repoId}`, {
        branchName,
        message,
        files: cleanFiles,
      });
      navigate(`/repos/${repoId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Commit failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <h1>New commit</h1>
      <RepoTabs repoId={repoId} />

      <form onSubmit={handleCommit} className="card">
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>BRANCH</label>
        <input
          className="mono"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          style={{ marginTop: 4, marginBottom: 14, maxWidth: 200 }}
        />

        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>COMMIT MESSAGE</label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          style={{ marginTop: 4, marginBottom: 18 }}
        />

        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>FILES</label>
        {files.map((file, i) => (
          <div key={i} style={{ marginTop: 8, marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <input
              className="mono"
              placeholder="path/to/file.js"
              value={file.path}
              onChange={(e) => updateFile(i, 'path', e.target.value)}
              style={{ marginBottom: 8 }}
            />

            <input
              type="file"
              onChange={async (e) => {
                const selected = e.target.files[0];
                if (!selected) return;
                const text = await selected.text();
                updateFile(i, 'content', text);
                if (!file.path) updateFile(i, 'path', selected.name);
              }}
              style={{ marginBottom: 8, fontSize: 12.5 }}
            />

            <textarea
              className="mono"
              placeholder="file contents (or choose a file above)"
              value={file.content}
              onChange={(e) => updateFile(i, 'content', e.target.value)}
              rows={5}
              style={{
                width: '100%',
                fontSize: 12.5,
                padding: '9px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                resize: 'vertical',
              }}
            />
            {files.length > 1 && (
              <button
                type="button"
                className="secondary"
                onClick={() => removeFileRow(i)}
                style={{ marginTop: 8, fontSize: 12, padding: '5px 10px' }}
              >
                Remove file
              </button>
            )}
          </div>
        ))}
        <button type="button" className="secondary" onClick={addFileRow} style={{ marginTop: 4, marginBottom: 18 }}>
          + Add another file
        </button>

        {error && <p className="error-text">{error}</p>}

        <div>
          <button type="submit" disabled={saving}>
            {saving ? 'Committing…' : 'Commit'}
          </button>
        </div>
      </form>
    </Layout>
  );
}