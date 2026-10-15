const crypto = require('crypto');

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function hashTreeEntries(entries) {
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const serialized = sorted
    .map((e) => `${e.type}:${e.name}:${e.hash}`)
    .join('\n');
  return hashContent(serialized);
}

function hashCommit({ tree, parents, message, authorId, timestamp }) {
  const serialized = [
    `tree:${tree}`,
    `parents:${parents.join(',')}`,
    `message:${message}`,
    `author:${authorId}`,
    `timestamp:${timestamp}`,
  ].join('\n');
  return hashContent(serialized);
}

module.exports = { hashContent, hashTreeEntries, hashCommit };