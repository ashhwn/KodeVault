const prisma = require('../config/db');
const { diffCommits } = require('../utils/diff');
const { findCommonAncestor, threeWayMerge } = require('../utils/merge');
const { hashTreeEntries, hashCommit } = require('../utils/hash');

// POST /api/prs/:repoId
async function createPR(req, res, next) {
  try {
    const { title, description, sourceBranch, targetBranch } = req.body;
    if (!title || !sourceBranch || !targetBranch) {
      return res.status(400).json({ message: 'title, sourceBranch, targetBranch are required' });
    }
    if (sourceBranch === targetBranch) {
      return res.status(400).json({ message: 'sourceBranch and targetBranch must be different' });
    }

    const repoId = req.params.repoId;

    const source = await prisma.branch.findUnique({
      where: { repoId_name: { repoId, name: sourceBranch } },
    });
    const target = await prisma.branch.findUnique({
      where: { repoId_name: { repoId, name: targetBranch } },
    });
    if (!source || !target) {
      return res.status(404).json({ message: 'One or both branches not found' });
    }

    const pr = await prisma.pullRequest.create({
      data: {
        repoId,
        title,
        description: description || '',
        authorId: req.user.id,
        sourceBranch,
        targetBranch,
        sourceCommit: source.headHash,
        targetCommit: target.headHash,
      },
    });

    res.status(201).json(pr);
  } catch (err) {
    next(err);
  }
}

// GET /api/prs/:repoId
async function listPRs(req, res, next) {
  try {
    const prs = await prisma.pullRequest.findMany({
      where: { repoId: req.params.repoId },
      include: { author: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(prs);
  } catch (err) {
    next(err);
  }
}

// GET /api/prs/item/:prId
async function getPR(req, res, next) {
  try {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: req.params.prId },
      include: {
        author: { select: { id: true, username: true } },
        comments: { include: { author: { select: { id: true, username: true } } } },
      },
    });
    if (!pr) return res.status(404).json({ message: 'PR not found' });
    res.json(pr);
  } catch (err) {
    next(err);
  }
}

