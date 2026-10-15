const prisma = require('../config/db');

async function loadIssueRepoAndAccess(req, res, next) {
  try {
    const issue = await prisma.issue.findUnique({ where: { id: req.params.issueId } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    req.params.repoId = issue.repoId; // let loadRepoAndAccess-style logic reuse below
    await attachAccess(req, res, next, issue.repoId);
  } catch (err) {
    next(err);
  }
}

async function loadPRRepoAndAccess(req, res, next) {
  try {
    const pr = await prisma.pullRequest.findUnique({ where: { id: req.params.prId } });
    if (!pr) return res.status(404).json({ message: 'PR not found' });
    req.params.repoId = pr.repoId;
    await attachAccess(req, res, next, pr.repoId);
  } catch (err) {
    next(err);
  }
}

async function attachAccess(req, res, next, repoId) {
  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    include: { collaborators: true },
  });
  if (!repo) return res.status(404).json({ message: 'Repo not found' });

  const isOwner = req.user && repo.ownerId === req.user.id;
  const collaboration = req.user
    ? repo.collaborators.find((c) => c.userId === req.user.id)
    : null;

  req.repo = repo;
  req.repoAccess = {
    isOwner,
    isCollaborator: !!collaboration,
    permission: isOwner ? 'WRITE' : collaboration?.permission || null,
  };
  next();
}

module.exports = { loadIssueRepoAndAccess, loadPRRepoAndAccess };