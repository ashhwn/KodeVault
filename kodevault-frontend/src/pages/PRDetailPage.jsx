import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';

export default function PRDetailPage() {
  const { repoId, prId } = useParams();
  const [pr, setPr] = useState(null);
  const [diff, setDiff] = useState(null);
  const [error, setError] = useState('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    loadPR();
    loadDiff();
  }, [prId]);

  async function loadPR() {
    try {
      const res = await client.get(`/prs/item/${prId}`);
      setPr(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load PR');
    }
  }

  async function loadDiff() {
    try {
      const res = await client.get(`/prs/item/${prId}/diff`);
      setDiff(res.data);
    } catch (err) {
      // diff may fail if commits diverge oddly — non-fatal for viewing PR itself
    }
  }

  async function handleMerge() {
    setMerging(true);
    setError('');
    try {
      const res = await client.post(`/prs/item/${prId}/merge`);
      setPr(res.data);
    } catch (err) {
      if (err.response?.status === 409 && err.response.data.conflicts) {
        setError('Merge conflict — manual resolution required (see conflicting files below).');
        setPr((prev) => ({ ...prev, status: 'CONFLICT', conflicts: err.response.data.conflicts }));
      } else {
        setError(err.response?.data?.message || 'Merge failed');
      }
    } finally {
      setMerging(false);
    }
  }

  function renderHunks(hunks) {
    return hunks.map((hunk, i) => {
      const lines = hunk.value.split('\n').filter((l, idx, arr) => !(idx === arr.length - 1 && l === ''));
      const bg = hunk.added ? 'var(--success-bg)' : hunk.removed ? 'var(--danger-bg)' : 'transparent';
      const color = hunk.added ? 'var(--success)' : hunk.removed ? 'var(--danger)' : 'var(--text-secondary)';
      const prefix = hunk.added ? '+' : hunk.removed ? '−' : ' ';
      return lines.map((line, j) => (
        <div key={`${i}-${j}`} style={{ background: bg, color, padding: '1px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <span style={{ display: 'inline-block', width: 14 }}>{prefix}</span>{line}
        </div>
      ));
    });
  }

  if (error && !pr) return <Layout><p className="error-text">{error}</p></Layout>;
  if (!pr) return <Layout><p>Loading…</p></Layout>;

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h2 style={{ marginBottom: 0 }}>{pr.title}</h2>
        <span className={pr.status === 'MERGED' ? 'badge-success' : pr.status === 'CONFLICT' ? 'badge-danger' : 'badge-warn'}>
          {pr.status.toLowerCase()}
        </span>
      </div>
      <p className="mono" style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 20 }}>
        {pr.sourceBranch} → {pr.targetBranch}
      </p>

      {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}

      {pr.status === 'OPEN' && (
        <button onClick={handleMerge} disabled={merging} style={{ marginBottom: 20 }}>
          {merging ? 'Merging…' : 'Merge pull request'}
        </button>
      )}

      {pr.conflicts && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--danger)' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Conflicting files</div>
          {pr.conflicts.map((c) => (
            <div key={c.path} className="mono" style={{ fontSize: 12.5, color: 'var(--danger)' }}>{c.path}</div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            Manual resolution UI for choosing each file's final content isn't built yet — resolve via API for now.
          </p>
        </div>
      )}

      {diff && diff.files.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {diff.files.map((file) => (
            <div key={file.path} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--panel-dark)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 14px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{file.path}</span>
                <span style={{ opacity: 0.7 }}>{file.status}</span>
              </div>
              <div style={{ paddingTop: 6, paddingBottom: 6 }}>{renderHunks(file.hunks)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ color: 'var(--text-secondary)' }}>No changes to show.</div>
      )}
    </Layout>
  );
}