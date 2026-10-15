const prisma = require('../config/db');
const archiver = require('archiver');
const { hashContent, hashTreeEntries, hashCommit } = require('../utils/hash');
const { flattenTree } = require('../utils/diff');

async function buildTree(files, prismaClient) {
  const seenPaths = new Set();
  for (const file of files) {
    if (seenPaths.has(file.path)) {
      throw Object.assign(new Error(`Duplicate file path in commit: ${file.path}`), { status: 400 });
    }
    seenPaths.add(file.path);
  }

  const root = {};
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || { __dir: true, children: {} };
      node = node[parts[i]].children;
    }
    node[parts[parts.length - 1]] = { __dir: false, content: file.content };
  }

  async function processNode(node) {
    const entries = [];
    for (const name of Object.keys(node).sort()) {
      const item = node[name];
      if (item.__dir) {
        const subtreeHash = await processNode(item.children);
        entries.push({ name, type: 'tree', hash: subtreeHash });
      } else {
        const blobHash = hashContent(item.content);
        await prismaClient.blob.upsert({
          where: { hash: blobHash },
          update: {},
          create: { hash: blobHash, content: item.content, size: Buffer.byteLength(item.content) },
        });
        entries.push({ name, type: 'blob', hash: blobHash });
      }
    }
    const treeHash = hashTreeEntries(entries);
    await prismaClient.tree.upsert({ where: { hash: treeHash }, update: {}, create: { hash: treeHash, entries } });
    return treeHash;
  }

  return processNode(root);
}

// POST /api/commits/:repoId
// body: { branchName, message, files: [{ path, content }] }
// Sequential writes instead of an interactive $transaction — same Neon
// pooling/suspend issue as createRepo. The optimistic-lock retry loop below
// still protects against concurrent commits to the same branch.
async function createCommit(req, res, next) {
  try {
    const { branchName, message, files } = req.body;
    const { repoId } = req.params;

    if (!branchName || !message || !Array.isArray(files)) {
      return res.status(400).json({ message: 'branchName, message, and files[] are required' });
    }

    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const branch = await prisma.branch.findUnique({
        where: { repoId_name: { repoId, name: branchName } },
      });
      if (!branch) return res.status(404).json({ message: 'Branch not found' });

      const expectedParentHash = branch.headHash;
      const rootTreeHash = await buildTree(files, prisma);

      const timestamp = Date.now();
      const commitHash = hashCommit({
        tree: rootTreeHash,
        parents: [expectedParentHash],
        message,
        authorId: req.user.id,
        timestamp,
      });

      const existingCommit = await prisma.commit.findUnique({ where: { hash: commitHash } });
      if (!existingCommit) {
        await prisma.commit.create({
          data: { hash: commitHash, repoId, treeHash: rootTreeHash, message, authorId: req.user.id },
        });
        await prisma.commitParent.create({
          data: { childHash: commitHash, parentHash: expectedParentHash },
        });
      }

      const updateResult = await prisma.branch.updateMany({
        where: { id: branch.id, headHash: expectedParentHash },
        data: { headHash: commitHash },
      });

      if (updateResult.count === 0) {
        continue; // someone else committed to this branch in the meantime — retry
      }

      return res.status(201).json({ commitHash, branchName });
    }

    return res.status(409).json({ message: 'Too many concurrent commits to this branch, please retry' });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    next(err);
  }
}

async function getCommitHistory(req, res, next) {
  try {
    const { repoId, branchName } = req.params;
    const branch = await prisma.branch.findUnique({ where: { repoId_name: { repoId, name: branchName } } });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const history = await prisma.$queryRaw`
      WITH RECURSIVE ancestry AS (
        SELECT c.*, 0 as depth FROM "Commit" c WHERE c.hash = ${branch.headHash}
        UNION ALL
        SELECT c.*, a.depth + 1 FROM "Commit" c
        JOIN "CommitParent" cp ON cp."parentHash" = c.hash
        JOIN ancestry a ON cp."childHash" = a.hash
      )
      SELECT DISTINCT hash, "treeHash", message, "authorId", "createdAt", depth
      FROM ancestry ORDER BY depth ASC;
    `;
    res.json(history);
  } catch (err) {
    next(err);
  }
}

async function getTreeAtCommit(req, res, next) {
  try {
    const { repoId, commitHash } = req.params;
    const commit = await prisma.commit.findUnique({ where: { hash: commitHash } });
    if (!commit || commit.repoId !== repoId) {
      return res.status(404).json({ message: 'Commit not found in this repo' });
    }
    const tree = await prisma.tree.findUnique({ where: { hash: commit.treeHash } });
    res.json({ commit, tree });
  } catch (err) {
    next(err);
  }
}

async function downloadBranchAsZip(req, res, next) {
  try {
    const { repoId, branchName } = req.params;
    const branch = await prisma.branch.findUnique({ where: { repoId_name: { repoId, name: branchName } } });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const commit = await prisma.commit.findUnique({ where: { hash: branch.headHash } });
    const files = await flattenTree(commit.treeHash);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${branchName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ message: 'Failed to create archive' });
      else res.destroy();
    });
    archive.pipe(res);

    for (const [path, blobHash] of Object.entries(files)) {
      const blob = await prisma.blob.findUnique({ where: { hash: blobHash } });
      archive.append(blob.content, { name: path });
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
}

async function getCommitGraph(req, res, next) {
  try {
    const { repoId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 200, 500);

    const commits = await prisma.commit.findMany({
      where: { repoId },
      select: { hash: true, message: true, authorId: true, createdAt: true, author: { select: { username: true } } },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const commitHashes = commits.map((c) => c.hash);
    const edges = await prisma.commitParent.findMany({
      where: { childHash: { in: commitHashes } },
      select: { childHash: true, parentHash: true },
    });
    const branches = await prisma.branch.findMany({ where: { repoId }, select: { name: true, headHash: true } });

    res.json({
      nodes: commits.map((c) => ({ id: c.hash, message: c.message, author: c.author.username, createdAt: c.createdAt })),
      edges: edges.map((e) => ({ from: e.parentHash, to: e.childHash })),
      branches,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCommit,
  getCommitHistory,
  getTreeAtCommit,
  downloadBranchAsZip,
  getCommitGraph,
};