const { diffLines } = require('diff');
const prisma = require('../config/db');

/**
 * Flattens a Tree (recursively) into a map of { "full/path/to/file.js": blobHash }.
 * Needed because trees are nested, but diffing is naturally done file-by-file.
 */
async function flattenTree(treeHash, prefix = '') {
  const tree = await prisma.tree.findUnique({ where: { hash: treeHash } });
  if (!tree) return {};

  const files = {};
  for (const entry of tree.entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.type === 'blob') {
      files[fullPath] = entry.hash;
    } else {
      const nested = await flattenTree(entry.hash, fullPath);
      Object.assign(files, nested);
    }
  }
  return files;
}

/**
 * Computes the diff between two commits: which files were added, removed,
 * modified (with line-level diff), or unchanged. This is what powers the
 * PR diff view. repoId is required and checked against both commits to
 * prevent diffing across repos the requester shouldn't be able to read
 * (closes a cross-repo data leak — a bare commit hash lookup with no
 * repo check would let someone diff commits from a private repo they
 * don't have access to, as long as they knew/guessed the hash).
 */
async function diffCommits(fromCommitHash, toCommitHash, repoId) {
  const [fromCommit, toCommit] = await Promise.all([
    prisma.commit.findUnique({ where: { hash: fromCommitHash } }),
    prisma.commit.findUnique({ where: { hash: toCommitHash } }),
  ]);

  if (!fromCommit || !toCommit || fromCommit.repoId !== repoId || toCommit.repoId !== repoId) {
    throw Object.assign(new Error('One or both commits not found in this repo'), { status: 404 });
  }

  const [fromFiles, toFiles] = await Promise.all([
    flattenTree(fromCommit.treeHash),
    flattenTree(toCommit.treeHash),
  ]);

  const allPaths = new Set([...Object.keys(fromFiles), ...Object.keys(toFiles)]);
  const results = [];

  for (const path of allPaths) {
    const fromHash = fromFiles[path];
    const toHash = toFiles[path];

    if (!fromHash && toHash) {
      const blob = await prisma.blob.findUnique({ where: { hash: toHash } });
      results.push({ path, status: 'added', hunks: diffLines('', blob.content) });
    } else if (fromHash && !toHash) {
      const blob = await prisma.blob.findUnique({ where: { hash: fromHash } });
      results.push({ path, status: 'removed', hunks: diffLines(blob.content, '') });
    } else if (fromHash !== toHash) {
      const [fromBlob, toBlob] = await Promise.all([
        prisma.blob.findUnique({ where: { hash: fromHash } }),
        prisma.blob.findUnique({ where: { hash: toHash } }),
      ]);
      results.push({ path, status: 'modified', hunks: diffLines(fromBlob.content, toBlob.content) });
    }
    // fromHash === toHash means unchanged — skip it, PR diffs only show changes
  }

  return { fromCommit: fromCommitHash, toCommit: toCommitHash, files: results };
}

module.exports = { diffCommits, flattenTree };