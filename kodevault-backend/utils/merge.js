const prisma = require('../config/db');
const { flattenTree } = require('./diff');
const { hashContent, hashTreeEntries, hashCommit } = require('./hash');

/**
 * Walks a commit's full ancestor chain (same recursive CTE approach as
 * getCommitHistory) and returns the set of ancestor hashes, keyed by hash
 * for fast lookup.
 */
async function getAncestrySet(commitHash) {
  const rows = await prisma.$queryRaw`
    WITH RECURSIVE ancestry AS (
      SELECT c.hash, 0 as depth
      FROM "Commit" c
      WHERE c.hash = ${commitHash}

      UNION ALL

      SELECT c.hash, a.depth + 1
      FROM "Commit" c
      JOIN "CommitParent" cp ON cp."parentHash" = c.hash
      JOIN ancestry a ON cp."childHash" = a.hash
    )
    SELECT DISTINCT hash, MIN(depth) as depth
    FROM ancestry
    GROUP BY hash;
  `;
  return new Map(rows.map((r) => [r.hash, Number(r.depth)]));
}

/**
 * Finds the lowest common ancestor of two commits: walks both ancestry
 * chains and picks the shared commit with the smallest combined depth
 * (i.e. the most recent common point in history).
 */
async function findCommonAncestor(hashA, hashB) {
  const [ancestryA, ancestryB] = await Promise.all([
    getAncestrySet(hashA),
    getAncestrySet(hashB),
  ]);

  let best = null;
  let bestScore = Infinity;

  for (const [hash, depthA] of ancestryA) {
    if (ancestryB.has(hash)) {
      const score = depthA + ancestryB.get(hash);
      if (score < bestScore) {
        bestScore = score;
        best = hash;
      }
    }
  }

  return best; // null means no common ancestor at all (shouldn't happen within one repo)
}

/**
 * File-level 3-way merge: compares each file's content across base, source,
 * and target. A file only conflicts if BOTH branches changed it AND changed
 * it to different content. This is a file-level merge (not line-level) —
 * a deliberate scope choice to keep conflict resolution correct and
 * explainable within the timeline, rather than attempting line-level diff3
 * merging, which is a much larger surface for subtle bugs.
 */
async function threeWayMerge(baseCommitHash, sourceCommitHash, targetCommitHash) {
  const [baseFiles, sourceFiles, targetFiles] = await Promise.all([
    baseCommitHash ? flattenTree((await prisma.commit.findUnique({ where: { hash: baseCommitHash } })).treeHash) : {},
    flattenTree((await prisma.commit.findUnique({ where: { hash: sourceCommitHash } })).treeHash),
    flattenTree((await prisma.commit.findUnique({ where: { hash: targetCommitHash } })).treeHash),
  ]);

  const allPaths = new Set([
    ...Object.keys(baseFiles),
    ...Object.keys(sourceFiles),
    ...Object.keys(targetFiles),
  ]);

  const merged = {}; // path -> blobHash (final content to write)
  const conflicts = []; // path list where manual resolution is needed

  for (const path of allPaths) {
    const baseHash = baseFiles[path];
    const sourceHash = sourceFiles[path];
    const targetHash = targetFiles[path];

    const sourceChanged = sourceHash !== baseHash;
    const targetChanged = targetHash !== baseHash;

    if (!sourceChanged && !targetChanged) {
      // neither side touched it — keep base version (or omit if it never existed)
      if (baseHash) merged[path] = baseHash;
    } else if (sourceChanged && !targetChanged) {
      // only source branch changed it — take source's version
      if (sourceHash) merged[path] = sourceHash;
    } else if (!sourceChanged && targetChanged) {
      // only target branch changed it — keep target's version
      if (targetHash) merged[path] = targetHash;
    } else if (sourceHash === targetHash) {
      // both changed it, but to the same thing — no real conflict
      if (sourceHash) merged[path] = sourceHash;
    } else {
      // both changed it differently — real conflict, needs manual resolution
      conflicts.push({
        path,
        base: baseHash ? { hash: baseHash } : null,
        source: sourceHash ? { hash: sourceHash } : null,
        target: targetHash ? { hash: targetHash } : null,
      });
    }
  }

  return { merged, conflicts };
}

module.exports = { findCommonAncestor, threeWayMerge };