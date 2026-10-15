import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import CommitGraph from '../components/CommitGraph';
import Layout from '../components/Layout';
import RepoTabs from '../components/RepoTabs';

export default function RepoGraphPage() {
  const { repoId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get(`/commits/${repoId}/graph`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load graph'));
  }, [repoId]);

  return (
    <Layout>
      <h1>Commit graph</h1>
      <RepoTabs repoId={repoId} />

      {error && <p className="error-text">{error}</p>}
      {!error && !data && <p>Loading commit graph…</p>}
      {data && <CommitGraph data={data} />}
    </Layout>
  );
}