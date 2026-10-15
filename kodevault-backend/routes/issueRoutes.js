const express = require('express');
const router = express.Router();
const {
  createIssue,
  listIssues,
  closeIssue,
  addComment,
} = require('../controllers/issueController');
const { protect } = require('../middleware/auth');
const { loadRepoAndAccess, requireRead, requireWrite } = require('../middleware/repoAccess');
const { loadIssueRepoAndAccess } = require('../middleware/itemAccess');

router.post('/:repoId', protect, loadRepoAndAccess, requireWrite, createIssue);
router.get('/:repoId', protect, loadRepoAndAccess, requireRead, listIssues);
router.patch('/item/:issueId/close', protect, loadIssueRepoAndAccess, requireWrite, closeIssue);
router.post('/item/:issueId/comments', protect, loadIssueRepoAndAccess, requireRead, addComment);

module.exports = router;