// POST /api/prs/item/:prId/comments
async function addComment(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const comment = await prisma.pRComment.create({
      data: {
        prId: req.params.prId,
        authorId: req.user.id,
        text,
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

// GET /api/prs/item/:prId/diff
async function getPRDiff(req, res, next) {
  try {
    const pr = await prisma.pullRequest.findUnique({ where: { id: req.params.prId } });
    if (!pr) return res.status(404).json({ message: 'PR not found' });

    const diff = await diffCommits(pr.targetCommit, pr.sourceCommit, pr.repoId);
    res.json(diff);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ message: err.message });
    next(err);
  }
}

// PATCH /api/prs/item/:prId/sync
async function syncPR(req, res, next) {
  try {
    const pr = await prisma.pullRequest.findUnique({ where: { id: req.params.prId } });
    if (!pr) return res.status(404).json({ message: 'PR not found' });
    if (pr.status !== 'OPEN') {
      return res.status(400).json({ message: `PR is ${pr.status.toLowerCase()}, cannot sync` });
    }

    const [source, target] = await Promise.all([
      prisma.branch.findUnique({ where: { repoId_name: { repoId: pr.repoId, name: pr.sourceBranch } } }),
      prisma.branch.findUnique({ where: { repoId_name: { repoId: pr.repoId, name: pr.targetBranch } } }),
    ]);
    if (!source || !target) {
      return res.status(404).json({ message: 'One or both branches no longer exist' });
    }

    const updated = await prisma.pullRequest.update({
      where: { id: pr.id },
      data: { sourceCommit: source.headHash, targetCommit: target.headHash },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function buildTreeFromHashes(pathMap, prismaClient) {
  const root = {};
  for (const [path, blobHash] of Object.entries(pathMap)) {
    const parts = path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || { __dir: true, children: {} };
      node = node[parts[i]].children;
    }
    node[parts[parts.length - 1]] = { __dir: false, hash: blobHash };
  }

  async function processNode(node) {
    const entries = [];
    for (const name of Object.keys(node).sort()) {
      const item = node[name];
      if (item.__dir) {
        const subtreeHash = await processNode(item.children);
        entries.push({ name, type: 'tree', hash: subtreeHash });
      } else {
        entries.push({ name, type: 'blob', hash: item.hash });
      }
    }
    const treeHash = hashTreeEntries(entries);
    await prismaClient.tree.upsert({
      where: { hash: treeHash },
      update: {},
      create: { hash: treeHash, entries },
    });
    return treeHash;
  }

  return processNode(root);
}

// POST /api/prs/item/:prId/merge
// Sequential writes instead of $transaction — same Neon pooling issue.
// The optimistic-lock check (updateMany + count === 0) still prevents
// silently overwriting a branch that moved during the merge.
async function mergePR(req, res, next) {
  try {
    const pr = await prisma.pullRequest.findUnique({ where: { id: req.params.prId } });
    if (!pr) return res.status(404).json({ message: 'PR not found' });
    if (pr.status !== 'OPEN') {
      return res.status(400).json({ message: `PR is already ${pr.status.toLowerCase()}` });
    }

    const [sourceBranch, targetBranch] = await Promise.all([
      prisma.branch.findUnique({ where: { repoId_name: { repoId: pr.repoId, name: pr.sourceBranch } } }),
      prisma.branch.findUnique({ where: { repoId_name: { repoId: pr.repoId, name: pr.targetBranch } } }),
    ]);
    if (!sourceBranch || !targetBranch) {
      return res.status(404).json({ message: 'One or both branches no longer exist' });
    }

    const liveSourceCommit = sourceBranch.headHash;
    const liveTargetCommit = targetBranch.headHash;

    const baseHash = await findCommonAncestor(liveSourceCommit, liveTargetCommit);
    const { merged, conflicts } = await threeWayMerge(baseHash, liveSourceCommit, liveTargetCommit);

    if (conflicts.length > 0) {
      await prisma.pullRequest.update({
        where: { id: pr.id },
        data: { status: 'CONFLICT', sourceCommit: liveSourceCommit, targetCommit: liveTargetCommit },
      });
      return res.status(409).json({
        message: 'Merge conflict — manual resolution required',
        conflicts,
      });
    }

    const mergedTreeHash = await buildTreeFromHashes(merged, prisma);
    const timestamp = Date.now();
    const mergeCommitHash = hashCommit({
      tree: mergedTreeHash,
      parents: [liveTargetCommit, liveSourceCommit],
      message: `Merge pull request: ${pr.title}`,
      authorId: req.user.id,
      timestamp,
    });

    await prisma.commit.create({
      data: {
        hash: mergeCommitHash,
        repoId: pr.repoId,
        treeHash: mergedTreeHash,
        message: `Merge pull request: ${pr.title}`,
        authorId: req.user.id,
      },
    });

    await prisma.commitParent.createMany({
      data: [
        { childHash: mergeCommitHash, parentHash: liveTargetCommit },
        { childHash: mergeCommitHash, parentHash: liveSourceCommit },
      ],
    });

    const updateResult = await prisma.branch.updateMany({
      where: { repoId: pr.repoId, name: pr.targetBranch, headHash: liveTargetCommit },
      data: { headHash: mergeCommitHash },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        message: 'Target branch changed during merge — please retry the merge',
      });
    }

    const result = await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        status: 'MERGED',
        mergeCommit: mergeCommitHash,
        sourceCommit: liveSourceCommit,
        targetCommit: liveTargetCommit,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/prs/item/:prId/resolve
async function resolveMergeConflict(req, res, next) {
  try {
    const { resolutions } = req.body;
    const pr = await prisma.pullRequest.findUnique({ where: { id: req.params.prId } });
    if (!pr) return res.status(404).json({ message: 'PR not found' });
    if (pr.status !== 'CONFLICT') {
      return res.status(400).json({ message: 'PR is not in a conflict state' });
    }

    const targetBranch = await prisma.branch.findUnique({
      where: { repoId_name: { repoId: pr.repoId, name: pr.targetBranch } },
    });
    if (!targetBranch) {
      return res.status(404).json({ message: 'Target branch no longer exists' });
    }

    const liveSourceCommit = pr.sourceCommit;
    const liveTargetCommit = pr.targetCommit;

    const baseHash = await findCommonAncestor(liveSourceCommit, liveTargetCommit);
    const { merged, conflicts } = await threeWayMerge(baseHash, liveSourceCommit, liveTargetCommit);

    const resolutionMap = new Map(resolutions.map((r) => [r.path, r.blobHash]));
    for (const conflict of conflicts) {
      const chosenHash = resolutionMap.get(conflict.path);
      if (!chosenHash) {
        return res.status(400).json({
          message: `Missing resolution for conflicting file: ${conflict.path}`,
        });
      }
      const blobExists = await prisma.blob.findUnique({ where: { hash: chosenHash } });
      if (!blobExists) {
        return res.status(400).json({
          message: `Resolution for ${conflict.path} references a blob that doesn't exist`,
        });
      }
      merged[conflict.path] = chosenHash;
    }

    const mergedTreeHash = await buildTreeFromHashes(merged, prisma);
    const timestamp = Date.now();
    const mergeCommitHash = hashCommit({
      tree: mergedTreeHash,
      parents: [liveTargetCommit, liveSourceCommit],
      message: `Merge pull request (manually resolved): ${pr.title}`,
      authorId: req.user.id,
      timestamp,
    });

    await prisma.commit.create({
      data: {
        hash: mergeCommitHash,
        repoId: pr.repoId,
        treeHash: mergedTreeHash,
        message: `Merge pull request (manually resolved): ${pr.title}`,
        authorId: req.user.id,
      },
    });

    await prisma.commitParent.createMany({
      data: [
        { childHash: mergeCommitHash, parentHash: liveTargetCommit },
        { childHash: mergeCommitHash, parentHash: liveSourceCommit },
      ],
    });

    const updateResult = await prisma.branch.updateMany({
      where: { repoId: pr.repoId, name: pr.targetBranch, headHash: liveTargetCommit },
      data: { headHash: mergeCommitHash },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        message: 'Target branch changed while resolving conflict — please retry',
      });
    }

    const result = await prisma.pullRequest.update({
      where: { id: pr.id },
      data: { status: 'MERGED', mergeCommit: mergeCommitHash },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPR,
  listPRs,
  getPR,
  addComment,
  getPRDiff,
  syncPR,
  mergePR,
  resolveMergeConflict,
};