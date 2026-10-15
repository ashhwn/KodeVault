const prisma = require('../config/db');

// GET /api/branches/:repoId
async function listBranches(req, res, next) {
  try {
    const branches = await prisma.branch.findMany({
      where: { repoId: req.params.repoId },
    });
    res.json(branches);
  } catch (err) {
    next(err);
  }
}

// POST /api/branches/:repoId
// body: { name, fromBranch }  -> new branch points at fromBranch's current head
async function createBranch(req, res, next) {
  try {
    const { name, fromBranch } = req.body;
    if (!name || !fromBranch) {
      return res.status(400).json({ message: 'name and fromBranch are required' });
    }

    const source = await prisma.branch.findUnique({
      where: { repoId_name: { repoId: req.params.repoId, name: fromBranch } },
    });
    if (!source) return res.status(404).json({ message: 'Source branch not found' });

    const branch = await prisma.branch.create({
      data: {
        name,
        repoId: req.params.repoId,
        headHash: source.headHash,
      },
    });

    res.status(201).json(branch);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'A branch with this name already exists' });
    }
    next(err);
  }
}

// DELETE /api/branches/:repoId/:branchName
async function deleteBranch(req, res, next) {
  try {
    const { repoId, branchName } = req.params;

    if (branchName === req.repo.defaultBranch) {
      return res.status(400).json({ message: "Can't delete the default branch" });
    }

    await prisma.branch.delete({
      where: { repoId_name: { repoId, name: branchName } },
    });

    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Branch not found' });
    }
    next(err);
  }
}

module.exports = { listBranches, createBranch, deleteBranch };