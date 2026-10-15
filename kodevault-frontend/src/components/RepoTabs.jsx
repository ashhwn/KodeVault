import { NavLink } from 'react-router-dom';

export default function RepoTabs({ repoId }) {
  const tabs = [
    { label: 'Code', path: `/repos/${repoId}` },
    { label: 'Pull requests', path: `/repos/${repoId}/prs` },
    { label: 'Issues', path: `/repos/${repoId}/issues` },
    { label: 'Graph', path: `/repos/${repoId}/graph` },
  ];

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end
          style={({ isActive }) => ({
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            background: isActive ? 'var(--panel-dark)' : 'transparent',
            color: isActive ? '#fff' : 'var(--text-secondary)',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}