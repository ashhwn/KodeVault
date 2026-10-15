const prisma = require('../config/db');

// POST /api/issues/:repoId
async function createIssue(req, res, next) {
  try {
    const { title, description, labels } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const issue = await prisma.issue.create({
      data: {
        repoId: req.params.repoId,
        title,
        description: description || '',
        labels: labels || [],
        authorId: req.user.id,
      },
    });

    res.status(201).json(issue);
  } catch (err) {
    next(err);
  }
}

// GET /api/issues/:repoId
async function listIssues(req, res, next) {
  try {
    const issues = await prisma.issue.findMany({
      where: { repoId: req.params.repoId },
      include: { author: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(issues);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/issues/item/:issueId/close
async function closeIssue(req, res, next) {
  try {
    const issue = await prisma.issue.update({
      where: { id: req.params.issueId },
      data: { status: 'CLOSED' },
    });
    res.json(issue);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Issue not found' });
    }
    next(err);
  }
}

// POST /api/issues/item/:issueId/comments
async function addComment(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const comment = await prisma.issueComment.create({
      data: {
        issueId: req.params.issueId,
        authorId: req.user.id,
        text,
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

module.exports = { createIssue, listIssues, closeIssue, addComment };