const prisma = require('../config/db');
const { hashTreeEntries, hashCommit } = require('../utils/hash');

// POST /api/repos
async function createRepo(req, res, next) {
  try {
    const { name, description, visibility } = req.body;
    if (!name) return res.status(400).json({ message: 'Repo name is required' });

    const existing = await prisma.repo.findFirst({ where: { ownerId: req.user.id, name } });
    if (existing) {
      return res.status(409).json({ message: 'You already have a repo with this name' });
    }

    const emptyTreeHash = hashTreeEntries([]);
    const timestamp = Date.now();
    const initialCommitHash = hashCommit({
      tree: emptyTreeHash,
      parents: [],
      message: 'Initial commit',
      authorId: req.user.id,
      timestamp,
    });

    // Sequential writes instead of an interactive $transaction — Neon's
    // free-tier compute can suspend/wake mid-transaction and drop the
    // connection Prisma's interactive transactions depend on. This trades
    // strict atomicity (a crash between steps could theoretically leave a
    // repo without a branch) for reliability, which is the right call here.
    const newRepo = await prisma.repo.create({
      data: {
        name,
        description: description || '',
        visibility: visibility === 'private' ? 'PRIVATE' : 'PUBLIC',
        ownerId: req.user.id,
      },
    });

    await prisma.tree.upsert({
      where: { hash: emptyTreeHash },
      update: {},
      create: { hash: emptyTreeHash, entries: [] },
    });

    await prisma.commit.upsert({
      where: { hash: initialCommitHash },
      update: {},
      create: {
        hash: initialCommitHash,
        repoId: newRepo.id,
        treeHash: emptyTreeHash,
        message: 'Initial commit',
        authorId: req.user.id,
      },
    });

    await prisma.branch.create({
      data: { name: newRepo.defaultBranch, repoId: newRepo.id, headHash: initialCommitHash },
    });

    res.status(201).json(newRepo);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'You already have a repo with this name' });
    }
    next(err);
  }
}

// GET /api/repos/:id
async function getRepo(req, res, next) {
  try {
    const repo = await prisma.repo.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        collaborators: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
      },
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });
    res.json(repo);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/repos/:id
async function updateRepo(req, res, next) {
  try {
    if (!req.repoAccess.isOwner) {
      return res.status(403).json({ message: 'Only the owner can edit repo settings' });
    }

    const { name, description, visibility } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (visibility !== undefined) data.visibility = visibility === 'private' ? 'PRIVATE' : 'PUBLIC';

    const updated = await prisma.repo.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'You already have a repo with this name' });
    }
    next(err);
  }
}

// DELETE /api/repos/:id
async function deleteRepo(req, res, next) {
  try {
    if (!req.repoAccess.isOwner) {
      return res.status(403).json({ message: 'Only the owner can delete this repo' });
    }
    await prisma.repo.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/repos/user/:username
async function listUserRepos(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isSelf = req.user && req.user.id === user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);

    const repos = await prisma.repo.findMany({
      where: { ownerId: user.id, ...(isSelf ? {} : { visibility: 'PUBLIC' }) },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    res.json({ repos, page, pageSize });
  } catch (err) {
    next(err);
  }
}

// POST /api/repos/:id/star
async function toggleStar(req, res, next) {
  try {
    const repoId = req.params.id;
    try {
      await prisma.repoStar.create({ data: { repoId, userId: req.user.id } });
      await prisma.repo.update({ where: { id: repoId }, data: { starCount: { increment: 1 } } });
      const updated = await prisma.repo.findUnique({ where: { id: repoId } });
      return res.json({ starred: true, starCount: updated.starCount });
    } catch (err) {
      if (err.code !== 'P2002') throw err;
    }

    await prisma.repoStar.delete({
      where: { repoId_userId: { repoId, userId: req.user.id } },
    });
    await prisma.repo.update({ where: { id: repoId }, data: { starCount: { decrement: 1 } } });
    const updated = await prisma.repo.findUnique({ where: { id: repoId } });
    res.json({ starred: false, starCount: updated.starCount });
  } catch (err) {
    next(err);
  }
}

// GET /api/repos/users/search?q=...
async function searchUsers(req, res, next) {
  try {
    const q = req.query.q || '';
    if (q.length < 2) return res.json([]);

    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: 'insensitive' } },
      select: { id: true, username: true, avatarUrl: true },
      take: 10,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// GET /api/repos/:id/collaborators
async function listCollaborators(req, res, next) {
  try {
    const collaborators = await prisma.repoCollaborator.findMany({
      where: { repoId: req.params.id },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.json(collaborators);
  } catch (err) {
    next(err);
  }
}

// POST /api/repos/:id/collaborators
async function addCollaborator(req, res, next) {
  try {
    if (!req.repoAccess.isOwner) {
      return res.status(403).json({ message: 'Only the owner can add collaborators' });
    }

    const { userId, permission } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (userId === req.repo.ownerId) {
      return res.status(400).json({ message: 'Owner is already implicitly a collaborator' });
    }

    const collaborator = await prisma.repoCollaborator.create({
      data: { repoId: req.params.id, userId, permission: permission === 'read' ? 'READ' : 'WRITE' },
    });

    res.status(201).json(collaborator);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Already a collaborator' });
    }
    next(err);
  }
}

// DELETE /api/repos/:id/collaborators/:userId
async function removeCollaborator(req, res, next) {
  try {
    if (!req.repoAccess.isOwner) {
      return res.status(403).json({ message: 'Only the owner can remove collaborators' });
    }

    await prisma.repoCollaborator.delete({
      where: { repoId_userId: { repoId: req.params.id, userId: req.params.userId } },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Collaborator not found' });
    }
    next(err);
  }
}

// POST /api/repos/:id/fork
async function forkRepo(req, res, next) {
  try {
    const sourceRepo = req.repo;

    if (sourceRepo.visibility === 'PRIVATE' && !req.repoAccess.isOwner) {
      return res.status(403).json({ message: 'Private repos can only be forked by their owner' });
    }
    if (sourceRepo.ownerId === req.user.id) {
      return res.status(400).json({ message: "You can't fork your own repo" });
    }

    const alreadyForked = await prisma.repo.findFirst({
      where: { ownerId: req.user.id, forkedFromId: sourceRepo.id },
    });
    if (alreadyForked) {
      return res.status(409).json({ message: 'You already forked this repo' });
    }

    const sourceBranches = await prisma.branch.findMany({ where: { repoId: sourceRepo.id } });
    if (sourceBranches.length === 0) {
      return res.status(500).json({ message: 'Source repo has no branches' });
    }

    const newRepo = await prisma.repo.create({
      data: {
        name: sourceRepo.name,
        description: sourceRepo.description,
        visibility: sourceRepo.visibility,
        defaultBranch: sourceRepo.defaultBranch,
        ownerId: req.user.id,
        forkedFromId: sourceRepo.id,
      },
    });

    await prisma.branch.createMany({
      data: sourceBranches.map((b) => ({
        name: b.name,
        repoId: newRepo.id,
        headHash: b.headHash,
      })),
    });

    res.status(201).json(newRepo);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'You already have a repo with this name' });
    }
    next(err);
  }
}

module.exports = {
  createRepo,
  getRepo,
  updateRepo,
  deleteRepo,
  listUserRepos,
  toggleStar,
  searchUsers,
  listCollaborators,
  addCollaborator,
  removeCollaborator,
  forkRepo,
};