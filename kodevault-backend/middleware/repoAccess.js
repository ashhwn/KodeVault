const prisma = require('../config/db');

/**
 * Attaches req.repo and req.repoAccess ({ isOwner, isCollaborator, permission }).
 * Use `requireRead` for any endpoint that reads repo data, `requireWrite` for
 * anything that creates commits/branches/merges. This is the check that was
 * missing everywhere except getRepo — every repo-scoped route needs one of these.
 */
async function loadRepoAndAccess(req, res, next) {
  try {
    const repoId = req.params.repoId || req.params.id;
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
  } catch (err) {
    next(err);
  }
}

function requireRead(req, res, next) {
  const { isOwner, isCollaborator } = req.repoAccess;
  if (req.repo.visibility === 'PUBLIC' || isOwner || isCollaborator) {
    return next();
  }
  return res.status(403).json({ message: 'You do not have access to this repo' });
}

function requireWrite(req, res, next) {
  const { isOwner, permission } = req.repoAccess;
  if (isOwner || permission === 'WRITE') {
    return next();
  }
  return res.status(403).json({ message: 'You do not have write access to this repo' });
}

module.exports = { loadRepoAndAccess, requireRead, requireWrite };